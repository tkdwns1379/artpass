import { useState, useEffect, useRef } from 'react';
import {
  Drawer, Tabs, Avatar, Button, Input, Badge, Empty, Spin,
  Popconfirm, Typography, message as antMessage,
} from 'antd';
import {
  UserOutlined, CheckOutlined, CloseOutlined,
  SendOutlined, ArrowLeftOutlined, MessageOutlined,
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { Text } = Typography;

interface Friend {
  friendshipId: string;
  userId: string;
  name: string;
  role: string;
  status: 'pending' | 'accepted';
  isMine: boolean; // 내가 요청한 경우 true
}

interface DM {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readByReceiver: boolean;
}

interface FriendDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function FriendDrawer({ open, onClose }: FriendDrawerProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatFriend, setChatFriend] = useState<Friend | null>(null);
  const [dms, setDms] = useState<DM[]>([]);
  const [dmLoading, setDmLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchFriends() {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const otherIds = (data ?? []).map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      if (otherIds.length === 0) { setFriends([]); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('id', otherIds);

      const profileMap: Record<string, { name: string; role: string }> = {};
      (profiles ?? []).forEach(p => { profileMap[p.id] = { name: p.name, role: p.role }; });

      setFriends(
        (data ?? []).map(f => {
          const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
          return {
            friendshipId: f.id,
            userId: otherId,
            name: profileMap[otherId]?.name ?? '알 수 없음',
            role: profileMap[otherId]?.role ?? 'user',
            status: f.status,
            isMine: f.requester_id === user.id,
          };
        })
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && user) fetchFriends();
  }, [open, user]);

  // 친구 수락
  async function handleAccept(friendshipId: string) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    antMessage.success('친구 요청을 수락했습니다.');
    fetchFriends();
  }

  // 친구 거절 / 삭제
  async function handleDelete(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    antMessage.success('처리되었습니다.');
    if (chatFriend?.friendshipId === friendshipId) setChatFriend(null);
    fetchFriends();
  }

  // DM 불러오기
  async function fetchDMs(friendId: string) {
    if (!user) return;
    setDmLoading(true);
    try {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })
        .limit(200);

      setDms(
        (data ?? []).map(m => ({
          id: m.id,
          senderId: m.sender_id,
          content: m.content,
          createdAt: m.created_at,
          readByReceiver: m.read_by_receiver,
        }))
      );

      // 읽음 처리
      await supabase
        .from('direct_messages')
        .update({ read_by_receiver: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', friendId);
    } finally {
      setDmLoading(false);
    }
  }

  function openChat(friend: Friend) {
    setChatFriend(friend);
    fetchDMs(friend.userId);
  }

  useEffect(() => {
    if (!chatFriend || !user) return;
    const channel = supabase
      .channel(`dm:${[user.id, chatFriend.userId].sort().join('-')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const m = payload.new as { id: string; sender_id: string; content: string; created_at: string; read_by_receiver: boolean };
          if (
            (m.sender_id === chatFriend.userId) ||
            (m.sender_id === user.id)
          ) {
            setDms(prev => {
              if (prev.some(d => d.id === m.id)) return prev;
              return [...prev, { id: m.id, senderId: m.sender_id, content: m.content, createdAt: m.created_at, readByReceiver: m.read_by_receiver }];
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatFriend, user]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [dms]);

  async function handleSend() {
    if (!input.trim() || !user || !chatFriend) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      await supabase.from('direct_messages').insert({
        sender_id: user.id,
        receiver_id: chatFriend.userId,
        content,
        read_by_receiver: false,
      });
    } catch {
      antMessage.error('전송 실패');
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  const accepted = friends.filter(f => f.status === 'accepted');
  const incoming = friends.filter(f => f.status === 'pending' && !f.isMine);
  const outgoing = friends.filter(f => f.status === 'pending' && f.isMine);

  const pendingCount = incoming.length;

  function renderMember(f: Friend) {
    return (
      <div key={f.friendshipId} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderBottom: '1px solid #f5f5f5',
      }}>
        <Avatar size={36} icon={<UserOutlined />}
          style={{ background: f.role === 'admin' ? '#ff4d4f' : '#1677ff', flexShrink: 0 }} />
        <Text style={{ flex: 1 }} ellipsis>{f.name}</Text>
        <Button size="small" icon={<MessageOutlined />} onClick={() => openChat(f)}>대화</Button>
        <Popconfirm title="친구를 삭제할까요?" onConfirm={() => handleDelete(f.friendshipId)} okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}>
          <Button size="small" danger icon={<CloseOutlined />} />
        </Popconfirm>
      </div>
    );
  }

  // 1:1 채팅 뷰
  if (chatFriend) {
    return (
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={() => setChatFriend(null)} />
            <Avatar size={28} icon={<UserOutlined />} style={{ background: '#1677ff' }} />
            <span>{chatFriend.name}</span>
          </div>
        }
        open={open}
        onClose={() => { setChatFriend(null); onClose(); }}
        width={320}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
      >
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#f9fafb', minHeight: 0, height: 'calc(100vh - 130px)' }}>
          {dmLoading ? (
            <div style={{ textAlign: 'center', marginTop: 40 }}><Spin /></div>
          ) : dms.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 13 }}>
              첫 메시지를 보내보세요!
            </div>
          ) : (
            dms.map(m => {
              const isMine = m.senderId === user?.id;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                  <div style={{
                    maxWidth: '75%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                    background: isMine ? '#1677ff' : '#fff', color: isMine ? '#fff' : '#333',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    borderBottomRightRadius: isMine ? 4 : 12,
                    borderBottomLeftRadius: isMine ? 12 : 4,
                  }}>
                    {m.content}
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, textAlign: 'right' }}>
                      {new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, background: '#fff' }}>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onPressEnter={handleSend}
            placeholder="메시지 입력..."
            style={{ borderRadius: 20 }}
            maxLength={500}
          />
          <Button type="primary" shape="circle" icon={<SendOutlined />} onClick={handleSend} loading={sending} disabled={!input.trim()} />
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      title="친구 목록"
      open={open}
      onClose={onClose}
      width={320}
      styles={{ body: { padding: 0 } }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : (
        <Tabs
          defaultActiveKey="friends"
          style={{ padding: '0 4px' }}
          items={[
            {
              key: 'friends',
              label: `친구 (${accepted.length})`,
              children: accepted.length === 0 ? (
                <Empty description="아직 친구가 없어요" style={{ marginTop: 40 }} />
              ) : (
                <div>{accepted.map(renderMember)}</div>
              ),
            },
            {
              key: 'requests',
              label: (
                <Badge count={pendingCount} offset={[6, -2]} size="small">
                  요청
                </Badge>
              ),
              children: (
                <div>
                  {incoming.length > 0 && (
                    <>
                      <Text type="secondary" style={{ fontSize: 12, padding: '8px 16px', display: 'block' }}>받은 요청</Text>
                      {incoming.map(f => (
                        <div key={f.friendshipId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #f5f5f5' }}>
                          <Avatar size={36} icon={<UserOutlined />} style={{ background: '#1677ff', flexShrink: 0 }} />
                          <Text style={{ flex: 1 }} ellipsis>{f.name}</Text>
                          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleAccept(f.friendshipId)} />
                          <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleDelete(f.friendshipId)} />
                        </div>
                      ))}
                    </>
                  )}
                  {outgoing.length > 0 && (
                    <>
                      <Text type="secondary" style={{ fontSize: 12, padding: '8px 16px', display: 'block' }}>보낸 요청</Text>
                      {outgoing.map(f => (
                        <div key={f.friendshipId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #f5f5f5' }}>
                          <Avatar size={36} icon={<UserOutlined />} style={{ background: '#1677ff', flexShrink: 0 }} />
                          <Text style={{ flex: 1 }} ellipsis>{f.name}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>대기 중</Text>
                          <Button size="small" danger icon={<CloseOutlined />} onClick={() => handleDelete(f.friendshipId)} />
                        </div>
                      ))}
                    </>
                  )}
                  {incoming.length === 0 && outgoing.length === 0 && (
                    <Empty description="친구 요청이 없어요" style={{ marginTop: 40 }} />
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
    </Drawer>
  );
}
