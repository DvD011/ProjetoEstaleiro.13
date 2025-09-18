import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface ForgotPasswordRequest {
  email: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req: Request) => {
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

    const { email }: ForgotPasswordRequest = await req.json();

    // Validações básicas
    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'E-mail é obrigatório' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Formato de e-mail inválido' 
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

    // Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, email, name, is_active')
      .eq('email', email.toLowerCase())
      .single();

    // Por segurança, sempre retornamos sucesso mesmo se o email não existir
    // Isso evita que atacantes descubram quais emails estão cadastrados
    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar se a conta está ativa
    if (!user.is_active) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Invalidar tokens de reset anteriores
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('used_at', null);

    // Gerar novo token de reset
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hora

    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Erro ao criar token de reset:', tokenError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro interno do servidor' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // TODO: Enviar e-mail de recuperação
    // Em um ambiente real, aqui seria enviado um e-mail com o link de reset
    const resetLink = `${Deno.env.get('APP_URL') || 'http://localhost:8081'}/(auth)/reset-password?token=${resetToken}`;
    console.log(`Link de recuperação para ${email}: ${resetLink}`);

    // Simular envio de e-mail
    console.log(`
      ===== E-MAIL DE RECUPERAÇÃO =====
      Para: ${user.email}
      Nome: ${user.name}
      
      Olá ${user.name},
      
      Você solicitou a redefinição de sua senha no Sistema de Inspeção Elétrica.
      
      Clique no link abaixo para redefinir sua senha:
      ${resetLink}
      
      Este link expira em 1 hora.
      
      Se você não solicitou esta redefinição, ignore este e-mail.
      
      Atenciosamente,
      Equipe Joule
      ================================
    `);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no forgot password:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});