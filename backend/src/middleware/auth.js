const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'artpass-secret-key';

module.exports = function (req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: '인증이 만료되었습니다.' });
  }
};
