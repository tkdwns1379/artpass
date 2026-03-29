/**
 * parsed/*.json → Supabase 직접 임포트 스크립트
 * 사용법: node import-parsed-to-supabase.js
 */

require('dotenv').config({ path: __dirname + '/.env' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ .env에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const PARSED_DIR = path.join(__dirname, 'parsed');

function mapDoc(doc) {
  return {
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

async function main() {
  // 기존 DB 데이터 조회 (중복 방지)
  const { data: existing, error: fetchErr } = await supabase
    .from('universities')
    .select('name, department');

  if (fetchErr) {
    console.error('❌ Supabase 조회 실패:', fetchErr.message);
    process.exit(1);
  }

  const existingSet = new Set(existing.map(u => `${u.name}||${u.department}`));
  console.log(`ℹ️  Supabase 기존 데이터: ${existing.length}개\n`);

  const jsonFiles = fs.readdirSync(PARSED_DIR).filter(f => f.endsWith('.json'));
  console.log(`📂 파싱된 JSON: ${jsonFiles.length}개\n`);

  let totalAdded = 0, totalSkipped = 0, totalErrors = 0;

  for (const file of jsonFiles) {
    const uniName = file.replace('_2026.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(PARSED_DIR, file), 'utf-8'));
    const toInsert = data
      .map(mapDoc)
      .filter(d => !existingSet.has(`${d.name}||${d.department}`));

    if (toInsert.length === 0) {
      console.log(`⏭️  ${uniName}: 모두 기존 데이터`);
      totalSkipped += data.length;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from('universities')
      .insert(toInsert)
      .select('id');

    if (error) {
      console.error(`❌ ${uniName}: ${error.message}`);
      totalErrors += toInsert.length;
    } else {
      const count = inserted?.length ?? toInsert.length;
      console.log(`✅ ${uniName}: ${count}개 추가`);
      toInsert.forEach(d => existingSet.add(`${d.name}||${d.department}`));
      totalAdded += count;
    }
    totalSkipped += data.length - toInsert.length;
  }

  console.log('\n========================================');
  console.log(`추가: ${totalAdded}개 | 중복 건너뜀: ${totalSkipped}개 | 오류: ${totalErrors}개`);
  console.log('========================================');
}

main().catch(console.error);
