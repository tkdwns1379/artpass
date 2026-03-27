const express = require('express');
const router = express.Router();
const { db, norm, normAll } = require('../db/database');
const authMiddleware = require('../middleware/auth');

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: '관리자만 접근 가능합니다.' });
  next();
}

// 회원 목록 (관리자)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const docs = await db.users.findAsync({}).sort({ createdAt: -1 });
    res.json(normAll(docs));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 프리미엄 승인/취소 (관리자)
router.patch('/:id/premium', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { isPremium } = req.body;
    if (typeof isPremium !== 'boolean') return res.status(400).json({ message: 'isPremium(boolean) 값이 필요합니다.' });
    const n = await db.users.updateAsync({ _id: req.params.id }, { $set: { isPremium } });
    if (n === 0) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });
    res.json({ message: isPremium ? '프리미엄 승인 완료' : '프리미엄 해제 완료' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 회원 삭제/추방 (관리자)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: '자기 자신은 삭제할 수 없습니다.' });
    }
    const n = await db.users.removeAsync({ _id: req.params.id });
    if (n === 0) return res.status(404).json({ message: '회원을 찾을 수 없습니다.' });
    res.json({ message: '회원이 삭제되었습니다.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
