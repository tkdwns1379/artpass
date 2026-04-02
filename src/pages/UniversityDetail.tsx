import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Typography, Row, Col, Button, Divider, Descriptions, Spin, Table, Timeline, Alert } from 'antd';
import {
  LockOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  TrophyOutlined, BulbOutlined, WarningOutlined, CalendarOutlined, BookOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { getUniversity } from '@/api/client';

const { Title, Text, Paragraph } = Typography;

interface PracticeGuide {
  overview: string;
  examInfo: { time: string; paper: string; materials: string };
  trends: { year: string; topic: string }[];
  scoring: { item: string; detail: string }[];
  strategy: string[];
  cautions: string[];
}

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
  practiceGuide?: PracticeGuide;
  avgGrade?: string | null;
  avgGrade5?: string | null;
  gradeNote?: string | null;
  avgSuneung?: string | null;
  avgSuneungNote?: string | null;
}

const grade5Colors: Record<string, string> = {
  '1등급': '#1677ff', '2등급': '#52c41a', '3등급': '#fa8c16', '4등급': '#ff4d4f', '5등급': '#aaa',
};

function GradeTag({ avgGrade, avgGrade5, gradeNote }: { avgGrade?: string | null; avgGrade5?: string | null; gradeNote?: string | null }) {
  const color = avgGrade5 ? (grade5Colors[avgGrade5.replace(/~.*/, '').trim()] ?? '#888') : '#888';
  return (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px' }}>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
        📊 내신 등급 참고 <span style={{ color: '#ccc' }}>({gradeNote ?? '참고용'})</span>
      </Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>9등급제 평균 </Text>
          <Text strong style={{ fontSize: 13 }}>{avgGrade}등급</Text>
        </div>
        {avgGrade5 && (
          <>
            <Text type="secondary" style={{ fontSize: 11 }}>→</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>5등급제 예상 </Text>
              <Tag color={color} style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{avgGrade5}</Tag>
            </div>
          </>
        )}
      </div>
      <Text type="secondary" style={{ fontSize: 10, marginTop: 4, display: 'block', color: '#bbb' }}>
        * 실제 입결과 다를 수 있음. 참고용으로만 활용하세요.
      </Text>
    </div>
  );
}

const suneungGradeColor = (grade: string) => {
  const g = parseFloat(grade);
  if (g <= 2.0) return '#1677ff';
  if (g <= 3.0) return '#52c41a';
  if (g <= 4.0) return '#fa8c16';
  return '#ff4d4f';
};

function SuneungGradeTag({ avgSuneung, avgSuneungNote }: { avgSuneung?: string | null; avgSuneungNote?: string | null }) {
  const color = avgSuneung ? suneungGradeColor(avgSuneung) : '#888';
  return (
    <div style={{ background: '#f6ffed', borderRadius: 8, padding: '10px 12px', border: '1px solid #b7eb8f' }}>
      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
        🎯 정시 수능 등급 참고 <span style={{ color: '#ccc' }}>({avgSuneungNote ?? '참고용'})</span>
      </Text>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>수능 평균 </Text>
        <Tag color={color} style={{ fontSize: 13, fontWeight: 700, margin: 0, padding: '2px 10px' }}>
          {avgSuneung}등급
        </Tag>
      </div>
      <Text type="secondary" style={{ fontSize: 10, marginTop: 4, display: 'block', color: '#bbb' }}>
        * 실제 입결과 다를 수 있음. 참고용으로만 활용하세요.
      </Text>
    </div>
  );
}

