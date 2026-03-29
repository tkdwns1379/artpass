/**
 * 채팅방 기능 DB 테이블 생성 스크립트
 * node setup-chat-rooms.js
 */
const axios = require('axios');

const PROJECT_REF = 'qbkalbnehrmxjxzlftlu';
const ACCESS_TOKEN = 'sbp_a8f12e78768504b7c40b153d658a2ef2c774152f';

const SQL = `
-- ── 1. 테이블 생성 ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rooms (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  created_by  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tags        text[] DEFAULT '{}',
  max_members int  DEFAULT 10 CHECK (max_members >= 1 AND max_members <= 10),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_members (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id   uuid REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id    uuid REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content    text NOT NULL,
  type       text DEFAULT 'message' CHECK (type IN ('message', 'system')),
  created_at timestamptz DEFAULT now()
);

-- ── 2. RLS 활성화 ─────────────────────────────────────────────

ALTER TABLE rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;

-- ── 3. rooms 정책 ─────────────────────────────────────────────

DROP POLICY IF EXISTS "rooms_select"  ON rooms;
DROP POLICY IF EXISTS "rooms_insert"  ON rooms;
DROP POLICY IF EXISTS "rooms_delete"  ON rooms;

CREATE POLICY "rooms_select" ON rooms FOR SELECT USING (true);

CREATE POLICY "rooms_insert" ON rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "rooms_delete" ON rooms FOR DELETE
  USING (auth.uid() = created_by OR is_admin());

-- ── 4. room_members 정책 ──────────────────────────────────────

DROP POLICY IF EXISTS "room_members_select" ON room_members;
DROP POLICY IF EXISTS "room_members_insert" ON room_members;
DROP POLICY IF EXISTS "room_members_delete" ON room_members;

CREATE POLICY "room_members_select" ON room_members FOR SELECT USING (true);

-- 본인만 스스로 입장 가능 (강제 입장 방지)
CREATE POLICY "room_members_insert" ON room_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 퇴장 OR 방장이 추방 OR 관리자가 추방
CREATE POLICY "room_members_delete" ON room_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND created_by = auth.uid())
    OR is_admin()
  );

-- ── 5. room_messages 정책 ─────────────────────────────────────

DROP POLICY IF EXISTS "room_messages_select" ON room_messages;
DROP POLICY IF EXISTS "room_messages_insert" ON room_messages;

CREATE POLICY "room_messages_select" ON room_messages FOR SELECT USING (true);

-- 본인 메시지만 insert (시스템 메시지는 Edge Function 서비스롤로)
CREATE POLICY "room_messages_insert" ON room_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ── 6. Realtime 활성화 ────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
`;

async function run() {
  console.log('🛠  채팅방 테이블 생성 중...\n');
  try {
    const res = await axios.post(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      { query: SQL },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ 완료!', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('❌ 오류:', e.response?.data || e.message);
  }
}

run();
