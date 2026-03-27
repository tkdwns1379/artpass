require('dotenv').config({ path: require('path').join(__dirname, '../../tools/.env') });
const Nedb = require('@seald-io/nedb');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const db = new Nedb({
  filename: path.join(__dirname, '../data/universities.db'),
  autoload: true,
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ① 중복 제거 - 같은 name||department 중 createdAt 최신 것만 남김
async function removeDuplicates() {
  const docs = await db.findAsync({});
  const map = {};

  for (const doc of docs) {
    const key = `${doc.name}||${doc.department}`;
    if (!map[key]) {
      map[key] = doc;
    } else {
      const existing = new Date(map[key].createdAt || 0);
      const current = new Date(doc.createdAt || 0);
      if (current > existing) {
        // 기존 것 삭제, 새 것 유지
        await db.removeAsync({ _id: map[key]._id });
        map[key] = doc;
      } else {
        // 현재 것 삭제
        await db.removeAsync({ _id: doc._id });
      }
    }
  }

  const removed = docs.length - Object.keys(map).length;
  console.log(`✅ 중복 제거 완료: ${removed}개 삭제`);
  return Object.values(map);
}

// ② 가이드 생성
async function generateGuide(uni) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `당신은 대한민국 디자인·영상·웹툰·미술 입시 분야 최고 전문가입니다.
아래 대학/학과에 대한 전문적인 입시 준비 가이드를 JSON으로 작성해주세요.
실제 합격자 수준의 구체적이고 실질적인 내용으로, 누가봐도 전문 사이트라는 인상을 줄 수 있게 작성해주세요.

대학: ${uni.name}
학과: ${uni.department}
지역: ${uni.region}
실기종목: ${(uni.practiceSubjects || []).join(', ') || '정보없음'}
수능반영: ${uni.suneungRatio || '정보없음'}
실기반영: ${uni.practiceRatio || '정보없음'}
특이사항: ${uni.note || '없음'}

반드시 JSON만 반환하세요 (다른 텍스트 없이):
{
  "tips": ["핵심 합격 팁 5가지 (구체적이고 실질적으로)"],
  "preparationGuide": "실기/포트폴리오 준비 방법을 4~6문장으로 전문적으로 작성. 실제 시험 특성, 채점 기준, 준비 기간별 전략 포함.",
  "applicationTips": "이 대학 이 학과만의 전략적 지원 조언을 3~4문장으로. 경쟁률, 커트라인 경향, 차별화 포인트 포함.",
  "practiceGuide": {
    "overview": "이 학과 실기의 핵심 특성과 평가 방향 (3문장)",
    "examInfo": {
      "time": "시험 시간 (예: 4시간)",
      "paper": "용지 규격 (예: 켄트지 3절)",
      "materials": "사용 재료"
    },
    "trends": [
      {"year": "2025", "topic": "최근 출제 경향"},
      {"year": "2024", "topic": "이전 출제 경향"}
    ],
    "scoring": [
      {"item": "평가 항목", "detail": "세부 기준"}
    ],
    "strategy": ["준비 전략 4~5가지"],
    "cautions": ["주의사항 2~3가지"]
  }
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('JSON 추출 실패');
  return JSON.parse(match[0]);
}

async function main() {
  console.log('\n========================================');
  console.log('  아트패스 데이터 정제 & 가이드 보완');
  console.log('========================================\n');

  // ① 중복 제거
  const docs = await removeDuplicates();
  await db.compactDatafileAsync();
  console.log(`남은 데이터: ${docs.length}개\n`);

  // ② 가이드 없는 항목 보완
  const noGuide = docs.filter(u => !u.preparationGuide && !u.practiceGuide);
  console.log(`가이드 없는 학과: ${noGuide.length}개\n`);

  let success = 0, fail = 0;
  for (let i = 0; i < noGuide.length; i++) {
    const uni = noGuide[i];
    console.log(`[${i + 1}/${noGuide.length}] ${uni.name} - ${uni.department}`);
    try {
      const guide = await generateGuide(uni);
      await db.updateAsync(
        { _id: uni._id },
        {
          $set: {
            tips: guide.tips,
            preparationGuide: guide.preparationGuide,
            applicationTips: guide.applicationTips,
            practiceGuide: guide.practiceGuide,
          }
        }
      );
      console.log(`  ✅ 가이드 생성 완료`);
      success++;
      await sleep(5000);
    } catch (e) {
      console.log(`  ❌ 실패: ${e.message}`);
      fail++;
      await sleep(3000);
    }
  }

  await db.compactDatafileAsync();

  console.log('\n========================================');
  console.log(`  완료! 가이드 생성: ${success}개 / 실패: ${fail}개`);
  console.log('========================================\n');
}

main().catch(console.error);