function LockBanner({ onRegister }: { onRegister: () => void }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f5ff 0%, #fff 100%)',
      border: '1.5px dashed #adc6ff',
      borderRadius: 12, padding: '40px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: '#e6f0ff', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 16px',
      }}>
        <LockOutlined style={{ fontSize: 24, color: '#1677ff' }} />
      </div>
      <Title level={5} style={{ margin: '0 0 8px', color: '#1677ff' }}>회원 전용 콘텐츠</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        무료 회원가입 후 실기 가이드, 기출 경향, 합격 전략을 모두 확인하세요
      </Text>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Button type="primary" size="large" onClick={onRegister} icon={<CheckCircleOutlined />}>
          무료 회원가입
        </Button>
        <Button size="large" onClick={() => window.location.href = '/login'}>
          로그인
        </Button>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center' }}>
        {['연도별 기출 경향', '채점 기준 분석', '합격 전략 가이드', '주의사항'].map(item => (
          <div key={item} style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 4 }}>
            <LockOutlined style={{ fontSize: 10 }} />{item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UniversityDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uni, setUni] = useState<University | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getUniversity(id)
      .then(data => setUni(data as University))
      .catch(() => setUni(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  if (!uni) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Text type="secondary">대학 정보를 찾을 수 없습니다.</Text><br />
        <Button style={{ marginTop: 16 }} onClick={() => navigate('/')}>홈으로</Button>
      </div>
    );
  }

  const guide = uni.practiceGuide;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/', { state: { scrollToId: id } })} style={{ marginBottom: 16, paddingLeft: 0 }}>
        목록으로
      </Button>

      {/* 헤더 카드 */}
      <Card style={{ borderRadius: 16, marginBottom: 24, background: 'linear-gradient(135deg, #1677ff 0%, #0050b3 100%)', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ marginBottom: 8 }}>
              <Tag color="rgba(255,255,255,0.2)" style={{ color: '#fff', border: 'none', borderRadius: 20 }}>{uni.region}</Tag>
              {uni.admissionTypes?.map(t => (
                <Tag key={t} color={t === '수시' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)'}
                  style={{ color: '#fff', border: 'none', borderRadius: 20 }}>{t}</Tag>
              ))}
            </div>
            <Title level={2} style={{ color: '#fff', margin: '0 0 4px' }}>{uni.name}</Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>{uni.department}</Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            {uni.hasPractice
              ? <Tag color="orange" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20 }}>실기 있음</Tag>
              : <Tag color="green" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20 }}>실기 없음</Tag>
            }
          </div>
        </div>
      </Card>

      <Row gutter={[20, 20]}>
        {/* 기본 정보 (공개) */}
        <Col xs={24} md={12}>
          <Card
            title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircleOutlined style={{ color: '#52c41a' }} />기본 정보</span>}
            style={{ borderRadius: 12, height: '100%' }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="원서접수">{uni.applicationPeriod}</Descriptions.Item>
              <Descriptions.Item label="전형">
                <div style={{ display: 'flex', gap: 4 }}>
                  {uni.admissionTypes?.map(t => <Tag key={t} color={t === '수시' ? 'blue' : 'purple'}>{t}</Tag>)}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="지역">{uni.region}</Descriptions.Item>
              <Descriptions.Item label="실기">
                {uni.hasPractice
                  ? <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {uni.practiceSubjects?.map(s => <Tag key={s} color="orange">{s}</Tag>)}
                    </div>
                  : <Tag color="green">없음</Tag>
                }
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 상세 정보 (회원 전용) */}
        <Col xs={24} md={12}>
          {user ? (
            <Card
              title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrophyOutlined style={{ color: '#faad14' }} />입시 상세 정보</span>}
              style={{ borderRadius: 12, height: '100%' }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="모집인원">{uni.recruitCount}</Descriptions.Item>
                <Descriptions.Item label="수능 반영">{uni.suneungRatio}</Descriptions.Item>
                <Descriptions.Item label="실기 비율">{uni.practiceRatio}</Descriptions.Item>
                <Descriptions.Item label="경쟁률">{uni.competitionRate}</Descriptions.Item>
              </Descriptions>
              {uni.note && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Alert message={uni.note} type="info" showIcon style={{ fontSize: 12 }} />
                </>
              )}
              {uni.avgGrade && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <GradeTag avgGrade={uni.avgGrade} avgGrade5={uni.avgGrade5} gradeNote={uni.gradeNote} />
                </>
              )}
              {uni.avgSuneung && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <SuneungGradeTag avgSuneung={uni.avgSuneung} avgSuneungNote={uni.avgSuneungNote} />
                </>
              )}
            </Card>
          ) : (
            <Card
              title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><LockOutlined style={{ color: '#aaa' }} />입시 상세 정보</span>}
              style={{ borderRadius: 12, height: '100%', background: '#fafafa' }}
            >
              <div style={{ filter: 'blur(4px)', pointerEvents: 'none', marginBottom: 12 }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="모집인원">수시 ??명 / 정시 ??명</Descriptions.Item>
                  <Descriptions.Item label="수능 반영">??% (정시)</Descriptions.Item>
                  <Descriptions.Item label="실기 비율">??% (정시)</Descriptions.Item>
                  <Descriptions.Item label="경쟁률">??.?? : 1</Descriptions.Item>
                </Descriptions>
              </div>
              <Button type="primary" block onClick={() => navigate('/register')}>
                무료 회원가입으로 확인하기
              </Button>
              {uni.avgGrade && (
                <div style={{ marginTop: 12 }}>
                  <GradeTag avgGrade={uni.avgGrade} avgGrade5={uni.avgGrade5} gradeNote={uni.gradeNote} />
                </div>
              )}
              {uni.avgSuneung && (
                <div style={{ marginTop: 12 }}>
                  <SuneungGradeTag avgSuneung={uni.avgSuneung} avgSuneungNote={uni.avgSuneungNote} />
                </div>
              )}
            </Card>
          )}
        </Col>
      </Row>

      {/* 실기 가이드 (회원 전용) */}
      {guide && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <BookOutlined style={{ fontSize: 20, color: '#1677ff' }} />
            <Title level={4} style={{ margin: 0 }}>실기 준비 가이드</Title>
            {!user && <Tag color="blue">회원 전용</Tag>}
          </div>

          {!user ? (
            <LockBanner onRegister={() => navigate('/register')} />
          ) : (
            <Row gutter={[20, 20]}>
              {/* 실기 개요 */}
              <Col xs={24}>
                <Card style={{ borderRadius: 12, borderLeft: '4px solid #1677ff' }}>
                  <Paragraph style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: '#444' }}>
                    {guide.overview}
                  </Paragraph>
                </Card>
              </Col>

              {/* 시험 정보 */}
              <Col xs={24} md={8}>
                <Card
                  title={<span style={{ color: '#1677ff' }}>⏱ 시험 정보</span>}
                  style={{ borderRadius: 12, height: '100%' }}
                  size="small"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: '시험 시간', value: guide.examInfo.time },
                      { label: '용지 규격', value: guide.examInfo.paper },
                      { label: '사용 재료', value: guide.examInfo.materials },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
                        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>

              {/* 연도별 출제 경향 */}
              <Col xs={24} md={16}>
                <Card
                  title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarOutlined style={{ color: '#fa8c16' }} />연도별 출제 경향</span>}
                  style={{ borderRadius: 12, height: '100%' }}
                  size="small"
                >
                  <Timeline
                    items={guide.trends.map(t => ({
                      color: '#1677ff',
                      content: (
                        <div>
                          <Tag color="blue" style={{ marginBottom: 4 }}>{t.year}</Tag>
                          <div style={{ fontSize: 13, color: '#444' }}>{t.topic}</div>
                        </div>
                      ),
                    }))}
                  />
                </Card>
              </Col>

              {/* 채점 기준 */}
              <Col xs={24} md={12}>
                <Card
                  title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrophyOutlined style={{ color: '#faad14' }} />채점 기준</span>}
                  style={{ borderRadius: 12 }}
                  size="small"
                >
                  <Table
                    dataSource={guide.scoring.map((s, i) => ({ ...s, key: i }))}
                    columns={[
                      { title: '항목', dataIndex: 'item', key: 'item', width: '35%', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                      { title: '세부 내용', dataIndex: 'detail', key: 'detail', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                    ]}
                    pagination={false}
                    size="small"
                    showHeader={false}
                  />
                </Card>
              </Col>

              {/* 합격 전략 */}
              <Col xs={24} md={12}>
                <Card
                  title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BulbOutlined style={{ color: '#52c41a' }} />합격 전략</span>}
                  style={{ borderRadius: 12 }}
                  size="small"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {guide.strategy.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{
                          minWidth: 22, height: 22, borderRadius: '50%',
                          background: '#f6ffed', border: '1px solid #b7eb8f',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: '#52c41a', fontWeight: 600, flexShrink: 0,
                        }}>{i + 1}</div>
                        <Text style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>{s}</Text>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>

              {/* 주의사항 */}
              <Col xs={24}>
                <Card
                  title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><WarningOutlined style={{ color: '#ff4d4f' }} />주의사항</span>}
                  style={{ borderRadius: 12, borderLeft: '4px solid #ff4d4f' }}
                  size="small"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {guide.cautions.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <WarningOutlined style={{ color: '#ff4d4f', marginTop: 3, flexShrink: 0 }} />
                        <Text style={{ fontSize: 13, color: '#444' }}>{c}</Text>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            </Row>
          )}
        </div>
      )}
    </div>
  );
}
