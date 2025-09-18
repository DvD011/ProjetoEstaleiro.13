/*
  Edge Function: webhook-config
  
  Endpoint para testar e validar configurações de webhook.
  
  Variáveis de ambiente necessárias:
  - EXTERNAL_WOMS_API_URL
  - EXTERNAL_WOMS_API_KEY
  - SLACK_WEBHOOK_URL
  - TEAMS_WEBHOOK_URL
  - CUSTOM_NOTIFICATION_API_URL
  - NOTIFICATION_API_KEY
  - COST_TRACKING_API_URL
  - COST_TRACKING_API_KEY
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface WebhookTestRequest {
  webhook_name: string;
  test_data?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'GET') {
      // Retornar configuração atual dos webhooks
      const config = await getWebhookConfiguration(supabase);
      
      return new Response(
        JSON.stringify(config),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      // Testar webhook específico
      const { webhook_name, test_data }: WebhookTestRequest = await req.json();
      
      const testResult = await testWebhook(webhook_name, test_data);
      
      return new Response(
        JSON.stringify(testResult),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro em webhook-config:', error);
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

async function getWebhookConfiguration(supabase: any) {
  // Buscar estatísticas da fila
  const { data: queueStats } = await supabase
    .from('webhook_queue')
    .select('status')
    .then((result: any) => {
      if (result.error) return { data: [] };
      
      const stats = result.data.reduce((acc: any, item: any) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      
      return { data: stats };
    });

  // Buscar logs recentes
  const { data: recentLogs } = await supabase
    .from('webhook_logs')
    .select('event_type, response_status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    webhooks: [
      {
        name: 'external_os_integration',
        description: 'Integração com sistema WOMS/ERP para Ordens de Serviço',
        url: Deno.env.get('EXTERNAL_WOMS_API_URL') || 'not_configured',
        enabled: !!Deno.env.get('EXTERNAL_WOMS_API_URL'),
        events: ['work_order_created'],
        trigger: 'Database trigger on work_orders table INSERT',
      },
      {
        name: 'notification_webhook',
        description: 'Notificações em tempo real para Slack/Teams/Custom',
        platforms: {
          slack: {
            url: Deno.env.get('SLACK_WEBHOOK_URL') || 'not_configured',
            enabled: !!Deno.env.get('SLACK_WEBHOOK_URL'),
          },
          teams: {
            url: Deno.env.get('TEAMS_WEBHOOK_URL') || 'not_configured',
            enabled: !!Deno.env.get('TEAMS_WEBHOOK_URL'),
          },
          custom: {
            url: Deno.env.get('CUSTOM_NOTIFICATION_API_URL') || 'not_configured',
            enabled: !!Deno.env.get('CUSTOM_NOTIFICATION_API_URL'),
          },
        },
        events: ['corrective_action_high_criticality'],
        trigger: 'Database trigger on corrective_actions table INSERT/UPDATE',
      },
      {
        name: 'cost_tracking_webhook',
        description: 'Integração com sistema financeiro para tracking de custos',
        url: Deno.env.get('COST_TRACKING_API_URL') || 'not_configured',
        enabled: !!Deno.env.get('COST_TRACKING_API_URL'),
        events: ['corrective_action_cost_changed'],
        trigger: 'Database trigger on corrective_actions table INSERT/UPDATE',
      },
    ],
    queue_statistics: queueStats || {},
    recent_logs: recentLogs || [],
    environment_variables: {
      required: [
        'EXTERNAL_WOMS_API_URL',
        'EXTERNAL_WOMS_API_KEY',
        'SLACK_WEBHOOK_URL',
        'TEAMS_WEBHOOK_URL',
        'CUSTOM_NOTIFICATION_API_URL',
        'NOTIFICATION_API_KEY',
        'COST_TRACKING_API_URL',
        'COST_TRACKING_API_KEY',
      ],
      configured: [
        Deno.env.get('EXTERNAL_WOMS_API_URL') ? 'EXTERNAL_WOMS_API_URL' : null,
        Deno.env.get('EXTERNAL_WOMS_API_KEY') ? 'EXTERNAL_WOMS_API_KEY' : null,
        Deno.env.get('SLACK_WEBHOOK_URL') ? 'SLACK_WEBHOOK_URL' : null,
        Deno.env.get('TEAMS_WEBHOOK_URL') ? 'TEAMS_WEBHOOK_URL' : null,
        Deno.env.get('CUSTOM_NOTIFICATION_API_URL') ? 'CUSTOM_NOTIFICATION_API_URL' : null,
        Deno.env.get('NOTIFICATION_API_KEY') ? 'NOTIFICATION_API_KEY' : null,
        Deno.env.get('COST_TRACKING_API_URL') ? 'COST_TRACKING_API_URL' : null,
        Deno.env.get('COST_TRACKING_API_KEY') ? 'COST_TRACKING_API_KEY' : null,
      ].filter(Boolean),
    },
  };
}

async function testWebhook(webhookName: string, testData?: any) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    let targetFunction: string;
    let defaultTestData: any;

    switch (webhookName) {
      case 'external_os_integration':
        targetFunction = 'handle-new-os';
        defaultTestData = {
          os_number: 'TEST-OS-' + Date.now(),
          inspection_id: 'test_inspection',
          fault_id: 'test_fault',
          description: 'Test work order for webhook validation',
          priority: 'urgent',
          estimated_cost: 1000,
          created_at: new Date().toISOString(),
        };
        break;
      
      case 'notification_webhook':
        targetFunction = 'send-notification';
        defaultTestData = {
          message: 'Test notification from webhook system',
          recipients: ['test_user'],
          urgency: 'medium',
          type: 'test_alert',
          inspection_id: 'test_inspection',
          fault_id: 'test_fault',
        };
        break;
      
      case 'cost_tracking_webhook':
        targetFunction = 'update-cost-tracking';
        defaultTestData = {
          fault_id: 'test_fault_' + Date.now(),
          inspection_id: 'test_inspection',
          descricao: 'Test corrective action for cost tracking',
          criticidade: 'alta',
          custo_estimado: 1500,
          status: 'pendente',
          data_deteccao: new Date().toISOString(),
          event_trigger: 'cost_added',
        };
        break;
      
      default:
        return { success: false, error: 'Webhook desconhecido' };
    }

    // Fazer requisição de teste
    const response = await fetch(`${supabaseUrl}/functions/v1/${targetFunction}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(testData || defaultTestData),
    });

    const responseBody = await response.text();

    return {
      success: response.ok,
      webhook_name: webhookName,
      target_function: targetFunction,
      response_status: response.status,
      response_body: responseBody,
      test_data: testData || defaultTestData,
    };

  } catch (error) {
    return {
      success: false,
      webhook_name: webhookName,
      error: error.message,
    };
  }
}