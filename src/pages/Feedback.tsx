import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Select, Typography, Upload, Spin, Alert, Divider, Tag,
  Tabs, Radio, Input,
} from 'antd';
import {
  UploadOutlined, SendOutlined, ArrowLeftOutlined, StarFilled,
  TrophyOutlined, BulbOutlined, BarChartOutlined, CompassOutlined, CloseCircleFilled,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUniversities,
  callFeedback,
  callFeedbackRecommend,
  callFeedbackAcceptance,
  callFeedbackAdvice,
} from '@/api/client';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface University {
  id: string;
  name: string;
  department: string;
  hasPractice: boolean;
  practiceSubjects?: string[];
}

function AcceptanceGauge({ rate, uniName }: { rate: number; uniName?: string }) {
  const color = rate >= 70 ? '#52c41a' : rate >= 45 ? '#faad14' : '#ff4d4f';
  const label = rate >= 70 ? '합격 가능성 높음' : rate >= 45 ? '추가 노력 필요' : '집중 준비 필요';
  const bgColor = rate >= 70 ? '#f6ffed' : rate >= 45 ? '#fffbe6' : '#fff2f0';
  const borderColor = rate >= 70 ? '#b7eb8f' : rate >= 45 ? '#ffe58f' : '#ffccc7';

  return (
    <div style={{ textAlign: 'center', padding: '28px 0 20px' }}>
      {uniName && (
        <div style={{ marginBottom: 12 }}>
          <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px' }}>{uniName}</Tag>
        </div>
      )}
      <div style={{ fontSize: 80, fontWeight: 900, color, lineHeight: 1, letterSpacing: -2 }}>
        {rate}%
      </div>
      <div style={{ fontSize: 16, color, marginTop: 8, fontWeight: 700 }}>{label}</div>
      <div style={{
        marginTop: 16, padding: '10px 20px',
        background: bgColor, border: `1px solid ${borderColor}`,
        borderRadius: 8, display: 'inline-block',
        fontSize: 12, color: '#666', lineHeight: 1.6,
      }}>
        ※ 이 수치는 <strong>심리적 참고용</strong>으로, 실제 합격을 보장하지 않습니다.<br />
        성적·작품·전형 등 다양한 변수에 따라 실제 결과는 달라질 수 있습니다.
      </div>
    </div>
  );
}

