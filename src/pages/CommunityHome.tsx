import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, Spin, message } from 'antd';
import { ReadOutlined, RightOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

interface Board {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
}

export default function CommunityHome() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoards();
  }, []);

  async function fetchBoards() {
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
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ margin: 0 }}>커뮤니티</Title>
        <Text type="secondary">디자인 입시생들과 함께 이야기해요</Text>
        <div style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, color: '#bbb' }}>
            ⚠ 욕설·비속어·혐오 표현 사용 시 경고 없이 이용이 제한될 수 있습니다.
          </Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {boards.map((board) => (
          <Col xs={24} sm={12} key={board.id}>
            <Card
              hoverable
              onClick={() => navigate(`/community/${board.id}`)}
              style={{ borderRadius: 12, cursor: 'pointer' }}
              styles={{ body: { padding: '24px 28px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: '#e6f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ReadOutlined style={{ fontSize: 22, color: '#1677ff' }} />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 16 }}>{board.name}</Text>
                    {board.description && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 13 }}>{board.description}</Text>
                      </div>
                    )}
                  </div>
                </div>
                <RightOutlined style={{ color: '#bbb' }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
