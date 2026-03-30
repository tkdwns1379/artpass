import { useState, useEffect, useRef } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Typography, Tabs, Tag, Popconfirm, message, Space, Badge, List, Avatar } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined, CheckOutlined, UserOutlined, SendOutlined, FlagOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { getUniversities, mapUniversity } from '@/api/client';

const { Title } = Typography;

interface University {
  id: string;
  name: string;
  department: string;
  region: string;
  admissionTypes: string[];
  applicationPeriod: string;
  hasPractice: boolean;
  practiceSubjects: string[];
  recruitCount: string;
  suneungRatio: string;
  practiceRatio: string;
  competitionRate: string;
  note: string;
  tips?: string[];
  preparationGuide?: string;
  applicationTips?: string;
}

interface UserProfile {
  id: string;
  name: string;
  realName?: string | null;
  email: string;
  role: string;
  isPremium?: boolean;
  isBanned?: boolean;
  isConfirmed?: boolean;
  createdAt: string;
  userNumber?: number | null;
}

interface Report {
  id: string;
  reporterName: string;
  reportedName: string;
  messageContent: string;
  messageType: 'room' | 'dm';
  reasonCategory: string;
  reasonDetail: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

interface Conversation {
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface ChatMessage {
  id: string;
  senderRole: 'user' | 'admin';
  content: string;
  createdAt: string;
}

// university camelCase → snake_case (저장용)
function toSnakeCase(values: Partial<University>) {
  return {
    name: values.name,
    department: values.department,
    region: values.region,
    admission_types: values.admissionTypes,
    application_period: values.applicationPeriod,
    has_practice: values.hasPractice,
    practice_subjects: values.practiceSubjects,
    recruit_count: values.recruitCount,
    suneung_ratio: values.suneungRatio,
    practice_ratio: values.practiceRatio,
    competition_rate: values.competitionRate,
    note: values.note,
    tips: values.tips && values.tips.length > 0 ? values.tips : undefined,
    preparation_guide: values.preparationGuide || undefined,
    application_tips: values.applicationTips || undefined,
  };
}

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

export default function Admin() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<University | null>(null);
  const [form] = Form.useForm();

  // 닉네임 수정 모달
  const [nicknameModalUser, setNicknameModalUser] = useState<UserProfile | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);

  // 채팅 관련
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [newMsgModalOpen, setNewMsgModalOpen] = useState(false);
  const [newMsgUserId, setNewMsgUserId] = useState<string | undefined>();
  const [newMsgContent, setNewMsgContent] = useState('');

  // 신고 관련
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // 게시판 관리 관련
  const [boards, setBoards] = useState<{ id: string; name: string; description: string | null; display_order: number }[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [boardSaving, setBoardSaving] = useState(false);
  const [boardForm] = Form.useForm();

  // PDF 파싱 관련
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfResults, setPdfResults] = useState<University[]>([]);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [savingPdf, setSavingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // =============================================
  // 대학 목록 / 회원 목록
  // =============================================
  async function fetchUniversities() {
    try {
      const data = await getUniversities();
      setUniversities(data as University[]);
    } catch (e: unknown) {
      message.error((e as Error).message || '대학 목록을 불러오지 못했습니다.');
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      // 이메일 맵 가져오기 (Edge Function)
      let emailMap: Record<string, string> = {};
      const res = await supabase.functions.invoke('get-user-emails');
      if (res.data?.ok === false) {
        console.error('get-user-emails error:', res.data.error);
      } else {
        emailMap = res.data?.emailMap ?? {};
      }

      setUsers(
        (data ?? []).map(p => ({
          id: p.id,
          name: p.name,
          realName: p.real_name ?? null,
          email: emailMap[p.id] ?? '',
          role: p.role,
          isPremium: p.is_premium,
          isBanned: p.is_banned,
          isConfirmed: p.is_confirmed,
          createdAt: p.created_at,
          userNumber: p.user_number ?? null,
        }))
      );
    } catch (e: unknown) {
      message.error((e as Error).message || '회원 목록을 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    fetchUniversities();
    fetchUsers();
  }, []);

  // =============================================
  // 채팅 (messages 테이블 직접 사용)
  // =============================================
  async function fetchConversations() {
    try {
      // 각 user_id별 최신 메시지 + 안 읽은 수 집계
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      const grouped: Record<string, { msgs: typeof data; profile?: UserProfile }> = {};
      for (const msg of data ?? []) {
        if (!grouped[msg.user_id]) grouped[msg.user_id] = { msgs: [] };
        grouped[msg.user_id].msgs.push(msg);
      }

      const convs: Conversation[] = Object.entries(grouped).map(([userId, { msgs }]) => {
        const latest = msgs[0];
        const unread = msgs.filter(m => m.sender_role === 'user' && !m.read_by_admin).length;
        const profile = users.find(u => u.id === userId);
        return {
          userId,
          userName: profile?.name || userId.slice(0, 8),
          userEmail: profile?.email || '',
          lastMessage: latest?.content || '',
          lastAt: latest?.created_at || '',
          unread,
        };
      });

      setConversations(convs);
    } catch {}
  }

  async function fetchChatMessages(userId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);

      setChatMessages(
        (data ?? []).map(m => ({
          id: m.id,
          senderRole: m.sender_role as 'user' | 'admin',
          content: m.content,
          createdAt: m.created_at,
        }))
      );

      // 읽음 처리
      await supabase
        .from('messages')
        .update({ read_by_admin: true })
        .eq('user_id', userId)
        .eq('sender_role', 'user');

      fetchConversations();
    } catch {}
  }

