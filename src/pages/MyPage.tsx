import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Avatar, Tag } from 'antd';
import { UserOutlined, EnvironmentOutlined, NumberOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

export default function MyPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  async function handleSave(values: { realName: string }) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ real_name: values.realName.trim() })
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
        {/* 프로필 요약 */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Avatar size={72} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff', marginBottom: 12 }} />
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text strong style={{ fontSize: 17 }}>{user?.name}</Text>
            {user?.userNumber != null && (
              <Tag icon={<NumberOutlined />} color="default" style={{ fontSize: 12, margin: 0 }}>
                #{user.userNumber}
              </Tag>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>{user?.email}</Text>
          {user?.location && (
            <div style={{ marginTop: 6 }}>
              <Tag icon={<EnvironmentOutlined />} color="blue" style={{ fontSize: 12 }}>{user.location}</Tag>
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            {user?.isPremium
              ? <span style={{ background: '#faad14', color: '#fff', padding: '3px 12px', borderRadius: 12, fontSize: 12 }}>⭐ 프리미엄 회원</span>
              : <span style={{ background: '#f0f0f0', color: '#888', padding: '3px 12px', borderRadius: 12, fontSize: 12 }}>일반 회원</span>
            }
          </div>
        </div>

        {/* 닉네임 (조회 전용) */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>닉네임</Text>
          <div style={{
            marginTop: 4, padding: '8px 12px', background: '#f5f5f5',
            borderRadius: 8, fontSize: 14, color: '#333',
          }}>
            {user?.name}
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>변경 불가 (유료 서비스)</Text>
          </div>
        </div>

        {/* 이름 수정 */}
        <Form
          form={form}
          layout="vertical"
          initialValues={{ realName: user?.realName ?? '' }}
          onFinish={handleSave}
        >
          <Form.Item
            name="realName"
            label="이름 수정"
            rules={[{ required: true, message: '이름을 입력하세요' }]}
          >
            <Input placeholder="실명 입력" size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            저장
          </Button>
        </Form>
      </Card>
    </div>
  );
}
