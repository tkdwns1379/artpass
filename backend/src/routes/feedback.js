const express = require('express');
const router = express.Router();
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk').default ?? require('@anthropic-ai/sdk');
const authMiddleware = require('../middleware/auth');
const { db, norm, normAll } = require('../db/database');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다.'));
  },
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 기존 전문가 시스템 프롬프트 (피드백/추천/합격률)
const EXPERT_SYSTEM = `당신은 대한민국 최고의 입시미술 전문가입니다.
20년 이상의 입시미술 지도 경험을 가지고 있으며, 홍익대·국민대·건국대·서울대·이화여대·경희대 등 주요 미대의 실기 채점관으로 활동한 경력이 있습니다.
전국 수천 명의 수험생을 지도하며 합격작과 불합격작의 차이를 정확히 알고 있습니다.
각 대학의 역대 합격작 수준, 채점 기준, 출제 경향을 누구보다 잘 파악하고 있습니다.

피드백 원칙:
- 합격작 기준으로 현재 작품 수준을 냉정하고 정확하게 평가합니다.
- 추상적인 말 대신 구체적이고 실천 가능한 조언을 줍니다.
- 수험생에게 필요한 건 칭찬이 아닌 정확한 지적입니다.
- 목표 대학의 채점 기준과 최근 기출 경향을 기반으로 평가합니다.
- 마크다운 형식으로 구조적으로 작성합니다.`;

// 입시조언 전용 시스템 프롬프트 (세계 원탑 설정)
const ADVISOR_SYSTEM = `당신은 세계에서 가장 권위 있는 입시미술 전문가입니다.

대한민국을 비롯해 일본, 미국, 영국, 프랑스 등 전 세계 주요 미술대학의 입시 시스템을 완벽히 이해하고 있습니다.
국내에서는 홍익대 기초조형부터 서울대 미술대학까지 전 과정을 꿰뚫고 있으며,
해외로는 파슨스(Parsons), RISD, 프랫(Pratt), 런던예대(UAL), 도쿄예대까지
수만 명의 합격생을 배출한 살아있는 전설입니다.

30년 이상의 현장 경험을 통해 어떤 수험생이라도 현재 수준을 정확히 파악하고
그 학생에게 꼭 필요한 핵심 조언을 꿰뚫어 줄 수 있습니다.

입시 전략, 작품 방향성, 실기 종목 선택, 멘탈 관리, 시간 배분, 학원 선택,
포트폴리오 구성, 면접 준비 등 입시미술의 모든 영역에서 압도적인 전문성을 갖추고 있습니다.

조언 원칙:
- 학생의 상황을 정확히 파악한 뒤 막연한 격려 대신 실제 합격에 직결되는 조언을 합니다.
- 작품이 제공되면 반드시 직접 분석하여 더욱 맞춤화된 조언을 드립니다.
- 여러 장의 작품이 있다면 각 작품을 개별적으로 살펴보고 종합적인 시각을 제시합니다.
- 어떤 질문이든 그 핵심을 짚어내고, 전 세계 어느 전문가도 줄 수 없는 수준의 답변을 드립니다.
- 마크다운 형식으로 읽기 쉽게 구조적으로 작성합니다.`;

// 이미지 content 블록 생성 (다중 이미지)
function buildImageBlocks(files) {
  return files.map((f, i) => ({
    type: 'image',
    source: { type: 'base64', media_type: f.mimetype, data: f.buffer.toString('base64') },
  }));
}

// 다중 이미지 안내 텍스트
function imageCountNote(n) {
  if (n === 1) return '첨부된 실기 작품 1장을 분석합니다.';
  return `첨부된 실기 작품 ${n}장을 분석합니다. 각 작품별로 개별 분석 후 종합 평가를 해주세요.`;
}

