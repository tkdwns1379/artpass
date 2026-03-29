import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Avatar, Tag } from 'antd';
import { UserOutlined, EditOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

const BANNED_WORDS = new Set([
  '시발','씨발','씨팔','쉬발','시팔','ㅅㅂ','ㅆㅂ',
  '개새끼','개쉐끼','개세끼','개씨발',
  '병신','ㅂㅅ','보지','자지','창녀','창년','창놈',
  '새끼','쌍년','쌍놈','지랄','존나','좆','ㅈㄴ',
  'fuck','shit','bitch','dick','pussy','cock','cunt','nigger','nigga','bastard','whore','slut','ass',
]);

function containsBannedWord(value: string): boolean {
  const lower = value.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) return true;
  }
  return false;
}

const NICKNAME_REGEX = /^[가-힣a-zA-Z]{1,7}$/;

export default function MyPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');
  const [form] = Form.useForm();

  async function checkNickname(value: string) {
    if (!NICKNAME_REGEX.test(value)) return;
    if (containsBannedWord(value)) return;
    if (value === user?.name) { setNicknameStatus('ok'); return; }
    setNicknameStatus('checking');
    const { data } = await supabase.from('profiles').select('id').eq('name', value).maybeSingle();
    setNicknameStatus(data ? 'taken' : 'ok');
  }

  async function handleSave(values: { nickname: string }) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: values.nickname.trim() })
        .eq('id', user!.id);
      if (error) throw new Error(error.message);
      await refreshUser();
      message.success('닉네임이 변경되었습니다.');
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
            {user?.realName && (
              <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>({user.realName})</Text>
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

        <Form
          form={form}
          layout="vertical"
          initialValues={{ nickname: user?.name }}
          onFinish={handleSave}
        >
          <Form.Item
            name="nickname"
            label="닉네임 변경"
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
                  if (!NICKNAME_REGEX.test(value)) return Promise.reject('한글 또는 영어만, 7자 이내로 입력하세요');
                  if (containsBannedWord(value)) return Promise.reject('사용할 수 없는 닉네임입니다.');
                  if (nicknameStatus === 'taken') return Promise.reject('이미 사용 중인 닉네임입니다.');
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              prefix={<EditOutlined />}
              placeholder="닉네임 (한글/영어, 7자 이내)"
              size="large"
              maxLength={7}
              onBlur={(e) => checkNickname(e.target.value)}
              onChange={() => setNicknameStatus('idle')}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            저장
          </Button>
        </Form>
      </Card>
    </div>
  );
}
