import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { hash } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

interface SignupRequest {
  email: string;
  password: string;
  name: string;
  role?: string;
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

    const { email, password, name, role = 'inspector' }: SignupRequest = await req.json();

    // Validações básicas
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email, senha e nome são obrigatórios' 
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

    // Validar complexidade da senha
    if (password.length < 8) {
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

    if (!/[A-Z]/.test(password)) {
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

    if (!/\d/.test(password)) {
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

    // Verificar se o email já existe
    const { data: existingUser } = await supabase
      .from('auth_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Este e-mail já está cadastrado' 
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Hash da senha
    const passwordHash = await hash(password, 12);

    // Criar usuário
    const { data: newUser, error: createError } = await supabase
      .from('auth_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name.trim(),
        role: role,
        is_verified: true,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Erro ao criar usuário:', createError);
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conta criada com sucesso! Você já pode fazer login.',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          is_verified: newUser.is_verified,
        }
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro no signup:', error);
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