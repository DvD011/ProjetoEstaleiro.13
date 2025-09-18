import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { compare } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { create, verify } from 'https://deno.land/x/djwt@v3.0.1/mod.ts';

interface SigninRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const JWT_SECRET = new TextEncoder().encode(
  Deno.env.get('JWT_SECRET') || 'your-secret-key'
);

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

    const { email, password, rememberMe = false, deviceInfo }: SigninRequest = await req.json();

    // Validações básicas
    if (!email || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email e senha são obrigatórios' 
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
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais inválidas' 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar se a conta está ativa
    if (!user.is_active) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Conta desativada. Entre em contato com o suporte.' 
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verificar senha
    const passwordMatch = await compare(password, user.password_hash);
    if (!passwordMatch) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais inválidas' 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Atualizar último login
    await supabase
      .from('auth_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Gerar JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60), // 30 dias ou 1 dia
    };

    const token = await create({ alg: 'HS256', typ: 'JWT' }, payload, JWT_SECRET);

    // Se "lembrar-me" estiver ativado, criar sessão persistente
    let sessionToken = null;
    if (rememberMe) {
      sessionToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias

      await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          device_info: deviceInfo || 'Unknown',
          ip_address: req.headers.get('x-forwarded-for') || 'Unknown',
          expires_at: expiresAt.toISOString(),
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_verified: user.is_verified,
        },
        token,
        sessionToken,
        expiresIn: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no signin:', error);
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