// 대학별 채점 기준 컨텍스트
function buildUniversityContext(uni) {
  if (!uni) return '';
  const lines = [
    `■ 목표 대학: ${uni.name} - ${uni.department}`,
    `■ 지역: ${uni.region || ''}`,
  ];
  if (uni.recruitCount) lines.push(`■ 모집인원: ${uni.recruitCount}`);
  if (uni.competitionRate) lines.push(`■ 경쟁률: ${uni.competitionRate}`);

  if (uni.hasPractice === false) {
    lines.push('■ 전형: 실기 없음 (포트폴리오+면접)');
    if (uni.practiceGuide?.overview) lines.push(`■ 전형 개요: ${uni.practiceGuide.overview}`);
    if (uni.practiceGuide?.scoring?.length) {
      lines.push('■ 평가 기준:');
      uni.practiceGuide.scoring.forEach(s => lines.push(`  • ${s.item}: ${s.detail}`));
    }
    if (uni.practiceGuide?.trends?.length) {
      lines.push('■ 최근 면접 기출:');
      uni.practiceGuide.trends.forEach(t => lines.push(`  ${t.year}: ${t.topic}`));
    }
    if (uni.practiceGuide?.strategy?.length) {
      lines.push('■ 합격 전략:');
      uni.practiceGuide.strategy.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    }
    if (uni.practiceGuide?.cautions?.length) {
      lines.push('■ 주의사항:');
      uni.practiceGuide.cautions.forEach(c => lines.push(`  ⚠ ${c}`));
    }
  } else {
    if (uni.practiceSubjects?.length) lines.push(`■ 실기 종목: ${uni.practiceSubjects.join(', ')}`);
    if (uni.practiceGuide?.examInfo) {
      const e = uni.practiceGuide.examInfo;
      lines.push(`■ 시험 정보: 시간 ${e.time} | 용지 ${e.paper} | 재료 ${e.materials}`);
    }
    if (uni.practiceGuide?.overview) lines.push(`■ 시험 특징: ${uni.practiceGuide.overview}`);
    if (uni.practiceGuide?.scoring?.length) {
      lines.push('■ 채점 기준:');
      uni.practiceGuide.scoring.forEach(s => lines.push(`  • ${s.item}: ${s.detail}`));
    }
    if (uni.practiceGuide?.trends?.length) {
      lines.push('■ 최근 기출 경향:');
      uni.practiceGuide.trends.forEach(t => lines.push(`  ${t.year}: ${t.topic}`));
    }
    if (uni.practiceGuide?.cautions?.length) {
      lines.push('■ 주의사항:');
      uni.practiceGuide.cautions.forEach(c => lines.push(`  ⚠ ${c}`));
    }
    if (uni.practiceGuide?.strategy?.length) {
      lines.push('■ 합격 전략:');
      uni.practiceGuide.strategy.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    }
  }
  if (uni.suneungRatio) lines.push(`■ 수능 반영: ${uni.suneungRatio}`);
  if (uni.practiceRatio) lines.push(`■ 실기 반영: ${uni.practiceRatio}`);
  if (uni.note) lines.push(`■ 참고: ${uni.note}`);
  return lines.join('\n');
}

function buildUniversitiesSummary(unis) {
  return unis.map(u => {
    const practiceInfo = u.hasPractice === false
      ? '실기없음(포트폴리오+면접)'
      : (u.practiceSubjects?.join('·') || '실기');
    const scoring = u.practiceGuide?.scoring?.map(s => s.item).join('·') || '';
    const competition = u.competitionRate ? `경쟁률 ${u.competitionRate}` : '';
    return `[${u.region}] ${u.name} - ${u.department} | ${practiceInfo} | 평가: ${scoring} | ${competition}`;
  }).join('\n');
}

// 프리미엄 전용 미들웨어
async function premiumOnly(req, res, next) {
  const doc = await db.users.findOneAsync({ _id: req.user.id });
  if (!doc?.isPremium && doc?.role !== 'admin') {
    return res.status(403).json({ message: '프리미엄 회원만 이용할 수 있는 기능입니다.' });
  }
  next();
}

