import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    // Supabase가 URL 해시에서 토큰을 파싱해 세션을 설정하면 PASSWORD_RECOVERY 이벤트 발생
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(values: { newPassword: string; confirmPassword: string }) {
    if (values.newPassword !== values.confirmPassword) {
      message.error('비밀번호가 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.newPassword });
      if (error) throw new Error(error.message);
      message.success('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    } catch (e: unknown) {
      message.error((e as Error).message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card style={{ width: 400, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0, color: '#1677ff' }}>새 비밀번호 설정</Title>
          <Text type="secondary">사용할 새 비밀번호를 입력하세요</Text>
        </div>

        {!ready ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Text type="secondary">링크를 확인하는 중입니다...</Text>
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="newPassword" rules={[{ required: true, min: 6, message: '6자 이상 입력하세요' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="새 비밀번호 (6자 이상)" size="large" />
            </Form.Item>
            <Form.Item name="confirmPassword" rules={[{ required: true, message: '비밀번호를 다시 입력하세요' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="새 비밀번호 확인" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              비밀번호 변경
            </Button>
          </Form>
        )}
      </Card>
    </div>
  );
}
