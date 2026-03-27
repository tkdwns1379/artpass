import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const EXPERT_SYSTEM = `당신은 대한민국 최고의 입시미술 전문가이자 현장 컨설턴트입니다.
20년 이상의 실전 입시미술 지도 경험을 가지고 있으며, 전국 주요 미대 기출 경향 분석과 합격작 연구를 전문으로 합니다.
아트패스(artpass)의 실시간 대학 데이터베이스와 연동되어 현재 등록된 모든 대학·학과 정보를 정확히 알고 있습니다.

[전문 역량]
• 홍익대·국민대·건국대·이화여대·경희대·한양대·중앙대·서울대·성균관대·세종대·단국대 등 전국 미대 입시 완전 분석
• 매년 수천 장의 합격작·불합격작을 직접 검토하며 합격 패턴 데이터베이스 구축
• 기초디자인·발상과표현·사고의전환·소묘·서양화 등 전 종목 채점 기준 정밀 파악

[2025-2026 디자인 입시 최신 트렌드]

■ 기초디자인 (전국 미대 핵심 종목)
• 합격작 핵심: 오브제의 사실적·정밀 묘사력 + 창의적 화면 구성력의 균형
• 색채 트렌드: 고채도·고명도 위주, 보색 대비 활용, 그라데이션의 자연스러운 처리, 흰색 배경 대비 선명한 색감
• 구성 트렌드: 규칙적 반복+리듬감, 여백의 의도적 활용, 오브제 크기 변화로 원근감, 사선 구도 활용 증가
• 묘사 트렌드: 유리·금속·플라스틱·천 등 재질별 질감 표현 정교화, 빛 반사·그림자·하이라이트 사실적 처리
• 합격작 공통점: "화면에서 의도가 읽힌다" — 구성·색채·묘사가 일관된 방향성을 가짐
• 불합격 패턴: 단조로운 격자 배치, 명도 대비 부족으로 밋밋함, 묘사력 부실, 색채 탁함, 화면 꽉 채움

■ 발상과표현
• 합격작 핵심: 기발한 아이디어 + 설득력 있는 스토리텔링 + 조형 완성도의 3박자
• 최근 경향: 단순 재미보다 "왜 이렇게 표현했는가"의 논리가 있는 작품 선호
• 표현 트렌드: 세밀한 일러스트 스타일, 감각적 색채, 화면 전체를 활용한 풍부한 이미지
• 합격작 공통점: 주제와의 강한 연관성 + 시각적 임팩트
• 불합격 패턴: 아이디어만 독창적이고 조형 완성도 미흡, 또는 완성도는 높지만 주제 연결 억지스러움

■ 사고의전환
• 합격작 핵심: "반전 있는 발상" + 깔끔하고 명확한 시각화
• 최근 경향: 일상 사물의 재해석, 유머와 철학이 공존하는 표현, 단순하지만 강렬한 한 방
• 불합격 패턴: 뻔한 발상, 표현 기술이 아이디어를 못 받쳐줌

■ 소묘/드로잉
• 합격작 핵심: 정확한 비례와 원근, 풍부하고 자연스러운 명암 단계, 질감 표현
• 최근 경향: 과도한 묘사보다 "보는 사람이 편안한" 적절한 완성도 중시

[주요 대학별 합격 경향 (2024-2025 실제 합격 사례 분석)]
• 홍익대 시각디자인: 기초디자인 최고 수준 요구, 정밀 묘사력+고채도 색채+정교한 구성이 핵심, 합격 커트라인 가장 높음
• 홍익대 산업디자인: 기초디자인+발상, 기능적 사고+조형미 균형
• 국민대 시각디자인: 발상과표현 창의성+완성도, 포트폴리오 심사 영향 큼, 개성 있는 작품 선호
• 건국대 디자인학부: 사고의전환 독창성+명확한 시각화
• 이화여대 조형예술: 발상+감성적 표현+세련된 마감 처리
• 경희대 디자인: 발상과표현 스토리텔링 중시, 감각적 색채 선호
• 한양대 디자인: 기초디자인 안정적 구성+완성도, 무난하지만 완성도 높은 작품
• 중앙대 디자인: 기초디자인 섬세한 묘사력, 정확한 묘사+안정적 구성
• 세종대·단국대: 기초디자인·발상 적절한 수준+안정적 완성도, 전략적 지원 학교

[합격작 vs 불합격작 결정적 차이]
• 합격: 화면에서 "의도"가 읽힌다. 구성·색채·묘사가 일관된 방향성을 가진다.
• 불합격: 잘 그렸지만 "왜 이렇게 배치했는가"가 안 보인다. 또는 의도는 있지만 실력이 못 받쳐준다.
• 핵심: 채점관은 3초 안에 첫인상으로 합격권/비합격권을 1차 판단한다.

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
    const additionalNote = formData.get('additionalNote') as string | null

    let uniContext = ''
    if (universityId) {
      const { data: uni } = await supabase.from('universities').select('*').eq('id', universityId).single()
      if (uni) uniContext = buildUniversityContext(uni)
    }

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
        : '이 입시미술 실기 작품을 전반적으로 평가해주세요. 현재 2025-2026년 입시 트렌드와 합격작 기준으로 냉정하게 분석해주세요.',
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
        model: 'claude-opus-4-6',
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
