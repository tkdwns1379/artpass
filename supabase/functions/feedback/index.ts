import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const EXPERT_SYSTEM = `당신은 대한민국 최고의 입시미술 전문가입니다.
20년 이상의 입시미술 지도 경험을 가지고 있으며, 홍익대·국민대·건국대·서울대·이화여대·경희대 등 주요 미대의 실기 채점관으로 활동한 경력이 있습니다.
전국 수천 명의 수험생을 지도하며 합격작과 불합격작의 차이를 정확히 알고 있습니다.
각 대학의 역대 합격작 수준, 채점 기준, 출제 경향을 누구보다 잘 파악하고 있습니다.

피드백 원칙:
- 합격작 기준으로 현재 작품 수준을 냉정하고 정확하게 평가합니다.
- 추상적인 말 대신 구체적이고 실천 가능한 조언을 줍니다.
- 수험생에게 필요한 건 칭찬이 아닌 정확한 지적입니다.
- 목표 대학의 채점 기준과 최근 기출 경향을 기반으로 평가합니다.
- 마크다운 형식으로 구조적으로 작성합니다.`

function buildUniversityContext(uni: Record<string, unknown>): string {
  const lines: string[] = [
    `■ 목표 대학: ${uni.name} - ${uni.department}`,
    `■ 지역: ${uni.region || ''}`,
  ]
  if (uni.recruit_count) lines.push(`■ 모집인원: ${uni.recruit_count}`)
  if (uni.competition_rate) lines.push(`■ 경쟁률: ${uni.competition_rate}`)

  const guide = uni.practice_guide as Record<string, unknown> | null

  if (uni.has_practice === false) {
    lines.push('■ 전형: 실기 없음 (포트폴리오+면접)')
    if (guide?.overview) lines.push(`■ 전형 개요: ${guide.overview}`)
    if (Array.isArray(guide?.scoring)) {
      lines.push('■ 평가 기준:')
      ;(guide.scoring as { item: string; detail: string }[]).forEach(s => lines.push(`  • ${s.item}: ${s.detail}`))
    }
    if (Array.isArray(guide?.trends)) {
      lines.push('■ 최근 면접 기출:')
      ;(guide.trends as { year: string; topic: string }[]).forEach(t => lines.push(`  ${t.year}: ${t.topic}`))
    }
    if (Array.isArray(guide?.strategy)) {
      lines.push('■ 합격 전략:')
      ;(guide.strategy as string[]).forEach((s, i) => lines.push(`  ${i + 1}. ${s}`))
    }
  } else {
    if (Array.isArray(uni.practice_subjects)) lines.push(`■ 실기 종목: ${(uni.practice_subjects as string[]).join(', ')}`)
    if (guide?.examInfo) {
      const e = guide.examInfo as { time: string; paper: string; materials: string }
      lines.push(`■ 시험 정보: 시간 ${e.time} | 용지 ${e.paper} | 재료 ${e.materials}`)
    }
    if (guide?.overview) lines.push(`■ 시험 특징: ${guide.overview}`)
    if (Array.isArray(guide?.scoring)) {
      lines.push('■ 채점 기준:')
      ;(guide.scoring as { item: string; detail: string }[]).forEach(s => lines.push(`  • ${s.item}: ${s.detail}`))
    }
    if (Array.isArray(guide?.trends)) {
      lines.push('■ 최근 기출 경향:')
      ;(guide.trends as { year: string; topic: string }[]).forEach(t => lines.push(`  ${t.year}: ${t.topic}`))
    }
    if (Array.isArray(guide?.cautions)) {
      lines.push('■ 주의사항:')
      ;(guide.cautions as string[]).forEach(c => lines.push(`  ⚠ ${c}`))
    }
    if (Array.isArray(guide?.strategy)) {
      lines.push('■ 합격 전략:')
      ;(guide.strategy as string[]).forEach((s, i) => lines.push(`  ${i + 1}. ${s}`))
    }
  }
  if (uni.suneung_ratio) lines.push(`■ 수능 반영: ${uni.suneung_ratio}`)
  if (uni.practice_ratio) lines.push(`■ 실기 반영: ${uni.practice_ratio}`)
  if (uni.note) lines.push(`■ 참고: ${uni.note}`)
  return lines.join('\n')
}

async function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return {
    data: btoa(binary),
    mediaType: file.type,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // 인증 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ message: '인증이 필요합니다.' }), { status: 401 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return new Response(JSON.stringify({ message: '인증 실패' }), { status: 401 })

    // 프리미엄 확인
    const { data: profile } = await supabase.from('profiles').select('is_premium, role').eq('id', user.id).single()
    if (!profile?.is_premium && profile?.role !== 'admin') {
      return new Response(JSON.stringify({ message: '프리미엄 회원만 이용할 수 있는 기능입니다.' }), { status: 403 })
    }

    // multipart/form-data 파싱
    const formData = await req.formData()
    const imageFiles = formData.getAll('images') as File[]
    if (imageFiles.length === 0) {
      return new Response(JSON.stringify({ message: '이미지를 업로드해주세요.' }), { status: 400 })
    }

    const universityId = formData.get('universityId') as string | null
    const additionalNote = formData.get('additionalNote') as string | null

    // 대학 컨텍스트 조회
    let uniContext = ''
    if (universityId) {
      const { data: uni } = await supabase.from('universities').select('*').eq('id', universityId).single()
      if (uni) uniContext = buildUniversityContext(uni)
    }

    // 이미지 블록 생성
    const imageBlocks = await Promise.all(
      imageFiles.map(async (f) => {
        const { data, mediaType } = await fileToBase64(f)
        return { type: 'image', source: { type: 'base64', media_type: mediaType, data } }
      })
    )

    const n = imageFiles.length
    const perImageInstruction = n > 1
      ? `\n\n${n}장의 작품이 제공되었습니다. 각 작품에 대해 아래 형식으로 순서대로 분석해주세요:\n\n` +
        Array.from({ length: n }, (_, i) =>
          `## 작품 ${i + 1} 분석\n### 종합 평가\n### 강점\n### 개선 필요 사항\n### 실천 조언`
        ).join('\n\n') +
        `\n\n---\n## 종합 평가 및 최우선 과제\n(${n}장을 전체적으로 보고 현재 수준과 가장 중요한 과제 1~2가지)`
      : `\n\n다음 항목으로 피드백을 구성해주세요:\n\n## 종합 평가\n## 강점\n## 개선 필요 사항\n## 목표 대학 기준 분석\n## 실천 조언`

    const userPrompt = [
      universityId && uniContext
        ? `아래 대학 기준으로 이 실기 작품을 평가해주세요.\n\n${uniContext}`
        : '이 입시미술 실기 작품을 전반적으로 평가해주세요.',
      additionalNote ? `\n\n수험생 메모: ${additionalNote}` : '',
      perImageInstruction,
    ].join('')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: EXPERT_SYSTEM,
        messages: [{
          role: 'user',
          content: [...imageBlocks, { type: 'text', text: userPrompt }],
        }],
      }),
    })

    const result = await response.json()
    const feedbackText = result.content?.[0]?.text

    return new Response(JSON.stringify({ feedback: feedbackText }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    console.error('feedback error:', e)
    return new Response(JSON.stringify({ message: (e as Error).message || '피드백 생성 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
