import { Form, Input, Button, Card, Typography, Divider, message, Alert } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

const { Title, Text } = Typography;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [form] = Form.useForm();

  async function handleSubmit(values: { name: string; email: string; password: string }) {
    setLoading(true);
    try {
      await register(values.name, values.email, values.password);
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
          <Alert
            type="info"
            showIcon
            message="이메일이 오지 않았다면?"
            description="스팸 편지함을 확인하거나, 잠시 후 다시 시도해주세요."
            style={{ marginBottom: 16, textAlign: 'left' }}
          />
          <Alert
            type="warning"
            showIcon
            message="이메일을 잘못 입력했나요?"
            description="아래 버튼을 눌러 올바른 이메일로 다시 가입해주세요."
            style={{ marginBottom: 16, textAlign: 'left' }}
          />
          <Button block style={{ marginBottom: 8 }} onClick={() => { setRegistered(false); setRegisteredEmail(''); form.resetFields(); }}>
            이메일 다시 입력하기
          </Button>
          <Button type="primary" block onClick={() => navigate('/login')}>
            로그인 페이지로 이동
          </Button>
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
          <Form.Item name="name" rules={[{ required: true, message: '이름을 입력하세요' }]}>
            <Input prefix={<UserOutlined />} placeholder="이름" size="large" />
          </Form.Item>

          <Form.Item name="email" rules={[{ required: true, type: 'email', message: '올바른 이메일을 입력하세요' }]}>
            <Input prefix={<MailOutlined />} placeholder="이메일" size="large" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, min: 6, message: '6자 이상 입력하세요' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호 (6자 이상)" size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            회원가입
          </Button>
        </Form>

        <Divider plain><Text type="secondary" style={{ fontSize: 12 }}>이미 회원이신가요?</Text></Divider>
        <Button block onClick={() => navigate('/login')}>로그인</Button>
      </Card>
    </div>
  );
}
