// Supabase service role로 pg_net extension을 통해 SQL 실행
const SR = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2FsYm5laHJteGp4emxmdGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU4OTg1NiwiZXhwIjoyMDkwMTY1ODU2fQ.EI_TLZLqBVl6neIK7f6OUyF132AhdnzwcH8H33zvd_8';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2FsYm5laHJteGp4emxmdGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODk4NTYsImV4cCI6MjA5MDE2NTg1Nn0.F2KtRznr-epHQyVmk64BJSiwsbA_C8HrtvdfQ4EkByg';
const URL = 'https://qbkalbnehrmxjxzlftlu.supabase.co';

async function rpc(fnName, params = {}) {
  const r = await fetch(`${URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: { 'apikey': SR, 'Authorization': `Bearer ${SR}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return r.json();
}

async function main() {
  // Supabase의 realtime_publication 확인용 rpc 시도
  console.log('=== Realtime 설정 확인 ===');

  // 현재 publication에 있는 테이블 확인
  const check = await rpc('exec_sql_check');
  console.log('check:', JSON.stringify(check));

  // 다른 방법: supabase/realtime broadcast 직접 테스트
  const testSub = await fetch(`${URL}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      'apikey': SR, 'Authorization': `Bearer ${SR}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages: [{ topic: 'test', event: 'test', payload: {} }] }),
  });
  console.log('broadcast status:', testSub.status, await testSub.text().then(t => t.substring(0, 100)));
}

main().catch(console.error);
