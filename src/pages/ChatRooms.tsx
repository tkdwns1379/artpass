import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Tag, Modal, Form, Input, Select, Slider, Typography,
  Empty, Spin, message, Badge, Tooltip, Avatar, Divider,
} from 'antd';
import { PlusOutlined, TeamOutlined, LoginOutlined, LockOutlined, StarFilled, SearchOutlined, UserAddOutlined, UserOutlined, TrophyOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text } = Typography;

interface Room {
  id: string;
  name: string;
  created_by: string;
  tags: string[];
  max_members: number;
  created_at: string;
  member_count: number;      // 전체 인원 (관리자 포함)
  non_admin_count: number;   // 일반 유저만
  has_admin: boolean;        // 관리자 참여 or 방장이 관리자
  creator_name?: string;
}

const PRESET_TAGS = [
  '홍익대', '국민대', '건국대', '한양대', '중앙대', '서울대', '이화여대',
  '경희대', '세종대', '성균관대', '단국대', '서울과학기술대',
  '기초디자인', '발상과표현', '사고의전환', '포트폴리오', '소묘',
  '수시', '정시', '합격후기', '정보공유', '질문있어요',
];

interface PublicProfile {
  id: string;
  name: string;
  role: string;
  realName: string | null;
  avatarUrl: string | null;
  admissionType: string | null;
  avgGrade: string | null;
  targetUniversity: string | null;
  acceptanceRate: number | null;
  nameVisibility: string;
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  friendshipId: string | null;
}

