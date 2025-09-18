/*
  Edge Function: process-webhook-queue
  
  Processa a fila de webhooks e envia requisições para sistemas externos.
  
  Variáveis de ambiente necessárias:
  - SUPABASE_URL (automática)
  - SUPABASE_SERVICE_ROLE_KEY (automática)
  - EXTERNAL_WOMS_API_URL (URL do sistema WOMS/ERP)
  - EXTERNAL_WOMS_API_KEY (chave de autenticação WOMS)
  - NOTIFICATION_WEBHOOK_URL (URL para notificações - Slack/Teams/Custom)
  - NOTIFICATION_API_KEY (chave para notificações customizadas)
  - COST_TRACKING_API_URL (URL do sistema financeiro)
  - COST_TRACKING_API_KEY (chave do sistema financeiro)
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

interface WebhookQueueItem {
  id: string;
  event_type: string;
  payload: any;
  status: string;
  attempts: number;
  priority: number;
  created_at: string;
}

interface WebhookConfig {
  url: string;
  headers: Record<string, string>;
  timeout: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 10;
const REQUEST_TIMEOUT = 30000; // 30 segundos

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Configurar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar itens pendentes da fila
    const { data: queueItems, error: fetchError } = await supabase
      .from('webhook_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('Erro ao buscar fila de webhooks:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao acessar fila' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum item na fila para processar',
          processed: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processando ${queueItems.length} itens da fila de webhooks`);

    const results = [];

    // Processar cada item da fila
    for (const item of queueItems) {
      const result = await processWebhookItem(item, supabase);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processamento concluído: ${successCount} sucessos, ${failureCount} falhas`,
        processed: results.length,
        results: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no processamento da fila:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processWebhookItem(item: WebhookQueueItem, supabase: any) {
  const startTime = Date.now();
  
  try {
    // Marcar como processando
    await supabase
      .from('webhook_queue')
      .update({ status: 'processing' })
      .eq('id', item.id);

    // Obter configuração do webhook baseada no tipo de evento
    const webhookConfig = getWebhookConfig(item.event_type);
    
    if (!webhookConfig) {
      throw new Error(`Configuração não encontrada para evento: ${item.event_type}`);
    }

    // Preparar payload para o sistema externo
    const externalPayload = prepareExternalPayload(item.event_type, item.payload);

    // Fazer requisição HTTP
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: webhookConfig.headers,
      body: JSON.stringify(externalPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text();
    const processingTime = Date.now() - startTime;

    // Log da requisição
    await supabase
      .from('webhook_logs')
      .insert({
        queue_id: item.id,
        event_type: item.event_type,
        target_url: webhookConfig.url,
        request_payload: externalPayload,
        response_status: response.status,
        response_body: responseBody,
        error: response.ok ? null : `HTTP ${response.status}: ${responseBody}`,
      });

    if (response.ok) {
      // Sucesso - marcar como concluído
      await supabase
        .from('webhook_queue')
        .update({ 
          status: 'done', 
          processed_at: new Date().toISOString() 
        })
        .eq('id', item.id);

      console.log(`Webhook ${item.event_type} processado com sucesso em ${processingTime}ms`);
      
      return {
        success: true,
        item_id: item.id,
        event_type: item.event_type,
        processing_time_ms: processingTime,
        response_status: response.status,
      };
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody}`);
    }

  } catch (error) {
    console.error(`Erro ao processar webhook ${item.event_type}:`, error);
    
    const newAttempts = item.attempts + 1;
    const shouldRetry = newAttempts < MAX_ATTEMPTS;
    const nextRetryAt = shouldRetry 
      ? new Date(Date.now() + (newAttempts * 5 * 60 * 1000)) // 5 min * tentativas
      : null;

    // Atualizar status do item
    await supabase
      .from('webhook_queue')
      .update({
        status: shouldRetry ? 'failed' : 'dead',
        attempts: newAttempts,
        error_message: error.message,
        next_retry_at: nextRetryAt?.toISOString(),
      })
      .eq('id', item.id);

    // Log do erro
    await supabase
      .from('webhook_logs')
      .insert({
        queue_id: item.id,
        event_type: item.event_type,
        target_url: getWebhookConfig(item.event_type)?.url || 'unknown',
        request_payload: item.payload,
        response_status: null,
        response_body: null,
        error: error.message,
      });

    return {
      success: false,
      item_id: item.id,
      event_type: item.event_type,
      error: error.message,
      attempts: newAttempts,
      will_retry: shouldRetry,
    };
  }
}

function getWebhookConfig(eventType: string): WebhookConfig | null {
  const baseHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'InspecaoEletrica-Webhook/1.0',
  };

  switch (eventType) {
    case 'work_order_created':
      const womsUrl = Deno.env.get('EXTERNAL_WOMS_API_URL');
      const womsKey = Deno.env.get('EXTERNAL_WOMS_API_KEY');
      
      if (!womsUrl) return null;
      
      return {
        url: womsUrl,
        headers: {
          ...baseHeaders,
          ...(womsKey ? { 'Authorization': `Bearer ${womsKey}` } : {}),
          'X-Source': 'inspecao-eletrica',
        },
        timeout: REQUEST_TIMEOUT,
      };

    case 'corrective_action_high_criticality':
      const notificationUrl = Deno.env.get('NOTIFICATION_WEBHOOK_URL');
      const notificationKey = Deno.env.get('NOTIFICATION_API_KEY');
      
      if (!notificationUrl) return null;
      
      return {
        url: notificationUrl,
        headers: {
          ...baseHeaders,
          ...(notificationKey ? { 'Authorization': `Bearer ${notificationKey}` } : {}),
        },
        timeout: REQUEST_TIMEOUT,
      };

    case 'corrective_action_cost_changed':
      const costUrl = Deno.env.get('COST_TRACKING_API_URL');
      const costKey = Deno.env.get('COST_TRACKING_API_KEY');
      
      if (!costUrl) return null;
      
      return {
        url: costUrl,
        headers: {
          ...baseHeaders,
          ...(costKey ? { 'Authorization': `Bearer ${costKey}` } : {}),
          'X-Source': 'inspecao-eletrica',
        },
        timeout: REQUEST_TIMEOUT,
      };

    default:
      return null;
  }
}

function prepareExternalPayload(eventType: string, payload: any): any {
  const basePayload = {
    ...payload,
    timestamp: new Date().toISOString(),
    source: 'inspecao_eletrica_app',
    event_type: eventType,
  };

  switch (eventType) {
    case 'work_order_created':
      return {
        ...basePayload,
        // Mapear campos para formato esperado pelo WOMS
        work_order: {
          number: payload.os_number,
          inspection_reference: payload.inspection_id,
          fault_reference: payload.fault_id,
          title: payload.description,
          priority_level: payload.priority,
          estimated_cost_brl: payload.estimated_cost,
          assigned_technician: payload.assigned_to,
          created_timestamp: payload.created_at,
        },
      };

    case 'corrective_action_high_criticality':
      return {
        ...basePayload,
        // Mapear para formato de notificação
        notification: {
          type: 'critical_alert',
          title: 'Problema Crítico Detectado',
          message: `Ação corretiva de alta criticidade: ${payload.descricao}`,
          urgency: 'high',
          metadata: {
            fault_id: payload.fault_id,
            inspection_id: payload.inspection_id,
            criticality: payload.criticidade,
            estimated_cost: payload.custo_estimado,
            photos_count: payload.fotos_before_count + payload.fotos_after_count,
            responsible: payload.responsavel,
            detection_date: payload.data_deteccao,
          },
        },
      };

    case 'corrective_action_cost_changed':
      return {
        ...basePayload,
        // Mapear para formato de tracking financeiro
        cost_tracking: {
          fault_id: payload.fault_id,
          inspection_id: payload.inspection_id,
          description: payload.descricao,
          criticality_level: payload.criticidade,
          previous_cost_brl: payload.custo_estimado_anterior,
          current_cost_brl: payload.custo_estimado_novo,
          change_type: payload.event_trigger,
          responsible_party: payload.responsavel,
          detection_date: payload.data_deteccao,
          status: payload.status,
        },
      };

    default:
      return basePayload;
  }
}