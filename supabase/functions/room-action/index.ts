import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 호출자 확인
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !caller) return json({ error: 'Unauthorized' }, 401)

    // 호출자 프로필 (role 확인)
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('name, role, is_banned')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.is_banned) return json({ error: 'Banned' }, 403)

    const callerIsAdmin = callerProfile?.role === 'admin'
    const callerName = callerProfile?.name ?? '알 수 없음'

    const { action, room_id, target_user_id } = await req.json()

    // ──────────────── JOIN ────────────────────────────────────
    if (action === 'join') {
      // 방 존재 + 인원 확인
      const { data: room } = await admin
        .from('rooms')
        .select('id, max_members')
        .eq('id', room_id)
        .single()

      if (!room) return json({ error: '방이 존재하지 않습니다.' }, 404)

      const { count } = await admin
        .from('room_members')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room_id)

      if ((count ?? 0) >= room.max_members) {
        return json({ error: '방이 가득 찼습니다.' }, 400)
      }

      // 이미 입장 중이면 스킵
      const { data: existing } = await admin
        .from('room_members')
        .select('id')
        .eq('room_id', room_id)
        .eq('user_id', caller.id)
        .maybeSingle()

      if (!existing) {
        await admin.from('room_members').insert({ room_id, user_id: caller.id })
        await admin.from('room_messages').insert({
          room_id,
          user_id: null,
          content: `${callerName}님이 입장했습니다.`,
          type: 'system',
        })
      }

      return json({ ok: true })
    }

    // ──────────────── LEAVE ───────────────────────────────────
    if (action === 'leave') {
      await admin
        .from('room_members')
        .delete()
        .eq('room_id', room_id)
        .eq('user_id', caller.id)

      await admin.from('room_messages').insert({
        room_id,
        user_id: null,
        content: `${callerName}님이 퇴장했습니다.`,
        type: 'system',
      })

      return json({ ok: true })
    }

    // ──────────────── KICK ────────────────────────────────────
    if (action === 'kick') {
      if (!target_user_id) return json({ error: 'target_user_id 필요' }, 400)

      // 대상 프로필
      const { data: targetProfile } = await admin
        .from('profiles')
        .select('name, role')
        .eq('id', target_user_id)
        .single()

      const targetIsAdmin = targetProfile?.role === 'admin'
      const targetName = targetProfile?.name ?? '알 수 없음'

      // 관리자는 추방 불가
      if (targetIsAdmin) return json({ error: '관리자는 추방할 수 없습니다.' }, 403)

      // 권한 확인: 방장 또는 관리자만 추방 가능
      const { data: room } = await admin
        .from('rooms')
        .select('created_by')
        .eq('id', room_id)
        .single()

      const callerIsOwner = room?.created_by === caller.id

      if (!callerIsAdmin && !callerIsOwner) {
        return json({ error: '추방 권한이 없습니다.' }, 403)
      }

      await admin
        .from('room_members')
        .delete()
        .eq('room_id', room_id)
        .eq('user_id', target_user_id)

      await admin.from('room_messages').insert({
        room_id,
        user_id: null,
        content: `${targetName}님이 추방되었습니다.`,
        type: 'system',
      })

      return json({ ok: true, kicked_user_id: target_user_id })
    }

    return json({ error: '알 수 없는 action' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
