const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { db } = require('../db/database');

// 내 메시지 목록 조회 (회원: 본인 대화, 관리자: userId 파라미터로 특정 유저 대화)
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.role === 'admin'
      ? req.query.userId
      : req.user.id;

    if (!userId) return res.json([]);

    const messages = await db.messages.findAsync({ userId }).sort({ createdAt: 1 });
    res.json(messages.map(m => ({ ...m, id: m._id })));
  } catch (e) {
    res.status(500).json({ message: '메시지 조회 실패' });
  }
});

// 대화 목록 조회 (관리자 전용: 유저별 마지막 메시지)
router.get('/conversations', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: '권한 없음' });
  try {
    const all = await db.messages.findAsync({}).sort({ createdAt: -1 });
    const map = new Map();
    for (const m of all) {
      if (!map.has(m.userId)) map.set(m.userId, m);
    }
    const conversations = Array.from(map.values());

    // 유저 정보 붙이기
    const userIds = conversations.map(c => c.userId);
    const users = await db.users.findAsync({ _id: { $in: userIds } });
    const userMap = Object.fromEntries(users.map(u => [u._id, u]));

    const result = conversations.map(c => {
      const u = userMap[c.userId];
      const unread = all.filter(m => m.userId === c.userId && m.senderRole === 'user' && !m.readByAdmin).length;
      return {
        userId: c.userId,
        userName: u?.name || '알 수 없음',
        userEmail: u?.email || '',
        lastMessage: c.content,
        lastAt: c.createdAt,
        unread,
      };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ message: '대화 목록 조회 실패' });
  }
});

// 메시지 전송
router.post('/', auth, async (req, res) => {
  try {
    const { content, userId: targetUserId } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: '내용을 입력하세요.' });

    const isAdmin = req.user.role === 'admin';
    const userId = isAdmin ? targetUserId : req.user.id;
    if (!userId) return res.status(400).json({ message: 'userId 필요' });

    const msg = await db.messages.insertAsync({
      userId,
      senderRole: isAdmin ? 'admin' : 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      readByAdmin: isAdmin,
      readByUser: !isAdmin,
    });

    res.json({ ...msg, id: msg._id });
  } catch (e) {
    res.status(500).json({ message: '메시지 전송 실패' });
  }
});

// 읽음 처리
router.patch('/read', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const userId = isAdmin ? req.body.userId : req.user.id;
    const query = isAdmin
      ? { userId, senderRole: 'user', readByAdmin: false }
      : { userId, senderRole: 'admin', readByUser: false };
    const update = isAdmin ? { $set: { readByAdmin: true } } : { $set: { readByUser: true } };
    await db.messages.updateAsync(query, update, { multi: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: '읽음 처리 실패' });
  }
});

module.exports = router;
