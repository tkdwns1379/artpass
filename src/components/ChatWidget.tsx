import { useState, useEffect, useRef } from 'react';
import { Button, Input, Badge, Spin } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  senderRole: 'user' | 'admin';
  content: string;
  createdAt: string;
  readByUser: boolean;
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);

      const mapped: Message[] = (data ?? []).map(m => ({
        id: m.id,
        senderRole: m.sender_role as 'user' | 'admin',
        content: m.content,
        createdAt: m.created_at,
        readByUser: m.read_by_user,
      }));
      setMessages(mapped);
      setUnread(mapped.filter(m => m.senderRole === 'admin' && !m.readByUser).length);
    } catch {}
  }

  async function markRead() {
    if (!user) return;
    try {
      await supabase
        .from('messages')
        .update({ read_by_user: true })
        .eq('user_id', user.id)
        .eq('sender_role', 'admin');
      setUnread(0);
    } catch {}
  }

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (open) {
      markRead();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [open, messages]);

  async function handleSend() {
    if (!input.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        user_id: user.id,
        sender_role: 'user',
        content: input,
        read_by_admin: false,
        read_by_user: true,
      });
      if (error) throw new Error(error.message);
      setInput('');
      await fetchMessages();
    } catch (e: unknown) {
      const msg = (e as Error).message || '전송 실패';
      alert('메시지 전송 오류: ' + msg);
    } finally {
      setSending(false);
    }
  }

  if (!user || user.role === 'admin') return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      {open && (
        <div style={{
          width: 320, height: 440, background: '#fff', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column',
          marginBottom: 12, overflow: 'hidden',
        }}>
          {/* 헤더 */}
          <div style={{
            background: '#1677ff', color: '#fff', padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>아트패스 문의</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>관리자가 확인 후 답변드립니다</div>
            </div>
            <Button
              type="text" size="small" icon={<CloseOutlined />}
              onClick={() => setOpen(false)}
              style={{ color: '#fff' }}
            />
          </div>

          {/* 메시지 영역 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: '#f5f7fa' }}>
            {loading ? (
              <div style={{ textAlign: 'center', marginTop: 40 }}><Spin /></div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 13 }}>
                궁금한 점을 남겨주세요!<br />관리자가 답변드립니다.
              </div>
            ) : (
              messages.map(m => (
                <div key={m.id} style={{
                  display: 'flex',
                  justifyContent: m.senderRole === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 10,
                }}>
                  <div style={{
                    maxWidth: '75%', padding: '8px 12px', borderRadius: 12,
                    background: m.senderRole === 'user' ? '#1677ff' : '#fff',
                    color: m.senderRole === 'user' ? '#fff' : '#333',
                    fontSize: 13, lineHeight: 1.5,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    borderBottomRightRadius: m.senderRole === 'user' ? 4 : 12,
                    borderBottomLeftRadius: m.senderRole === 'admin' ? 4 : 12,
                  }}>
                    {m.senderRole === 'admin' && (
                      <div style={{ fontSize: 10, color: '#1677ff', marginBottom: 2, fontWeight: 600 }}>관리자</div>
                    )}
                    {m.content}
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, textAlign: 'right' }}>
                      {new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onPressEnter={handleSend}
              placeholder="메시지 입력..."
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
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Badge count={unread} offset={[-4, 4]}>
          <Button
            type="primary" shape="circle" size="large"
            icon={<MessageOutlined />}
            onClick={() => setOpen(v => !v)}
            style={{ width: 52, height: 52, fontSize: 20, boxShadow: '0 4px 12px rgba(22,119,255,0.4)' }}
          />
        </Badge>
      </div>
    </div>
  );
}
