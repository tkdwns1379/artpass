const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, norm } = require('../db/database');
const { sendVerificationCode, verifyCode } = require('../services/email');

const JWT_SECRET = process.env.JWT_SECRET || 'artpass-secret-key';

// 인증번호 발송
router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: '이메일을 입력해주세요.' });

    const existing = await db.users.findOneAsync({ email });
    if (existing) return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });

    await sendVerificationCode(email);
    res.json({ message: '인증번호가 발송되었습니다.' });
  } catch (e) {
    res.status(500).json({ message: '이메일 발송에 실패했습니다.' });
  }
});

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, verificationCode } = req.body;
    if (!name || !email || !password || !verificationCode) {
      return res.status(400).json({ message: '모든 항목을 입력해주세요.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const result = verifyCode(email, verificationCode);
    if (!result.ok) return res.status(400).json({ message: result.message });

    const existing = await db.users.findOneAsync({ email });
    if (existing) {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const doc = await db.users.insertAsync({
      name,
      email,
      password_hash,
      createdAt: new Date().toISOString(),
    });

    const user = norm(doc);
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (e) {
    if (e.errorType === 'uniqueViolated') {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }
    res.status(500).json({ message: e.message });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
    }

    const doc = await db.users.findOneAsync({ email });
    if (!doc) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const valid = await bcrypt.compare(password, doc.password_hash);
    if (!valid) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = norm(doc);
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 내 정보 조회
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const doc = await db.users.findOneAsync({ _id: req.user.id });
    if (!doc) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    res.json(norm(doc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// 비밀번호 변경
router.put('/password', require('../middleware/auth'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: '새 비밀번호는 6자 이상이어야 합니다.' });
    }
    const doc = await db.users.findOneAsync({ _id: req.user.id });
    if (!doc) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });

    const valid = await bcrypt.compare(currentPassword, doc.password_hash);
    if (!valid) return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' });

    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.users.updateAsync({ _id: req.user.id }, { $set: { password_hash } });
    res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
