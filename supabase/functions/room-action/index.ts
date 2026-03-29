import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ ok: false, error: 'Unauthorized' })

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authErr || !caller) return json({ ok: false, error: 'Unauthorized' })

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('name, role, is_banned')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.is_banned) return json({ ok: false, error: '이용이 제한된 계정입니다.' })

    const callerIsAdmin = callerProfile?.role === 'admin'
    const callerName = callerProfile?.name ?? '알 수 없음'

    const { action, room_id, target_user_id } = await req.json()

    // ──────────────── JOIN ────────────────────────────────────
    if (action === 'join') {
      const { data: room } = await admin
        .from('rooms')
        .select('id, max_members')
        .eq('id', room_id)
        .single()

      if (!room) return json({ ok: false, error: '방이 존재하지 않습니다.' })

      if (!callerIsAdmin) {
        const { data: memberList } = await admin
          .from('room_members')
          .select('user_id, profiles!inner(role)')
          .eq('room_id', room_id)

        const nonAdminCount = (memberList ?? []).filter(
          (m: { profiles: { role: string } }) => m.profiles?.role !== 'admin'
        ).length

        if (nonAdminCount >= room.max_members) {
          return json({ ok: false, error: '방이 가득 찼습니다.' })
        }
      }

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
      const { data: roomData } = await admin
        .from('rooms')
        .select('created_by')
        .eq('id', room_id)
        .single()

      const isOwnerLeaving = roomData?.created_by === caller.id

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

      const { count: remaining } = await admin
        .from('room_members')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room_id)

      if ((remaining ?? 0) === 0) {
        await admin.from('rooms').delete().eq('id', room_id)
        return json({ ok: true, deleted: true })
      }

      // 방장이 나간 경우 자동 위임 (가장 먼저 입장한 멤버에게)
      if (isOwnerLeaving) {
        const { data: nextMember } = await admin
          .from('room_members')
          .select('user_id')
          .eq('room_id', room_id)
          .order('joined_at', { ascending: true })
          .limit(1)
          .single()

        if (nextMember) {
          await admin.from('rooms').update({ created_by: nextMember.user_id }).eq('id', room_id)
          const { data: newOwnerProfile } = await admin
            .from('profiles').select('name').eq('id', nextMember.user_id).single()
          await admin.from('room_messages').insert({
            room_id,
            user_id: null,
            content: `${newOwnerProfile?.name ?? '멤버'}님이 새 방장이 되었습니다.`,
            type: 'system',
          })
        }
      }

      return json({ ok: true })
    }

    // ──────────────── TRANSFER (방장 위임) ─────────────────────
    if (action === 'transfer') {
      if (!target_user_id) return json({ ok: false, error: 'target_user_id 필요' })

      const { data: roomData } = await admin
        .from('rooms').select('created_by').eq('id', room_id).single()

      const callerIsOwner = roomData?.created_by === caller.id
      if (!callerIsOwner && !callerIsAdmin) return json({ ok: false, error: '방장만 위임할 수 있습니다.' })

      const { data: targetMember } = await admin
        .from('room_members').select('user_id')
        .eq('room_id', room_id).eq('user_id', target_user_id).maybeSingle()

      if (!targetMember) return json({ ok: false, error: '해당 유저가 방에 없습니다.' })

      const { data: targetProfile } = await admin
        .from('profiles').select('name, role').eq('id', target_user_id).single()

      if (targetProfile?.role === 'admin') return json({ ok: false, error: '관리자에게는 위임할 수 없습니다.' })

      await admin.from('rooms').update({ created_by: target_user_id }).eq('id', room_id)

      await admin.from('room_messages').insert({
        room_id,
        user_id: null,
        content: `${callerName}님이 ${targetProfile?.name ?? '멤버'}님에게 방장을 위임했습니다.`,
        type: 'system',
      })

      return json({ ok: true })
    }

    // ──────────────── KICK ────────────────────────────────────
    if (action === 'kick') {
      if (!target_user_id) return json({ ok: false, error: 'target_user_id 필요' })

      const { data: targetProfile } = await admin
        .from('profiles').select('name, role').eq('id', target_user_id).single()

      if (targetProfile?.role === 'admin') return json({ ok: false, error: '관리자는 추방할 수 없습니다.' })

      const { data: roomData } = await admin
        .from('rooms').select('created_by').eq('id', room_id).single()

      const callerIsOwner = roomData?.created_by === caller.id
      if (!callerIsAdmin && !callerIsOwner) return json({ ok: false, error: '추방 권한이 없습니다.' })

      await admin
        .from('room_members').delete()
        .eq('room_id', room_id).eq('user_id', target_user_id)

      await admin.from('room_messages').insert({
        room_id,
        user_id: null,
        content: `${targetProfile?.name ?? '멤버'}님이 추방되었습니다.`,
        type: 'system',
      })

      return json({ ok: true, kicked_user_id: target_user_id })
    }

    return json({ ok: false, error: '알 수 없는 action' })
  } catch (e) {
    return json({ ok: false, error: (e as Error).message })
  }
})
