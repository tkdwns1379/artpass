const express = require('express');
const router = express.Router();
const { db, norm, normAll } = require('../db/database');
const authMiddleware = require('../middleware/auth');

// 대학 목록 조회 (공개)
router.get('/', async (req, res) => {
  try {
    const docs = await db.universities.findAsync({}).sort({ name: 1 });
    res.json(normAll(docs));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 대학 단건 조회 (공개)
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.universities.findOneAsync({ _id: req.params.id });
    if (!doc) return res.status(404).json({ message: '데이터를 찾을 수 없습니다.' });
    res.json(norm(doc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 관리자 전용 미들웨어
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: '관리자만 접근 가능합니다.' });
  next();
}

// 대학 추가 (관리자)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const doc = await db.universities.insertAsync({
      ...req.body,
      createdAt: new Date().toISOString(),
    });
    res.status(201).json(norm(doc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 대학 수정 (관리자)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.universities.updateAsync({ _id: req.params.id }, { $set: req.body });
    const doc = await db.universities.findOneAsync({ _id: req.params.id });
    res.json(norm(doc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 대학 삭제 (관리자)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const n = await db.universities.removeAsync({ _id: req.params.id });
    if (n === 0) return res.status(404).json({ message: '데이터를 찾을 수 없습니다.' });
    res.json({ message: '삭제되었습니다.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
