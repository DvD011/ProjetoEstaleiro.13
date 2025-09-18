/*
  Edge Function: handle-new-os
  
  Integra novas Ordens de Serviço com sistemas externos WOMS/ERP.
  
  Variáveis de ambiente necessárias:
  - EXTERNAL_WOMS_API_URL (URL do sistema WOMS/ERP)
  - EXTERNAL_WOMS_API_KEY (chave de autenticação)
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface WorkOrderPayload {
  os_number: string;
  inspection_id: string;
  fault_id: string;
  description: string;
  priority: string;
  estimated_cost: number;
  assigned_to?: string;
  created_at: string;
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
    const workOrder: WorkOrderPayload = requestData.record || requestData;

    // Validar campos obrigatórios
    if (!workOrder.os_number || !workOrder.description) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios ausentes: os_number e description' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Obter configuração da API externa
    const externalApiUrl = Deno.env.get('EXTERNAL_WOMS_API_URL');
    const externalApiKey = Deno.env.get('EXTERNAL_WOMS_API_KEY');

    if (!externalApiUrl) {
      console.log('EXTERNAL_WOMS_API_URL não configurada, simulando integração');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'API externa não configurada - simulação de sucesso',
          simulated: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Preparar payload para sistema externo
    const externalPayload = {
      work_order: {
        external_reference: workOrder.os_number,
        inspection_id: workOrder.inspection_id,
        fault_id: workOrder.fault_id,
        title: workOrder.description,
        priority: mapPriorityToExternal(workOrder.priority),
        estimated_cost: {
          amount: workOrder.estimated_cost,
          currency: 'BRL',
        },
        assigned_technician: workOrder.assigned_to || null,
        source_system: 'inspecao_eletrica',
        created_at: workOrder.created_at,
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

    if (externalApiKey) {
      headers['Authorization'] = `Bearer ${externalApiKey}`;
    }

    const response = await fetch(externalApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(externalPayload),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      throw new Error(`API externa retornou erro ${response.status}: ${responseBody}`);
    }

    console.log(`OS ${workOrder.os_number} integrada com sucesso ao sistema externo`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ordem de Serviço integrada com sucesso',
        os_number: workOrder.os_number,
        external_response: responseBody,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro na integração da OS:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro na integração com sistema externo',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function mapPriorityToExternal(priority: string): string {
  const priorityMap: Record<string, string> = {
    'urgent': 'HIGH',
    'high': 'HIGH',
    'normal': 'MEDIUM',
    'low': 'LOW',
  };
  
  return priorityMap[priority] || 'MEDIUM';
}