import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input, Row, Col, Card, Tag, Typography, Badge, Button } from 'antd';
import { SearchOutlined, LockOutlined, StarOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { getUniversities } from '@/api/client';

const { Title, Text } = Typography;

const regionColors: Record<string, string> = {
  서울: 'blue', 경기: 'green', 인천: 'cyan', 부산: 'orange',
};

interface University {
  id: string;
  name: string;
  department: string;
  region: string;
  admissionTypes: string[];
  applicationPeriod: string;
  hasPractice?: boolean;
  practiceSubjects?: string[];
  recruitCount?: string;
  suneungRatio?: string;
  practiceRatio?: string;
  competitionRate?: string;
  note?: string;
}

export default function Home() {
  const [search, setSearch] = useState(() => sessionStorage.getItem('artpass_search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [universities, setUniversities] = useState<University[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollToId = (location.state as { scrollToId?: string } | null)?.scrollToId;
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasSearch = debouncedSearch.trim().length > 0;

  useEffect(() => {
    getUniversities()
      .then(data => setUniversities(data as University[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      sessionStorage.setItem('artpass_search', search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!scrollToId || universities.length === 0) return;
    const el = cardRefs.current[scrollToId];
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [scrollToId, universities]);

  const universityNames = useMemo(() => [...new Set(universities.map(u => u.name))], [universities]);
  const filtered = useMemo(() =>
    hasSearch
      ? universities.filter(u =>
          u.name.includes(debouncedSearch) || u.department.includes(debouncedSearch) || u.region.includes(debouncedSearch)
        )
      : [],
  [hasSearch, debouncedSearch, universities]);

  return (
    <div>
      <div style={{
        textAlign: 'center',
        background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: hasSearch ? 'auto' : 'calc(100vh - 64px)',
        padding: hasSearch ? '40px' : undefined,
      }}>
        <Title level={2} style={{ marginBottom: 4, color: '#1677ff' }}>모든 디자인 입시 정보의 모음집!</Title>
        <Title level={3} style={{ marginTop: 0, marginBottom: 28, color: '#333', fontWeight: 400 }}>아트패스</Title>
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 8, display: 'block' }}>
          추가됐으면 하는 학교·학과는 1:1 채팅으로 문의해 주세요 😊
        </Text>
        <Input
          size="large"
          placeholder="대학명, 학과, 지역으로 검색"
          prefix={<SearchOutlined style={{ color: '#aaa' }} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 480, width: '100%', borderRadius: 8 }}
          allowClear autoFocus
        />
        {!user && (
          <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
            <LockOutlined /> 일부 상세 정보는{' '}
            <a onClick={() => navigate('/register')}>회원가입</a> 후 확인 가능합니다
          </Text>
        )}
        <Button
          type="primary"
          size="large"
          icon={<StarOutlined />}
          onClick={() => navigate('/feedback')}
          style={{ marginTop: 20, borderRadius: 8 }}
        >
          AI 실기 피드백 받기
        </Button>
        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 560 }}>
          {universityNames.map(name => (
            <Tag key={name} color="blue"
              style={{ cursor: 'pointer', fontSize: 13, padding: '4px 10px', borderRadius: 20 }}
              onClick={() => setSearch(name)}
            >{name}</Tag>
          ))}
        </div>
      </div>

      {hasSearch && (
        <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <Title level={5} style={{ marginBottom: 16, color: '#666' }}>검색 결과 {filtered.length}개</Title>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <Text type="secondary">검색 결과가 없습니다.</Text>
            </div>
          ) : (
            <Row gutter={[16, 16]}>
              {filtered.map(u => (
                <Col xs={24} sm={12} lg={8} key={u.id}>
                  <div ref={el => { cardRefs.current[u.id] = el; }}>
                  <Card hoverable onClick={() => navigate(`/university/${u.id}`)}
                    style={{
                      borderRadius: 12, height: '100%',
                      ...(scrollToId === u.id ? { boxShadow: '0 0 0 2px #1677ff', border: '1.5px solid #1677ff' } : {}),
                    }} styles={{ body: { padding: '20px' } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <Text strong style={{ fontSize: 16 }}>{u.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 13 }}>{u.department}</Text>
                      </div>
                      <Tag color={regionColors[u.region] || 'default'}>{u.region}</Tag>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      {u.admissionTypes.map(t => (
                        <Tag key={t} color={t === '수시' ? 'blue' : 'purple'}>{t}</Tag>
                      ))}
                    </div>
                    <div style={{ background: '#fafafa', borderRadius: 8, padding: '10px 12px' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>원서접수</Text>
                      <br />
                      <Text style={{ fontSize: 13 }}>{u.applicationPeriod}</Text>
                    </div>
                    {!user && (
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: 12 }}>
                        <LockOutlined /><span>실기 종목, 경쟁률 등 3개 항목 잠김</span>
                      </div>
                    )}
                    {user && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <Badge color="green" text={<Text style={{ fontSize: 12 }}>모집 {u.recruitCount}</Text>} />
                        <Badge color="orange" text={<Text style={{ fontSize: 12 }}>경쟁률 {u.competitionRate}</Text>} />
                      </div>
                    )}
                  </Card>
                  </div>
                </Col>
              ))}
            </Row>
          )}
        </div>
      )}
    </div>
  );
}
