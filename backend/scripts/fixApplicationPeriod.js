const Nedb = require('@seald-io/nedb');
const path = require('path');

const db = new Nedb({
  filename: path.join(__dirname, '../data/universities.db'),
  autoload: true,
});

async function fix() {
  const docs = await db.findAsync({});
  let count = 0;

  for (const doc of docs) {
    const p = doc.applicationPeriod || '';
    if (p.includes('2024') || p.includes('2025')) {
      await db.updateAsync(
        { _id: doc._id },
        { $set: { applicationPeriod: '2026학년도 일정 미정 (입학처 확인 필요)' } },
        {}
      );
      count++;
    }
  }

  await db.compactDatafileAsync();
  console.log(`수정 완료: ${count}개`);
  process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
