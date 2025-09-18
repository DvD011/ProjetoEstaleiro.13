import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { hash } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
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

    const { token, newPassword }: ResetPasswordRequest = await req.json();

    // Validações básicas
    if (!token || !newPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token e nova senha são obrigatórios' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar complexidade da nova senha
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'A senha deve ter pelo menos 8 caracteres' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'A senha deve conter pelo menos uma letra maiúscula' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!/\d/.test(newPassword)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'A senha deve conter pelo menos um número' 
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

    // Buscar token de reset válido
    const { data: resetTokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select(`
        id,
        user_id,
        expires_at,
        used_at,
        auth_users (
          id,
          email,
          name,
          is_active
        )
      `)
      .eq('token', token)
      .single();

    if (tokenError || !resetTokenData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token inválido ou expirado' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar se o token já foi usado
    if (resetTokenData.used_at) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token já foi utilizado' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar se o token expirou
    const now = new Date();
    const expiresAt = new Date(resetTokenData.expires_at);
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Token expirado' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar se a conta está ativa
    if (!resetTokenData.auth_users.is_active) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Conta desativada' 
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Hash da nova senha
    const passwordHash = await hash(newPassword, 12);

    // Atualizar senha do usuário
    const { error: updateError } = await supabase
      .from('auth_users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', resetTokenData.user_id);

    if (updateError) {
      console.error('Erro ao atualizar senha:', updateError);
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

    // Marcar token como usado
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetTokenData.id);

    // Invalidar todas as sessões do usuário (logout de todos os dispositivos)
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', resetTokenData.user_id);

    console.log(`Senha redefinida com sucesso para usuário: ${resetTokenData.auth_users.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Senha redefinida com sucesso',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no reset password:', error);
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