const PAT = 'sbp_a8f12e78768504b7c40b153d658a2ef2c774152f';
const PROJECT_REF = 'qbkalbnehrmxjxzlftlu';
const SR = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2FsYm5laHJteGp4emxmdGx1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU4OTg1NiwiZXhwIjoyMDkwMTY1ODU2fQ.EI_TLZLqBVl6neIK7f6OUyF132AhdnzwcH8H33zvd_8';

async function runQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  return data;
}

async function main() {
  console.log('=== realtime publication 현재 상태 확인 ===');
  const current = await runQuery(
    "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;"
  );
  console.log('현재 등록된 테이블:', JSON.stringify(current));

  console.log('\n=== room 테이블들을 realtime publication에 추가 ===');

  // rooms 추가
  const r1 = await runQuery(
    "DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE rooms; EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
  );
  console.log('rooms:', JSON.stringify(r1));

  // room_members 추가
  const r2 = await runQuery(
    "DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE room_members; EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
  );
  console.log('room_members:', JSON.stringify(r2));

  // room_messages 추가
  const r3 = await runQuery(
    "DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE room_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
  );
  console.log('room_messages:', JSON.stringify(r3));

  console.log('\n=== 추가 후 상태 확인 ===');
  const after = await runQuery(
    "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;"
  );
  console.log('등록된 테이블:', JSON.stringify(after));
}

main().catch(console.error);
