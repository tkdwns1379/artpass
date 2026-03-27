const Nedb = require('@seald-io/nedb');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = {
  users: new Nedb({ filename: path.join(dataDir, 'users.db'), autoload: true }),
  universities: new Nedb({ filename: path.join(dataDir, 'universities.db'), autoload: true }),
  messages: new Nedb({ filename: path.join(dataDir, 'messages.db'), autoload: true }),
};

db.users.ensureIndex({ fieldName: 'email', unique: true });

function norm(doc) {
  if (!doc) return null;
  const { _id, password_hash, ...rest } = doc;
  return { id: _id, ...rest };
}

function normAll(docs) {
  return docs.map(norm);
}

// 기본 관리자 계정 생성
db.users.findOneAsync({ email: 'admin@artpass.kr' }).then(doc => {
  if (!doc) {
    const hash = bcrypt.hashSync('artpass1234', 10);
    db.users.insertAsync({
      name: '관리자',
      email: 'admin@artpass.kr',
      password_hash: hash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
    console.log('기본 관리자 계정 생성: admin@artpass.kr / artpass1234');
  }
});

// 대학 데이터 시딩 (신규 항목 자동 추가)
async function seedUniversities() {
  const allSeed = [
    ...require('./seedData'),
    ...require('./seedDataExtra'),
  ];
  const existing = await db.universities.findAsync({});
  const existingKeys = new Set(existing.map(d => `${d.name}||${d.department}`));
  const toInsert = allSeed.filter(d => !existingKeys.has(`${d.name}||${d.department}`));
  if (toInsert.length > 0) {
    await db.universities.insertAsync(toInsert);
    console.log(`대학 데이터 ${toInsert.length}개 추가 완료 (총 ${existing.length + toInsert.length}개)`);
  } else {
    console.log(`대학 데이터 최신 상태 (총 ${existing.length}개)`);
  }
}
seedUniversities();

module.exports = { db, norm, normAll };
