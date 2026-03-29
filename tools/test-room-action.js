const SUPABASE_URL = 'https://qbkalbnehrmxjxzlftlu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2FsYm5laHJteGp4emxmdGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODk4NTYsImV4cCI6MjA5MDE2NTg1Nn0.F2KtRznr-epHQyVmk64BJSiwsbA_C8HrtvdfQ4EkByg';
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2FsYm5laHJteGp4emxmdGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU4OTg1NiwiZXhwIjoyMDkwMTY1ODU2fQ.EI_TLZLqBVl6neIK7f6OUyF132AhdnzwcH8H33zvd_8';

async function main() {
  console.log('=== 1. 로그인 ===');
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'best_2017@naver.com', password: 'artpass1234' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.access_token) {
    console.error('로그인 실패:', loginData);
    return;
  }
  const JWT = loginData.access_token;
  console.log('로그인 성공. JWT prefix:', JWT.substring(0, 30) + '...');

  console.log('\n=== 2. 방 생성 ===');
  const roomRes = await fetch(`${SUPABASE_URL}/rest/v1/rooms`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
    },
    body: JSON.stringify({ name: 'test-room', created_by: loginData.user.id, tags: [], max_members: 5 }),
  });
  const roomData = await roomRes.json();
  console.log('방 생성:', JSON.stringify(roomData));
  const roomId = Array.isArray(roomData) ? roomData[0]?.id : roomData?.id;
  if (!roomId) { console.error('방 생성 실패'); return; }

  console.log('\n=== 3. JOIN 테스트 ===');
  const joinRes = await fetch(`${SUPABASE_URL}/functions/v1/room-action`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY, 'Authorization': `Bearer ${JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'join', room_id: roomId }),
  });
  const joinData = await joinRes.json();
  console.log('JOIN 결과:', JSON.stringify(joinData));

  console.log('\n=== 4. room_members 확인 ===');
  const membersRes = await fetch(`${SUPABASE_URL}/rest/v1/room_members?room_id=eq.${roomId}`, {
    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` },
  });
  const members = await membersRes.json();
  console.log('멤버 목록:', JSON.stringify(members));

  console.log('\n=== 5. 메시지 전송 테스트 ===');
  const msgRes = await fetch(`${SUPABASE_URL}/rest/v1/room_messages`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY, 'Authorization': `Bearer ${JWT}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
    },
    body: JSON.stringify({ room_id: roomId, user_id: loginData.user.id, content: '테스트 메시지', type: 'message' }),
  });
  const msgData = await msgRes.json();
  console.log('메시지 전송:', JSON.stringify(msgData));

  console.log('\n=== 6. LEAVE 테스트 ===');
  const leaveRes = await fetch(`${SUPABASE_URL}/functions/v1/room-action`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY, 'Authorization': `Bearer ${JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'leave', room_id: roomId }),
  });
  const leaveData = await leaveRes.json();
  console.log('LEAVE 결과:', JSON.stringify(leaveData));

  console.log('\n=== 7. 방 삭제 확인 (0명이면 삭제됐어야 함) ===');
  const roomCheckRes = await fetch(`${SUPABASE_URL}/rest/v1/rooms?id=eq.${roomId}`, {
    headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` },
  });
  const roomCheck = await roomCheckRes.json();
  console.log('방 존재 여부:', roomCheck.length > 0 ? '존재 (삭제 안됨)' : '삭제됨 ✓');
}

main().catch(console.error);
