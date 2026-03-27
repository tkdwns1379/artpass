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
async function invokeFunction(name: string, formData: FormData) {
  const { data, error } = await supabase.functions.invoke(name, { body: formData })
  if (error) {
    let msg = error.message
    try {
      const body = await (error as { context?: Response }).context?.json?.()
      if (body?.message) msg = body.message
    } catch {}
    throw new Error(msg)
  }
  return data
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
