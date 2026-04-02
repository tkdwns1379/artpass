import { supabase } from '@/lib/supabase'

// =============================================
// DB 필드명 변환 (snake_case → camelCase)
// =============================================
export function mapUniversity(raw: Record<string, unknown>) {
  return {
    id: raw.id as string,
    name: raw.name as string,
    department: raw.department as string,
    region: raw.region as string,
    admissionTypes: (raw.admission_types as string[]) || [],
    applicationPeriod: raw.application_period as string,
    hasPractice: raw.has_practice as boolean,
    practiceSubjects: (raw.practice_subjects as string[]) || [],
    recruitCount: raw.recruit_count as string,
    suneungRatio: raw.suneung_ratio as string,
    practiceRatio: raw.practice_ratio as string,
    competitionRate: raw.competition_rate as string,
    note: raw.note as string,
    tips: raw.tips,
    practiceGuide: raw.practice_guide,
    preparationGuide: raw.preparation_guide,
    applicationTips: raw.application_tips,
    createdAt: raw.created_at as string,
    avgGrade: raw.avg_grade as string | null,
    avgGrade5: raw.avg_grade_5 as string | null,
    gradeNote: raw.grade_note as string | null,
    avgSuneung: raw.avg_suneung as string | null,
    avgSuneungNote: raw.avg_suneung_note as string | null,
  }
}

// =============================================
// 대학 목록 조회
// =============================================
export async function getUniversities() {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapUniversity)
}

// =============================================
// 대학 단건 조회
// =============================================
export async function getUniversity(id: string) {
  const { data, error } = await supabase
    .from('universities')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return mapUniversity(data)
}

// =============================================
// Edge Function 호출 헬퍼
// =============================================
const SUPABASE_URL = 'https://qbkalbnehrmxjxzlftlu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFia2FsYm5laHJteGp4emxmdGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODk4NTYsImV4cCI6MjA5MDE2NTg1Nn0.F2KtRznr-epHQyVmk64BJSiwsbA_C8HrtvdfQ4EkByg'

async function invokeFunction(name: string, formData: FormData) {
  // 세션에서 access_token 직접 추출하여 fetch로 호출
  // supabase.functions.invoke 는 FormData 전송 시 Authorization 헤더 누락 버그 있음
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('로그인이 필요합니다.')

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: formData,
  })

  if (!response.ok) {
    let msg = `오류가 발생했습니다. (${response.status})`
    try {
      const body = await response.json()
      if (body?.message) msg = body.message
    } catch {}
    throw new Error(msg)
  }

  return response.json()
}

export async function callFeedback(formData: FormData) {
  return invokeFunction('feedback', formData)
}

export async function callFeedbackRecommend(formData: FormData) {
  return invokeFunction('feedback-recommend', formData)
}

export async function callFeedbackAcceptance(formData: FormData) {
  return invokeFunction('feedback-acceptance', formData)
}

export async function callFeedbackAdvice(formData: FormData) {
  return invokeFunction('feedback-advice', formData)
}

// =============================================
// 취업 가이드 (careers)
// =============================================
export interface Career {
  id: string
  field: string
  category: string
  emoji: string
  description: string
  mainTasks: string[]
  requiredSkills: string[]
  salaryEntry: string
  salaryMid: string
  salarySenior: string
  majorEmployers: string[]
  portfolioTips: string
  careerPath: string
  relatedDepartments: string[]
  demandOutlook: string
  difficulty: string
  sortOrder: number
}

function mapCareer(raw: Record<string, unknown>): Career {
  return {
    id: raw.id as string,
    field: raw.field as string,
    category: raw.category as string,
    emoji: (raw.emoji as string) || '🎨',
    description: raw.description as string,
    mainTasks: (raw.main_tasks as string[]) || [],
    requiredSkills: (raw.required_skills as string[]) || [],
    salaryEntry: raw.salary_entry as string,
    salaryMid: raw.salary_mid as string,
    salarySenior: raw.salary_senior as string,
    majorEmployers: (raw.major_employers as string[]) || [],
    portfolioTips: raw.portfolio_tips as string,
    careerPath: raw.career_path as string,
    relatedDepartments: (raw.related_departments as string[]) || [],
    demandOutlook: raw.demand_outlook as string,
    difficulty: raw.difficulty as string,
    sortOrder: (raw.sort_order as number) || 0,
  }
}

export async function getCareers(): Promise<Career[]> {
  const { data, error } = await supabase
    .from('careers')
    .select('*')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return (data ?? []).map(mapCareer)
}

export async function getCareer(id: string): Promise<Career> {
  const { data, error } = await supabase
    .from('careers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return mapCareer(data)
}

// =============================================
// 피드백 로그 조회
// =============================================
export interface FeedbackLog {
  id: string
  type: '실기피드백' | '대학추천' | '합격분석' | '입시조언'
  universityName: string | null
  content: string
  meta: Record<string, unknown>
  createdAt: string
}

export async function saveFeedbackLog(params: {
  userId: string
  type: FeedbackLog['type']
  universityName?: string | null
  content: string
  meta?: Record<string, unknown>
}): Promise<void> {
  // 같은 타입 기존 저장 내용 삭제 (1개만 허용)
  await supabase.from('feedback_logs').delete().eq('type', params.type)

  const { error } = await supabase.from('feedback_logs').insert({
    user_id: params.userId,
    type: params.type,
    university_name: params.universityName ?? null,
    content: params.content,
    meta: params.meta ?? {},
  })
  if (error) throw new Error(error.message)
}

export async function getFeedbackLogs(): Promise<FeedbackLog[]> {
  const { data, error } = await supabase
    .from('feedback_logs')
    .select('id, type, university_name, content, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []).map(row => ({
    id: row.id,
    type: row.type,
    universityName: row.university_name,
    content: row.content,
    meta: row.meta ?? {},
    createdAt: row.created_at,
  }))
}
