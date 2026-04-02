import { Form, Input, Button, Card, Typography, Divider, message, Modal } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

const { Title, Text } = Typography;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  async function handleResetPassword() {
    if (!resetEmail) { message.warning('이메일을 입력하세요.'); return; }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://www.designpass.co.kr/reset-password',
      });
      if (error) throw new Error(error.message);
      message.success('비밀번호 재설정 링크를 이메일로 발송했습니다.');
      setResetModalOpen(false);
      setResetEmail('');
    } catch (e: unknown) {
      message.error((e as Error).message || '발송에 실패했습니다.');
    } finally {
      setResetLoading(false);
    }
  }

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
          <Form.Item name="password" style={{ marginBottom: 8 }} rules={[{ required: true, message: '비밀번호를 입력하세요' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" size="large" />
          </Form.Item>
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => setResetModalOpen(true)}>
              비밀번호를 잊으셨나요?
            </Button>
          </div>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            로그인
          </Button>
        </Form>

        <Divider plain><Text type="secondary" style={{ fontSize: 12 }}>아직 회원이 아니신가요?</Text></Divider>
        <Button block onClick={() => navigate('/register')}>무료 회원가입</Button>
      </Card>

      <Modal
        title="비밀번호 찾기"
        open={resetModalOpen}
        onOk={handleResetPassword}
        onCancel={() => { setResetModalOpen(false); setResetEmail(''); }}
        okText="재설정 링크 발송"
        cancelText="취소"
        confirmLoading={resetLoading}
      >
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            가입 시 사용한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
          </Text>
          <Input
            prefix={<MailOutlined />}
            placeholder="이메일"
            size="large"
            value={resetEmail}
            onChange={e => setResetEmail(e.target.value)}
            onPressEnter={handleResetPassword}
          />
        </div>
      </Modal>
    </div>
  );
}
