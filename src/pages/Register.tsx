import { Form, Input, Button, Card, Typography, Divider, message, Alert, Modal, Checkbox, Cascader } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { REGIONS } from '@/data/regions';
import { NICKNAME_REGEX, containsBannedWord } from '@/utils/nicknameValidator';

const { Title, Text } = Typography;

const TERMS_CONTENT = `제1조 (목적)
본 약관은 디자인패스(이하 "서비스")가 제공하는 디자인 입시 정보 서비스의 이용 조건 및 절차, 이용자와 서비스의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
① "서비스"란 디자인패스가 운영하는 비공식 디자인 입시 정보 웹사이트를 의미합니다.
② "이용자"란 본 약관에 동의하고 서비스를 이용하는 자를 의미합니다.

제3조 (약관의 효력 및 변경)
① 본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.
② 서비스는 필요한 경우 약관을 변경할 수 있으며, 변경 시 공지합니다.

제4조 (서비스 이용)
① 서비스는 비공식 정보 제공을 목적으로 하며, 제공되는 입시 정보의 정확성을 보장하지 않습니다.
② 이용자는 서비스에서 제공하는 정보를 참고용으로만 활용해야 하며, 중요한 입시 관련 결정은 반드시 해당 학교 공식 발표를 확인하시기 바랍니다.

제5조 (이용자의 의무)
① 이용자는 타인의 정보를 도용하거나 허위 정보를 등록하여서는 안 됩니다.
② 이용자는 서비스의 운영을 방해하거나 다른 이용자에게 피해를 주는 행위를 하여서는 안 됩니다.
③ 이용자는 관련 법령 및 본 약관의 규정을 준수해야 합니다.

제6조 (서비스 제공의 중단)
서비스는 시스템 점검, 서버 장애, 천재지변 등의 사유로 서비스 제공을 일시적으로 중단할 수 있습니다.

제7조 (면책조항)
① 서비스는 비공식 정보 제공 사이트로, 입시 정보의 정확성·최신성에 대해 법적 책임을 지지 않습니다.
② 이용자가 서비스 정보를 신뢰하여 발생한 손해에 대해 서비스는 책임을 지지 않습니다.

제8조 (준거법 및 관할)
본 약관은 대한민국 법률에 따르며, 분쟁 발생 시 관할 법원은 민사소송법에 따릅니다.

부칙
본 약관은 2025년 1월 1일부터 시행합니다.`;

