import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table, Button, Modal, Form, Input, Typography,
  Space, message, Breadcrumb, Tag, Checkbox,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, LikeOutlined,
  MessageOutlined, HomeOutlined,
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { filterBadWords } from '@/utils/badWordFilter';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Board {
  id: string;
  name: string;
  description: string | null;
}

interface Post {
  id: string;
  board_id: string;
  user_id: string;
  title: string;
  content: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  author_name?: string;
  is_notice: boolean;
}

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [writeLoading, setWriteLoading] = useState(false);
  const [writeForm] = Form.useForm();

  useEffect(() => {
    if (boardId) {
      fetchBoard();
    }
  }, [boardId]);

  useEffect(() => {
    if (boardId) {
      fetchPosts(page);
    }
  }, [boardId, page]);

  async function fetchBoard() {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('id, name, description')
        .eq('id', boardId)
        .single();
      if (error) throw new Error(error.message);
      setBoard(data);
    } catch (e: unknown) {
      message.error((e as Error).message || '게시판 정보를 불러오지 못했습니다.');
    }
  }

  async function fetchPosts(currentPage: number) {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('posts')
        .select('*', { count: 'exact' })
        .eq('board_id', boardId)
        .order('is_notice', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      const postList = data ?? [];

      // 작성자 이름 일괄 조회
      const userIds = [...new Set(postList.map(p => p.user_id))];
      let nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        nameMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.name]));
      }

      setPosts(postList.map(p => ({
        ...p,
        author_name: nameMap[p.user_id] ?? '알 수 없음',
      })));
      setTotal(count ?? 0);
    } catch (e: unknown) {
      message.error((e as Error).message || '게시글 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleWrite() {
    try {
      const values = await writeForm.validateFields();
      if (!user) {
        message.error('로그인이 필요합니다.');
        return;
      }
      setWriteLoading(true);
      const { error } = await supabase.from('posts').insert({
        board_id: boardId,
        user_id: user.id,
        title: values.title.trim(),
        content: values.content.trim(),
        is_notice: user.role === 'admin' ? (values.is_notice ?? false) : false,
      });
      if (error) throw new Error(error.message);
      message.success('게시글이 작성되었습니다.');
      setWriteModalOpen(false);
      writeForm.resetFields();
      setPage(1);
      fetchPosts(1);
    } catch (e: unknown) {
      message.error((e as Error).message || '게시글 작성에 실패했습니다.');
    } finally {
      setWriteLoading(false);
    }
  }

  const columns = [
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Post) => (
        <span
          style={{ cursor: 'pointer', color: '#1677ff', fontWeight: 500 }}
          onClick={() => navigate(`/community/${boardId}/${record.id}`)}
        >
          {record.is_notice && <Tag color="red" style={{ marginRight: 6 }}>공지</Tag>}
          {filterBadWords(title)}
        </span>
      ),
    },
    {
      title: '작성자',
      dataIndex: 'author_name',
      key: 'author_name',
      width: 100,
      render: (name: string) => <Text type="secondary" style={{ fontSize: 13 }}>{name}</Text>,
    },
    {
      title: '날짜',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {v?.slice(0, 10)}
        </Text>
      ),
    },
    {
      title: '조회',
      dataIndex: 'view_count',
      key: 'view_count',
      width: 70,
      render: (v: number) => (
        <Space size={4}>
          <EyeOutlined style={{ fontSize: 11, color: '#aaa' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: '댓글',
      dataIndex: 'comment_count',
      key: 'comment_count',
      width: 70,
      render: (v: number) => (
        <Space size={4}>
          <MessageOutlined style={{ fontSize: 11, color: '#aaa' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: '좋아요',
      dataIndex: 'like_count',
      key: 'like_count',
      width: 70,
      render: (v: number) => (
        <Space size={4}>
          <LikeOutlined style={{ fontSize: 11, color: '#aaa' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <HomeOutlined />, onClick: () => navigate('/'), style: { cursor: 'pointer' } },
          { title: '커뮤니티', onClick: () => navigate('/community'), style: { cursor: 'pointer' } },
          { title: board?.name ?? '...' },
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>{board?.name}</Title>
          {board?.description && (
            <Text type="secondary" style={{ fontSize: 14 }}>{board.description}</Text>
          )}
        </div>
        {user && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setWriteModalOpen(true)}
          >
            글쓰기
          </Button>
        )}
      </div>

      {!user && (
        <div style={{ marginBottom: 12 }}>
          <Tag color="default">로그인 후 글을 작성할 수 있습니다.</Tag>
        </div>
      )}

      <Table
        dataSource={posts}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: (p) => setPage(p),
          showSizeChanger: false,
        }}
        size="middle"
        rowClassName={(record: Post) => record.is_notice ? 'notice-row' : ''}
        onRow={(record) => ({
          onClick: (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'SPAN' || !target.style.cursor) {
              navigate(`/community/${boardId}/${record.id}`);
            }
          },
          style: {
            cursor: 'pointer',
            background: record.is_notice ? '#fff7e6' : undefined,
          },
        })}
      />

      <Modal
        title="글쓰기"
        open={writeModalOpen}
        onOk={handleWrite}
        onCancel={() => { setWriteModalOpen(false); writeForm.resetFields(); }}
        okText="작성"
        cancelText="취소"
        confirmLoading={writeLoading}
        width={600}
      >
        <Form form={writeForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력하세요' }, { max: 100, message: '100자 이내로 입력하세요' }]}
          >
            <Input placeholder="제목을 입력하세요" maxLength={100} />
          </Form.Item>
          <Form.Item
            name="content"
            label="내용"
            rules={[{ required: true, message: '내용을 입력하세요' }]}
          >
            <TextArea
              placeholder="내용을 입력하세요"
              rows={8}
              maxLength={5000}
              showCount
            />
          </Form.Item>
          {user?.role === 'admin' && (
            <Form.Item name="is_notice" valuePropName="checked">
              <Checkbox>공지사항으로 등록</Checkbox>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
