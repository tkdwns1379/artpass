import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Avatar, Typography, message as antMsg, Tooltip } from 'antd';
import {
  SendOutlined, CloseOutlined, FullscreenOutlined,
  MinusOutlined, UserOutlined,
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingChat } from '@/contexts/FloatingChatContext';

const { Text } = Typography;

interface ChatMsg {
  id: string;
  user_id: string | null;
  content: string;
  type: 'message' | 'system';
  created_at: string;
  sender_name?: string;
}

export default function FloatingChat() {
  const { user } = useAuth();
  const { floatingRoom, isMinimized, expand, closeFloating } = useFloatingChat();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const profileMapRef = useRef<Record<string, string>>({});

  // 드래그 상태
  const [pos, setPos] = useState({ x: -1, y: -1 }); // -1은 초기화 전
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const roomId = floatingRoom?.id;

  // 초기 위치 설정 (window 크기 기준)
  useEffect(() => {
    setPos({ x: window.innerWidth - 370, y: window.innerHeight - 500 });
  }, []);

  // 메시지/멤버 로드 + 실시간 구독
  useEffect(() => {
    if (!roomId) return;
    setMessages([]);
    setMemberCount(0);

    (async () => {
      // 메시지 로드
      const { data } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      const userIds = [...new Set((data ?? []).filter(m => m.user_id).map(m => m.user_id as string))];
      const profiles: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: pData } = await supabase.from('profiles').select('id, name').in('id', userIds);
        (pData ?? []).forEach(p => { profiles[p.id] = p.name; });
        setProfileMap(profiles);
        profileMapRef.current = profiles;
      }

      setMessages((data ?? []).map(m => ({
        id: m.id,
        user_id: m.user_id,
        content: m.content,
        type: m.type as 'message' | 'system',
        created_at: m.created_at,
        sender_name: m.user_id ? profiles[m.user_id] : undefined,
      })));

      // 멤버 수
      const { count } = await supabase
        .from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', roomId);
      setMemberCount(count ?? 0);
    })();

    const channel = supabase
      .channel(`floating:${roomId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const msg = payload.new as { id: string; user_id: string | null; content: string; type: string; created_at: string };
          let senderName: string | undefined;
          if (msg.user_id) {
            senderName = profileMapRef.current[msg.user_id];
            if (!senderName) {
              const { data } = await supabase.from('profiles').select('id, name').eq('id', msg.user_id).single();
              if (data) {
                profileMapRef.current = { ...profileMapRef.current, [data.id]: data.name };
                setProfileMap({ ...profileMapRef.current });
                senderName = data.name;
              }
            }
          }
          setMessages(prev => [...prev, {
            id: msg.id, user_id: msg.user_id,
            content: msg.content, type: msg.type as 'message' | 'system',
            created_at: msg.created_at, sender_name: senderName,
          }]);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'DELETE' && (payload.old as { user_id?: string })?.user_id === user?.id) {
            antMsg.error('방에서 추방되었습니다.');
            closeFloating();
            return;
          }
          supabase.from('room_members').select('*', { count: 'exact', head: true }).eq('room_id', roomId)
            .then(({ count }) => setMemberCount(count ?? 0));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // 스크롤
  useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, collapsed]);

  // 드래그
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 340, e.clientX - dragStart.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragStart.current.y)),
      });
    };
    const handleMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  async function handleSend() {
    if (!input.trim() || !user || !roomId) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const { error } = await supabase.from('room_messages').insert({
        room_id: roomId, user_id: user.id, content, type: 'message',
      });
      if (error) throw error;
    } catch {
      antMsg.error('전송 실패');
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    if (roomId) {
      await supabase.functions.invoke('room-action', { body: { action: 'leave', room_id: roomId } });
    }
    closeFloating();
  }

  function handleExpand() {
    expand();
    navigate(`/rooms/${roomId}`);
  }

  if (!floatingRoom || !isMinimized || pos.x === -1) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 340,
        zIndex: 1100,
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        background: '#fff',
        border: '1px solid #e0e0e0',
        userSelect: 'none',
      }}
    >
      {/* 헤더 (드래그 영역) */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          background: '#1677ff',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'grab',
        }}
      >
        <Text
          style={{ color: '#fff', fontWeight: 600, flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          💬 {floatingRoom.name}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, flexShrink: 0 }}>
          {memberCount}명
        </Text>
        <Tooltip title={collapsed ? '펼치기' : '접기'}>
          <Button
            type="text" size="small" icon={<MinusOutlined />}
            onClick={(e) => { e.stopPropagation(); setCollapsed(c => !c); }}
            style={{ color: '#fff', padding: 0, height: 22, width: 22, minWidth: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </Tooltip>
        <Tooltip title="채팅방으로 이동">
          <Button
            type="text" size="small" icon={<FullscreenOutlined />}
            onClick={(e) => { e.stopPropagation(); handleExpand(); }}
            style={{ color: '#fff', padding: 0, height: 22, width: 22, minWidth: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </Tooltip>
        <Tooltip title="나가기">
          <Button
            type="text" size="small" icon={<CloseOutlined />}
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            style={{ color: '#fff', padding: 0, height: 22, width: 22, minWidth: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        </Tooltip>
      </div>

      {/* 채팅 본문 */}
      {!collapsed && (
        <>
          <div style={{ height: 300, overflowY: 'auto', padding: '8px 10px', background: '#f9fafb' }}>
            {messages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} style={{ textAlign: 'center', margin: '5px 0' }}>
                    <Text style={{ fontSize: 11, color: '#aaa', background: '#ebebeb', padding: '2px 10px', borderRadius: 10 }}>
                      {msg.content}
                    </Text>
                  </div>
                );
              }
              const isMine = msg.user_id === user?.id;
              const name = msg.sender_name ?? profileMap[msg.user_id ?? ''] ?? '알 수 없음';
              return (
                <div
                  key={msg.id}
                  style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8, gap: 5, alignItems: 'flex-end' }}
                >
                  {!isMine && (
                    <Avatar size={22} icon={<UserOutlined />} style={{ background: '#1677ff', flexShrink: 0 }} />
                  )}
                  <div style={{ maxWidth: '72%' }}>
                    {!isMine && (
                      <Text style={{ fontSize: 10, color: '#888', display: 'block', marginLeft: 3, marginBottom: 1 }}>{name}</Text>
                    )}
                    <div style={{
                      padding: '6px 10px', borderRadius: 12,
                      background: isMine ? '#1677ff' : '#fff',
                      color: isMine ? '#fff' : '#333',
                      fontSize: 12, lineHeight: 1.5,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                      borderBottomRightRadius: isMine ? 3 : 12,
                      borderBottomLeftRadius: isMine ? 12 : 3,
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '8px 10px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6, background: '#fff' }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={handleSend}
              placeholder="메시지 입력..."
              style={{ borderRadius: 16, fontSize: 12 }}
              maxLength={500}
            />
            <Button
              type="primary" shape="circle" size="small"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={sending}
              disabled={!input.trim()}
              style={{ flexShrink: 0 }}
            />
          </div>
        </>
      )}
    </div>
  );
}
