const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PARSED_DIR = path.join(__dirname, 'parsed');
const ARTPASS_API = process.env.ARTPASS_API || 'http://localhost:4000/api';

async function main() {
  // 로그인
  const loginRes = await axios.post(`${ARTPASS_API}/auth/login`, {
    email: 'admin@artpass.kr', password: 'artpass1234',
  });
  const token = loginRes.data.token;
  console.log('✅ 로그인 완료\n');

  // 기존 DB 데이터 조회 (중복 방지)
  const existing = await axios.get(`${ARTPASS_API}/universities`);
  const existingSet = new Set(existing.data.map(u => `${u.name}||${u.department}`));
  console.log(`기존 DB: ${existing.data.length}개\n`);

  const jsonFiles = fs.readdirSync(PARSED_DIR).filter(f => f.endsWith('.json'));
  let added = 0, skipped = 0, errors = 0;

  for (const file of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(PARSED_DIR, file), 'utf-8'));
    const uniName = file.replace('_2026.json', '');
    let fileAdded = 0;

    for (const item of data) {
      const key = `${item.name}||${item.department}`;
      if (existingSet.has(key)) { skipped++; continue; }
      try {
        await axios.post(`${ARTPASS_API}/universities`, item, {
          headers: { Authorization: `Bearer ${token}` },
        });
        existingSet.add(key);
        added++;
        fileAdded++;
      } catch (e) {
        errors++;
      }
    }
    if (fileAdded > 0) console.log(`✅ ${uniName}: ${fileAdded}개 추가`);
  }

  console.log(`\n========================================`);
  console.log(`추가: ${added}개 | 중복 건너뜀: ${skipped}개 | 오류: ${errors}개`);
  console.log(`========================================`);
}

main().catch(console.error);
