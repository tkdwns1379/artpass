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
• 기초디자인·발상과표현·사고의전환·소묘·서양화 등 전 종목 채점 기준 정밀 파악

[2025-2026 디자인 입시 최신 트렌드]

■ 기초디자인 (전국 미대 핵심 종목)
• 합격작 핵심: 오브제의 사실적·정밀 묘사력 + 창의적 화면 구성력의 균형
• 색채 트렌드: 고채도·고명도 위주, 보색 대비 활용, 자연스러운 그라데이션 처리
• 구성 트렌드: 규칙적 반복+리듬감, 여백의 의도적 활용, 오브제 크기 변화로 원근감, 사선 구도 증가
• 묘사 트렌드: 유리·금속·플라스틱·천 등 재질별 질감 표현 정교화, 빛 반사·그림자·하이라이트 사실적 처리
• 합격작 공통점: "화면에서 의도가 읽힌다" — 구성·색채·묘사가 일관된 방향성
• 불합격 패턴: 단조로운 격자 배치, 명도 대비 부족, 묘사력 부실, 색채 탁함

■ 발상과표현
• 합격작 핵심: 기발한 아이디어 + 설득력 있는 스토리텔링 + 조형 완성도의 3박자
• 최근 경향: 단순 재미보다 논리 있는 작품 선호, 세밀한 일러스트 스타일 + 감각적 색채
• 불합격 패턴: 아이디어만 독창적이고 조형 완성도 미흡, 또는 완성도 높지만 주제 연결 억지스러움

■ 사고의전환
• 합격작 핵심: "반전 있는 발상" + 깔끔하고 명확한 시각화
• 최근 경향: 일상 사물 재해석, 유머와 철학이 공존하는 단순하지만 강렬한 표현

[주요 대학별 합격 경향 (2024-2025 실제 합격 사례 분석)]
• 홍익대 시각디자인: 기초디자인 최고 수준, 정밀 묘사력+고채도 색채+정교한 구성 핵심
• 홍익대 산업디자인: 기초디자인+발상, 기능적 사고+조형미 균형
• 국민대 시각디자인: 발상과표현 창의성+완성도, 개성 있는 작품 선호, 포트폴리오 영향 큼
• 건국대 디자인학부: 사고의전환 독창성+명확한 시각화
• 이화여대 조형예술: 발상+감성적 표현+세련된 마감
• 경희대 디자인: 발상과표현 스토리텔링 중시, 감각적 색채 선호
• 한양대 디자인: 기초디자인 안정적 구성+완성도
• 중앙대 디자인: 기초디자인 섬세한 묘사력
• 세종대·단국대: 기초디자인·발상 적절한 수준+안정적 완성도 (전략적 지원 학교)

[합격 가능성 판단 기준]
• 최상위권 (홍익대 서울): 기초디자인 완성도 95% 이상, 미술학원 최상위 반 수준
• 상위권 (국민대·이화여대·경희대·한양대): 완성도 80-90%, 종목별 특성 잘 이해한 작품
• 중위권 (세종대·단국대·지방 국립대): 완성도 65-80%, 안정적 구성+적절한 묘사

피드백 원칙:
- 현재 작품 수준에 맞는 현실적인 대학을 추천합니다. 무조건 상위권만 추천하지 않습니다.
- 작품 스타일과 전형 특성의 궁합을 최우선으로 고려합니다.
- 추천 이유와 준비 포인트를 구체적으로 제시합니다.
- 디자인패스 DB에 등록된 대학 목록 기준으로만 추천합니다.
- 마크다운 형식으로 구조적으로 작성합니다.`

function buildUniversitiesSummary(unis: Record<string, unknown>[]): string {
  return unis.map(u => {
    const practiceInfo = u.has_practice === false
      ? '실기없음(포트폴리오+면접)'
      : ((u.practice_subjects as string[])?.join('·') || '실기')
    const guide = u.practice_guide as Record<string, unknown> | null
    const scoring = Array.isArray(guide?.scoring)
      ? (guide!.scoring as { item: string }[]).map(s => s.item).join('·')
      : ''
    const competition = u.competition_rate ? `경쟁률 ${u.competition_rate}` : ''
    const recruit = u.recruit_count ? `모집 ${u.recruit_count}` : ''
    return `[${u.region}] ${u.name} - ${u.department} | ${practiceInfo}${scoring ? ` | 채점: ${scoring}` : ''} | ${competition}${recruit ? ` | ${recruit}` : ''}`
  }).join('\n')
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

    const additionalNote = formData.get('additionalNote') as string | null

    // 디자인패스 DB에서 전국 대학 실시간 조회
    const { data: allUnis } = await supabase.from('universities').select('*')
    const uniSummary = buildUniversitiesSummary(allUnis ?? [])

    const imageBlocks = await Promise.all(
      imageFiles.map(async (f) => {
        const { data, mediaType } = await fileToBase64(f)
        return { type: 'image', source: { type: 'base64', media_type: mediaType, data } }
      })
    )

    const n = imageFiles.length
    const userPrompt = `${n > 1 ? `${n}장의 실기 작품이 제공되었습니다. 전체 작품을 종합적으로 분석하여` : '이 실기 작품을 보고,'} 디자인패스에 현재 등록된 대학 목록 중 이 학생에게 가장 잘 맞는 대학을 추천해주세요.

[디자인패스 등록 대학 목록 — 실시간 데이터]
${uniSummary}

${additionalNote ? `수험생 추가 정보: ${additionalNote}\n\n` : ''}${n > 1 ? '작품들의 전반적인 스타일·완성도·강점·약점을 종합 분석하고 ' : '작품의 스타일·완성도·강점·약점을 분석하고 '}현재 수준에 맞는 현실적 추천을 포함하여 다음 형식으로 답해주세요:

## 작품 분석 요약
(스타일, 강점, 현재 수준 — 솔직하게)

## 추천 대학 TOP 5

### 1위: [대학명] - [학과]
**추천 이유:** (이 대학 전형 특성과 작품 스타일이 맞는 이유)
**합격 가능성:** (현재 수준 기준 솔직한 판단)
**준비 포인트:** (합격을 위해 가장 중요한 보완 사항)

### 2위 ~ 5위 동일 형식

## 현실적 입시 전략
(현재 수준에서 가장 효율적인 준비 방법과 목표 설정)`

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
    const recommendationText = result.content?.[0]?.text

    return new Response(JSON.stringify({ recommendation: recommendationText }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    console.error('feedback-recommend error:', e)
    return new Response(JSON.stringify({ message: (e as Error).message || '대학 추천 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
