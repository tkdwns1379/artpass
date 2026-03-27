require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DOWNLOAD_DIR = path.join(__dirname, 'downloaded');
const PARSED_DIR = path.join(__dirname, 'parsed');
const ARTPASS_API = process.env.ARTPASS_API || 'http://localhost:4000/api';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const CURRENT_YEAR = 2026;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Gemini로 PDF 파싱
async function parsePdf(filePath) {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const pdfBase64 = fs.readFileSync(filePath).toString('base64');

  const prompt = `이 PDF는 대학교 입시 모집요강입니다. 아래 JSON 형식으로 정보를 추출해주세요.
여러 학과가 있으면 각각 별도 항목으로 만들어주세요.
정보가 없는 항목은 빈 문자열("")로 두세요.

당신은 대한민국 디자인·영상·웹툰 입시 분야 최고 전문가입니다.
tips, preparationGuide, applicationTips 필드는 해당 학과에 맞는 실질적이고 구체적인 전문가 조언을 작성해주세요.

반드시 JSON 배열만 반환하고 다른 텍스트는 포함하지 마세요:

[
  {
    "name": "대학교명",
    "department": "학과명",
    "region": "지역 (다음 중 하나: ${REGIONS.join(', ')})",
    "admissionTypes": ["수시", "정시"] 중 해당하는 것,
    "applicationPeriod": "원서접수 기간 (이번년도 ${CURRENT_YEAR}년 원서접수 일정이 있으면 그것을 우선 기재)",
    "dataYear": PDF에 명시된 모집연도 숫자 (예: 2025),
    "hasPractice": true 또는 false,
    "practiceSubjects": ["실기 종목"],
    "recruitCount": "모집인원",
    "suneungRatio": "수능 반영 비율",
    "practiceRatio": "실기 반영 비율",
    "competitionRate": "경쟁률",
    "note": "특이사항",
    "tips": ["이 학과 합격을 위한 핵심 팁 3~5개 (구체적이고 실질적으로)"],
    "preparationGuide": "이 학과 실기·포트폴리오 준비 방법을 3~5문장으로 상세히 작성",
    "applicationTips": "이 대학 이 학과에 지원할 때 알아야 할 전략적 조언 2~3문장"
  }
]`;

  const result = await model.generateContent([
    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
    prompt,
  ]);

  const text = result.response.text().trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('JSON 추출 실패');
  return JSON.parse(jsonMatch[0]);
}

// 아트패스 관리자 로그인
async function login() {
  const res = await axios.post(`${ARTPASS_API}/auth/login`, {
    email: 'admin@artpass.kr',
    password: 'artpass1234',
  });
  return res.data.token;
}

// DB에 저장
async function saveToDb(data, token) {
  const results = { added: 0, errors: [] };
  for (const item of data) {
    try {
      await axios.post(`${ARTPASS_API}/universities`, item, {
        headers: { Authorization: `Bearer ${token}` },
      });
      results.added++;
    } catch (e) {
      results.errors.push(e.response?.data?.message || e.message);
    }
  }
  return results;
}

async function main() {
  if (!GEMINI_KEY) {
    console.error('❌ .env 파일에 GEMINI_API_KEY가 없습니다.');
    process.exit(1);
  }
  if (!fs.existsSync(PARSED_DIR)) fs.mkdirSync(PARSED_DIR, { recursive: true });

  // 다운로드된 PDF 목록
  const pdfFiles = fs.readdirSync(DOWNLOAD_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(DOWNLOAD_DIR, f))
    .filter(f => fs.statSync(f).size > 100 * 1024); // 100KB 미만 손상 파일 제외

  if (pdfFiles.length === 0) {
    console.log('❌ downloaded/ 폴더에 PDF가 없습니다. 먼저 node 1-find-pdfs.js 실행하세요.');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log(`  아트패스 PDF 파싱 & DB 저장`);
  console.log(`  PDF 파일 수: ${pdfFiles.length}개`);
  console.log('========================================\n');

  // 관리자 로그인
  let token;
  try {
    token = await login();
    console.log('✅ 관리자 로그인 완료\n');
  } catch (e) {
    console.error('❌ 로그인 실패:', e.response?.data?.message || e.message);
    console.log('   파싱만 진행하고 parsed/ 폴더에 JSON 저장합니다.\n');
  }

  const summary = [];

  for (let i = 0; i < pdfFiles.length; i++) {
    const filePath = pdfFiles[i];
    const fileName = path.basename(filePath);
    const jsonPath = path.join(PARSED_DIR, fileName.replace('.pdf', '.json'));
    if (fs.existsSync(jsonPath)) {
      console.log(`[${i + 1}/${pdfFiles.length}] ⏭️  건너뜀 (이미 파싱됨): ${fileName}`);
      continue;
    }
    console.log(`[${i + 1}/${pdfFiles.length}] ${fileName}`);

    try {
      console.log(`  📖 Gemini 파싱 중...`);
      const parsed = await parsePdf(filePath);
      console.log(`  📋 ${parsed.length}개 학과 추출됨`);

      // JSON 저장
      fs.writeFileSync(jsonPath, JSON.stringify(parsed, null, 2));

      // DB 저장
      if (token) {
        const result = await saveToDb(parsed, token);
        console.log(`  ✅ DB 저장: ${result.added}개 추가`);
        if (result.errors.length > 0) {
          console.log(`  ⚠️  오류 ${result.errors.length}건`);
        }
        summary.push({ file: fileName, parsed: parsed.length, saved: result.added });
      } else {
        summary.push({ file: fileName, parsed: parsed.length, saved: 0 });
      }

      // Gemini 무료 티어 rate limit 방지 (분당 15회)
      await sleep(5000);

    } catch (e) {
      console.log(`  ❌ 실패: ${e.message}`);
      summary.push({ file: fileName, error: e.message });
    }
  }

  console.log('\n========================================');
  console.log('  완료!');
  summary.forEach(s => {
    if (s.error) {
      console.log(`  ❌ ${s.file}: ${s.error}`);
    } else {
      console.log(`  ✅ ${s.file}: ${s.parsed}개 파싱, ${s.saved}개 저장`);
    }
  });
  console.log(`  파싱 결과 JSON: parsed/ 폴더 확인`);
  console.log('========================================\n');
}

main().catch(console.error);
