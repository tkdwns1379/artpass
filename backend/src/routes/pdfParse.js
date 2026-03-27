const express = require('express');
const router = express.Router();
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const authMiddleware = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('PDF 파일만 업로드 가능합니다.'));
  },
});

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

// POST /api/pdf-parse - PDF 모집요강 파싱
router.post('/', authMiddleware, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'PDF 파일을 업로드해주세요.' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ message: 'Gemini API 키가 설정되지 않았습니다.' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const pdfBase64 = req.file.buffer.toString('base64');

    const prompt = `이 PDF는 대학교 입시 모집요강입니다. 아래 JSON 형식으로 정보를 추출해주세요.
여러 학과가 있으면 각각 별도 항목으로 만들어주세요.
정보가 없는 항목은 빈 문자열("")로 두세요.

반드시 아래 JSON 배열 형식만 반환하고 다른 텍스트는 절대 포함하지 마세요:

[
  {
    "name": "대학교명 (예: 홍익대학교)",
    "department": "학과명 (예: 시각디자인학과)",
    "region": "지역 (다음 중 하나: ${REGIONS.join(', ')})",
    "admissionTypes": ["수시", "정시"] 중 해당하는 것,
    "applicationPeriod": "원서접수 기간 (예: 2025.09.08 ~ 09.12)",
    "hasPractice": true 또는 false,
    "practiceSubjects": ["실기 종목1", "실기 종목2"],
    "recruitCount": "모집인원 (예: 수시 30명 / 정시 20명)",
    "suneungRatio": "수능 반영 비율 (예: 60%)",
    "practiceRatio": "실기 반영 비율 (예: 40%)",
    "competitionRate": "경쟁률 (예: 14.15 : 1)",
    "note": "특이사항"
  }
]`;

    const result = await model.generateContent([
      { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
      prompt,
    ]);

    const text = result.response.text().trim();

    // JSON 파싱
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ message: 'PDF에서 정보를 추출하지 못했습니다.' });

    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ data: parsed });
  } catch (e) {
    console.error('PDF 파싱 오류:', e?.message || e);
    if (e?.message?.includes('API key')) {
      return res.status(500).json({ message: 'Gemini API 키가 올바르지 않습니다.' });
    }
    res.status(500).json({ message: e?.message || 'PDF 파싱 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