export default function ChatRooms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [form] = Form.useForm();

  // 닉네임 검색
  const [nicknameSearch, setNicknameSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [profileModal, setProfileModal] = useState<PublicProfile | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);

  async function fetchRooms() {
    const { data, error } = await supabase
      .from('rooms')
      .select('*, profiles!rooms_created_by_fkey(name, role)')
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }

    const roomIds = (data ?? []).map((r) => r.id);
    if (roomIds.length === 0) { setRooms([]); setLoading(false); return; }

    // 멤버 목록 가져오기
    const { data: members } = await supabase
      .from('room_members')
      .select('room_id, user_id')
      .in('room_id', roomIds);

    // 멤버 유저들의 role 가져오기
    const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('id, role').in('id', userIds)
      : { data: [] };

    const roleMap: Record<string, string> = {};
    (profiles ?? []).forEach((p) => { roleMap[p.id] = p.role; });

    const countMap: Record<string, number> = {};
    const nonAdminCountMap: Record<string, number> = {};
    const adminRoomSet = new Set<string>();

    (members ?? []).forEach((m) => {
      countMap[m.room_id] = (countMap[m.room_id] ?? 0) + 1;
      if (roleMap[m.user_id] === 'admin') {
        adminRoomSet.add(m.room_id);
      } else {
        nonAdminCountMap[m.room_id] = (nonAdminCountMap[m.room_id] ?? 0) + 1;
      }
    });

    setRooms(
      (data ?? []).map((r) => {
        const creatorProfile = r.profiles as { name: string; role: string } | null;
        const creatorIsAdmin = creatorProfile?.role === 'admin';
        return {
          id: r.id,
          name: r.name,
          created_by: r.created_by,
          tags: r.tags ?? [],
          max_members: r.max_members,
          created_at: r.created_at,
          member_count: countMap[r.id] ?? 0,
          non_admin_count: nonAdminCountMap[r.id] ?? 0,
          has_admin: adminRoomSet.has(r.id) || creatorIsAdmin,
          creator_name: creatorProfile?.name,
        };
      })
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchRooms();

    const sub = supabase
      .channel('rooms-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, fetchRooms)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  async function handleCreate() {
    if (!user) { message.warning('로그인이 필요합니다.'); return; }
    const values = await form.validateFields();
    setCreating(true);
    try {
      const { data: newRoom, error } = await supabase.from('rooms').insert({
        name: values.name,
        created_by: user.id,
        tags: values.tags ?? [],
        max_members: values.max_members ?? 10,
      }).select('id').single();
      if (error) throw new Error(error.message);
      setCreateOpen(false);
      form.resetFields();
      navigate(`/rooms/${newRoom.id}`);
    } catch (e: unknown) {
      message.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleNicknameSearch() {
    if (!nicknameSearch.trim()) return;
    if (!user) { message.warning('로그인이 필요합니다.'); return; }
    setSearching(true);
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, name, real_name, role, avatar_url, admission_type, avg_grade, target_university, acceptance_rate, name_visibility')
        .eq('name', nicknameSearch.trim())
        .single();

      if (error || !profileData) {
        message.warning('해당 닉네임의 사용자를 찾을 수 없습니다.');
        return;
      }

      if (profileData.id === user.id) {
        message.info('본인의 닉네임입니다.');
        return;
      }

      // 친구 관계 조회
      const { data: fship } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .or(`requester_id.eq.${profileData.id},addressee_id.eq.${profileData.id}`)
        .single();

      let friendshipStatus: PublicProfile['friendshipStatus'] = 'none';
      let friendshipId: string | null = null;

      if (fship) {
        const isMyRequest = fship.requester_id === user.id;
        const isRelated =
          (fship.requester_id === user.id && fship.addressee_id === profileData.id) ||
          (fship.requester_id === profileData.id && fship.addressee_id === user.id);

        if (isRelated) {
          friendshipId = fship.id;
          if (fship.status === 'accepted') friendshipStatus = 'accepted';
          else if (isMyRequest) friendshipStatus = 'pending_sent';
          else friendshipStatus = 'pending_received';
        }
      }

      setProfileModal({
        id: profileData.id,
        name: profileData.name,
        realName: profileData.real_name ?? null,
        role: profileData.role,
        avatarUrl: profileData.avatar_url,
        admissionType: profileData.admission_type,
        avgGrade: profileData.avg_grade,
        targetUniversity: profileData.target_university,
        acceptanceRate: profileData.acceptance_rate,
        nameVisibility: profileData.name_visibility ?? 'friend',
        friendshipStatus,
        friendshipId,
      });
    } catch {
      message.error('검색 중 오류가 발생했습니다.');
    } finally {
      setSearching(false);
    }
  }

  async function handleFriendRequest() {
    if (!user || !profileModal) return;
    setFriendLoading(true);
    try {
      const { error } = await supabase.from('friendships').insert({
        requester_id: user.id,
        addressee_id: profileModal.id,
        status: 'pending',
      });
      if (error) throw new Error(error.message);
      setProfileModal(prev => prev ? { ...prev, friendshipStatus: 'pending_sent', friendshipId: null } : null);
      message.success('친구 요청을 보냈습니다.');
    } catch (e: unknown) {
      message.error((e as Error).message || '친구 요청에 실패했습니다.');
    } finally {
      setFriendLoading(false);
    }
  }

  async function handleEnter(room: Room) {
    if (!user) { message.warning('로그인이 필요합니다.'); return; }
    navigate(`/rooms/${room.id}`);
  }

  const isAdmin = user?.role === 'admin';

  const filtered = filterTags.length === 0
    ? rooms
    : rooms.filter((r) => filterTags.every((t) => r.tags.includes(t)));

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <Title level={4} style={{ margin: 0, whiteSpace: 'nowrap' }}>💬 채팅방</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>입시 정보를 실시간으로 공유하세요</Text>
        </div>
        {user && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} style={{ flexShrink: 0 }}>
            방 만들기
          </Button>
        )}
      </div>

      {/* 닉네임 검색 */}
      {user && (
        <div style={{ marginBottom: 20 }}>
          <Input.Search
            placeholder="닉네임으로 검색"
            value={nicknameSearch}
            onChange={(e) => setNicknameSearch(e.target.value)}
            onSearch={handleNicknameSearch}
            onPressEnter={handleNicknameSearch}
            loading={searching}
            enterButton={<><SearchOutlined /> 검색</>}
            style={{ maxWidth: 320 }}
            allowClear
          />
        </div>
      )}

      {/* 태그 필터 */}
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {PRESET_TAGS.map((tag) => (
          <Tag.CheckableTag
            key={tag}
            checked={filterTags.includes(tag)}
            onChange={(checked) =>
              setFilterTags((prev) => checked ? [...prev, tag] : prev.filter((t) => t !== tag))
            }
            style={{ cursor: 'pointer', fontSize: 12, padding: '2px 10px' }}
          >
            #{tag}
          </Tag.CheckableTag>
        ))}
        {filterTags.length > 0 && (
          <Button size="small" type="text" danger onClick={() => setFilterTags([])}>
            초기화
          </Button>
        )}
      </div>

      {/* 방 목록 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
      ) : filtered.length === 0 ? (
        <Empty description="방이 없습니다. 첫 번째 방을 만들어보세요!" style={{ padding: 60 }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((room) => {
            // 관리자는 항상 입장 가능, 일반 유저는 non_admin_count 기준
            const isFull = isAdmin ? false : room.non_admin_count >= room.max_members;
            const displayCount = room.member_count;

            return (
              <Card
                key={room.id}
                hoverable={!isFull}
                style={{
                  opacity: isFull ? 0.65 : 1,
                  border: room.has_admin ? '1.5px solid #faad14' : '1px solid #f0f0f0',
                  borderRadius: 12,
                }}
                bodyStyle={{ padding: 20 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* 방 이름 + 별 + 인원 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, marginRight: 8, minWidth: 0 }}>
                      {room.has_admin && (
                        <Tooltip title="관리자가 있는 방">
                          <StarFilled style={{ color: '#faad14', fontSize: 14, flexShrink: 0 }} />
                        </Tooltip>
                      )}
                      <Text strong style={{ fontSize: 15 }} ellipsis={{ tooltip: room.name }}>{room.name}</Text>
                    </div>
                    <Badge
                      count={`${displayCount}/${room.max_members}`}
                      style={{
                        backgroundColor: room.non_admin_count >= room.max_members ? '#ff4d4f' : displayCount > 0 ? '#52c41a' : '#d9d9d9',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 12,
                        boxShadow: 'none',
                        minWidth: 48,
                      }}
                    />
                  </div>

                  {/* 태그 */}
                  {room.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {room.tags.map((tag) => (
                        <Tag key={tag} color="blue" style={{ fontSize: 11, margin: 0 }}>#{tag}</Tag>
                      ))}
                    </div>
                  )}

                  {/* 방장 + 입장 버튼 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <TeamOutlined style={{ marginRight: 4 }} />
                      {room.creator_name ?? '알 수 없음'}
                    </Text>
                    <Button
                      type={isFull ? 'default' : 'primary'}
                      size="small"
                      icon={isFull ? <LockOutlined /> : <LoginOutlined />}
                      disabled={isFull}
                      onClick={() => handleEnter(room)}
                    >
                      {isFull ? '만석' : '입장'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 닉네임 검색 프로필 모달 */}
      <Modal
        open={!!profileModal}
        onCancel={() => setProfileModal(null)}
        footer={null}
        width={400}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar
              size={40}
              src={profileModal?.avatarUrl}
              icon={!profileModal?.avatarUrl ? <UserOutlined /> : undefined}
              style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{profileModal?.name}</div>
              {profileModal?.role === 'admin' && <Tag color="gold" style={{ margin: 0, fontSize: 11 }}>관리자</Tag>}
            </div>
          </div>
        }
      >
        {profileModal && (() => {
          const isAccepted = profileModal.friendshipStatus === 'accepted';
          const isAdmin = user?.role === 'admin';
          const canViewInfo = isAdmin ||
            profileModal.nameVisibility === 'all' ||
            (profileModal.nameVisibility === 'friend' && isAccepted);

          return (
            <div>
              {/* 이름 */}
              {canViewInfo && profileModal.realName ? (
                <div style={{ background: '#f0f5ff', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 14 }}>
                  <span style={{ color: '#888', fontSize: 12 }}>이름 </span>
                  <span style={{ fontWeight: 600 }}>{profileModal.realName}</span>
                </div>
              ) : !canViewInfo ? (
                <div style={{ background: '#fafafa', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 13, color: '#aaa' }}>
                  {profileModal.nameVisibility === 'none' ? '🔒 비공개 프로필입니다.' : '🔒 친구만 볼 수 있는 프로필입니다.'}
                </div>
              ) : null}

              {/* 입시 정보 */}
              {canViewInfo && (profileModal.admissionType || profileModal.avgGrade || profileModal.targetUniversity || profileModal.acceptanceRate != null) ? (
                <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 10 }}>입시 정보</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {profileModal.admissionType && (
                      <div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>전형</div>
                        <Tag color="blue" style={{ marginTop: 2 }}>
                          {profileModal.admissionType === 'susi' ? '수시' : '정시'}
                        </Tag>
                      </div>
                    )}
                    {profileModal.avgGrade && (
                      <div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>평균 등급</div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{profileModal.avgGrade}</div>
                      </div>
                    )}
                    {profileModal.targetUniversity && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: 11, color: '#aaa' }}>목표 대학</div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{profileModal.targetUniversity}</div>
                      </div>
                    )}
                    {profileModal.acceptanceRate != null && (
                      <div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>AI 합격률</div>
                        <Tag
                          color={profileModal.acceptanceRate >= 70 ? 'success' : profileModal.acceptanceRate >= 45 ? 'warning' : 'error'}
                          icon={<TrophyOutlined />}
                          style={{ marginTop: 2, fontWeight: 700 }}
                        >
                          {profileModal.acceptanceRate}%
                        </Tag>
                      </div>
                    )}
                  </div>
                </div>
              ) : canViewInfo ? (
                <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: '8px 0', marginBottom: 8 }}>
                  아직 입시 정보를 입력하지 않았습니다.
                </div>
              ) : null}

              <Divider style={{ margin: '12px 0' }} />

              {/* 친구 관계 버튼 */}
              {profileModal.friendshipStatus === 'accepted' ? (
                <Button block icon={<CheckOutlined />} disabled style={{ background: '#f6ffed', borderColor: '#b7eb8f', color: '#389e0d' }}>
                  친구
                </Button>
              ) : profileModal.friendshipStatus === 'pending_sent' ? (
                <Button block icon={<ClockCircleOutlined />} disabled>
                  친구 요청 보냄
                </Button>
              ) : profileModal.friendshipStatus === 'pending_received' ? (
                <Button block type="default" disabled>
                  친구 요청 받음 (마이페이지에서 수락)
                </Button>
              ) : (
                <Button
                  block
                  type="primary"
                  icon={<UserAddOutlined />}
                  loading={friendLoading}
                  onClick={handleFriendRequest}
                >
                  친구 추가
                </Button>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* 방 만들기 모달 */}
      <Modal
        title="새 채팅방 만들기"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        okText="만들기" cancelText="취소"
        confirmLoading={creating}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="방 이름"
            rules={[{ required: true, message: '방 이름을 입력하세요' }, { max: 30, message: '30자 이내로 입력하세요' }]}
          >
            <Input placeholder="예: 홍익대 기초디자인 스터디" maxLength={30} showCount />
          </Form.Item>

          <Form.Item name="tags" label="태그 (최대 5개)">
            <Select
              mode="tags"
              placeholder="태그 선택 또는 직접 입력"
              options={PRESET_TAGS.map((t) => ({ label: `#${t}`, value: t }))}
              maxCount={5}
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item name="max_members" label="최대 인원" initialValue={10}>
            <Slider min={2} max={10} marks={{ 2: '2명', 5: '5명', 10: '10명' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
