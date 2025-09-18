/*
  Edge Function: update-cost-tracking
  
  Integra dados de custo de ações corretivas com sistemas financeiros externos.
  
  Variáveis de ambiente necessárias:
  - COST_TRACKING_API_URL (URL do sistema financeiro)
  - COST_TRACKING_API_KEY (chave de autenticação)
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface CostTrackingPayload {
  fault_id: string;
  inspection_id: string;
  descricao: string;
  criticidade: string;
  custo_estimado: number;
  custo_estimado_anterior?: number;
  status: string;
  data_deteccao: string;
  responsavel?: string;
  event_trigger: 'cost_added' | 'cost_updated';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const requestData = await req.json();
    const costData: CostTrackingPayload = requestData.record || requestData;

    // Validar campos obrigatórios
    if (!costData.fault_id || !costData.inspection_id || costData.custo_estimado === undefined) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios ausentes: fault_id, inspection_id e custo_estimado' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obter configuração da API externa
    const costTrackingUrl = Deno.env.get('COST_TRACKING_API_URL');
    const costTrackingKey = Deno.env.get('COST_TRACKING_API_KEY');

    if (!costTrackingUrl) {
      console.log('COST_TRACKING_API_URL não configurada, simulando integração');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'API de tracking de custos não configurada - simulação de sucesso',
          simulated: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Preparar payload para sistema financeiro
    const financialPayload = {
      cost_entry: {
        reference_id: costData.fault_id,
        inspection_reference: costData.inspection_id,
        description: costData.descricao,
        category: 'corrective_maintenance',
        criticality_level: mapCriticalityToExternal(costData.criticidade),
        cost_data: {
          estimated_amount: costData.custo_estimado,
          previous_amount: costData.custo_estimado_anterior || null,
          currency: 'BRL',
          change_type: costData.event_trigger,
        },
        responsible_party: costData.responsavel || 'Não especificado',
        detection_date: costData.data_deteccao,
        status: costData.status,
        source_system: 'inspecao_eletrica',
        integration_timestamp: new Date().toISOString(),
      },
      metadata: {
        source: 'inspecao_eletrica_app',
        version: '1.0',
        integration_type: 'automatic',
      },
    };

    // Fazer requisição para API externa
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Source': 'inspecao-eletrica',
    };

    if (costTrackingKey) {
      headers['Authorization'] = `Bearer ${costTrackingKey}`;
    }

    const response = await fetch(costTrackingUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(financialPayload),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      throw new Error(`API de custos retornou erro ${response.status}: ${responseBody}`);
    }

    console.log(`Custo da falha ${costData.fault_id} integrado com sucesso ao sistema financeiro`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dados de custo integrados com sucesso',
        fault_id: costData.fault_id,
        cost_amount: costData.custo_estimado,
        external_response: responseBody,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro na integração de custos:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro na integração com sistema financeiro',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function mapCriticalityToExternal(criticidade: string): string {
  const criticalityMap: Record<string, string> = {
    'alta': 'HIGH',
    'media': 'MEDIUM',
    'baixa': 'LOW',
  };
  
  return criticalityMap[criticidade.toLowerCase()] || 'MEDIUM';
}