// POST /api/feedback - 실기 피드백 (최대 4장)
router.post('/', authMiddleware, premiumOnly, upload.array('images', 4), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ message: '이미지를 업로드해주세요.' });

    const { universityId, additionalNote } = req.body;
    let uniContext = '';
    if (universityId) {
      const uniDoc = await db.universities.findOneAsync({ _id: universityId });
      if (uniDoc) uniContext = buildUniversityContext(norm(uniDoc));
    }

    const imageBlocks = buildImageBlocks(files);
    const n = files.length;

    const perImageInstruction = n > 1
      ? `\n\n${n}장의 작품이 제공되었습니다. 각 작품에 대해 아래 형식으로 순서대로 분석해주세요:\n\n` +
        Array.from({ length: n }, (_, i) =>
          `## 작품 ${i + 1} 분석\n### 종합 평가\n### 강점\n### 개선 필요 사항\n### 실천 조언`
        ).join('\n\n') +
        `\n\n---\n## 종합 평가 및 최우선 과제\n(${n}장을 전체적으로 보고 현재 수준과 가장 중요한 과제 1~2가지)`
      : `\n\n다음 항목으로 피드백을 구성해주세요:\n\n## 종합 평가\n## 강점\n## 개선 필요 사항\n## 목표 대학 기준 분석\n## 실천 조언`;

    const userPrompt = [
      universityId && uniContext
        ? `아래 대학 기준으로 이 실기 작품을 평가해주세요.\n\n${uniContext}`
        : '이 입시미술 실기 작품을 전반적으로 평가해주세요.',
      additionalNote ? `\n\n수험생 메모: ${additionalNote}` : '',
      perImageInstruction,
    ].join('');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: EXPERT_SYSTEM,
      messages: [{
        role: 'user',
        content: [...imageBlocks, { type: 'text', text: userPrompt }],
      }],
    });

    res.json({ feedback: response.content[0].text });
  } catch (e) {
    console.error('피드백 오류:', e?.message || e);
    res.status(500).json({ message: e?.message || '피드백 생성 중 오류가 발생했습니다.' });
  }
});

// POST /api/feedback/recommend - 대학 추천 (최대 4장)
router.post('/recommend', authMiddleware, premiumOnly, upload.array('images', 4), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ message: '이미지를 업로드해주세요.' });

    const { additionalNote } = req.body;
    const allDocs = await db.universities.findAsync({});
    const uniSummary = buildUniversitiesSummary(normAll(allDocs));
    const imageBlocks = buildImageBlocks(files);
    const n = files.length;

    const userPrompt = `${n > 1 ? `${n}장의 실기 작품이 제공되었습니다. 전체 작품을 종합적으로 분석하여` : '이 실기 작품을 보고,'} 아래 대학 목록 중 이 학생에게 가장 잘 맞는 대학을 추천해주세요.

[전국 미대 목록]
${uniSummary}

${additionalNote ? `수험생 추가 정보: ${additionalNote}\n\n` : ''}${n > 1 ? '작품들의 전반적인 스타일·완성도·강점·약점을 종합 분석하고 ' : '작품의 스타일·완성도·강점·약점을 분석하고 '}다음 형식으로 답해주세요:

## 작품 분석 요약
(스타일, 강점, 현재 수준 한 줄 요약)

## 추천 대학 TOP 5

### 1위: [대학명] - [학과]
**추천 이유:** (이 대학 전형 특성과 작품 스타일이 맞는 이유)
**준비 포인트:** (합격을 위해 보완해야 할 부분)

### 2위 ~ 5위 동일 형식

## 전반적인 조언
(현재 수준에서 가장 효율적인 입시 전략)`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: EXPERT_SYSTEM,
      messages: [{
        role: 'user',
        content: [...imageBlocks, { type: 'text', text: userPrompt }],
      }],
    });

    res.json({ recommendation: response.content[0].text });
  } catch (e) {
    console.error('대학 추천 오류:', e?.message || e);
    res.status(500).json({ message: e?.message || '대학 추천 중 오류가 발생했습니다.' });
  }
});

