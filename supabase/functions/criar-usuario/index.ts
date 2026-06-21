import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

interface Payload {
  nome_completo: string
  area_profissao: string
  conselho: string
  email: string
  perfil_acesso: string
  senha: string
  tem_login: boolean
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
      return new Response(JSON.stringify({ error: 'Apenas admin pode criar usuários' }), { status: 403 })
    }

    const { nome_completo, area_profissao, conselho, email, perfil_acesso, senha, tem_login }: Payload = await req.json()

    if (!nome_completo || !area_profissao || !email || !perfil_acesso || !senha) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: nome_completo, area_profissao, email, perfil_acesso, senha' }), { status: 400 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400 })
    }

    const { error: insertError } = await supabaseAdmin.from('usuarios').insert({
      id: authUser.user.id,
      nome_completo,
      area_profissao,
      conselho,
      email,
      perfil: perfil_acesso,
      tem_login,
    })

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 })
    }

    return new Response(
      JSON.stringify({ id: authUser.user.id, nome_completo, area_profissao, conselho, email, perfil: perfil_acesso }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
