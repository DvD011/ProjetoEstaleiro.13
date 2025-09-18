/*
  Edge Function: send-notification
  
  Envia notificações para Slack, Teams ou APIs customizadas.
  
  Variáveis de ambiente necessárias:
  - SLACK_WEBHOOK_URL (URL do webhook do Slack)
  - TEAMS_WEBHOOK_URL (URL do webhook do Teams)
  - CUSTOM_NOTIFICATION_API_URL (URL da API de notificação customizada)
  - NOTIFICATION_API_KEY (chave para API customizada)
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface NotificationRequest {
  message: string;
  recipients: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
  inspection_id?: string;
  fault_id?: string;
  metadata?: Record<string, any>;
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

    const notificationData: NotificationRequest = await req.json();

    // Validar campos obrigatórios
    if (!notificationData.message || !notificationData.recipients || notificationData.recipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Message e recipients são obrigatórios' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    // Enviar para Slack se configurado
    const slackResult = await sendToSlack(notificationData);
    if (slackResult) results.push(slackResult);

    // Enviar para Teams se configurado
    const teamsResult = await sendToTeams(notificationData);
    if (teamsResult) results.push(teamsResult);

    // Enviar para API customizada se configurada
    const customResult = await sendToCustomAPI(notificationData);
    if (customResult) results.push(customResult);

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma plataforma de notificação configurada',
          results: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: `Notificações enviadas: ${successCount}/${results.length} sucessos`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no envio de notificações:', error);
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

async function sendToSlack(data: NotificationRequest) {
  const webhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
  if (!webhookUrl) return null;

  try {
    const slackPayload = {
      text: data.message,
      attachments: [
        {
          color: getSlackColor(data.urgency),
          fields: [
            {
              title: 'Urgência',
              value: data.urgency.toUpperCase(),
              short: true,
            },
            {
              title: 'Destinatários',
              value: data.recipients.join(', '),
              short: true,
            },
            ...(data.inspection_id ? [{
              title: 'Inspeção',
              value: data.inspection_id,
              short: true,
            }] : []),
            ...(data.fault_id ? [{
              title: 'Falha',
              value: data.fault_id,
              short: true,
            }] : []),
          ],
          footer: 'Sistema de Inspeção Elétrica',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    return {
      platform: 'slack',
      success: response.ok,
      status: response.status,
      error: response.ok ? null : await response.text(),
    };
  } catch (error) {
    return {
      platform: 'slack',
      success: false,
      error: error.message,
    };
  }
}

async function sendToTeams(data: NotificationRequest) {
  const webhookUrl = Deno.env.get('TEAMS_WEBHOOK_URL');
  if (!webhookUrl) return null;

  try {
    const teamsPayload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: getTeamsColor(data.urgency),
      summary: data.message,
      sections: [
        {
          activityTitle: 'Sistema de Inspeção Elétrica',
          activitySubtitle: `Urgência: ${data.urgency.toUpperCase()}`,
          text: data.message,
          facts: [
            {
              name: 'Destinatários',
              value: data.recipients.join(', '),
            },
            ...(data.inspection_id ? [{
              name: 'Inspeção',
              value: data.inspection_id,
            }] : []),
            ...(data.fault_id ? [{
              name: 'ID da Falha',
              value: data.fault_id,
            }] : []),
            {
              name: 'Timestamp',
              value: new Date().toLocaleString('pt-BR'),
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamsPayload),
    });

    return {
      platform: 'teams',
      success: response.ok,
      status: response.status,
      error: response.ok ? null : await response.text(),
    };
  } catch (error) {
    return {
      platform: 'teams',
      success: false,
      error: error.message,
    };
  }
}

async function sendToCustomAPI(data: NotificationRequest) {
  const apiUrl = Deno.env.get('CUSTOM_NOTIFICATION_API_URL');
  if (!apiUrl) return null;

  try {
    const customPayload = {
      type: data.type || 'general_notification',
      message: data.message,
      recipients: data.recipients,
      urgency: data.urgency,
      timestamp: new Date().toISOString(),
      source: 'inspecao_eletrica_app',
      context: {
        inspection_id: data.inspection_id,
        fault_id: data.fault_id,
        metadata: data.metadata || {},
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Source': 'inspecao-eletrica',
    };

    const apiKey = Deno.env.get('NOTIFICATION_API_KEY');
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(customPayload),
    });

    return {
      platform: 'custom',
      success: response.ok,
      status: response.status,
      error: response.ok ? null : await response.text(),
    };
  } catch (error) {
    return {
      platform: 'custom',
      success: false,
      error: error.message,
    };
  }
}

function getSlackColor(urgency: string): string {
  switch (urgency) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'good';
    case 'low': return '#36a64f';
    default: return 'good';
  }
}

function getTeamsColor(urgency: string): string {
  switch (urgency) {
    case 'critical': return 'FF0000';
    case 'high': return 'FF6600';
    case 'medium': return 'FFCC00';
    case 'low': return '00CC00';
    default: return '0078D4';
  }
}