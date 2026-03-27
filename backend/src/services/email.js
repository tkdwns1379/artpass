const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'artpass.noreply@gmail.com',
    pass: 'ugsgfdphixopgazz',
  },
});

// 인증코드 임시 저장소: { email: { code, expiresAt } }
const codeStore = new Map();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerificationCode(email) {
  const code = generateCode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5분

  codeStore.set(email, { code, expiresAt });

  await transporter.sendMail({
    from: '"아트패스" <artpass.noreply@gmail.com>',
    to: email,
    subject: '[아트패스] 이메일 인증번호',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1677ff;">아트패스 이메일 인증</h2>
        <p>아래 인증번호를 입력해주세요. <strong>5분</strong> 내에 입력해야 합니다.</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center;
                    padding: 24px; background: #f0f5ff; border-radius: 12px; color: #1677ff;">
          ${code}
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 16px;">
          본인이 요청하지 않았다면 이 메일을 무시하세요.
        </p>
      </div>
    `,
  });

  return code;
}

function verifyCode(email, inputCode) {
  const entry = codeStore.get(email);
  if (!entry) return { ok: false, message: '인증번호를 먼저 발송해주세요.' };
  if (Date.now() > entry.expiresAt) {
    codeStore.delete(email);
    return { ok: false, message: '인증번호가 만료되었습니다. 다시 발송해주세요.' };
  }
  if (entry.code !== inputCode) return { ok: false, message: '인증번호가 올바르지 않습니다.' };
  codeStore.delete(email);
  return { ok: true };
}

module.exports = { sendVerificationCode, verifyCode };
