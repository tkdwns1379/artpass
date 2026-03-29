import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Input, Tag, Typography, Avatar, Spin, Popconfirm,
  message as antMessage, Tooltip, Drawer, Grid,
} from 'antd';
import {
  ArrowLeftOutlined, SendOutlined, UserOutlined,
  CrownFilled, SafetyCertificateFilled, StopOutlined, SwapOutlined, TeamOutlined,
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingChat } from '@/contexts/FloatingChatContext';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface RoomInfo {
  id: string;
  name: string;
  created_by: string;
  tags: string[];
  max_members: number;
}

interface Member {
  user_id: string;
  name: string;
  role: string;
}

interface ChatMsg {
  id: string;
  user_id: string | null;
  content: string;
  type: 'message' | 'system';
  created_at: string;
  sender_name?: string;
}

export default function ChatRoom() {
  const { id: roomId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { floatingRoom, isMinimized, minimizingRef, setFloatingRoom, expand, closeFloating } = useFloatingChat();

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kicked, setKicked] = useState(false);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.sm;

  const bottomRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);
  const [profileMap, setProfileMap] = useState<Record<string, { name: string; role: string }>>({});

  async function fetchProfiles(ids: string[]) {
    if (ids.length === 0) return {};
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role')
      .in('id', ids);
    const map: Record<string, { name: string; role: string }> = {};
    (data ?? []).forEach((p) => { map[p.id] = { name: p.name, role: p.role }; });
    setProfileMap((prev) => ({ ...prev, ...map }));
    return map;
  }

  async function fetchRoom() {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId!)
      .single();
    if (error || !data) { navigate('/rooms'); return; }
    setRoom(data as RoomInfo);
    // context에 방 정보 등록
    setFloatingRoom({ id: data.id, name: data.name });
  }

  async function fetchMembers(map?: Record<string, { name: string; role: string }>) {
    const { data } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId!);

    const ids = (data ?? []).map((m) => m.user_id);
    const profiles = map ?? profileMap;
    const missing = ids.filter((id) => !profiles[id]);
    let merged = profiles;
    if (missing.length > 0) {
      const { data: newProfiles } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('id', missing);
      const newMap: typeof profiles = { ...profiles };
      (newProfiles ?? []).forEach((p) => { newMap[p.id] = { name: p.name, role: p.role }; });
      setProfileMap(newMap);
      merged = newMap;
    }

    setMembers(
      ids.map((uid) => ({
        user_id: uid,
        name: merged[uid]?.name ?? uid.slice(0, 8),
        role: merged[uid]?.role ?? 'user',
      }))
    );
  }

  async function fetchMessages(map?: Record<string, { name: string; role: string }>) {
    const { data } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', roomId!)
      .order('created_at', { ascending: true })
      .limit(200);

    const ids = [...new Set((data ?? []).filter((m) => m.user_id).map((m) => m.user_id as string))];
    let profiles = map ?? profileMap;
    const missing = ids.filter((id) => !profiles[id]);
    if (missing.length > 0) {
      const { data: newP } = await supabase.from('profiles').select('id, name, role').in('id', missing);
      const newMap = { ...profiles };
      (newP ?? []).forEach((p) => { newMap[p.id] = { name: p.name, role: p.role }; });
      setProfileMap(newMap);
      profiles = newMap;
    }

    setMessages(
      (data ?? []).map((m) => ({
        id: m.id,
        user_id: m.user_id,
        content: m.content,
        type: m.type as 'message' | 'system',
        created_at: m.created_at,
        sender_name: m.user_id ? (profiles[m.user_id]?.name ?? m.user_id.slice(0, 8)) : undefined,
      }))
    );
  }

  const joinRoom = useCallback(async () => {
    if (!user || !roomId || joinedRef.current) return;
    joinedRef.current = true;

    const res = await supabase.functions.invoke('room-action', {
      body: { action: 'join', room_id: roomId },
    });

    if (res.error || res.data?.ok === false) {
      const errMsg = res.data?.error || res.error?.message || '입장에 실패했습니다.';
      antMessage.error(errMsg);
      joinedRef.current = false;
      navigate('/rooms');
    }
  }, [user?.id, roomId, navigate]);

  const leaveRoom = useCallback(async () => {
    if (!user || !roomId || !joinedRef.current) return;
    joinedRef.current = false;
    await supabase.functions.invoke('room-action', {
      body: { action: 'leave', room_id: roomId },
    });
  }, [user?.id, roomId]);

  // 명시적 퇴장 (뒤로가기 버튼)
  const handleExplicitLeave = useCallback(async () => {
    closeFloating();
    await leaveRoom();
    navigate('/rooms');
  }, [closeFloating, leaveRoom, navigate]);

  // FloatingChat에서 같은 방으로 돌아오면 expand
  useEffect(() => {
    if (floatingRoom?.id === roomId && isMinimized) {
      expand();
    }
  }, []);

  useEffect(() => {
    // auth 로딩 중에는 아무것도 하지 않음 (새로고침 시 로그인 리다이렉트 방지)
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!roomId) return;

    (async () => {
      try {
        await fetchRoom();
        const map = await fetchProfiles([user.id]);
        await fetchMessages(map);
        await joinRoom();
        await fetchMembers(map);
      } catch (err) {
        console.error('ChatRoom init error:', err);
      } finally {
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const msg = payload.new as { id: string; user_id: string | null; content: string; type: string; created_at: string };
          let senderName: string | undefined;
          if (msg.user_id) {
            setProfileMap((prev) => {
              senderName = prev[msg.user_id!]?.name;
              return prev;
            });
            if (!senderName) {
              const { data } = await supabase.from('profiles').select('id, name, role').eq('id', msg.user_id).single();
              if (data) {
                setProfileMap((prev) => ({ ...prev, [data.id]: { name: data.name, role: data.role } }));
                senderName = data.name;
              }
            }
          }
          setMessages((prev) => {
            // 낙관적으로 추가한 임시 메시지 제거 후 실제 메시지로 교체
            const filtered = prev.filter(
              (m) => !(m.id.startsWith('temp-') && m.user_id === msg.user_id && m.content === msg.content)
            );
            // 이미 있는 메시지면 중복 추가 방지
            if (filtered.some((m) => m.id === msg.id)) return filtered;
            return [
              ...filtered,
              {
                id: msg.id,
                user_id: msg.user_id,
                content: msg.content,
                type: msg.type as 'message' | 'system',
                created_at: msg.created_at,
                sender_name: senderName,
              },
            ];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (
            payload.eventType === 'DELETE' &&
            (payload.old as { user_id?: string })?.user_id === user?.id
          ) {
            setKicked(true);
          }
          // 방장 변경 감지를 위해 room 정보도 갱신
          fetchRoom();
          fetchMembers();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => { fetchRoom(); }
      )
      .subscribe();

    const handleBeforeUnload = () => { leaveRoom(); };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (minimizingRef.current) {
        // 미니채팅으로 전환 → leaveRoom 호출 안 함
        minimizingRef.current = false;
      } else {
        leaveRoom();
        closeFloating();
      }
    };
  }, [roomId, user?.id, authLoading]);

  useEffect(() => {
    if (kicked) {
      antMessage.error('방에서 추방되었습니다.', 3);
      joinedRef.current = false;
      closeFloating();
      navigate('/rooms');
    }
  }, [kicked, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !user || !roomId) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    // 낙관적 업데이트: 즉시 UI에 표시
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        user_id: user.id,
        content,
        type: 'message',
        created_at: new Date().toISOString(),
        sender_name: profileMap[user.id]?.name,
      },
    ]);

    try {
      const { error } = await supabase.from('room_messages').insert({
        room_id: roomId,
        user_id: user.id,
        content,
        type: 'message',
      });
      if (error) throw new Error(error.message);
    } catch {
      antMessage.error('메시지 전송 실패');
      setInput(content);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  async function handleKick(targetUserId: string) {
    const res = await supabase.functions.invoke('room-action', {
      body: { action: 'kick', room_id: roomId, target_user_id: targetUserId },
    });
    if (res.data?.ok === false) {
      antMessage.error(res.data.error);
    } else {
      antMessage.success('추방되었습니다.');
    }
  }

  async function handleTransfer(targetUserId: string) {
    const res = await supabase.functions.invoke('room-action', {
      body: { action: 'transfer', room_id: roomId, target_user_id: targetUserId },
    });
    if (res.data?.ok === false) {
      antMessage.error(res.data.error);
    } else {
      antMessage.success('방장을 위임했습니다.');
    }
  }

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  const isOwner = room?.created_by === user?.id;
  const isAdmin = user?.role === 'admin';

  function canKick(member: Member) {
    if (member.user_id === user?.id) return false;
    if (member.role === 'admin') return false;
    return isAdmin || isOwner;
  }

  function canTransfer(member: Member) {
    if (member.user_id === user?.id) return false;
    if (member.role === 'admin') return false;
    return isOwner || isAdmin;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
      {/* 상단 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid #f0f0f0',
        flexWrap: 'wrap',
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleExplicitLeave}
          type="text"
        />
        <div style={{ flex: 1 }}>
          <Text strong style={{ fontSize: 16 }}>{room?.name}</Text>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
            {room?.tags.map((tag) => (
              <Tag key={tag} color="blue" style={{ fontSize: 11, margin: 0 }}>#{tag}</Tag>
            ))}
          </div>
        </div>
        {isMobile ? (
          <Button
            type="text"
            icon={<TeamOutlined />}
            onClick={() => setMemberDrawerOpen(true)}
            style={{ color: '#555', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {members.length}명
          </Button>
        ) : (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {members.length}/{room?.max_members ?? 10}명
          </Text>
        )}
      </div>

      {/* 본문 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 채팅 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', background: '#f9fafb' }}>
            {messages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} style={{ textAlign: 'center', margin: '8px 0' }}>
                    <Text style={{ fontSize: 12, color: '#aaa', background: '#f0f0f0', padding: '2px 12px', borderRadius: 12 }}>
                      {msg.content}
                    </Text>
                  </div>
                );
              }

              const isMine = msg.user_id === user?.id;
              const senderName = msg.sender_name ?? profileMap[msg.user_id ?? '']?.name ?? '알 수 없음';

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                    marginBottom: 10,
                    gap: 8,
                    alignItems: 'flex-end',
                  }}
                >
                  {!isMine && (
                    <Avatar size={28} icon={<UserOutlined />} style={{ background: '#1677ff', flexShrink: 0 }} />
                  )}
                  <div style={{ maxWidth: '65%' }}>
                    {!isMine && (
                      <Text style={{ fontSize: 11, color: '#888', marginBottom: 2, display: 'block', marginLeft: 4 }}>
                        {senderName}
                      </Text>
                    )}
                    <div style={{
                      padding: '8px 12px', borderRadius: 14,
                      background: isMine ? '#1677ff' : '#fff',
                      color: isMine ? '#fff' : '#333',
                      fontSize: 14, lineHeight: 1.5,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      borderBottomRightRadius: isMine ? 4 : 14,
                      borderBottomLeftRadius: isMine ? 14 : 4,
                    }}>
                      {msg.content}
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, textAlign: 'right' }}>
                        {new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, background: '#fff' }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={handleSend}
              placeholder="메시지를 입력하세요..."
              style={{ borderRadius: 20 }}
              maxLength={500}
            />
            <Button
              type="primary" shape="circle" icon={<SendOutlined />}
              onClick={handleSend} loading={sending}
              disabled={!input.trim()}
            />
          </div>
        </div>

        {/* 멤버 사이드바 — 데스크톱만 */}
        {!isMobile && <div style={{
          width: 180, borderLeft: '1px solid #f0f0f0',
          background: '#fafafa', overflowY: 'auto',
          padding: '12px 0',
          flexShrink: 0,
        }}>
          <Text type="secondary" style={{ fontSize: 12, padding: '0 12px', display: 'block', marginBottom: 8 }}>
            참여자 {members.length}명
          </Text>
          {members.map((member) => {
            const isMe = member.user_id === user?.id;
            const isMemberOwner = member.user_id === room?.created_by;
            const isMemberAdmin = member.role === 'admin';

            return (
              <div
                key={member.user_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  background: isMe ? '#e6f4ff' : undefined,
                }}
              >
                <Avatar size={24} icon={<UserOutlined />} style={{ background: isMemberAdmin ? '#ff4d4f' : isMemberOwner ? '#faad14' : '#1677ff', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {isMemberAdmin && (
                      <Tooltip title="관리자">
                        <SafetyCertificateFilled style={{ color: '#ff4d4f', fontSize: 11 }} />
                      </Tooltip>
                    )}
                    {isMemberOwner && !isMemberAdmin && (
                      <Tooltip title="방장">
                        <CrownFilled style={{ color: '#faad14', fontSize: 11 }} />
                      </Tooltip>
                    )}
                    <Text
                      style={{ fontSize: 12, fontWeight: isMe ? 600 : 400 }}
                      ellipsis={{ tooltip: member.name }}
                    >
                      {member.name}
                    </Text>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {canTransfer(member) && (
                    <Popconfirm
                      title={`${member.name}님에게 방장을 위임할까요?`}
                      onConfirm={() => handleTransfer(member.user_id)}
                      okText="위임" cancelText="취소"
                      placement="left"
                    >
                      <Tooltip title="방장 위임">
                        <Button
                          type="text" size="small"
                          icon={<SwapOutlined />}
                          style={{ padding: 0, height: 20, width: 20, minWidth: 20, color: '#faad14' }}
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                  {canKick(member) && (
                    <Popconfirm
                      title={`${member.name}님을 추방할까요?`}
                      onConfirm={() => handleKick(member.user_id)}
                      okText="추방" cancelText="취소" okButtonProps={{ danger: true }}
                      placement="left"
                    >
                      <Button
                        type="text" size="small" danger
                        icon={<StopOutlined />}
                        style={{ padding: 0, height: 20, width: 20, minWidth: 20 }}
                      />
                    </Popconfirm>
                  )}
                </div>
              </div>
            );
          })}
        </div>}
      </div>

      {/* 모바일 참여자 Drawer */}
      <Drawer
        title={`참여자 ${members.length}명`}
        placement="right"
        open={memberDrawerOpen}
        onClose={() => setMemberDrawerOpen(false)}
        width={260}
        styles={{ body: { padding: '8px 0' } }}
      >
        {members.map((member) => {
          const isMe = member.user_id === user?.id;
          const isMemberOwner = member.user_id === room?.created_by;
          const isMemberAdmin = member.role === 'admin';

          return (
            <div
              key={member.user_id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px',
                background: isMe ? '#e6f4ff' : undefined,
                borderBottom: '1px solid #f5f5f5',
              }}
            >
              <Avatar size={32} icon={<UserOutlined />} style={{ background: isMemberAdmin ? '#ff4d4f' : isMemberOwner ? '#faad14' : '#1677ff', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isMemberAdmin && <SafetyCertificateFilled style={{ color: '#ff4d4f', fontSize: 12 }} />}
                  {isMemberOwner && !isMemberAdmin && <CrownFilled style={{ color: '#faad14', fontSize: 12 }} />}
                  <Text style={{ fontSize: 14, fontWeight: isMe ? 600 : 400 }} ellipsis>
                    {member.name}{isMe ? ' (나)' : ''}
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {canTransfer(member) && (
                  <Popconfirm
                    title={`${member.name}님에게 방장을 위임할까요?`}
                    onConfirm={() => { handleTransfer(member.user_id); setMemberDrawerOpen(false); }}
                    okText="위임" cancelText="취소"
                    placement="left"
                  >
                    <Tooltip title="방장 위임">
                      <Button type="text" size="small" icon={<SwapOutlined />} style={{ color: '#faad14' }} />
                    </Tooltip>
                  </Popconfirm>
                )}
                {canKick(member) && (
                  <Popconfirm
                    title={`${member.name}님을 추방할까요?`}
                    onConfirm={() => { handleKick(member.user_id); setMemberDrawerOpen(false); }}
                    okText="추방" cancelText="취소" okButtonProps={{ danger: true }}
                    placement="left"
                  >
                    <Button type="text" size="small" danger icon={<StopOutlined />} />
                  </Popconfirm>
                )}
              </div>
            </div>
          );
        })}
      </Drawer>
    </div>
  );
}
