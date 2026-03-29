import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Button, Avatar, Dropdown, Typography, Space, Modal, Form, Input, message, Grid } from 'antd';
import { UserOutlined, LogoutOutlined, LoginOutlined, EditOutlined, SettingOutlined, LockOutlined, MessageOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingChat } from '@/contexts/FloatingChatContext';
import { supabase } from '@/lib/supabase';
import ChatWidget from '@/components/ChatWidget';
import FloatingChat from '@/components/FloatingChat';

const { Header, Content, Footer } = Layout;

const { useBreakpoint } = Grid;

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { floatingRoom, minimize } = useFloatingChat();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isHome = location.pathname === '/';
  const isChatRoom = /^\/rooms\/.+/.test(location.pathname);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwForm] = Form.useForm();

  function handleLogoClick() {
    // 채팅방 안에 있을 때 로고 클릭 → 미니 채팅으로 전환
    if (isChatRoom && floatingRoom) {
      minimize();
    }
    navigate('/');
  }

  async function handleChangePassword() {
    const values = await pwForm.validateFields();
    if (values.newPassword !== values.confirmPassword) {
      message.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.newPassword });
      if (error) throw new Error(error.message);
      message.success('비밀번호가 변경되었습니다.');
      setPwModalOpen(false);
      pwForm.resetFields();
    } catch (e: unknown) {
      message.error((e as Error).message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setPwLoading(false);
    }
  }

  const userMenuItems = [
    ...(user?.role === 'admin' ? [{
      key: 'admin',
      icon: <SettingOutlined />,
      label: '관리자 페이지',
      onClick: () => navigate('/admin'),
    }] : []),
    {
      key: 'mypage',
      icon: <UserOutlined />,
      label: '마이페이지',
      onClick: () => navigate('/mypage'),
    },
    {
      key: 'password',
      icon: <LockOutlined />,
      label: '비밀번호 변경',
      onClick: () => setPwModalOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      danger: true,
      onClick: () => logout(),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#fff',
        padding: screens.sm ? '0 40px' : '0 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <Space size={0} align="center" style={{ flexShrink: 0 }}>
          <Typography.Title level={4} style={{ margin: 0, cursor: 'pointer', color: '#1677ff', whiteSpace: 'nowrap' }} onClick={handleLogoClick}>
            아트패스
          </Typography.Title>
          <div style={{ width: 1, height: 16, background: '#e0e0e0', margin: '0 8px' }} />
          <Button type="text" icon={<MessageOutlined />} onClick={() => navigate('/rooms')} style={{ color: '#555', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {screens.sm ? '소통 라운지' : '라운지'}
          </Button>
        </Space>

        <Space size={screens.sm ? 8 : 4} style={{ flexShrink: 0 }}>
          {user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff', flexShrink: 0 }} />
                {screens.sm && <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>}
              </Button>
            </Dropdown>
          ) : (
            <>
              <Button size={screens.sm ? 'middle' : 'small'} icon={<LoginOutlined />} onClick={() => navigate('/login')}>
                {screens.sm ? '로그인' : '로그인'}
              </Button>
              <Button size={screens.sm ? 'middle' : 'small'} type="primary" icon={<EditOutlined />} onClick={() => navigate('/register')}>
                {screens.sm ? '회원가입' : '가입'}
              </Button>
            </>
          )}
        </Space>
      </Header>

      <Content style={
        isHome || isChatRoom
          ? { padding: 0, display: 'flex', flexDirection: 'column' }
          : { padding: screens.sm ? '32px 40px' : '16px 12px', maxWidth: 1200, margin: '0 auto', width: '100%' }
      }>
        <Outlet />
      </Content>

      {!isChatRoom && (
        <Footer style={{ textAlign: 'center', color: '#aaa', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
          아트패스 © 2025 — 비공식 입시 정보 사이트
        </Footer>
      )}

      <ChatWidget />
      <FloatingChat />

      <Modal
        title="비밀번호 변경"
        open={pwModalOpen}
        onOk={handleChangePassword}
        onCancel={() => { setPwModalOpen(false); pwForm.resetFields(); }}
        okText="변경" cancelText="취소"
        confirmLoading={pwLoading}
      >
        <Form form={pwForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="newPassword" label="새 비밀번호" rules={[{ required: true, min: 6, message: '6자 이상 입력하세요' }]}>
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item name="confirmPassword" label="새 비밀번호 확인" rules={[{ required: true, message: '비밀번호를 다시 입력하세요' }]}>
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
