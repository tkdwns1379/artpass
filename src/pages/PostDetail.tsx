import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Button, Space, Divider, Spin, message,
  Modal, Form, Input, Select, Popconfirm, Breadcrumb, Tag,
} from 'antd';
import {
  LikeOutlined, LikeFilled, FlagOutlined,
  DeleteOutlined, EditOutlined, HomeOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

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
  updated_at: string;
  author_name?: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

const REPORT_REASONS = ['스팸', '욕설/비방', '불법정보', '기타'];

export default function PostDetail() {
  const { boardId, postId } = useParams<{ boardId: string; postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [boardName, setBoardName] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // 수정 모달
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  // 댓글 작성
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // 신고 모달
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState<string | undefined>(undefined);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (postId && boardId) {
      init();
    }
  }, [postId, boardId]);

  async function init() {
    setLoading(true);
    try {
      await Promise.all([fetchBoard(), fetchPost(), fetchComments()]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBoard() {
    const { data } = await supabase
      .from('boards')
      .select('name')
      .eq('id', boardId)
      .single();
    setBoardName(data?.name ?? '');
  }

  async function fetchPost() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();
    if (error) {
      message.error('게시글을 불러오지 못했습니다.');
      return;
    }
    // 작성자 이름
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', data.user_id)
      .single();
    setPost({ ...data, author_name: profile?.name ?? '알 수 없음' });

    // 조회수 증가
    await supabase.rpc('increment_view_count', { post_id: postId });

    // 좋아요 여부 확인
    if (user) {
      const { data: likeRow } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
      setLiked(!!likeRow);
    }
  }

  async function fetchComments() {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) {
      message.error('댓글을 불러오지 못했습니다.');
      return;
    }
    const commentList = data ?? [];
    const userIds = [...new Set(commentList.map(c => c.user_id))];
    let nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);
      nameMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.name]));
    }
    setComments(commentList.map(c => ({
      ...c,
      author_name: nameMap[c.user_id] ?? '알 수 없음',
    })));
  }

  async function handleLike() {
    if (!user) { message.warning('로그인이 필요합니다.'); return; }
    if (!post) return;
    setLikeLoading(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw new Error(error.message);
        setLiked(false);
        setPost(prev => prev ? { ...prev, like_count: prev.like_count - 1 } : prev);
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw new Error(error.message);
        setLiked(true);
        setPost(prev => prev ? { ...prev, like_count: prev.like_count + 1 } : prev);
      }
    } catch (e: unknown) {
      message.error((e as Error).message || '좋아요 처리에 실패했습니다.');
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleDeletePost() {
    if (!post) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw new Error(error.message);
      message.success('게시글이 삭제되었습니다.');
      navigate(`/community/${boardId}`);
    } catch (e: unknown) {
      message.error((e as Error).message || '게시글 삭제에 실패했습니다.');
    }
  }

  async function handleEditPost() {
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      const { error } = await supabase
        .from('posts')
        .update({ title: values.title.trim(), content: values.content.trim(), updated_at: new Date().toISOString() })
        .eq('id', postId);
      if (error) throw new Error(error.message);
      message.success('게시글이 수정되었습니다.');
      setEditModalOpen(false);
      await fetchPost();
    } catch (e: unknown) {
      message.error((e as Error).message || '게시글 수정에 실패했습니다.');
    } finally {
      setEditLoading(false);
    }
  }

  function openEditModal() {
    if (!post) return;
    editForm.setFieldsValue({ title: post.title, content: post.content });
    setEditModalOpen(true);
  }

  async function handleAddComment() {
    if (!user) { message.warning('로그인이 필요합니다.'); return; }
    if (!commentInput.trim()) { message.warning('댓글 내용을 입력하세요.'); return; }
    setCommentLoading(true);
    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: commentInput.trim(),
      });
      if (error) throw new Error(error.message);
      setCommentInput('');
      await fetchComments();
      // comment_count 갱신
      setPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev);
    } catch (e: unknown) {
      message.error((e as Error).message || '댓글 작성에 실패했습니다.');
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw new Error(error.message);
      message.success('댓글이 삭제되었습니다.');
      await fetchComments();
      setPost(prev => prev ? { ...prev, comment_count: Math.max(0, prev.comment_count - 1) } : prev);
    } catch (e: unknown) {
      message.error((e as Error).message || '댓글 삭제에 실패했습니다.');
    }
  }

  async function handleReport() {
    if (!user || !reportTarget || !reportReason) return;
    setReportLoading(true);
    try {
      const payload: Record<string, string> = {
        reporter_id: user.id,
        reason: reportReason,
      };
      if (reportTarget.type === 'post') {
        payload.post_id = reportTarget.id;
      } else {
        payload.comment_id = reportTarget.id;
      }
      const { error } = await supabase.from('post_reports').insert(payload);
      if (error) throw new Error(error.message);
      message.success('신고가 접수되었습니다.');
      setReportTarget(null);
      setReportReason(undefined);
    } catch (e: unknown) {
      message.error((e as Error).message || '신고 처리에 실패했습니다.');
    } finally {
      setReportLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Text type="secondary">게시글을 찾을 수 없습니다.</Text>
      </div>
    );
  }

  const isOwner = user?.id === post.user_id;
  const isAdmin = user?.role === 'admin';

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[
          { title: <HomeOutlined />, onClick: () => navigate('/'), style: { cursor: 'pointer' } },
          { title: '커뮤니티', onClick: () => navigate('/community'), style: { cursor: 'pointer' } },
          { title: boardName, onClick: () => navigate(`/community/${boardId}`), style: { cursor: 'pointer' } },
          { title: post.title.length > 20 ? post.title.slice(0, 20) + '...' : post.title },
        ]}
      />

      {/* 게시글 헤더 */}
      <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, padding: '28px 32px' }}>
        <Title level={3} style={{ marginBottom: 8 }}>{post.title}</Title>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Space size={16}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              <strong>{post.author_name}</strong>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {post.created_at?.slice(0, 16).replace('T', ' ')}
            </Text>
            <Space size={4}>
              <EyeOutlined style={{ fontSize: 11, color: '#aaa' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>{post.view_count}</Text>
            </Space>
          </Space>

          <Space>
            {(isOwner || isAdmin) && (
              <>
                <Button size="small" icon={<EditOutlined />} onClick={openEditModal}>수정</Button>
                <Popconfirm
                  title="게시글을 삭제하시겠습니까?"
                  onConfirm={handleDeletePost}
                  okText="삭제"
                  cancelText="취소"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" icon={<DeleteOutlined />} danger>삭제</Button>
                </Popconfirm>
              </>
            )}
            {user && !isOwner && (
              <Button
                size="small"
                icon={<FlagOutlined />}
                onClick={() => { setReportTarget({ type: 'post', id: post.id }); setReportReason(undefined); }}
              >
                신고
              </Button>
            )}
          </Space>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <Paragraph style={{ fontSize: 15, lineHeight: '1.8', whiteSpace: 'pre-wrap', minHeight: 80 }}>
          {post.content}
        </Paragraph>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            type={liked ? 'primary' : 'default'}
            icon={liked ? <LikeFilled /> : <LikeOutlined />}
            onClick={handleLike}
            loading={likeLoading}
            disabled={!user}
            style={{ minWidth: 100 }}
          >
            좋아요 {post.like_count > 0 && post.like_count}
          </Button>
        </div>
        {!user && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>로그인 후 좋아요를 누를 수 있습니다.</Text>
          </div>
        )}
      </div>

      {/* 댓글 목록 */}
      <div style={{ marginTop: 24, background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, padding: '24px 32px' }}>
        <Text strong style={{ fontSize: 15 }}>
          댓글 <Tag color="blue">{post.comment_count}</Tag>
        </Text>

        <div style={{ marginTop: 16 }}>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#bbb' }}>
              첫 번째 댓글을 남겨보세요
            </div>
          ) : (
            comments.map((comment, idx) => {
              const isCommentOwner = user?.id === comment.user_id;
              return (
                <div key={comment.id}>
                  {idx > 0 && <Divider style={{ margin: '12px 0' }} />}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <Space size={8}>
                        <Text strong style={{ fontSize: 13 }}>{comment.author_name}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {comment.created_at?.slice(0, 16).replace('T', ' ')}
                        </Text>
                      </Space>
                      <Paragraph style={{ margin: '6px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                        {comment.content}
                      </Paragraph>
                    </div>
                    <Space size={4} style={{ flexShrink: 0 }}>
                      {user && !isCommentOwner && (
                        <Button
                          type="text"
                          size="small"
                          icon={<FlagOutlined />}
                          style={{ color: '#aaa' }}
                          onClick={() => { setReportTarget({ type: 'comment', id: comment.id }); setReportReason(undefined); }}
                        />
                      )}
                      {(isCommentOwner || isAdmin) && (
                        <Popconfirm
                          title="댓글을 삭제하시겠습니까?"
                          onConfirm={() => handleDeleteComment(comment.id)}
                          okText="삭제"
                          cancelText="취소"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            danger
                          />
                        </Popconfirm>
                      )}
                    </Space>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 댓글 작성 */}
        {user ? (
          <div style={{ marginTop: 24, borderTop: '1px solid #f5f5f5', paddingTop: 20 }}>
            <TextArea
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              placeholder="댓글을 입력하세요..."
              rows={3}
              maxLength={1000}
              showCount
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                onClick={handleAddComment}
                loading={commentLoading}
                disabled={!commentInput.trim()}
              >
                댓글 작성
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 20, textAlign: 'center', padding: '16px 0', borderTop: '1px solid #f5f5f5' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              <Button type="link" size="small" onClick={() => navigate('/login')}>로그인</Button>
              후 댓글을 작성할 수 있습니다.
            </Text>
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      <Modal
        title="게시글 수정"
        open={editModalOpen}
        onOk={handleEditPost}
        onCancel={() => { setEditModalOpen(false); editForm.resetFields(); }}
        okText="수정"
        cancelText="취소"
        confirmLoading={editLoading}
        width={600}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력하세요' }, { max: 100, message: '100자 이내로 입력하세요' }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            name="content"
            label="내용"
            rules={[{ required: true, message: '내용을 입력하세요' }]}
          >
            <TextArea rows={8} maxLength={5000} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 신고 모달 */}
      <Modal
        title={reportTarget?.type === 'post' ? '게시글 신고' : '댓글 신고'}
        open={!!reportTarget}
        onOk={handleReport}
        onCancel={() => { setReportTarget(null); setReportReason(undefined); }}
        okText="신고 접수"
        cancelText="취소"
        confirmLoading={reportLoading}
        okButtonProps={{ disabled: !reportReason }}
      >
        <div style={{ marginTop: 16 }}>
          <Text>신고 사유를 선택하세요.</Text>
          <Select
            style={{ width: '100%', marginTop: 12 }}
            placeholder="신고 사유 선택"
            value={reportReason}
            onChange={v => setReportReason(v)}
          >
            {REPORT_REASONS.map(r => (
              <Option key={r} value={r}>{r}</Option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
