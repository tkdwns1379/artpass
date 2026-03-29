import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 요청자가 관리자인지 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ ok: false, error: 'Unauthorized' })

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 토큰으로 현재 유저 확인
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await adminClient.auth.getUser(token)
    if (userErr || !user) return json({ ok: false, error: 'Unauthorized' })

    // 관리자 권한 확인
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') return json({ ok: false, error: 'Forbidden' })

    // auth.users 전체 조회 (서비스 롤 필요)
    const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    if (error) throw error

    // id → email 맵 반환
    const emailMap: Record<string, string> = {}
    for (const u of users) {
      emailMap[u.id] = u.email ?? ''
    }

    return json({ ok: true, emailMap })
  } catch (e) {
    return json({ ok: false, error: (e as Error).message })
  }
})
