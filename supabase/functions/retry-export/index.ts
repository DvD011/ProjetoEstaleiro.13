/*
  Edge Function: retry-export
  
  Reprocessa exportações que falharam, permitindo retry manual.
  
  Funcionalidades:
  - Retry de uploads falhados
  - Retry de envios de e-mail falhados
  - Atualização de logs de exportação
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

interface RetryRequest {
  export_log_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

    const { export_log_id }: RetryRequest = await req.json();

    if (!export_log_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'export_log_id é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Configurar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do log de exportação
    const { data: exportLog, error: logError } = await supabase
      .from('export_logs')
      .select('*')
      .eq('id', export_log_id)
      .single();

    if (logError || !exportLog) {
      return new Response(
        JSON.stringify({ success: false, error: 'Log de exportação não encontrado' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar se pode fazer retry
    if (exportLog.status === 'success') {
      return new Response(
        JSON.stringify({ success: false, error: 'Exportação já foi bem-sucedida' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (exportLog.retry_count >= 5) {
      return new Response(
        JSON.stringify({ success: false, error: 'Número máximo de tentativas excedido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Incrementar contador de retry
    await supabase
      .from('export_logs')
      .update({
        retry_count: exportLog.retry_count + 1,
        status: 'pending',
        error_message: null,
      })
      .eq('id', export_log_id);

    let retryResult = { success: false, error: 'Tipo de retry não identificado' };

    // Determinar que tipo de retry fazer baseado no status atual
    if (exportLog.status === 'failed' && !exportLog.uploaded_at) {
      // Retry do upload
      retryResult = await retryUpload(supabase, exportLog);
    } else if (exportLog.status === 'failed' && exportLog.uploaded_at && !exportLog.email_delivered_at) {
      // Retry do envio de e-mail
      retryResult = await retryEmailSend(supabase, exportLog);
    } else {
      // Retry completo (regenerar relatório)
      retryResult = await retryCompleteGeneration(supabase, exportLog);
    }

    if (retryResult.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Retry executado com sucesso',
          export_log_id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Atualizar log com erro do retry
      await supabase
        .from('export_logs')
        .update({
          status: 'failed',
          error_message: retryResult.error,
        })
        .eq('id', export_log_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Retry falhou',
          details: retryResult.error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Erro no retry de exportação:', error);
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

async function retryUpload(supabase: any, exportLog: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Regenerar relatório e fazer upload
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        inspection_id: exportLog.inspection_id,
        mode: exportLog.metadata?.mode || 'compatibility',
        recipient_emails: exportLog.recipient_emails || [],
        send_email: false, // Não enviar e-mail no retry de upload
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function retryEmailSend(supabase: any, exportLog: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Tentar enviar e-mail novamente
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-report-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        export_log_id: exportLog.id,
        inspection_id: exportLog.inspection_id,
        pdf_url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/reports/${exportLog.file_name}`,
        client_name: exportLog.metadata?.client_name,
        inspection_date: exportLog.metadata?.inspection_date,
        version: exportLog.version,
        recipients: exportLog.recipient_emails,
        os_number: exportLog.metadata?.os_number || `AUTO-${exportLog.inspection_id.slice(-8)}`,
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function retryCompleteGeneration(supabase: any, exportLog: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Regenerar relatório completamente
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        inspection_id: exportLog.inspection_id,
        mode: exportLog.metadata?.mode || 'compatibility',
        recipient_emails: exportLog.recipient_emails || [],
        send_email: exportLog.metadata?.send_email || false,
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}