const PRIVACY_CONTENT = `디자인패스(이하 "서비스")는 개인정보 보호법 제30조에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.

1. 수집하는 개인정보 항목
서비스는 회원가입 시 아래의 개인정보를 수집합니다.
- 필수 항목: 이름(실명), 닉네임, 이메일 주소, 비밀번호(암호화 저장), 거주지(시/구 단위)

2. 개인정보의 수집 및 이용 목적
- 회원 가입 및 본인 확인
- 서비스 이용에 따른 이용자 식별 (닉네임 표시)
- 지역 기반 입시 정보 제공
- 서비스 내 소통 기능(채팅) 제공
- 불량 이용자 제재 및 서비스 운영

3. 개인정보의 보유 및 이용 기간
- 회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다.
- 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.

4. 개인정보의 제3자 제공
서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 단, 이용자의 사전 동의가 있거나 법령에 의한 경우는 예외로 합니다.

5. 개인정보 처리의 위탁
서비스는 원활한 운영을 위해 아래와 같이 개인정보 처리 업무를 위탁합니다.
- 수탁업체: Supabase Inc. (서버 및 인증 서비스 제공)
- 위탁 내용: 회원 인증 데이터 저장 및 관리

6. 이용자의 권리
이용자는 언제든지 아래 권리를 행사할 수 있습니다.
- 개인정보 열람 요청
- 개인정보 정정·삭제 요청
- 개인정보 처리 정지 요청
- 회원 탈퇴를 통한 개인정보 즉시 삭제

7. 개인정보의 파기
이용자가 회원 탈퇴하거나 개인정보 보유 기간이 경과한 경우, 해당 개인정보를 지체 없이 파기합니다. 전자적 파일 형태의 정보는 복구 불가능한 방법으로 삭제합니다.

8. 개인정보 보호 책임자
서비스 운영자가 개인정보 관련 문의를 처리합니다. 문의는 서비스 내 문의 기능을 통해 접수해 주세요.

9. 개인정보 처리방침의 변경
본 방침은 법령 또는 서비스 정책 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지합니다.

시행일: 2025년 1월 1일`;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [form] = Form.useForm();
  const [termsModal, setTermsModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');

  async function checkNickname(value: string) {
    if (!NICKNAME_REGEX.test(value)) return;
    if (containsBannedWord(value)) return;
    setNicknameStatus('checking');
    const { data } = await supabase.from('profiles').select('id').eq('name', value).maybeSingle();
    setNicknameStatus(data ? 'taken' : 'ok');
  }

  async function handleSubmit(values: {
    realName: string;
    nickname: string;
    email: string;
    password: string;
    location: string[];
    agree: boolean;
  }) {
    const location = values.location?.join(' ') ?? '';
    setLoading(true);
    try {
      await register(values.nickname, values.realName, values.email, values.password, location);
      setRegisteredEmail(values.email);
      setRegistered(true);
      message.success('회원가입이 완료되었습니다! 이메일을 확인해주세요.');
    } catch (e: unknown) {
      const err = e as Error;
      const msg = err.message?.includes('User already registered')
        ? '이미 가입된 이메일입니다.'
        : err.message?.includes('Password should be at least')
        ? '비밀번호는 6자 이상이어야 합니다.'
        : err.message || '회원가입에 실패했습니다.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Card style={{ width: 440, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✉️</div>
          <Title level={4} style={{ marginBottom: 8 }}>이메일을 확인해주세요!</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: 14 }}>
            <strong>{registeredEmail}</strong> 으로 인증 링크를 보냈습니다.<br />
            받은 편지함에서 인증 링크를 클릭하면 가입이 완료됩니다.
          </Text>
          <Alert type="info" showIcon message="이메일이 오지 않았다면?" description="스팸 편지함을 확인하거나, 잠시 후 다시 시도해주세요." style={{ marginBottom: 16, textAlign: 'left' }} />
          <Alert type="warning" showIcon message="이메일을 잘못 입력했나요?" description="아래 버튼을 눌러 올바른 이메일로 다시 가입해주세요." style={{ marginBottom: 16, textAlign: 'left' }} />
          <Button block style={{ marginBottom: 8 }} onClick={() => { setRegistered(false); setRegisteredEmail(''); form.resetFields(); }}>
            이메일 다시 입력하기
          </Button>
          <Button type="primary" block onClick={() => navigate('/login')}>로그인 페이지로 이동</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card style={{ width: 420, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0, color: '#1677ff' }}>무료 회원가입</Title>
          <Text type="secondary">가입 후 모든 입시 정보를 확인하세요</Text>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="realName"
            rules={[{ required: true, message: '이름을 입력하세요' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="이름 (실명)" size="large" />
          </Form.Item>

          <Form.Item
            name="nickname"
            validateStatus={nicknameStatus === 'taken' ? 'error' : nicknameStatus === 'ok' ? 'success' : undefined}
            help={
              nicknameStatus === 'taken' ? '이미 사용 중인 닉네임입니다.' :
              nicknameStatus === 'ok' ? '사용 가능한 닉네임입니다.' :
              '한글 또는 영어만, 7자 이내, 띄어쓰기·특수문자·숫자 불가'
            }
            rules={[
              { required: true, message: '닉네임을 입력하세요' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (!NICKNAME_REGEX.test(value)) return Promise.reject('한글 또는 영어만, 7자 이내로 입력하세요 (띄어쓰기·숫자·특수문자 불가)');
                  if (containsBannedWord(value)) return Promise.reject('사용할 수 없는 닉네임입니다.');
                  if (nicknameStatus === 'taken') return Promise.reject('이미 사용 중인 닉네임입니다.');
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="닉네임 (한글/영어, 7자 이내)"
              size="large"
              maxLength={7}
              onBlur={(e) => checkNickname(e.target.value)}
              onChange={() => setNicknameStatus('idle')}
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[{ required: true, type: 'email', message: '올바른 이메일을 입력하세요' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="이메일" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, min: 6, message: '6자 이상 입력하세요' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호 (6자 이상)" size="large" />
          </Form.Item>

          <Form.Item
            name="location"
            rules={[{ required: true, message: '거주 지역을 선택하세요' }]}
          >
            <Cascader
              options={REGIONS}
              placeholder="거주 지역 선택"
              size="large"
              style={{ width: '100%' }}
              suffixIcon={<EnvironmentOutlined />}
              displayRender={(labels) => labels.join(' ')}
            />
          </Form.Item>

          <Form.Item
            name="agree"
            valuePropName="checked"
            rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject('약관에 동의해주세요.') }]}
          >
            <Checkbox>
              <Text style={{ fontSize: 13 }}>
                <Button type="link" size="small" style={{ padding: 0, fontSize: 13 }} onClick={(e) => { e.preventDefault(); setTermsModal(true); }}>
                  이용약관
                </Button>
                {' 및 '}
                <Button type="link" size="small" style={{ padding: 0, fontSize: 13 }} onClick={(e) => { e.preventDefault(); setPrivacyModal(true); }}>
                  개인정보 처리방침
                </Button>
                에 동의합니다 (필수)
              </Text>
            </Checkbox>
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            회원가입
          </Button>
        </Form>

        <Divider plain><Text type="secondary" style={{ fontSize: 12 }}>이미 회원이신가요?</Text></Divider>
        <Button block onClick={() => navigate('/login')}>로그인</Button>
      </Card>

      <Modal title="이용약관" open={termsModal} onCancel={() => setTermsModal(false)} footer={<Button type="primary" onClick={() => setTermsModal(false)}>확인</Button>} width={600}>
        <div style={{ maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, color: '#444' }}>{TERMS_CONTENT}</div>
      </Modal>

      <Modal title="개인정보 처리방침" open={privacyModal} onCancel={() => setPrivacyModal(false)} footer={<Button type="primary" onClick={() => setPrivacyModal(false)}>확인</Button>} width={600}>
        <div style={{ maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, color: '#444' }}>{PRIVACY_CONTENT}</div>
      </Modal>
    </div>
  );
}