function MultiImageUpload({
  imageFiles,
  imagePreviews,
  onAdd,
  onRemove,
  label = '실기 작품 업로드',
  optional = false,
}: {
  imageFiles: File[];
  imagePreviews: string[];
  onAdd: (file: File) => boolean;
  onRemove: (index: number) => void;
  label?: string;
  optional?: boolean;
}) {
  const canAdd = imageFiles.length < 4;

  return (
    <div style={{ marginBottom: 20 }}>
      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        {label}
        {optional && (
          <Text type="secondary" style={{ fontWeight: 'normal', marginLeft: 8, fontSize: 13 }}>(선택 — 최대 4장)</Text>
        )}
        {!optional && (
          <Text type="secondary" style={{ fontWeight: 'normal', marginLeft: 8, fontSize: 13 }}>(최대 4장)</Text>
        )}
      </Text>

      {imagePreviews.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {imagePreviews.map((preview, idx) => (
            <div key={idx} style={{ position: 'relative', width: 100, height: 100 }}>
              <img
                src={preview}
                alt={`작품 ${idx + 1}`}
                style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #d9d9d9' }}
              />
              <CloseCircleFilled
                onClick={() => onRemove(idx)}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  fontSize: 18, color: '#ff4d4f', cursor: 'pointer',
                  background: '#fff', borderRadius: '50%',
                }}
              />
              <div style={{
                position: 'absolute', bottom: 2, left: 2,
                background: 'rgba(0,0,0,0.45)', color: '#fff',
                fontSize: 11, borderRadius: 3, padding: '0 4px',
              }}>
                {idx + 1}번
              </div>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <Upload.Dragger
          accept="image/*"
          showUploadList={false}
          beforeUpload={onAdd}
          style={{ padding: '8px 0' }}
        >
          <div>
            <UploadOutlined style={{ fontSize: 28, color: '#1677ff', marginBottom: 6 }} />
            <p style={{ margin: 0, fontSize: 13 }}>클릭하거나 파일을 드래그하세요</p>
            <p style={{ margin: '4px 0 0', color: '#aaa', fontSize: 12 }}>
              JPG, PNG, WEBP / 최대 10MB · {imageFiles.length}/4장
            </p>
          </div>
        </Upload.Dragger>
      )}
      {!canAdd && (
        <div style={{
          padding: '10px 16px', background: '#f5f5f5', borderRadius: 6,
          fontSize: 12, color: '#888', textAlign: 'center',
        }}>
          최대 4장 업로드되었습니다. 이미지를 제거하면 추가할 수 있습니다.
        </div>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [universities, setUniversities] = useState<University[]>([]);

  // 공통: 다중 이미지 (탭 간 공유)
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Tab 1: 실기 피드백
  const [feedbackUniId, setFeedbackUniId] = useState('');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  // Tab 2: 대학 추천
  const [recommendNote, setRecommendNote] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState('');

  // Tab 3: 합격률 분석
  const [acceptanceUniId, setAcceptanceUniId] = useState('');
  const [admissionType, setAdmissionType] = useState<'수시' | '정시'>('수시');
  const [gradeScore, setGradeScore] = useState('');
  const [acceptanceNote, setAcceptanceNote] = useState('');
  const [acceptanceRate, setAcceptanceRate] = useState<number | null>(null);
  const [acceptanceDetail, setAcceptanceDetail] = useState('');
  const [acceptanceLoading, setAcceptanceLoading] = useState(false);
  const [acceptanceError, setAcceptanceError] = useState('');

  // Tab 4: 입시조언 (별도 이미지)
  const [adviceImageFiles, setAdviceImageFiles] = useState<File[]>([]);
  const [adviceImagePreviews, setAdviceImagePreviews] = useState<string[]>([]);
  const [adviceQuestion, setAdviceQuestion] = useState('');
  const [adviceNote, setAdviceNote] = useState('');
  const [advice, setAdvice] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState('');

  useEffect(() => {
    getUniversities()
      .then(data => setUniversities(data as University[]))
      .catch(() => {});
  }, []);

  if (!user) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center', padding: '0 16px' }}>
        <Card>
          <StarFilled style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
          <Title level={4}>회원 전용 서비스</Title>
          <Paragraph type="secondary">
            실기 분석 서비스는 회원 전용입니다.<br />
            무료 회원가입 후 이용하세요.
          </Paragraph>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/register')}>무료 회원가입</Button>
            <Button onClick={() => navigate('/login')}>로그인</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!user.isPremium && user.role !== 'admin') {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center', padding: '0 16px' }}>
        <Card style={{ border: '2px solid #faad14', borderRadius: 16 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>⭐</div>
          <Title level={3} style={{ color: '#d48806', marginBottom: 8 }}>프리미엄 전용 서비스</Title>
          <Paragraph style={{ fontSize: 15, color: '#555', marginBottom: 20 }}>
            AI 실기 피드백은 <strong>프리미엄 회원</strong>만 이용할 수 있습니다.<br />
            관리자 승인 후 이용 가능합니다.
          </Paragraph>
          <Alert
            type="info"
            showIcon
            message="프리미엄 신청 방법"
            description={
              <div style={{ textAlign: 'left', lineHeight: 2 }}>
                1. 우측 하단 <strong>채팅 버튼</strong>으로 관리자에게 문의<br />
                2. 이름·연락처 남기면 확인 후 승인
              </div>
            }
            style={{ marginBottom: 20, textAlign: 'left' }}
          />
          <Button type="primary" size="large" style={{ background: '#d48806', borderColor: '#d48806' }} onClick={() => navigate('/')}>
            메인으로 돌아가기
          </Button>
        </Card>
      </div>
    );
  }

  // 공통 이미지 추가/제거
  const handleImageAdd = (file: File) => {
    if (imageFiles.length >= 4) return false;
    const reader = new FileReader();
    reader.onload = e => {
      setImageFiles(prev => [...prev, file]);
      setImagePreviews(prev => [...prev, e.target?.result as string]);
    };
    reader.readAsDataURL(file);
    setFeedback('');
    setRecommendation('');
    setAcceptanceRate(null);
    setAcceptanceDetail('');
    return false;
  };

  const handleImageRemove = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
    setFeedback('');
    setRecommendation('');
    setAcceptanceRate(null);
    setAcceptanceDetail('');
  };

  // 입시조언 이미지 추가/제거
  const handleAdviceImageAdd = (file: File) => {
    if (adviceImageFiles.length >= 4) return false;
    const reader = new FileReader();
    reader.onload = e => {
      setAdviceImageFiles(prev => [...prev, file]);
      setAdviceImagePreviews(prev => [...prev, e.target?.result as string]);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleAdviceImageRemove = (idx: number) => {
    setAdviceImageFiles(prev => prev.filter((_, i) => i !== idx));
    setAdviceImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const buildFormData = (files: File[], extra: Record<string, string>) => {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    Object.entries(extra).forEach(([k, v]) => { if (v) formData.append(k, v); });
    return formData;
  };

  const handleFeedback = async () => {
    if (imageFiles.length === 0) { setFeedbackError('그림을 최소 1장 업로드해주세요.'); return; }
    setFeedbackLoading(true); setFeedback(''); setFeedbackError('');
    try {
      const formData = buildFormData(imageFiles, {
        universityId: feedbackUniId,
        additionalNote: feedbackNote,
      });
      const res = await callFeedback(formData);
      setFeedback(res.feedback);
    } catch (e: unknown) {
      setFeedbackError((e as Error).message || '피드백 생성 중 오류가 발생했습니다.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleRecommend = async () => {
    if (imageFiles.length === 0) { setRecommendError('그림을 최소 1장 업로드해주세요.'); return; }
    setRecommendLoading(true); setRecommendation(''); setRecommendError('');
    try {
      const formData = buildFormData(imageFiles, { additionalNote: recommendNote });
      const res = await callFeedbackRecommend(formData);
      setRecommendation(res.recommendation);
    } catch (e: unknown) {
      setRecommendError((e as Error).message || '대학 추천 중 오류가 발생했습니다.');
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleAcceptance = async () => {
    if (imageFiles.length === 0) { setAcceptanceError('그림을 최소 1장 업로드해주세요.'); return; }
    if (!acceptanceUniId) { setAcceptanceError('목표 대학을 선택해주세요.'); return; }
    if (!gradeScore.trim()) {
      setAcceptanceError(admissionType === '수시' ? '내신 등급을 입력해주세요.' : '수능 점수를 입력해주세요.');
      return;
    }
    setAcceptanceLoading(true); setAcceptanceRate(null); setAcceptanceDetail(''); setAcceptanceError('');
    try {
      const formData = buildFormData(imageFiles, {
        universityId: acceptanceUniId,
        admissionType,
        gradeScore,
        additionalNote: acceptanceNote,
      });
      const res = await callFeedbackAcceptance(formData);
      setAcceptanceRate(res.rate);
      setAcceptanceDetail(res.detail);
    } catch (e: unknown) {
      setAcceptanceError((e as Error).message || '합격률 분석 중 오류가 발생했습니다.');
    } finally {
      setAcceptanceLoading(false);
    }
  };

  const handleAdvice = async () => {
    if (!adviceQuestion.trim()) { setAdviceError('질문을 입력해주세요.'); return; }
    setAdviceLoading(true); setAdvice(''); setAdviceError('');
    try {
      const formData = new FormData();
      adviceImageFiles.forEach(f => formData.append('images', f));
      formData.append('question', adviceQuestion);
      if (adviceNote) formData.append('additionalNote', adviceNote);
      const res = await callFeedbackAdvice(formData);
      setAdvice(res.advice);
    } catch (e: unknown) {
      setAdviceError((e as Error).message || '조언을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setAdviceLoading(false);
    }
  };

  const uniOptions = universities.map(u => ({
    value: u.id,
    label: `${u.name} - ${u.department}`,
  }));

  const feedbackUni = universities.find(u => u.id === feedbackUniId);
  const acceptanceUni = universities.find(u => u.id === acceptanceUniId);

  const LoadingCard = ({ text }: { text: string }) => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <Spin size="large" />
      <p style={{ marginTop: 16, color: '#888' }}>
        {text}<br />
        <span style={{ fontSize: 12 }}>30초 ~ 1분 소요됩니다.</span>
      </p>
    </div>
  );

  const tabs = [
    {
      key: 'feedback',
      label: <span><StarFilled style={{ marginRight: 6, color: '#faad14' }} />실기 피드백</span>,
      children: (
        <div>
          <MultiImageUpload
            imageFiles={imageFiles}
            imagePreviews={imagePreviews}
            onAdd={handleImageAdd}
            onRemove={handleImageRemove}
          />

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              목표 대학 선택
              <Text type="secondary" style={{ fontWeight: 'normal', marginLeft: 8, fontSize: 13 }}>(선택 — 해당 대학 기준 맞춤 피드백)</Text>
            </Text>
            <Select
              placeholder="목표 대학을 선택하세요"
              style={{ width: '100%' }}
              options={uniOptions}
              allowClear showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              onChange={val => { setFeedbackUniId(val || ''); setFeedback(''); }}
              value={feedbackUniId || undefined}
            />
            {feedbackUni && (
              <div style={{ marginTop: 8 }}>
                {feedbackUni.hasPractice === false
                  ? <Tag color="blue">실기 없음 (포트폴리오+면접)</Tag>
                  : feedbackUni.practiceSubjects?.map(s => <Tag color="orange" key={s}>{s}</Tag>)}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              추가 메모
              <Text type="secondary" style={{ fontWeight: 'normal', marginLeft: 8, fontSize: 13 }}>(선택)</Text>
            </Text>
            <TextArea
              value={feedbackNote}
              onChange={e => setFeedbackNote(e.target.value)}
              placeholder="궁금한 점이나 특별히 피드백 받고 싶은 부분을 적어주세요."
              rows={3}
            />
          </div>

          {feedbackError && <Alert message={feedbackError} type="error" showIcon style={{ marginBottom: 12 }} />}

          <Button type="primary" size="large" icon={<SendOutlined />} onClick={handleFeedback} loading={feedbackLoading} disabled={imageFiles.length === 0} block>
            {feedbackLoading ? '전문가가 분석 중입니다...' : '전문가 피드백 받기'}
          </Button>

          {feedbackLoading && <LoadingCard text="꼼꼼히 분석하고 있습니다..." />}

          {feedback && !feedbackLoading && (
            <div style={{ marginTop: 20 }}>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <StarFilled style={{ color: '#faad14', fontSize: 18 }} />
                <Title level={5} style={{ margin: 0 }}>전문가 피드백</Title>
                {feedbackUni && <Tag color="blue" style={{ marginLeft: 'auto' }}>{feedbackUni.name} 기준</Tag>}
              </div>
              <div style={{ lineHeight: 1.8 }}>
                <ReactMarkdown>{feedback}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'recommend',
      label: <span><BulbOutlined style={{ marginRight: 6, color: '#1677ff' }} />대학 추천</span>,
      children: (
        <div>
          <MultiImageUpload
            imageFiles={imageFiles}
            imagePreviews={imagePreviews}
            onAdd={handleImageAdd}
            onRemove={handleImageRemove}
          />

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              추가 정보
              <Text type="secondary" style={{ fontWeight: 'normal', marginLeft: 8, fontSize: 13 }}>(선택 — 입력할수록 추천 정확도 높아짐)</Text>
            </Text>
            <TextArea
              value={recommendNote}
              onChange={e => setRecommendNote(e.target.value)}
              placeholder="예: 내신 2.5등급, 기초디자인 6개월 준비 중, 서울 지역 선호, 실기 있는 학교 원함"
              rows={3}
            />
          </div>

          {recommendError && <Alert message={recommendError} type="error" showIcon style={{ marginBottom: 12 }} />}

          <Button type="primary" size="large" icon={<BulbOutlined />} onClick={handleRecommend} loading={recommendLoading} disabled={imageFiles.length === 0} block>
            {recommendLoading ? '전국 미대와 비교 중입니다...' : '나에게 맞는 대학 추천받기'}
          </Button>

          {recommendLoading && <LoadingCard text="전국 미대와 작품을 비교 분석 중입니다..." />}

          {recommendation && !recommendLoading && (
            <div style={{ marginTop: 20 }}>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <BulbOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                <Title level={5} style={{ margin: 0 }}>맞춤 대학 추천</Title>
              </div>
              <div style={{ lineHeight: 1.8 }}>
                <ReactMarkdown>{recommendation}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'acceptance',
      label: <span><BarChartOutlined style={{ marginRight: 6, color: '#52c41a' }} />합격률 분석</span>,
      children: (
        <div>
          <MultiImageUpload
            imageFiles={imageFiles}
            imagePreviews={imagePreviews}
            onAdd={handleImageAdd}
            onRemove={handleImageRemove}
          />

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              목표 대학 선택
              <Text type="danger" style={{ fontSize: 12, marginLeft: 6 }}>*필수</Text>
            </Text>
            <Select
              placeholder="목표 대학을 선택하세요"
              style={{ width: '100%' }}
              options={uniOptions}
              allowClear showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              onChange={val => { setAcceptanceUniId(val || ''); setAcceptanceRate(null); setAcceptanceDetail(''); }}
              value={acceptanceUniId || undefined}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>전형 선택</Text>
            <Radio.Group value={admissionType} onChange={e => { setAdmissionType(e.target.value); setGradeScore(''); }}>
              <Radio.Button value="수시">수시</Radio.Button>
              <Radio.Button value="정시">정시</Radio.Button>
            </Radio.Group>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              {admissionType === '수시' ? '내신 평균 등급' : '수능 점수 / 등급'}
              <Text type="danger" style={{ fontSize: 12, marginLeft: 6 }}>*필수</Text>
            </Text>
            <Input
              value={gradeScore}
              onChange={e => setGradeScore(e.target.value)}
              placeholder={
                admissionType === '수시'
                  ? '예: 2.5 (소수점 입력 가능)'
                  : '예: 국어 2등급, 수학 3등급, 탐구 2등급'
              }
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              추가 메모
              <Text type="secondary" style={{ fontWeight: 'normal', marginLeft: 8, fontSize: 13 }}>(선택)</Text>
            </Text>
            <TextArea
              value={acceptanceNote}
              onChange={e => setAcceptanceNote(e.target.value)}
              placeholder="예: 실기 준비 1년차, 기초디자인 위주로 준비 중"
              rows={2}
            />
          </div>

          {acceptanceError && <Alert message={acceptanceError} type="error" showIcon style={{ marginBottom: 12 }} />}

          <Button type="primary" size="large" icon={<TrophyOutlined />} onClick={handleAcceptance} loading={acceptanceLoading} disabled={imageFiles.length === 0} block>
            {acceptanceLoading ? '합격 가능성을 분석 중입니다...' : '합격 가능성 분석하기'}
          </Button>

          {acceptanceLoading && <LoadingCard text="성적과 작품을 종합 분석 중입니다..." />}

          {acceptanceRate !== null && !acceptanceLoading && (
            <div style={{ marginTop: 20 }}>
              <Divider />
              <AcceptanceGauge
                rate={acceptanceRate}
                uniName={acceptanceUni ? `${acceptanceUni.name} - ${acceptanceUni.department}` : undefined}
              />
              <div style={{ lineHeight: 1.8, marginTop: 16 }}>
                <ReactMarkdown>{acceptanceDetail}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'advice',
      label: <span><CompassOutlined style={{ marginRight: 6, color: '#722ed1' }} />입시조언</span>,
      children: (
        <div>
          <MultiImageUpload
            imageFiles={adviceImageFiles}
            imagePreviews={adviceImagePreviews}
            onAdd={handleAdviceImageAdd}
            onRemove={handleAdviceImageRemove}
            label="작품 사진 첨부"
            optional
          />

          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              질문
              <Text type="danger" style={{ fontSize: 12, marginLeft: 6 }}>*필수</Text>
            </Text>
            <TextArea
              value={adviceQuestion}
              onChange={e => setAdviceQuestion(e.target.value)}
              placeholder="예: 기초디자인을 6개월째 준비 중인데, 지금 작품 수준으로 홍익대 도전이 가능할까요? 어떤 부분을 집중적으로 개선해야 할지 알고 싶습니다."
              rows={4}
              autoSize={{ minRows: 4, maxRows: 8 }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              추가 정보
              <Text type="secondary" style={{ fontWeight: 'normal', marginLeft: 8, fontSize: 13 }}>(선택)</Text>
            </Text>
            <TextArea
              value={adviceNote}
              onChange={e => setAdviceNote(e.target.value)}
              placeholder="예: 고3, 내신 2등급, 기초디자인 전공, 서울 소재 대학 목표"
              rows={2}
            />
          </div>

          {adviceError && <Alert message={adviceError} type="error" showIcon style={{ marginBottom: 12 }} />}

          <Button
            type="primary"
            size="large"
            icon={<CompassOutlined />}
            onClick={handleAdvice}
            loading={adviceLoading}
            disabled={!adviceQuestion.trim()}
            block
            style={{ background: '#722ed1', borderColor: '#722ed1' }}
          >
            {adviceLoading ? '전문가가 조언을 작성 중입니다...' : '입시조언 받기'}
          </Button>

          {adviceLoading && <LoadingCard text="세계 최고의 전문가가 조언을 작성 중입니다..." />}

          {advice && !adviceLoading && (
            <div style={{ marginTop: 20 }}>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CompassOutlined style={{ color: '#722ed1', fontSize: 18 }} />
                <Title level={5} style={{ margin: 0 }}>전문가 입시조언</Title>
              </div>
              <div style={{ lineHeight: 1.8 }}>
                <ReactMarkdown>{advice}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 40px' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        홈으로
      </Button>

      <Title level={3} style={{ marginBottom: 4 }}>실기 분석 서비스</Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        AI가 분석한 결과입니다. 참고 자료로 활용하되, 실제 입시 결정은 담당 선생님과 상담하세요.
      </Paragraph>

      <Card>
        <Tabs defaultActiveKey="feedback" items={tabs} size="large" />
      </Card>
    </div>
  );
}
