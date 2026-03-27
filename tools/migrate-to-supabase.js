/**
 * NeDB → Supabase 마이그레이션 스크립트
 *
 * 사용법:
 *   1. C:\design-admission\tools\.env 파일에 환경변수 설정 (아래 .env.example 참고)
 *   2. cd C:\design-admission\tools
 *   3. npm install @supabase/supabase-js dotenv @seald-io/nedb
 *   4. node migrate-to-supabase.js
 */

require('dotenv').config({ path: __dirname + '/.env' });

const { createClient } = require('@supabase/supabase-js');
const Nedb = require('@seald-io/nedb');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 설정해주세요.');
  console.error('   tools/.env 파일을 생성하고 값을 입력하세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// NeDB 경로: backend/data/universities.db
const DB_PATH = path.join(__dirname, '../backend/data/universities.db');

const db = new Nedb({ filename: DB_PATH, autoload: true });

// camelCase → snake_case 필드 매핑
function mapUniversity(doc) {
  return {
    // NeDB _id는 uuid 형식이 아님 → Supabase에서 자동 uuid 생성 (id 제외)
    name: doc.name,
    department: doc.department,
    region: doc.region || null,
    admission_types: doc.admissionTypes || [],
    application_period: doc.applicationPeriod || null,
    has_practice: doc.hasPractice ?? true,
    practice_subjects: doc.practiceSubjects || [],
    recruit_count: doc.recruitCount || null,
    suneung_ratio: doc.suneungRatio || null,
    practice_ratio: doc.practiceRatio || null,
    competition_rate: doc.competitionRate || null,
    note: doc.note || null,
    tips: doc.tips || null,
    practice_guide: doc.practiceGuide || null,
    preparation_guide: doc.preparationGuide || null,
    application_tips: doc.applicationTips || null,
  };
}

async function migrate() {
  console.log('📦 NeDB에서 universities 데이터 읽는 중...');

  const docs = await new Promise((resolve, reject) => {
    db.find({}, (err, docs) => {
      if (err) reject(err);
      else resolve(docs);
    });
  });

  console.log(`✅ NeDB에서 ${docs.length}개 레코드 로드 완료`);

  if (docs.length === 0) {
    console.log('데이터가 없습니다. 마이그레이션 종료.');
    return;
  }

  const mapped = docs.map(mapUniversity);

  // 기존 Supabase 데이터 확인
  const { count } = await supabase
    .from('universities')
    .select('*', { count: 'exact', head: true });

  console.log(`ℹ️  Supabase에 현재 ${count ?? 0}개 레코드 존재`);

  // 배치 단위로 INSERT (50개씩)
  const BATCH_SIZE = 50;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('universities')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`❌ 배치 ${Math.floor(i / BATCH_SIZE) + 1} 오류:`, error.message);
      failed += batch.length;
    } else {
      inserted += data?.length ?? batch.length;
      console.log(`  → 배치 ${Math.floor(i / BATCH_SIZE) + 1}: ${data?.length ?? batch.length}개 삽입 완료`);
    }
  }

  console.log('\n=============================');
  console.log(`✅ 마이그레이션 완료`);
  console.log(`   성공: ${inserted}개`);
  console.log(`   실패: ${failed}개`);
  console.log('=============================\n');

  if (failed > 0) {
    console.log('⚠️  일부 레코드가 실패했습니다. 위 오류 메시지를 확인하세요.');
  }
}

migrate().catch(err => {
  console.error('마이그레이션 중 오류 발생:', err);
  process.exit(1);
});
