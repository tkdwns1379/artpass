import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const EXPERT_SYSTEM = `당신은 대한민국 최고의 입시미술 전문가이자 현장 컨설턴트입니다.
20년 이상의 실전 입시미술 지도 경험을 가지고 있으며, 전국 주요 미대 기출 경향 분석과 합격작 연구를 전문으로 합니다.
디자인패스(designpass)의 실시간 대학 데이터베이스와 연동되어 현재 등록된 모든 대학·학과 정보를 정확히 알고 있습니다.

[전문 역량]
• 홍익대·국민대·건국대·이화여대·경희대·한양대·중앙대·서울대·성균관대·세종대·단국대 등 전국 미대 입시 완전 분석
• 매년 수천 장의 합격작·불합격작을 직접 검토하며 합격 패턴 데이터베이스 구축
• 기초디자인·발상과표현·사고의전환·소묘 등 전 종목 채점 기준 정밀 파악

[2025-2026 합격선 기준 (실제 합격 사례 분석)]

■ 수시 내신 기준 (디자인 학과)
• 홍익대 시각/산업디자인: 실기 비중 높음, 내신 3~4등급도 실기 최상이면 합격 사례 있음
• 국민대 시각디자인: 내신 3~4등급 + 실기 상위권
• 이화여대·경희대·한양대: 내신 2.5~4등급 + 실기 안정권
• 건국대·세종대·단국대: 내신 3.5~5등급 + 실기 보통 이상

■ 정시 수능 기준 (디자인 학과)
• 홍익대: 국·수·탐 평균 1~2등급 수준 (미술 특기자 제외)
• 국민대·이화여대·경희대: 2~3등급
• 건국대·한양대·중앙대: 2.5~4등급
• 세종대·단국대: 3~5등급

■ 실기 수준 기준
• 합격 최상위권 (홍익대 서울): 학원 최상위반, 5년 이상 준비 수준의 완성도
• 합격 상위권 (국민대·이화여대·경희대·한양대): 학원 상위반, 3-4년 이상 준비 수준
• 합격 중위권 (세종대·단국대·지방대): 학원 중간반 이상, 1-2년 이상 준비 수준

[합격 가능성 산출 방식]
1. 해당 대학 전형 반영 비율 파악 (수능:실기:내신 비중)
2. 성적 요소: 합격선 대비 현재 성적의 위치 → 0~100점 환산
3. 실기 요소: 제출된 작품의 합격 기준 대비 완성도 → 0~100점 환산
4. 최종 합격 가능성 = 전형 반영 비율로 가중 평균
5. 단, 실기 비중이 매우 높은 대학은 실기 수준이 결정적 요소임을 강조

피드백 원칙:
- 합격 가능성을 냉정하고 정확하게 평가합니다. 과장하거나 위로하지 않습니다.
- 구체적인 수치와 근거를 제시합니다.
- 현재 부족한 부분을 정확히 짚고 실천 가능한 개선 방법을 제시합니다.
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
  return { data: btoa(binary), mediaType: file.type }
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ message: '인증이 필요합니다.' }), { status: 401 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return new Response(JSON.stringify({ message: '인증 실패' }), { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_premium, role').eq('id', user.id).single()
    if (!profile?.is_premium && profile?.role !== 'admin') {
      return new Response(JSON.stringify({ message: '프리미엄 회원만 이용할 수 있는 기능입니다.' }), { status: 403 })
    }

    const formData = await req.formData()
    const imageFiles = formData.getAll('images') as File[]
    if (imageFiles.length === 0) {
      return new Response(JSON.stringify({ message: '이미지를 업로드해주세요.' }), { status: 400 })
    }

    const universityId = formData.get('universityId') as string | null
    const admissionType = formData.get('admissionType') as string | null
    const gradeScore = formData.get('gradeScore') as string | null
    const additionalNote = formData.get('additionalNote') as string | null

    if (!universityId) return new Response(JSON.stringify({ message: '목표 대학을 선택해주세요.' }), { status: 400 })
    if (!admissionType) return new Response(JSON.stringify({ message: '수시/정시를 선택해주세요.' }), { status: 400 })
    if (!gradeScore) return new Response(JSON.stringify({ message: '성적을 입력해주세요.' }), { status: 400 })

    const { data: uni } = await supabase.from('universities').select('*').eq('id', universityId).single()
    if (!uni) return new Response(JSON.stringify({ message: '대학을 찾을 수 없습니다.' }), { status: 404 })

    const uniContext = buildUniversityContext(uni)

    const imageBlocks = await Promise.all(
      imageFiles.map(async (f) => {
        const { data, mediaType } = await fileToBase64(f)
        return { type: 'image', source: { type: 'base64', media_type: mediaType, data } }
      })
    )

    const n = imageFiles.length
    const gradeLabel = admissionType === '수시' ? `내신 평균 등급: ${gradeScore}등급` : `수능: ${gradeScore}`

    const userPrompt = `이 학생의 합격 가능성을 분석해주세요.

[지원 정보]
• 전형: ${admissionType}
• ${gradeLabel}
${additionalNote ? `• 추가 정보: ${additionalNote}` : ''}
${n > 1 ? `• 제출 작품: ${n}장 (모든 작품을 종합하여 실기 수준 판단)` : ''}

[목표 대학 정보 — 디자인패스 DB]
${uniContext}

[분석 방법]
1. 이 대학 ${admissionType} 전형의 반영 비율 파악 (수능:실기:내신)
2. 제출된 성적이 합격선 대비 차이 분석 (상/중/하/미달 중 어느 수준)
3. ${n > 1 ? `${n}장의 작품을 종합적으로 보고` : '작품의'} 실기 수준이 이 대학 합격 기준에 얼마나 근접하는지 평가
4. 두 요소를 전형 반영 비율로 종합하여 합격 가능성 산정
5. 현재 부족한 부분과 보완 방법 구체적 제시

반드시 첫 줄을 아래 형식으로 시작해주세요 (다른 내용 없이 정확히):
합격 가능성: XX%

이후 마크다운으로:

## 분석 근거

### 성적 측면
(성적이 합격선 대비 어느 수준인지 구체적으로, 해당 대학 합격선 언급)

### 실기/포트폴리오 측면
(작품 수준이 합격 기준 대비 어느 수준인지, 2025-2026 트렌드 기준으로)

### 종합 판단
(전형 반영 비율 기준으로 종합한 최종 판단)

## 합격을 위한 핵심 과제
(지금 당장 가장 집중해야 할 2~3가지 — 구체적이고 실천 가능하게)`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        system: EXPERT_SYSTEM,
        messages: [{
          role: 'user',
          content: [...imageBlocks, { type: 'text', text: userPrompt }],
        }],
      }),
    })

    const result = await response.json()
    const text = result.content?.[0]?.text ?? ''
    const match = text.match(/합격 가능성:\s*(\d+)%/)
    const rate = match ? parseInt(match[1]) : null
    const detail = text.replace(/^합격 가능성:\s*\d+%\s*\n?/m, '').trim()

    return new Response(JSON.stringify({ rate, detail }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    console.error('feedback-acceptance error:', e)
    return new Response(JSON.stringify({ message: (e as Error).message || '합격률 분석 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
