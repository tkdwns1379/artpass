import { Form, Input, Button, Card, Typography, Divider, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

const { Title, Text } = Typography;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { email: string; password: string }) {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('로그인되었습니다.');
      navigate('/', { replace: true });
    } catch (e: unknown) {
      const err = e as Error;
      // Supabase 에러 메시지 한국어 변환
      const msg = err.message?.includes('Invalid login credentials')
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : err.message?.includes('Email not confirmed')
        ? '이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해주세요.'
        : err.message || '로그인에 실패했습니다.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card style={{ width: 400, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0, color: '#1677ff' }}>로그인</Title>
          <Text type="secondary">디자인패스 정보를 확인하세요</Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: '이메일을 입력하세요' }]}>
            <Input prefix={<UserOutlined />} placeholder="이메일" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력하세요' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            로그인
          </Button>
        </Form>

        <Divider plain><Text type="secondary" style={{ fontSize: 12 }}>아직 회원이 아니신가요?</Text></Divider>
        <Button block onClick={() => navigate('/register')}>무료 회원가입</Button>
      </Card>
    </div>
  );
}