  async function handleChatSend() {
    if (!chatInput.trim() || !selectedUserId) return;
    setChatSending(true);
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      const { error } = await supabase.from('messages').insert({
        user_id: selectedUserId,
        sender_role: 'admin',
        content: chatInput,
        read_by_admin: true,
        read_by_user: false,
      });
      if (error) throw new Error(error.message);
      setChatInput('');
      await fetchChatMessages(selectedUserId);
      void me;
    } catch {} finally {
      setChatSending(false);
    }
  }

  function selectConversation(userId: string) {
    setSelectedUserId(userId);
    fetchChatMessages(userId);
  }

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [users]);

  useEffect(() => {
    if (selectedUserId) {
      const interval = setInterval(() => fetchChatMessages(selectedUserId), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUserId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // =============================================
  // 대학 CRUD
  // =============================================
  function openAdd() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ admissionTypes: [], practiceSubjects: [], hasPractice: false });
    setModalOpen(true);
  }

  function openEdit(u: University) {
    setEditing(u);
    form.setFieldsValue({
      ...u,
      practiceSubjects: u.practiceSubjects?.join(', ') || '',
      tips: u.tips?.join('\n') || '',
      preparationGuide: u.preparationGuide || '',
      applicationTips: u.applicationTips || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    const data = toSnakeCase({
      ...values,
      practiceSubjects: values.practiceSubjects
        ? values.practiceSubjects.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      tips: values.tips
        ? values.tips.split('\n').filter(Boolean)
        : [],
    });

    try {
      if (editing) {
        const { error } = await supabase
          .from('universities')
          .update(data)
          .eq('id', editing.id);
        if (error) throw new Error(error.message);
        message.success('수정되었습니다.');
      } else {
        const { error } = await supabase
          .from('universities')
          .insert(data);
        if (error) throw new Error(error.message);
        message.success('추가되었습니다.');
      }
      setModalOpen(false);
      fetchUniversities();
    } catch (e: unknown) {
      message.error((e as Error).message || '저장에 실패했습니다.');
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('universities')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      message.success('삭제되었습니다.');
      fetchUniversities();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  }

  // =============================================
  // PDF 업로드 (Edge Function 또는 직접 파싱)
  // =============================================
  async function handlePdfUpload(file: File) {
    setPdfParsing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const { data, error } = await supabase.functions.invoke('pdf-parse', {
        body: formData,
      });
      if (error) throw new Error(error.message);
      const mapped = (data?.data ?? []).map((u: Record<string, unknown>) => mapUniversity(u) as unknown as University);
      setPdfResults(mapped);
      setPdfModalOpen(true);
    } catch (e: unknown) {
      message.error((e as Error).message || 'PDF 파싱에 실패했습니다.');
    } finally {
      setPdfParsing(false);
    }
  }

  async function handlePdfSave() {
    setSavingPdf(true);
    try {
      for (const u of pdfResults) {
        const { error } = await supabase
          .from('universities')
          .insert(toSnakeCase(u));
        if (error) throw new Error(error.message);
      }
      message.success(`${pdfResults.length}개 대학/학과가 추가되었습니다.`);
      setPdfModalOpen(false);
      setPdfResults([]);
      fetchUniversities();
    } catch (e: unknown) {
      message.error((e as Error).message || '저장에 실패했습니다.');
    } finally {
      setSavingPdf(false);
    }
  }

  // =============================================
  // 회원 관리
  // =============================================
  async function handleSaveNickname() {
    if (!nicknameModalUser || !nicknameInput.trim()) return;
    setNicknameSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: nicknameInput.trim() })
        .eq('id', nicknameModalUser.id);
      if (error) throw new Error(error.message);
      message.success('닉네임이 변경되었습니다.');
      setNicknameModalUser(null);
      fetchUsers();
    } catch (e: unknown) {
      message.error((e as Error).message || '변경에 실패했습니다.');
    } finally {
      setNicknameSaving(false);
    }
  }

  async function handleBanUser(id: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true })
        .eq('id', id);
      if (error) throw new Error(error.message);
      message.success('회원이 추방되었습니다.');
      fetchUsers();
    } catch (e: unknown) {
      message.error((e as Error).message || '추방에 실패했습니다.');
    }
  }

  async function handleUnbanUser(id: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: false })
        .eq('id', id);
      if (error) throw new Error(error.message);
      message.success('추방이 해제되었습니다.');
      fetchUsers();
    } catch (e: unknown) {
      message.error((e as Error).message || '처리에 실패했습니다.');
    }
  }

  async function handleSendNewMsg() {
    if (!newMsgUserId || !newMsgContent.trim()) return;
    try {
      const { error } = await supabase.from('messages').insert({
        user_id: newMsgUserId,
        sender_role: 'admin',
        content: newMsgContent.trim(),
        read_by_admin: true,
        read_by_user: false,
      });
      if (error) throw new Error(error.message);
      message.success('쪽지를 보냈습니다.');
      setNewMsgModalOpen(false);
      setNewMsgUserId(undefined);
      setNewMsgContent('');
      setSelectedUserId(newMsgUserId);
      fetchChatMessages(newMsgUserId);
      fetchConversations();
    } catch (e: unknown) {
      message.error((e as Error).message || '전송에 실패했습니다.');
    }
  }

  async function fetchReports() {
    setReportsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);

      const allIds = new Set([
        ...(data ?? []).map(r => r.reporter_id),
        ...(data ?? []).map(r => r.reported_user_id),
      ]);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', [...allIds]);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach(p => { nameMap[p.id] = p.name; });

      setReports(
        (data ?? []).map(r => ({
          id: r.id,
          reporterName: nameMap[r.reporter_id] ?? r.reporter_id.slice(0, 8),
          reportedName: nameMap[r.reported_user_id] ?? r.reported_user_id.slice(0, 8),
          messageContent: r.message_content,
          messageType: r.message_type,
          reasonCategory: r.reason_category,
          reasonDetail: r.reason_detail,
          status: r.status,
          createdAt: r.created_at,
        }))
      );
    } catch (e: unknown) {
      message.error((e as Error).message || '신고 목록을 불러오지 못했습니다.');
    } finally {
      setReportsLoading(false);
    }
  }

  // =============================================
  // 게시판 관리
  // =============================================
  async function fetchBoards() {
    setBoardsLoading(true);
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      setBoards(data ?? []);
    } catch (e: unknown) {
      message.error((e as Error).message || '게시판 목록을 불러오지 못했습니다.');
    } finally {
      setBoardsLoading(false);
    }
  }

  async function handleBoardAdd() {
    try {
      const values = await boardForm.validateFields();
      setBoardSaving(true);
      const maxOrder = boards.length > 0 ? Math.max(...boards.map(b => b.display_order)) + 1 : 0;
      const { error } = await supabase.from('boards').insert({
        name: values.name.trim(),
        description: values.description?.trim() || null,
        display_order: maxOrder,
      });
      if (error) throw new Error(error.message);
      message.success('게시판이 추가되었습니다.');
      setBoardModalOpen(false);
      boardForm.resetFields();
      fetchBoards();
    } catch (e: unknown) {
      message.error((e as Error).message || '게시판 추가에 실패했습니다.');
    } finally {
      setBoardSaving(false);
    }
  }

  async function handleBoardDelete(id: string) {
    try {
      const { error } = await supabase.from('boards').delete().eq('id', id);
      if (error) throw new Error(error.message);
      message.success('게시판이 삭제되었습니다.');
      fetchBoards();
    } catch (e: unknown) {
      message.error((e as Error).message || '게시판 삭제에 실패했습니다.');
    }
  }

  async function handleReportStatus(id: string, status: 'resolved' | 'dismissed') {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status })
        .eq('id', id);
      if (error) throw new Error(error.message);
      message.success(status === 'resolved' ? '처리 완료로 변경했습니다.' : '무시로 변경했습니다.');
      fetchReports();
    } catch (e: unknown) {
      message.error((e as Error).message || '처리에 실패했습니다.');
    }
  }

  async function handleTogglePremium(id: string, current: boolean) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_premium: !current })
        .eq('id', id);
      if (error) throw new Error(error.message);
      message.success(!current ? '프리미엄 승인 완료' : '프리미엄 해제 완료');
      fetchUsers();
    } catch (e: unknown) {
      message.error((e as Error).message || '처리에 실패했습니다.');
    }
  }

  // =============================================
  // 테이블 컬럼
  // =============================================
  const uniColumns = [
    { title: '대학', dataIndex: 'name', key: 'name', width: 130 },
    { title: '학과', dataIndex: 'department', key: 'department' },
    { title: '지역', dataIndex: 'region', key: 'region', width: 70 },
    {
      title: '전형', dataIndex: 'admissionTypes', key: 'admissionTypes', width: 100,
      render: (types: string[]) => types?.map(t => <Tag key={t} color={t === '수시' ? 'blue' : 'purple'}>{t}</Tag>),
    },
    {
      title: '실기', dataIndex: 'hasPractice', key: 'hasPractice', width: 60,
      render: (v: boolean) => v ? <Tag color="orange">있음</Tag> : <Tag>없음</Tag>,
    },
    {
      title: '관리', key: 'action', width: 90,
      render: (_: unknown, u: University) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(u)} />
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(u.id)} okText="삭제" cancelText="취소" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userColumns = [
    {
      title: '번호', dataIndex: 'userNumber', key: 'userNumber', width: 70,
      render: (v: number | null) => v != null ? <span style={{ color: '#888', fontSize: 12 }}>#{v}</span> : '-',
    },
    { title: '이름', dataIndex: 'realName', key: 'realName', width: 90,
      render: (v: string | null) => <span style={{ fontSize: 12 }}>{v || '-'}</span>,
    },
    { title: '닉네임', dataIndex: 'name', key: 'name', width: 100 },
    { title: '이메일', dataIndex: 'email', key: 'email', render: (v: string) => <span style={{ fontSize: 12 }}>{v || '-'}</span> },
    {
      title: '권한', dataIndex: 'role', key: 'role', width: 80,
      render: (role: string) => <Tag color={role === 'admin' ? 'red' : 'blue'}>{role === 'admin' ? '관리자' : '회원'}</Tag>,
    },
    {
      title: '프리미엄', dataIndex: 'isPremium', key: 'isPremium', width: 90,
      render: (v: boolean, u: UserProfile) => u.role === 'admin' ? null : (
        <Tag color={v ? 'gold' : 'default'}>
          {v ? '⭐ 프리미엄' : '일반'}
        </Tag>
      ),
    },
    {
      title: '가입일', dataIndex: 'createdAt', key: 'createdAt', width: 120,
      render: (v: string) => v?.slice(0, 10),
    },
    {
      title: '상태', key: 'status', width: 100,
      render: (_: unknown, u: UserProfile) => {
        if (u.isBanned) return <Tag color="red">추방됨</Tag>;
        if (!u.isConfirmed) return <Tag color="orange">인증대기</Tag>;
        return <Tag color="green">정상</Tag>;
      },
    },
    {
      title: '관리', key: 'action', width: 240,
      render: (_: unknown, u: UserProfile) => u.role === 'admin' ? null : (
        <Space>
          <Button
            size="small"
            onClick={() => { setNicknameModalUser(u); setNicknameInput(u.name); }}
          >
            닉네임
          </Button>
          {!u.isBanned && (
            <Button
              size="small"
              type={u.isPremium ? 'default' : 'primary'}
              onClick={() => handleTogglePremium(u.id, !!u.isPremium)}
            >
              {u.isPremium ? '해제' : '프리미엄'}
            </Button>
          )}
          {u.isBanned ? (
            <Popconfirm
              title={`${u.name} 회원의 추방을 해제하시겠습니까?`}
              onConfirm={() => handleUnbanUser(u.id)}
              okText="해제" cancelText="취소"
            >
              <Button size="small">추방해제</Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title={`${u.name} 회원을 추방하시겠습니까?`}
              onConfirm={() => handleBanUser(u.id)}
              okText="추방" cancelText="취소" okButtonProps={{ danger: true }}
            >
              <Button size="small" danger>추방</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>관리자 페이지</Title>

      {/* PDF 파일 인풋 (숨김) */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handlePdfUpload(file);
          e.target.value = '';
        }}
      />

      <Tabs onChange={(key) => {
        if (key === 'reports') fetchReports();
        if (key === 'boards') fetchBoards();
      }} items={[
        {
          key: 'universities',
          label: `대학 정보 관리 (${universities.length})`,
          children: (
            <>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={() => pdfInputRef.current?.click()}
                  loading={pdfParsing}
                >
                  {pdfParsing ? 'PDF 분석 중...' : 'PDF로 일괄 추가'}
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>대학/학과 추가</Button>
              </div>
              <Table
                dataSource={universities}
                columns={uniColumns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 20 }}
                scroll={{ x: 700 }}
              />
            </>
          ),
        },
        {
          key: 'users',
          label: `회원 목록 (${users.length})`,
          children: (
            <Table
              dataSource={users}
              columns={userColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20 }}
            />
          ),
        },
        {
          key: 'messages',
          label: (
            <Badge count={conversations.reduce((s, c) => s + c.unread, 0)} offset={[6, 0]}>
              쪽지함
            </Badge>
          ),
          children: (
            <>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="primary" icon={<SendOutlined />} onClick={() => setNewMsgModalOpen(true)}>
                새 쪽지 보내기
              </Button>
            </div>
            <div style={{ display: 'flex', height: 520, border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
              {/* 대화 목록 */}
              <div style={{ width: 240, borderRight: '1px solid #f0f0f0', overflowY: 'auto', background: '#fafafa' }}>
                {conversations.length === 0 ? (
                  <div style={{ padding: 24, color: '#aaa', textAlign: 'center', fontSize: 13 }}>문의가 없습니다</div>
                ) : (
                  <List
                    dataSource={conversations}
                    renderItem={c => (
                      <List.Item
                        onClick={() => selectConversation(c.userId)}
                        style={{
                          padding: '12px 16px', cursor: 'pointer',
                          background: selectedUserId === c.userId ? '#e6f4ff' : undefined,
                          borderLeft: selectedUserId === c.userId ? '3px solid #1677ff' : '3px solid transparent',
                        }}
                      >
                        <List.Item.Meta
                          avatar={<Avatar size="small" icon={<UserOutlined />} style={{ background: '#1677ff' }} />}
                          title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{c.userName}</span>
                              {c.unread > 0 && <Badge count={c.unread} size="small" />}
                            </div>
                          }
                          description={
                            <div style={{ fontSize: 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                              {c.lastMessage}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </div>

              {/* 채팅창 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {!selectedUserId ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13 }}>
                    왼쪽에서 회원을 선택하세요
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', background: '#fff', fontWeight: 600, fontSize: 13 }}>
                      {conversations.find(c => c.userId === selectedUserId)?.userName}
                      <span style={{ color: '#aaa', fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                        {conversations.find(c => c.userId === selectedUserId)?.userEmail}
                      </span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#f5f7fa' }}>
                      {chatMessages.map(m => (
                        <div key={m.id} style={{
                          display: 'flex',
                          justifyContent: m.senderRole === 'admin' ? 'flex-end' : 'flex-start',
                          marginBottom: 10,
                        }}>
                          <div style={{
                            maxWidth: '70%', padding: '8px 12px', borderRadius: 12,
                            background: m.senderRole === 'admin' ? '#1677ff' : '#fff',
                            color: m.senderRole === 'admin' ? '#fff' : '#333',
                            fontSize: 13, lineHeight: 1.5,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            borderBottomRightRadius: m.senderRole === 'admin' ? 4 : 12,
                            borderBottomLeftRadius: m.senderRole === 'user' ? 4 : 12,
                          }}>
                            {m.content}
                            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, textAlign: 'right' }}>
                              {new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={chatBottomRef} />
                    </div>
                    <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, background: '#fff' }}>
                      <Input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onPressEnter={handleChatSend}
                        placeholder="답장 입력..."
                        style={{ borderRadius: 20 }}
                        maxLength={500}
                      />
                      <Button
                        type="primary" shape="circle" icon={<SendOutlined />}
                        onClick={handleChatSend} loading={chatSending}
                        disabled={!chatInput.trim()}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            </>
          ),
        },
        {
          key: 'reports',
          label: (
            <Badge count={reports.filter(r => r.status === 'pending').length} offset={[6, 0]}>
              <FlagOutlined /> 신고현황
            </Badge>
          ),
          children: (
            <Table
              dataSource={reports}
              rowKey="id"
              size="small"
              loading={reportsLoading}
              pagination={{ pageSize: 20 }}
              columns={[
                {
                  title: '신고일시', dataIndex: 'createdAt', key: 'createdAt', width: 110,
                  render: (v: string) => <span style={{ fontSize: 11 }}>{v?.slice(0, 16).replace('T', ' ')}</span>,
                },
                {
                  title: '유형', dataIndex: 'messageType', key: 'messageType', width: 60,
                  render: (v: string) => <Tag color={v === 'room' ? 'blue' : 'purple'}>{v === 'room' ? '채팅방' : 'DM'}</Tag>,
                },
                { title: '신고자', dataIndex: 'reporterName', key: 'reporterName', width: 80 },
                { title: '피신고자', dataIndex: 'reportedName', key: 'reportedName', width: 80 },
                {
                  title: '사유', dataIndex: 'reasonCategory', key: 'reasonCategory', width: 100,
                  render: (v: string) => <Tag>{v}</Tag>,
                },
                {
                  title: '메시지', dataIndex: 'messageContent', key: 'messageContent',
                  render: (v: string) => (
                    <span style={{ fontSize: 12, color: '#555' }}>
                      {v?.slice(0, 50)}{v?.length > 50 ? '...' : ''}
                    </span>
                  ),
                },
                {
                  title: '상세', dataIndex: 'reasonDetail', key: 'reasonDetail', width: 120,
                  render: (v: string | null) => v ? <span style={{ fontSize: 11, color: '#888' }}>{v}</span> : <span style={{ color: '#ccc' }}>-</span>,
                },
                {
                  title: '상태', dataIndex: 'status', key: 'status', width: 80,
                  render: (v: string) => (
                    <Tag color={v === 'pending' ? 'orange' : v === 'resolved' ? 'green' : 'default'}>
                      {v === 'pending' ? '대기' : v === 'resolved' ? '처리완료' : '무시'}
                    </Tag>
                  ),
                },
                {
                  title: '처리', key: 'action', width: 130,
                  render: (_: unknown, r: Report) => r.status !== 'pending' ? null : (
                    <Space size={4}>
                      <Button size="small" type="primary" onClick={() => handleReportStatus(r.id, 'resolved')}>처리완료</Button>
                      <Button size="small" onClick={() => handleReportStatus(r.id, 'dismissed')}>무시</Button>
                    </Space>
                  ),
                },
              ]}
            />
          ),
        },
        {
          key: 'boards',
          label: '게시판 관리',
          children: (
            <>
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setBoardModalOpen(true)}>
                  게시판 추가
                </Button>
              </div>
              <Table
                dataSource={boards}
                rowKey="id"
                size="small"
                loading={boardsLoading}
                pagination={false}
                columns={[
                  {
                    title: '순서',
                    dataIndex: 'display_order',
                    key: 'display_order',
                    width: 60,
                    render: (v: number) => <span style={{ color: '#888' }}>{v}</span>,
                  },
                  {
                    title: '게시판명',
                    dataIndex: 'name',
                    key: 'name',
                    render: (v: string) => <strong>{v}</strong>,
                  },
                  {
                    title: '설명',
                    dataIndex: 'description',
                    key: 'description',
                    render: (v: string | null) => v ?? <span style={{ color: '#ccc' }}>-</span>,
                  },
                  {
                    title: '삭제',
                    key: 'action',
                    width: 80,
                    render: (_: unknown, record: { id: string; name: string }) => (
                      <Popconfirm
                        title={`"${record.name}" 게시판을 삭제하시겠습니까?`}
                        description="게시판의 모든 글과 댓글이 함께 삭제됩니다."
                        onConfirm={() => handleBoardDelete(record.id)}
                        okText="삭제"
                        cancelText="취소"
                        okButtonProps={{ danger: true }}
                      >
                        <Button size="small" icon={<DeleteOutlined />} danger>삭제</Button>
                      </Popconfirm>
                    ),
                  },
                ]}
              />
            </>
          ),
        },
      ]} />

      <Modal
        title={editing ? '대학/학과 수정' : '대학/학과 추가'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editing ? '수정' : '추가'}
        cancelText="취소"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="대학명" rules={[{ required: true, message: '대학명을 입력하세요' }]}>
            <Input placeholder="예: 홍익대학교" />
          </Form.Item>
          <Form.Item name="department" label="학과명" rules={[{ required: true, message: '학과명을 입력하세요' }]}>
            <Input placeholder="예: 시각디자인학과" />
          </Form.Item>
          <Form.Item name="region" label="지역" rules={[{ required: true, message: '지역을 선택하세요' }]}>
            <Select options={REGIONS.map(r => ({ label: r, value: r }))} placeholder="지역 선택" />
          </Form.Item>
          <Form.Item name="admissionTypes" label="전형 종류">
            <Select mode="multiple" options={[{ label: '수시', value: '수시' }, { label: '정시', value: '정시' }]} placeholder="전형 선택" />
          </Form.Item>
          <Form.Item name="applicationPeriod" label="원서접수 기간">
            <Input placeholder="예: 2025.09.08 ~ 09.12" />
          </Form.Item>
          <Form.Item name="hasPractice" label="실기 여부" valuePropName="checked">
            <Switch checkedChildren="있음" unCheckedChildren="없음" />
          </Form.Item>
          <Form.Item name="practiceSubjects" label="실기 종목">
            <Input placeholder="쉼표로 구분: 기초디자인, 발상과표현" />
          </Form.Item>
          <Form.Item name="recruitCount" label="모집인원">
            <Input placeholder="예: 수시 30명 / 정시 20명" />
          </Form.Item>
          <Form.Item name="suneungRatio" label="수능 반영 비율">
            <Input placeholder="예: 60% (정시)" />
          </Form.Item>
          <Form.Item name="practiceRatio" label="실기 비율">
            <Input placeholder="예: 40% (정시)" />
          </Form.Item>
          <Form.Item name="competitionRate" label="경쟁률">
            <Input placeholder="예: 14.15 : 1" />
          </Form.Item>
          <Form.Item name="note" label="특이사항">
            <Input.TextArea rows={2} placeholder="추가 설명" />
          </Form.Item>
          <Form.Item label="합격 팁" name="tips" help="한 줄씩 입력 (엔터로 구분)">
            <Input.TextArea rows={4} placeholder={"팁1\n팁2\n팁3"} />
          </Form.Item>
          <Form.Item label="준비 가이드" name="preparationGuide">
            <Input.TextArea rows={4} placeholder="수험생을 위한 준비 가이드" />
          </Form.Item>
          <Form.Item label="지원 팁" name="applicationTips">
            <Input.TextArea rows={3} placeholder="지원 전략 및 팁" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 새 쪽지 보내기 모달 */}
      <Modal
        title="새 쪽지 보내기"
        open={newMsgModalOpen}
        onOk={handleSendNewMsg}
        onCancel={() => { setNewMsgModalOpen(false); setNewMsgUserId(undefined); setNewMsgContent(''); }}
        okText="보내기" cancelText="취소"
      >
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select
            placeholder="받는 회원 선택"
            value={newMsgUserId}
            onChange={setNewMsgUserId}
            style={{ width: '100%' }}
            options={users.filter(u => u.role !== 'admin' && !u.isBanned).map(u => ({
              label: u.name || u.id.slice(0, 8),
              value: u.id,
            }))}
          />
          <Input.TextArea
            placeholder="내용을 입력하세요"
            value={newMsgContent}
            onChange={e => setNewMsgContent(e.target.value)}
            rows={4}
            maxLength={500}
          />
        </div>
      </Modal>

      {/* PDF 파싱 결과 확인 모달 */}
      <Modal
        title={`PDF 파싱 결과 — ${pdfResults.length}개 학과 발견`}
        open={pdfModalOpen}
        onOk={handlePdfSave}
        onCancel={() => { setPdfModalOpen(false); setPdfResults([]); }}
        okText={<><CheckOutlined /> 전체 저장</>}
        cancelText="취소"
        confirmLoading={savingPdf}
        width={700}
      >
        <p style={{ marginBottom: 12, color: '#888' }}>아래 내용을 확인하고 저장하세요. 잘못된 항목은 저장 후 수정 가능합니다.</p>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {pdfResults.map((u, i) => (
            <div key={i} style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 12, marginBottom: 8, background: '#fafafa' }}>
              <Space wrap>
                <Tag color="purple">{u.name}</Tag>
                <Tag color="blue">{u.department}</Tag>
                <Tag>{u.region}</Tag>
                {u.admissionTypes?.map(t => <Tag key={t} color={t === '수시' ? 'cyan' : 'geekblue'}>{t}</Tag>)}
                {u.hasPractice ? <Tag color="orange">실기있음</Tag> : <Tag>실기없음</Tag>}
              </Space>
              {u.recruitCount && <div style={{ marginTop: 4, fontSize: 12, color: '#555' }}>모집인원: {u.recruitCount}</div>}
              {u.applicationPeriod && <div style={{ fontSize: 12, color: '#555' }}>원서접수: {u.applicationPeriod}</div>}
              {u.note && <div style={{ fontSize: 12, color: '#888' }}>특이사항: {u.note}</div>}
            </div>
          ))}
        </div>
      </Modal>

      {/* 닉네임 수정 모달 */}
      <Modal
        title={`닉네임 변경 — ${nicknameModalUser?.name ?? ''}`}
        open={!!nicknameModalUser}
        onOk={handleSaveNickname}
        onCancel={() => setNicknameModalUser(null)}
        okText="저장" cancelText="취소"
        confirmLoading={nicknameSaving}
      >
        <Input
          value={nicknameInput}
          onChange={e => setNicknameInput(e.target.value)}
          placeholder="새 닉네임 입력"
          maxLength={7}
          style={{ marginTop: 12 }}
        />
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>한글 또는 영어만, 7자 이내</div>
      </Modal>

      {/* 게시판 추가 모달 */}
      <Modal
        title="게시판 추가"
        open={boardModalOpen}
        onOk={handleBoardAdd}
        onCancel={() => { setBoardModalOpen(false); boardForm.resetFields(); }}
        okText="추가"
        cancelText="취소"
        confirmLoading={boardSaving}
      >
        <Form form={boardForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="게시판 이름"
            rules={[{ required: true, message: '게시판 이름을 입력하세요' }]}
          >
            <Input placeholder="예: 작품 공유" maxLength={20} />
          </Form.Item>
          <Form.Item name="description" label="설명 (선택)">
            <Input placeholder="게시판에 대한 간단한 설명" maxLength={50} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
