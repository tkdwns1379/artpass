require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('./db/database');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/universities', require('./routes/universities'));
app.use('/api/users', require('./routes/users'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/pdf-parse', require('./routes/pdfParse'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 프론트엔드 정적 파일 서빙 (프로덕션)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ 아트패스 서버 실행 중`);
  console.log(`   내 PC:     http://localhost:${PORT}`);
  console.log(`   네트워크:  http://192.168.1.127:${PORT}\n`);
});
