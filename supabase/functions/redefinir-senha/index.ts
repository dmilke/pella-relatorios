import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

interface Payload {
  usuario_id: string
  nova_senha: string
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token não fornecido' }), { status: 401 })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), { status: 401 })
    }

    const { data: callerProfile } = await supabaseClient
      .from('usuarios')
      .select('perfil')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || callerProfile.perfil !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas admin pode redefinir senhas' }), { status: 403 })
    }

    const { usuario_id, nova_senha }: Payload = await req.json()

    if (!usuario_id || !nova_senha) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: usuario_id, nova_senha' }), { status: 400 })
    }

    if (nova_senha.length < 6) {
      return new Response(JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }), { status: 400 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      usuario_id,
      { password: nova_senha }
    )

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 400 })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
