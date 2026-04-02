import { useState, useRef, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, message, Avatar, Tag, Spin, Dropdown, Modal, Empty, List, Radio, Select, InputNumber, Segmented } from 'antd';
import { UserOutlined, EnvironmentOutlined, NumberOutlined, CameraOutlined, PictureOutlined, DeleteOutlined, HistoryOutlined, StarFilled, TrophyOutlined, BulbOutlined, CompassOutlined, SafetyOutlined, RiseOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getFeedbackLogs, type FeedbackLog } from '@/api/client';

const { Title, Text } = Typography;

const TYPE_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  '실기피드백': { color: 'blue', icon: <StarFilled />, label: '실기피드백' },
  '대학추천':   { color: 'green', icon: <CompassOutlined />, label: '대학추천' },
  '합격분석':   { color: 'gold', icon: <TrophyOutlined />, label: '합격분석' },
  '입시조언':   { color: 'purple', icon: <BulbOutlined />, label: '입시조언' },
}

const CAREER_CATEGORIES = [
  '그래픽/브랜딩', '디지털/IT', '영상/모션', '게임',
  '산업디자인', '공간디자인', '패션', '일러스트/캐릭터', '3D/VFX',
];

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function MyPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [admissionLoading, setAdmissionLoading] = useState(false);
  const [careerLoading, setCareerLoading] = useState(false);
  const [myPageMode, setMyPageMode] = useState<'입시' | '취업'>('입시');
  const [form] = Form.useForm();
  const [admissionForm] = Form.useForm();
  const [careerForm] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [majorType, setMajorType] = useState<string | null>(null);

  const [logs, setLogs] = useState<FeedbackLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<FeedbackLog | null>(null);

  useEffect(() => {
    if (!user?.isPremium && user?.role !== 'admin') return;
    setLogsLoading(true);
    getFeedbackLogs()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    admissionForm.setFieldsValue({
      admission_type: user.admissionType ?? undefined,
      avg_grade: user.avgGrade ?? '',
      target_university: user.targetUniversity ?? '',
      acceptance_rate: user.acceptanceRate ?? undefined,
    });
    const mt = user.majorType ?? null;
    setMajorType(mt);
    careerForm.setFieldsValue({
      major_type: mt ?? undefined,
      school_name: user.schoolName ?? '',
      major_name: user.majorName ?? '',
      career_interest: user.careerInterest ?? undefined,
    });
    form.setFieldsValue({
      realName: user.realName ?? '',
      name_visibility: user.nameVisibility ?? 'friend',
    });
  }, [user, admissionForm, careerForm, form]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { message.error('파일 크기는 2MB 이하여야 합니다.'); return; }
    setAvatarLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const urlWithTs = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: urlWithTs }).eq('id', user.id);
      if (updateError) throw new Error(updateError.message);
      await refreshUser();
      message.success('프로필 사진이 변경되었습니다.');
    } catch (e: unknown) {
      message.error((e as Error).message || '업로드에 실패했습니다.');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleAvatarDelete() {
    if (!user) return;
    setAvatarLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      if (error) throw new Error(error.message);
      await refreshUser();
      message.success('프로필 사진이 삭제되었습니다.');
    } catch (e: unknown) {
      message.error((e as Error).message || '삭제에 실패했습니다.');
    } finally { setAvatarLoading(false); }
  }

  async function handleSave(values: { realName: string; name_visibility: string }) {
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles')
        .update({ real_name: values.realName.trim(), name_visibility: values.name_visibility })
        .eq('id', user!.id);
      if (error) throw new Error(error.message);
      await refreshUser();
      message.success('저장되었습니다.');
    } catch (e: unknown) {
      message.error((e as Error).message || '변경에 실패했습니다.');
    } finally { setLoading(false); }
  }

  async function handleAdmissionSave(values: {
    admission_type?: string;
    avg_grade?: string;
    target_university?: string;
    acceptance_rate?: number;
  }) {
    setAdmissionLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        admission_type: values.admission_type ?? null,
        avg_grade: values.avg_grade?.trim() ?? null,
        target_university: values.target_university?.trim() ?? null,
        acceptance_rate: values.acceptance_rate ?? null,
      }).eq('id', user!.id);
      if (error) throw new Error(error.message);
      await refreshUser();
      message.success('입시 정보가 저장되었습니다.');
    } catch (e: unknown) {
      message.error((e as Error).message || '저장에 실패했습니다.');
    } finally { setAdmissionLoading(false); }
  }

  async function handleCareerSave(values: {
    major_type?: string;
    school_name?: string;
    major_name?: string;
    career_interest?: string;
  }) {
    setCareerLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        major_type: values.major_type ?? null,
        school_name: values.major_type === '전공자' ? (values.school_name?.trim() ?? null) : null,
        major_name: values.major_type === '전공자' ? (values.major_name?.trim() ?? null) : null,
        career_interest: values.career_interest ?? null,
      }).eq('id', user!.id);
      if (error) throw new Error(error.message);
      await refreshUser();
      message.success('취업 정보가 저장되었습니다.');
    } catch (e: unknown) {
      message.error((e as Error).message || '저장에 실패했습니다.');
    } finally { setCareerLoading(false); }
  }

  const avatarMenuItems = [
    { key: 'set', icon: <PictureOutlined />, label: '이미지 설정', onClick: () => fileInputRef.current?.click() },
    ...(user?.avatarUrl ? [{ key: 'delete', icon: <DeleteOutlined />, label: '이미지 삭제', danger: true, onClick: handleAvatarDelete }] : []),
  ];

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>마이페이지</Title>

      {/* 프로필 카드 */}
      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Dropdown menu={{ items: avatarMenuItems }} trigger={['click']} placement="bottom">
            <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer', marginBottom: 12 }}>
              {avatarLoading ? (
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spin size="small" />
                </div>
              ) : (
                <Avatar size={72} src={user?.avatarUrl} icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
                  style={{ backgroundColor: user?.avatarUrl ? undefined : '#1677ff' }} />
              )}
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                background: '#1677ff', borderRadius: '50%', width: 24, height: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff',
              }}>
                <CameraOutlined style={{ color: '#fff', fontSize: 12 }} />
              </div>
            </div>
          </Dropdown>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }} onChange={handleAvatarChange} />
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text strong style={{ fontSize: 17 }}>{user?.name}</Text>
            {user?.userNumber != null && (
              <Tag icon={<NumberOutlined />} color="default" style={{ fontSize: 12, margin: 0 }}>#{user.userNumber}</Tag>
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

        {/* 닉네임 */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>닉네임</Text>
          <div style={{ marginTop: 4, padding: '8px 12px', background: '#f5f5f5', borderRadius: 8, fontSize: 14, color: '#333' }}>
            {user?.name}
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>변경 불가 (유료 서비스)</Text>
          </div>
        </div>

        {/* 이름 수정 + 나의 정보 공개 설정 */}
        <Form form={form} layout="vertical"
          initialValues={{ realName: user?.realName ?? '', name_visibility: user?.nameVisibility ?? 'friend' }}
          onFinish={handleSave}
        >
          <Form.Item name="realName" label="이름 수정" rules={[{ required: true, message: '이름을 입력하세요' }]}>
            <Input placeholder="실명 입력" size="large" />
          </Form.Item>

          <Form.Item
            name="name_visibility"
            label={<span><SafetyOutlined style={{ marginRight: 6, color: '#1677ff' }} />나의 정보 공개 설정</span>}
          >
            <Select size="middle" style={{ width: 160 }}>
              <Select.Option value="all">전체공개</Select.Option>
              <Select.Option value="friend">친구공개</Select.Option>
              <Select.Option value="none">비공개</Select.Option>
            </Select>
          </Form.Item>
          <div style={{ fontSize: 11, color: '#999', marginTop: -16, marginBottom: 16 }}>
            전체공개: 누구나 볼 수 있음 · 친구공개: 친구만 볼 수 있음 · 비공개: 아무도 볼 수 없음
          </div>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>저장</Button>
        </Form>
      </Card>

      {/* 입시 / 취업 토글 */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Segmented
          value={myPageMode}
          onChange={v => setMyPageMode(v as '입시' | '취업')}
          options={[
            { label: '🎓 입시 정보', value: '입시' },
            { label: '💼 취업 정보', value: '취업' },
          ]}
          size="large"
          style={{ fontWeight: 600 }}
        />
      </div>

      {/* 입시 정보 카드 */}
      {myPageMode === '입시' && (
        <Card
          style={{ borderRadius: 12, marginBottom: 24 }}
          title={<span style={{ fontSize: 15, fontWeight: 700 }}><TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />나의 입시 정보</span>}
        >
          <Form form={admissionForm} layout="vertical"
            initialValues={{
              admission_type: user?.admissionType ?? undefined,
              avg_grade: user?.avgGrade ?? '',
              target_university: user?.targetUniversity ?? '',
              acceptance_rate: user?.acceptanceRate ?? undefined,
            }}
            onFinish={handleAdmissionSave}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Form.Item name="admission_type" label="전형">
                <Radio.Group buttonStyle="solid" size="middle">
                  <Radio.Button value="susi">수시</Radio.Button>
                  <Radio.Button value="jeongsi">정시</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="avg_grade" label="평균 등급">
                <Input placeholder="예: 2.8등급" size="middle" />
              </Form.Item>
              <Form.Item name="target_university" label="목표 대학">
                <Input placeholder="예: 홍익대 시각디자인" size="middle" />
              </Form.Item>
              <Form.Item name="acceptance_rate" label="AI 합격률 (%)">
                <InputNumber min={0} max={100} placeholder="예: 72" style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
            </div>
            <Button type="primary" htmlType="submit" block loading={admissionLoading}>저장</Button>
          </Form>
        </Card>
      )}

      {/* 취업 정보 카드 */}
      {myPageMode === '취업' && (
        <Card
          style={{ borderRadius: 12, marginBottom: 24 }}
          title={<span style={{ fontSize: 15, fontWeight: 700 }}><RiseOutlined style={{ marginRight: 8, color: '#1677ff' }} />나의 취업 정보</span>}
        >
          <Form form={careerForm} layout="vertical"
            initialValues={{
              major_type: user?.majorType ?? undefined,
              school_name: user?.schoolName ?? '',
              major_name: user?.majorName ?? '',
              career_interest: user?.careerInterest ?? undefined,
            }}
            onFinish={handleCareerSave}
          >
            <Form.Item name="major_type" label="전공 여부">
              <Radio.Group buttonStyle="solid" size="middle"
                onChange={e => setMajorType(e.target.value as string)}
              >
                <Radio.Button value="전공자">전공자</Radio.Button>
                <Radio.Button value="비전공자">비전공자</Radio.Button>
              </Radio.Group>
            </Form.Item>

            {majorType === '전공자' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Form.Item name="school_name" label="학교명">
                  <Input placeholder="예: 홍익대학교" size="middle" />
                </Form.Item>
                <Form.Item name="major_name" label="학과명">
                  <Input placeholder="예: 시각디자인학과" size="middle" />
                </Form.Item>
              </div>
            )}

            <Form.Item name="career_interest" label="희망 취업 분야">
              <Select placeholder="분야를 선택하세요" size="middle" allowClear>
                {CAREER_CATEGORIES.map(cat => (
                  <Select.Option key={cat} value={cat}>{cat}</Select.Option>
                ))}
                <Select.Option value="기타">기타</Select.Option>
              </Select>
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={careerLoading}>저장</Button>
          </Form>
        </Card>
      )}

      {/* AI 피드백 내역 */}
      {(user?.isPremium || user?.role === 'admin') && (
        <Card
          style={{ borderRadius: 12 }}
          title={<span style={{ fontSize: 15, fontWeight: 700 }}><HistoryOutlined style={{ marginRight: 8, color: '#1677ff' }} />AI 피드백 내역</span>}
        >
          {logsLoading ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}><Spin /></div>
          ) : logs.length === 0 ? (
            <Empty description="아직 받은 피드백이 없어요" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              dataSource={logs}
              renderItem={(log) => {
                const meta = TYPE_META[log.type] ?? { color: 'default', icon: null, label: log.type }
                const rate = log.type === '합격분석' ? (log.meta as { rate?: number }).rate : null
                const question = log.type === '입시조언' ? (log.meta as { question?: string }).question : null
                const preview = log.content?.slice(0, 80).replace(/[#*\n]/g, ' ').trim()
                return (
                  <List.Item style={{ cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
                    onClick={() => setSelectedLog(log)}>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Tag color={meta.color} style={{ margin: 0, fontSize: 12 }}>{meta.icon} {meta.label}</Tag>
                        {rate !== null && rate !== undefined && (
                          <Tag color={rate >= 70 ? 'success' : rate >= 45 ? 'warning' : 'error'} style={{ margin: 0, fontSize: 12 }}>합격 {rate}%</Tag>
                        )}
                        {log.universityName && <Text type="secondary" style={{ fontSize: 12 }}>{log.universityName}</Text>}
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>{formatDate(log.createdAt)}</Text>
                      </div>
                      {question && <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>Q. {question}</Text>}
                      <Text type="secondary" style={{ fontSize: 13 }}>{preview}…</Text>
                    </div>
                  </List.Item>
                )
              }}
            />
          )}
        </Card>
      )}

      <Modal
        open={!!selectedLog}
        onCancel={() => setSelectedLog(null)}
        footer={<Button onClick={() => setSelectedLog(null)}>닫기</Button>}
        width={700}
        title={
          selectedLog ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color={TYPE_META[selectedLog.type]?.color ?? 'default'} style={{ margin: 0 }}>
                {TYPE_META[selectedLog.type]?.label ?? selectedLog.type}
              </Tag>
              {selectedLog.universityName && <span style={{ fontSize: 14 }}>{selectedLog.universityName}</span>}
              {selectedLog.type === '합격분석' && (selectedLog.meta as { rate?: number }).rate !== undefined && (
                <Tag color="gold">합격 {(selectedLog.meta as { rate?: number }).rate}%</Tag>
              )}
              <span style={{ fontSize: 12, color: '#999', fontWeight: 400, marginLeft: 4 }}>{formatDate(selectedLog.createdAt)}</span>
            </div>
          ) : null
        }
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
        {selectedLog?.type === '입시조언' && (selectedLog.meta as { question?: string }).question && (
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#555' }}>
            <strong>질문:</strong> {(selectedLog.meta as { question?: string }).question}
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <ReactMarkdown>{selectedLog?.content ?? ''}</ReactMarkdown>
        </div>
      </Modal>
    </div>
  );
}
