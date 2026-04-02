import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Tag, Spin, Button, Row, Col, Card, Table, Divider } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, ToolOutlined, BankOutlined, RiseOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { getCareer, type Career } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

const difficultyColor: Record<string, string> = {
  낮음: 'green',
  보통: 'orange',
  높음: 'red',
};

const categoryColor: Record<string, string> = {
  '그래픽/브랜딩': 'blue',
  '디지털/IT': 'purple',
  '영상/모션': 'cyan',
  '게임': 'green',
  '산업디자인': 'orange',
  '공간디자인': 'gold',
  '패션': 'pink',
  '일러스트/캐릭터': 'magenta',
  '3D/VFX': 'geekblue',
};

export default function CareerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [career, setCareer] = useState<Career | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getCareer(id)
      .then(setCareer)
      .catch(() => navigate('/careers'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <Spin size="large" />
    </div>
  );

  if (!career) return null;

  // 비로그인 시 잠금 화면
  if (!user) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16, color: '#666' }}>
          취업 가이드로 돌아가기
        </Button>
        {/* 헤더는 공개 */}
        <div style={{
          background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)',
          borderRadius: 16, padding: '32px 40px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <span style={{ fontSize: 48 }}>{career.emoji}</span>
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <Tag color={categoryColor[career.category] || 'default'}>{career.category}</Tag>
                <Tag color={difficultyColor[career.difficulty] || 'default'}>취업 난이도 {career.difficulty}</Tag>
              </div>
              <Title level={2} style={{ margin: 0, color: '#1677ff' }}>{career.field}</Title>
            </div>
          </div>
          <Paragraph style={{ fontSize: 15, color: '#444', margin: 0 }}>{career.description}</Paragraph>
        </div>
        {/* 잠금 안내 */}
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: '#fafafa', borderRadius: 16,
          border: '1.5px dashed #d9d9d9',
        }}>
          <LockOutlined style={{ fontSize: 48, color: '#bbb', marginBottom: 16 }} />
          <Title level={4} style={{ color: '#555', marginBottom: 8 }}>회원 전용 콘텐츠</Title>
          <Paragraph style={{ color: '#888', marginBottom: 24 }}>
            연봉 상세 정보, 주요 취업처, 포트폴리오 전략 등<br />
            취업 가이드 전체 내용은 회원가입 후 무료로 확인할 수 있어요.
          </Paragraph>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button type="primary" size="large" icon={<UserOutlined />} onClick={() => navigate('/register')}
              style={{ borderRadius: 8 }}>
              무료 회원가입
            </Button>
            <Button size="large" onClick={() => navigate('/login')} style={{ borderRadius: 8 }}>
              로그인
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const salaryData = [
    { key: '1', level: '신입 (0~2년)', salary: career.salaryEntry },
    { key: '2', level: '경력 (3~5년)', salary: career.salaryMid },
    { key: '3', level: '시니어/팀장 (7년+)', salary: career.salarySenior },
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16, color: '#666' }}
      >
        취업 가이드로 돌아가기
      </Button>

      {/* 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)',
        borderRadius: 16,
        padding: '32px 40px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <span style={{ fontSize: 48 }}>{career.emoji}</span>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <Tag color={categoryColor[career.category] || 'default'}>{career.category}</Tag>
              <Tag color={difficultyColor[career.difficulty] || 'default'}>취업 난이도 {career.difficulty}</Tag>
            </div>
            <Title level={2} style={{ margin: 0, color: '#1677ff' }}>{career.field}</Title>
          </div>
        </div>
        <Paragraph style={{ fontSize: 15, color: '#444', margin: 0 }}>{career.description}</Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {/* 주요 업무 */}
        <Col xs={24} md={12}>
          <Card
            title={<><CheckCircleOutlined style={{ color: '#1677ff', marginRight: 8 }} />주요 업무</>}
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
              {career.mainTasks.map((t, i) => (
                <li key={i} style={{ marginBottom: 8, fontSize: 14 }}>{t}</li>
              ))}
            </ul>
          </Card>
        </Col>

        {/* 필요 스킬 */}
        <Col xs={24} md={12}>
          <Card
            title={<><ToolOutlined style={{ color: '#52c41a', marginRight: 8 }} />필요 기술 / 툴</>}
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {career.requiredSkills.map((s, i) => (
                <Tag key={i} color="blue" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 20 }}>{s}</Tag>
              ))}
            </div>
          </Card>
        </Col>

        {/* 연봉 */}
        <Col xs={24}>
          <Card
            title={<><RiseOutlined style={{ color: '#faad14', marginRight: 8 }} />연봉 현황 (2025년 기준)</>}
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: '0' } }}
          >
            <Table
              dataSource={salaryData}
              columns={[
                { title: '경력 단계', dataIndex: 'level', key: 'level', width: '45%' },
                { title: '연봉 범위', dataIndex: 'salary', key: 'salary', render: (v: string) => <Text strong style={{ color: '#1677ff' }}>{v}</Text> },
              ]}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        {/* 주요 취업처 */}
        <Col xs={24} md={12}>
          <Card
            title={<><BankOutlined style={{ color: '#722ed1', marginRight: 8 }} />주요 취업처</>}
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {career.majorEmployers.map((e, i) => (
                <Tag key={i} color="purple" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 20 }}>{e}</Tag>
              ))}
            </div>
          </Card>
        </Col>

        {/* 관련 학과 */}
        <Col xs={24} md={12}>
          <Card
            title={<><UserOutlined style={{ color: '#13c2c2', marginRight: 8 }} />관련 학과</>}
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {career.relatedDepartments.map((d, i) => (
                <Tag key={i} color="cyan" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 20 }}>{d}</Tag>
              ))}
            </div>
          </Card>
        </Col>

        {/* 포트폴리오 팁 */}
        <Col xs={24}>
          <Card
            title="💼 포트폴리오 핵심 전략"
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: '20px' } }}
          >
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>{career.portfolioTips}</Paragraph>
          </Card>
        </Col>

        {/* 커리어 패스 + 수요 전망 */}
        <Col xs={24} md={12}>
          <Card
            title="📈 커리어 성장 경로"
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: '20px' } }}
          >
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, margin: 0, color: '#444' }}>{career.careerPath}</Paragraph>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title="🔭 취업 시장 전망"
            style={{ borderRadius: 12, height: '100%' }}
            styles={{ body: { padding: '20px' } }}
          >
            <Paragraph style={{ fontSize: 14, lineHeight: 1.8, margin: 0, color: '#444' }}>{career.demandOutlook}</Paragraph>
          </Card>
        </Col>
      </Row>

      <Divider />
      <div style={{ textAlign: 'center', paddingBottom: 16 }}>
        <Button type="primary" onClick={() => navigate('/')}>입시 정보 보러 가기</Button>
      </div>
    </div>
  );
}