// POST /api/feedback/acceptance - 합격률 분석 (최대 4장)
router.post('/acceptance', authMiddleware, premiumOnly, upload.array('images', 4), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ message: '이미지를 업로드해주세요.' });

    const { universityId, admissionType, gradeScore, additionalNote } = req.body;
    if (!universityId) return res.status(400).json({ message: '목표 대학을 선택해주세요.' });
    if (!admissionType) return res.status(400).json({ message: '수시/정시를 선택해주세요.' });
    if (!gradeScore) return res.status(400).json({ message: '성적을 입력해주세요.' });

    const uniDoc = await db.universities.findOneAsync({ _id: universityId });
    if (!uniDoc) return res.status(404).json({ message: '대학을 찾을 수 없습니다.' });
    const uni = norm(uniDoc);
    const uniContext = buildUniversityContext(uni);
    const imageBlocks = buildImageBlocks(files);
    const n = files.length;
    const gradeLabel = admissionType === '수시' ? `내신 평균 등급: ${gradeScore}등급` : `수능: ${gradeScore}`;

    const userPrompt = `이 학생의 합격 가능성을 분석해주세요.

[지원 정보]
• 전형: ${admissionType}
• ${gradeLabel}
${additionalNote ? `• 추가 정보: ${additionalNote}` : ''}
${n > 1 ? `• 제출 작품: ${n}장 (모든 작품을 종합하여 실기 수준 판단)` : ''}

[목표 대학 정보]
${uniContext}

[분석 방법]
1. 이 대학 ${admissionType} 전형의 반영 비율 파악
2. 제출된 성적이 합격선 대비 차이 분석
3. ${n > 1 ? `${n}장의 작품을 종합적으로 보고` : '작품의'} 실기 수준이 합격 기준에 얼마나 근접하는지 평가
4. 두 요소를 전형 반영 비율로 종합하여 합격 가능성 산정

반드시 첫 줄을 아래 형식으로 시작해주세요 (다른 내용 없이 정확히):
합격 가능성: XX%

이후 마크다운으로:

## 분석 근거

### 성적 측면
(성적이 합격선 대비 어느 수준인지 구체적으로)

### 실기/포트폴리오 측면
(작품 수준이 합격 기준 대비 어느 수준인지 구체적으로)

### 종합 판단
(전형 반영 비율 기준으로 종합한 최종 판단)

## 합격을 위한 핵심 과제
(지금 당장 가장 집중해야 할 2~3가지)`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: EXPERT_SYSTEM,
      messages: [{
        role: 'user',
        content: [...imageBlocks, { type: 'text', text: userPrompt }],
      }],
    });

    const text = response.content[0].text;
    const match = text.match(/합격 가능성:\s*(\d+)%/);
    const rate = match ? parseInt(match[1]) : null;
    const detail = text.replace(/^합격 가능성:\s*\d+%\s*\n?/m, '').trim();

    res.json({ rate, detail });
  } catch (e) {
    console.error('합격률 오류:', e?.message || e);
    res.status(500).json({ message: e?.message || '합격률 분석 중 오류가 발생했습니다.' });
  }
});

// POST /api/feedback/advice - 입시조언 (세계 원탑, 이미지 선택)
router.post('/advice', authMiddleware, premiumOnly, upload.array('images', 4), async (req, res) => {
  try {
    const { question, additionalNote } = req.body;
    if (!question?.trim()) return res.status(400).json({ message: '질문을 입력해주세요.' });

    const files = req.files || [];
    const imageBlocks = buildImageBlocks(files);
    const n = files.length;

    const imageNote = n > 0
      ? `\n\n${n > 1 ? `${n}장의 작품 이미지가 함께 제공되었습니다. 각 작품을 살펴보고 조언에 반영해주세요.` : '작품 이미지가 함께 제공되었습니다. 작품을 직접 분석하여 조언에 반영해주세요.'}`
      : '';

    const userPrompt = `[학생의 질문/상황]
${question}
${additionalNote ? `\n[추가 정보]\n${additionalNote}` : ''}${imageNote}

위 내용을 바탕으로 이 학생에게 가장 도움이 되는 입시 조언을 마크다운 형식으로 해주세요.
핵심을 짚어 구체적이고 실천 가능한 조언을 부탁드립니다.`;

    const content = n > 0
      ? [...imageBlocks, { type: 'text', text: userPrompt }]
      : [{ type: 'text', text: userPrompt }];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: ADVISOR_SYSTEM,
      messages: [{ role: 'user', content }],
    });

    res.json({ advice: response.content[0].text });
  } catch (e) {
    console.error('입시조언 오류:', e?.message || e);
    res.status(500).json({ message: e?.message || '조언 생성 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
