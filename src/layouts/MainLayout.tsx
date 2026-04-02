import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Button, Avatar, Dropdown, Typography, Space, Modal, Form, Input, message, Grid, Drawer, Divider } from 'antd';
import { UserOutlined, LogoutOutlined, LoginOutlined, EditOutlined, SettingOutlined, LockOutlined, MessageOutlined, TeamOutlined, ReadOutlined, MenuOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useFloatingChat } from '@/contexts/FloatingChatContext';
import { supabase } from '@/lib/supabase';
import ChatWidget from '@/components/ChatWidget';
import FloatingChat from '@/components/FloatingChat';
import FriendDrawer from '@/components/FriendDrawer';

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
  const [friendDrawerOpen, setFriendDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogoClick() {
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
        {/* 로고 + 데스크톱 네비게이션 */}
        <Space size={0} align="center" style={{ flexShrink: 0, overflow: 'hidden' }}>
          <Typography.Title level={4} style={{ margin: 0, cursor: 'pointer', color: '#1677ff', whiteSpace: 'nowrap' }} onClick={handleLogoClick}>
            디자인패스
          </Typography.Title>
          {screens.sm && (
            <>
              <div style={{ width: 1, height: 16, background: '#e0e0e0', margin: '0 8px' }} />
              <Button type="text" icon={<MessageOutlined />} onClick={() => navigate('/rooms')} style={{ color: '#555', fontWeight: 500, whiteSpace: 'nowrap' }}>
                소통 라운지
              </Button>
              <div style={{ width: 1, height: 16, background: '#e0e0e0', margin: '0 8px' }} />
              <Button type="text" icon={<ReadOutlined />} onClick={() => navigate('/community')} style={{ color: '#555', fontWeight: 500, whiteSpace: 'nowrap' }}>
                커뮤니티
              </Button>
              {user && (
                <>
                  <div style={{ width: 1, height: 16, background: '#e0e0e0', margin: '0 8px' }} />
                  <Button type="text" icon={<TeamOutlined />} onClick={() => setFriendDrawerOpen(true)} style={{ color: '#555', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    친구
                  </Button>
                </>
              )}
            </>
          )}
        </Space>

        {/* 우측: 데스크톱 유저 메뉴 / 모바일 햄버거 */}
        <Space size={4} style={{ flexShrink: 0 }}>
          {screens.sm ? (
            user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
                  <Avatar size="small" src={user.avatarUrl} icon={!user.avatarUrl ? <UserOutlined /> : undefined} style={{ backgroundColor: user.avatarUrl ? undefined : '#1677ff', flexShrink: 0 }} />
                  <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                </Button>
              </Dropdown>
            ) : (
              <>
                <Button icon={<LoginOutlined />} onClick={() => navigate('/login')}>로그인</Button>
                <Button type="primary" icon={<EditOutlined />} onClick={() => navigate('/register')}>회원가입</Button>
              </>
            )
          ) : (
            <>
              {user && (
                <Avatar size="small" src={user.avatarUrl} icon={!user.avatarUrl ? <UserOutlined /> : undefined} style={{ backgroundColor: user.avatarUrl ? undefined : '#1677ff' }} />
              )}
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 18 }} />}
                onClick={() => setMobileMenuOpen(true)}
                style={{ padding: '0 4px' }}
              />
            </>
          )}
        </Space>
      </Header>

      {/* 모바일 메뉴 Drawer */}
      <Drawer
        title="디자인패스"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        placement="right"
        width={220}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Button
            block type="text" icon={<MessageOutlined />}
            style={{ textAlign: 'left', justifyContent: 'flex-start' }}
            onClick={() => { navigate('/rooms'); setMobileMenuOpen(false); }}
          >소통 라운지</Button>
          <Button
            block type="text" icon={<ReadOutlined />}
            style={{ textAlign: 'left', justifyContent: 'flex-start' }}
            onClick={() => { navigate('/community'); setMobileMenuOpen(false); }}
          >커뮤니티</Button>
          {user && (
            <Button
              block type="text" icon={<TeamOutlined />}
              style={{ textAlign: 'left', justifyContent: 'flex-start' }}
              onClick={() => { setFriendDrawerOpen(true); setMobileMenuOpen(false); }}
            >친구</Button>
          )}
          <Divider style={{ margin: '8px 0' }} />
          {user ? (
            <>
              {user.role === 'admin' && (
                <Button
                  block type="text" icon={<SettingOutlined />}
                  style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                  onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}
                >관리자 페이지</Button>
              )}
              <Button
                block type="text" icon={<UserOutlined />}
                style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                onClick={() => { navigate('/mypage'); setMobileMenuOpen(false); }}
              >마이페이지</Button>
              <Button
                block type="text" icon={<LockOutlined />}
                style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                onClick={() => { setPwModalOpen(true); setMobileMenuOpen(false); }}
              >비밀번호 변경</Button>
              <Button
                block type="text" danger icon={<LogoutOutlined />}
                style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                onClick={() => { logout(); setMobileMenuOpen(false); }}
              >로그아웃</Button>
            </>
          ) : (
            <>
              <Button block icon={<LoginOutlined />} onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>로그인</Button>
              <Button block type="primary" icon={<EditOutlined />} onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} style={{ marginTop: 8 }}>회원가입</Button>
            </>
          )}
        </div>
      </Drawer>

      <Content style={
        isHome || isChatRoom
          ? { padding: 0, display: 'flex', flexDirection: 'column' }
          : { padding: screens.sm ? '32px 40px' : '16px 12px', maxWidth: 1200, margin: '0 auto', width: '100%' }
      }>
        <Outlet />
      </Content>

      {!isChatRoom && (
        <Footer style={{ textAlign: 'center', color: '#aaa', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
          디자인패스 © 2025 — 비공식 입시 정보 사이트
        </Footer>
      )}

      <ChatWidget />
      <FloatingChat />
      <FriendDrawer open={friendDrawerOpen} onClose={() => setFriendDrawerOpen(false)} />

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
