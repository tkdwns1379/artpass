import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Avatar } from 'antd';
import { UserOutlined, EditOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

export default function MyPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  async function handleSave(values: { name: string }) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: values.name.trim() })
        .eq('id', user!.id);
      if (error) throw new Error(error.message);
      await refreshUser();
      message.success('이름이 변경되었습니다.');
    } catch (e: unknown) {
      message.error((e as Error).message || '변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>마이페이지</Title>
      <Card style={{ borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Avatar size={72} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff', marginBottom: 12 }} />
          <div>
            <Text strong style={{ fontSize: 17 }}>{user?.name}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>{user?.email}</Text>
          <div style={{ marginTop: 10 }}>
            {user?.isPremium
              ? <span style={{ background: '#faad14', color: '#fff', padding: '3px 12px', borderRadius: 12, fontSize: 12 }}>⭐ 프리미엄 회원</span>
              : <span style={{ background: '#f0f0f0', color: '#888', padding: '3px 12px', borderRadius: 12, fontSize: 12 }}>일반 회원</span>
            }
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: user?.name }}
          onFinish={handleSave}
        >
          <Form.Item
            name="name"
            label="이름 수정"
            rules={[
              { required: true, message: '이름을 입력하세요' },
              { min: 1, max: 20, message: '1~20자로 입력하세요' },
            ]}
          >
            <Input prefix={<EditOutlined />} placeholder="변경할 이름 입력" size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            저장
          </Button>
        </Form>
      </Card>
    </div>
  );
}
