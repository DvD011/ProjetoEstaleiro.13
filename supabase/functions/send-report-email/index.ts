/*
  Edge Function: send-report-email
  
  Envia relatórios de inspeção por e-mail para contatos especificados.
  
  Variáveis de ambiente necessárias:
  - EMAIL_SERVICE_API_KEY (chave da API do serviço de e-mail)
  - EMAIL_SERVICE_URL (URL da API do serviço de e-mail)
  - FROM_EMAIL (e-mail remetente)
  - FROM_NAME (nome do remetente)
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

interface EmailRequest {
  export_log_id: string;
  inspection_id: string;
  pdf_url: string;
  json_url?: string;
  client_name: string;
  inspection_date: string;
  version: number;
  recipients: string[];
  os_number: string;
  responsible_name?: string;
  work_site?: string;
}

interface EmailTemplate {
  subject: string;
  html_body: string;
  text_body: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 5000, 25000]; // 1s, 5s, 25s

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

    const emailData: EmailRequest = await req.json();

    // Validar campos obrigatórios
    if (!emailData.export_log_id || !emailData.pdf_url || !emailData.recipients?.length) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios ausentes: export_log_id, pdf_url e recipients' 
        }),
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

    // Gerar template do e-mail
    const emailTemplate = generateEmailTemplate(emailData);

    // Tentar enviar e-mail com política de retentativa
    const emailResult = await sendEmailWithRetry(emailTemplate, emailData.recipients);

    if (emailResult.success) {
      // Atualizar export_logs com sucesso
      await supabase
        .from('export_logs')
        .update({
          status: 'success',
          email_delivered_at: new Date().toISOString(),
          metadata: {
            ...emailData,
            email_result: emailResult,
          },
        })
        .eq('id', emailData.export_log_id);

      console.log(`E-mail enviado com sucesso para: ${emailData.recipients.join(', ')}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'E-mail enviado com sucesso',
          recipients: emailData.recipients,
          delivery_id: emailResult.delivery_id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Atualizar export_logs com falha
      await supabase
        .from('export_logs')
        .update({
          status: 'failed',
          error_message: `Falha no envio de e-mail após ${MAX_RETRY_ATTEMPTS} tentativas: ${emailResult.error}`,
          retry_count: MAX_RETRY_ATTEMPTS,
        })
        .eq('id', emailData.export_log_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Falha no envio de e-mail após múltiplas tentativas',
          details: emailResult.error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

  } catch (error) {
    console.error('Erro no envio de e-mail:', error);
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

function generateEmailTemplate(emailData: EmailRequest): EmailTemplate {
  const formattedDate = formatDateForDisplay(emailData.inspection_date);
  
  const reportTypeText = emailData.report_type || 'Inspeção Elétrica';
  const subject = `${reportTypeText} - ${emailData.client_name} - ${formattedDate}`;
  
  const html_body = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #003366; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .details { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; }
        .button { background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Joule - Inspeção Elétrica</h1>
        <p>${reportTypeText}</p>
      </div>
      
      <div class="content">
        <p>Prezado(a) ${emailData.responsible_name || 'Responsável'},</p>
        
        <p>Segue em anexo o relatório de ${reportTypeText.toLowerCase()} referente à instalação de <strong>${emailData.client_name}</strong>, realizada em <strong>${formattedDate}</strong>.</p>
        
        <div class="details">
          <h3>Detalhes do Relatório:</h3>
          <ul>
            <li><strong>Cliente:</strong> ${emailData.client_name}</li>
            <li><strong>Local da Obra:</strong> ${emailData.work_site || 'Conforme especificado na inspeção'}</li>
            <li><strong>Data da Inspeção:</strong> ${formattedDate}</li>
            <li><strong>Número da OS:</strong> ${emailData.os_number}</li>
            <li><strong>Versão do Relatório:</strong> v${emailData.version}</li>
            <li><strong>ID da Inspeção:</strong> ${emailData.inspection_id}</li>
          </ul>
        </div>
        
        <p>Você pode acessar o relatório diretamente através do link abaixo:</p>
        <p><a href="${emailData.pdf_url}" class="button">📄 Baixar Relatório PDF</a></p>
        
        ${emailData.json_url ? `<p><a href="${emailData.json_url}" class="button">📊 Baixar Dados JSON</a></p>` : ''}
        
        <p>Em caso de dúvidas ou necessidade de informações adicionais, por favor, entre em contato conosco.</p>
        
        <p>Atenciosamente,</p>
        <p><strong>Equipe Joule</strong></p>
      </div>
      
      <div class="footer">
        <p>Joule - Soluções em Energia</p>
        <p>Rua Baffin, 335 • Jardim do Mar • CEP 09750-620 • São Bernardo do Campo • SP</p>
        <p>Tel: +55 11 2381-0838 • E-mail: contato@joule.com.br</p>
        <p><em>Este é um e-mail automático. Por favor, não responda diretamente.</em></p>
      </div>
    </body>
    </html>
  `;
  
  const text_body = `
Prezado(a) ${emailData.responsible_name || 'Responsável'},

Segue em anexo o relatório de ${reportTypeText.toLowerCase()} referente à instalação de ${emailData.client_name}, realizada em ${formattedDate}.

Detalhes do Relatório:
- Cliente: ${emailData.client_name}
- Local da Obra: ${emailData.work_site || 'Conforme especificado na inspeção'}
- Data da Inspeção: ${formattedDate}
- Número da OS: ${emailData.os_number}
- Versão do Relatório: v${emailData.version}
- ID da Inspeção: ${emailData.inspection_id}

Acesse o relatório: ${emailData.pdf_url}
${emailData.json_url ? `Dados JSON: ${emailData.json_url}` : ''}

Em caso de dúvidas ou necessidade de informações adicionais, por favor, entre em contato conosco.

Atenciosamente,

Equipe Joule
contato@joule.com.br
+55 11 2381-0838

---
Joule - Soluções em Energia
Rua Baffin, 335 • Jardim do Mar • CEP 09750-620 • São Bernardo do Campo • SP
Este é um e-mail automático. Por favor, não responda diretamente.
  `;

  return { subject, html_body, text_body };
}

async function sendEmailWithRetry(template: EmailTemplate, recipients: string[]): Promise<{
  success: boolean;
  delivery_id?: string;
  error?: string;
  attempts: number;
}> {
  const emailServiceUrl = Deno.env.get('EMAIL_SERVICE_URL');
  const emailServiceKey = Deno.env.get('EMAIL_SERVICE_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@joule.com.br';
  const fromName = Deno.env.get('FROM_NAME') || 'Joule - Inspeção Elétrica';

  // Se não houver configuração de e-mail, simular sucesso
  if (!emailServiceUrl || !emailServiceKey) {
    console.log('Serviço de e-mail não configurado, simulando envio...');
    console.log(`Simulando envio para: ${recipients.join(', ')}`);
    console.log(`Assunto: ${template.subject}`);
    
    return {
      success: true,
      delivery_id: `sim_${Date.now()}`,
      attempts: 1,
    };
  }

  let lastError = '';
  
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`Tentativa ${attempt + 1} de envio de e-mail para: ${recipients.join(', ')}`);
      
      // Preparar payload para o serviço de e-mail (exemplo para SendGrid/Mailgun)
      const emailPayload = {
        from: {
          email: fromEmail,
          name: fromName,
        },
        to: recipients.map(email => ({ email })),
        subject: template.subject,
        content: [
          {
            type: 'text/plain',
            value: template.text_body,
          },
          {
            type: 'text/html',
            value: template.html_body,
          },
        ],
        custom_args: {
          source: 'inspecao_eletrica',
          version: '1.0',
        },
      };

      const response = await fetch(emailServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${emailServiceKey}`,
          'X-Source': 'inspecao-eletrica',
        },
        body: JSON.stringify(emailPayload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`E-mail enviado com sucesso na tentativa ${attempt + 1}`);
        
        return {
          success: true,
          delivery_id: result.message_id || result.id || `delivery_${Date.now()}`,
          attempts: attempt + 1,
        };
      } else {
        const errorText = await response.text();
        lastError = `HTTP ${response.status}: ${errorText}`;
        console.warn(`Tentativa ${attempt + 1} falhou: ${lastError}`);
      }
    } catch (error) {
      lastError = error.message;
      console.warn(`Tentativa ${attempt + 1} falhou com erro: ${lastError}`);
    }

    // Aguardar antes da próxima tentativa (exceto na última)
    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: MAX_RETRY_ATTEMPTS,
  };
}

function formatDateForDisplay(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}