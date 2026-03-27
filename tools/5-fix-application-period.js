/**
 * 5-fix-application-period.js
 * applicationPeriod 필드 정리:
 * - 비어있거나 "미정", "추후공지", "일정 미정" 등의 값 → "확인 필요 (입학처 문의)"로 통일
 * - 실제 날짜/기간이 있는 경우는 그대로 유지
 */
const axios = require('axios');
const ARTPASS_API = process.env.ARTPASS_API || 'http://localhost:4000/api';

// "확인 필요"로 교체해야 할 패턴들
const NEED_UPDATE_PATTERNS = [
  '',              // 빈 값
  null,
  undefined,
  '미정',
  '추후 공지',
  '추후공지',
  '추후 안내',
  '추후안내',
  '일정 미정',
  '일정미정',
  '확인 필요',     // 이미 일부 정리된 경우도 통일
  '확인 필요 (입학처 문의)',  // 이미 정리된 케이스 - 스킵
  '미발표',
  '미공개',
  '발표 예정',
  '발표예정',
  'TBD',
  'tbd',
  '-',
  'N/A',
  'n/a',
];

// "이미 정리된" 값 (변경 불필요)
const ALREADY_CORRECT = '확인 필요 (입학처 문의)';

function needsUpdate(value) {
  if (value === ALREADY_CORRECT) return false;
  if (value === null || value === undefined || value === '') return true;
  const v = String(value).trim();
  if (v === '') return true;
  if (v === ALREADY_CORRECT) return false;

  // 날짜 패턴 체크 (YYYY.MM.DD, YYYY-MM-DD, YYYY년 등이 포함된 경우 유지)
  if (/\d{4}[.\-년]/.test(v)) return false;
  if (/\d{1,2}[월일]/.test(v)) return false;

  // 교체 대상 패턴
  const lowerV = v.toLowerCase();
  const badPatterns = [
    '미정', '추후', '발표 예정', '발표예정', '확인 필요', '미공개',
    '미발표', 'tbd', 'n/a', '-', '일정 미정', '일정미정', '없음',
    '해당없음', '해당 없음', '별도 안내', '별도안내', '추가 공지',
  ];
  return badPatterns.some(p => lowerV.includes(p));
}

async function main() {
  const loginRes = await axios.post(`${ARTPASS_API}/auth/login`, {
    email: 'admin@artpass.kr', password: 'artpass1234',
  });
  const token = loginRes.data.token;
  console.log('✅ 로그인 완료\n');

  const headers = { Authorization: `Bearer ${token}` };
  const res = await axios.get(`${ARTPASS_API}/universities`);
  const allUnis = res.data;
  console.log(`총 대학 목록: ${allUnis.length}개\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const uni of allUnis) {
    const current = uni.applicationPeriod;

    if (!needsUpdate(current)) {
      skipped++;
      continue;
    }

    try {
      await axios.put(`${ARTPASS_API}/universities/${uni._id || uni.id}`, {
        ...uni,
        applicationPeriod: ALREADY_CORRECT,
      }, { headers });
      console.log(`✅ 정리: ${uni.name} | ${uni.department} | 기존값: "${current}"`);
      updated++;
    } catch (e) {
      console.log(`❌ 오류: ${uni.name} | ${uni.department} - ${e.response?.data?.message || e.message}`);
      errors++;
    }

    // API 부하 방지 (100ms 딜레이)
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n========================================');
  console.log(`applicationPeriod 정리 완료`);
  console.log(`업데이트: ${updated}개 | 유지(날짜있음): ${skipped}개 | 오류: ${errors}개`);
  console.log('========================================');
}

main().catch(console.error);
