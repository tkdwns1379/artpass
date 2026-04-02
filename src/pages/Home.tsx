import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input, Row, Col, Card, Tag, Typography, Badge, Button, Grid, Segmented, Spin } from 'antd';
import { SearchOutlined, LockOutlined, StarOutlined, RiseOutlined } from '@ant-design/icons';

const { useBreakpoint } = Grid;
import { useAuth } from '@/contexts/AuthContext';
import { getUniversities, getCareers, type Career } from '@/api/client';

const { Title, Text } = Typography;

const regionColors: Record<string, string> = {
  서울: 'blue', 경기: 'green', 인천: 'cyan', 부산: 'orange',
};

const difficultyColor: Record<string, string> = {
  낮음: 'green', 보통: 'orange', 높음: 'red',
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
  const [mode, setMode] = useState<'입시' | '취업'>(() =>
    (sessionStorage.getItem('designpass_mode') as '입시' | '취업') || '입시'
  );
  const [search, setSearch] = useState(() => sessionStorage.getItem('designpass_search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [universities, setUniversities] = useState<University[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [careersLoading, setCareersLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const scrollToId = (location.state as { scrollToId?: string } | null)?.scrollToId;
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasSearch = debouncedSearch.trim().length > 0;

  useEffect(() => {
    getUniversities()
      .then(data => setUniversities(data as University[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === '취업' && careers.length === 0) {
      setCareersLoading(true);
      getCareers()
        .then(setCareers)
        .catch(() => {})
        .finally(() => setCareersLoading(false));
    }
  }, [mode, careers.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      sessionStorage.setItem('designpass_search', search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    sessionStorage.setItem('designpass_mode', mode);
  }, [mode]);

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

  const careerCategories = useMemo(() => [...new Set(careers.map(c => c.category))], [careers]);

  const isHeroFull = mode === '입시' ? !hasSearch : true;

  return (
    <div>
      <div style={{
        textAlign: 'center',
        background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: isHeroFull ? 'calc(100vh - 64px)' : 'auto',
        padding: isHeroFull ? (screens.sm ? undefined : '0 16px') : (screens.sm ? '40px' : '24px 16px'),
      }}>
        <Title level={2} style={{ marginBottom: 4, color: '#1677ff' }}>모든 디자인 정보의 모음집!</Title>
        <Title level={3} style={{ marginTop: 0, marginBottom: 20, color: '#333', fontWeight: 400 }}>디자인패스</Title>

        {/* 입시 / 취업 토글 */}
        <Segmented
          value={mode}
          onChange={v => setMode(v as '입시' | '취업')}
          options={[
            { label: '🎓 입시 정보', value: '입시' },
            { label: '💼 취업 가이드', value: '취업' },
          ]}
          size="large"
          style={{ marginBottom: 24, fontWeight: 600 }}
        />

        {mode === '입시' && (
          <>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 4, display: 'block' }}>
              추가됐으면 하는 학교·학과는 1:1 채팅으로 문의해 주세요 😊
            </Text>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 8, display: 'block' }}>
              전형계획 공개 시기: 3~4월 · 모집요강 공개 시기: 5~7월
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
            {screens.sm && (
              <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 560 }}>
                {universityNames.map(name => (
                  <Tag key={name} color="blue"
                    style={{ cursor: 'pointer', fontSize: 13, padding: '4px 10px', borderRadius: 20 }}
                    onClick={() => setSearch(name)}
                  >{name}</Tag>
                ))}
              </div>
            )}
          </>
        )}

        {mode === '취업' && (
          <>
            <Text style={{ fontSize: 13, color: '#555', marginBottom: 4, display: 'block' }}>
              디자인 전공 졸업 후 어떤 직종에서 일할 수 있을까?
            </Text>
            <Text style={{ fontSize: 12, color: '#888', marginBottom: 24, display: 'block' }}>
              직종별 연봉 · 취업처 · 포트폴리오 전략을 확인하세요
            </Text>
            <Button
              type="primary"
              size="large"
              icon={<RiseOutlined />}
              onClick={() => {
                const el = document.getElementById('careers-list');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              style={{ borderRadius: 8 }}
            >
              직종 둘러보기
            </Button>
          </>
        )}
      </div>

      {/* 입시 검색 결과 */}
      {mode === '입시' && hasSearch && (
        <div style={{ padding: screens.sm ? '32px 40px' : '20px 16px', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
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

      {/* 취업 가이드 목록 */}
      {mode === '취업' && (
        <div id="careers-list" style={{ padding: screens.sm ? '40px 40px' : '24px 16px', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {careersLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" /></div>
          ) : (
            <>
              {careerCategories.map(category => (
                <div key={category} style={{ marginBottom: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Tag color={categoryColor[category] || 'default'} style={{ fontSize: 14, padding: '4px 14px', borderRadius: 20 }}>
                      {category}
                    </Tag>
                  </div>
                  <Row gutter={[16, 16]}>
                    {careers.filter(c => c.category === category).map(career => (
                      <Col xs={24} sm={12} lg={8} key={career.id}>
                        <Card
                          hoverable
                          onClick={() => navigate(`/careers/${career.id}`)}
                          style={{ borderRadius: 12, height: '100%' }}
                          styles={{ body: { padding: '20px' } }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <span style={{ fontSize: 32 }}>{career.emoji}</span>
                            <div>
                              <Text strong style={{ fontSize: 16 }}>{career.field}</Text>
                              <br />
                              <Tag color={difficultyColor[career.difficulty] || 'default'} style={{ marginTop: 4, fontSize: 11 }}>
                                취업 난이도 {career.difficulty}
                              </Tag>
                            </div>
                          </div>
                          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12, lineHeight: 1.6 }}>
                            {career.description.length > 70 ? career.description.slice(0, 70) + '...' : career.description}
                          </Text>
                          <div style={{ background: '#fafafa', borderRadius: 8, padding: '10px 12px' }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>신입 연봉</Text>
                            <br />
                            <Text strong style={{ fontSize: 13, color: '#1677ff' }}>{career.salaryEntry}</Text>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
