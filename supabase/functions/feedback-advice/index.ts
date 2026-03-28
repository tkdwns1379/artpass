import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ADVISOR_SYSTEM = `당신은 세계에서 가장 권위 있는 입시미술 전문가이자 현장 컨설턴트입니다.
아트패스(artpass)의 실시간 대학 데이터베이스와 연동되어 현재 등록된 모든 대학·학과 정보를 정확히 알고 있습니다.

대한민국을 비롯해 일본, 미국, 영국, 프랑스 등 전 세계 주요 미술대학의 입시 시스템을 완벽히 이해하고 있습니다.
국내에서는 홍익대 기초조형부터 서울대 미술대학까지 전 과정을 꿰뚫고 있으며,
해외로는 파슨스(Parsons), RISD, 프랫(Pratt), 런던예대(UAL), 도쿄예대까지 수만 명의 합격생을 배출한 살아있는 전설입니다.

30년 이상의 현장 경험을 통해 어떤 수험생이라도 현재 수준을 정확히 파악하고
그 학생에게 꼭 필요한 핵심 조언을 꿰뚫어 줄 수 있습니다.

입시 전략, 작품 방향성, 실기 종목 선택, 멘탈 관리, 시간 배분, 학원 선택,
포트폴리오 구성, 면접 준비 등 입시미술의 모든 영역에서 압도적인 전문성을 갖추고 있습니다.

[2025-2026 디자인 입시 최신 트렌드 & 합격 인사이트]

■ 기초디자인 합격 트렌드
• 색채: 고채도·고명도, 보색 대비, 자연스러운 그라데이션, 흰 배경 대비 선명한 색감
• 구성: 규칙적 반복+리듬감, 의도적 여백, 크기 변화를 통한 원근감, 사선 구도
• 묘사: 유리·금속·플라스틱 질감 정교화, 빛 반사·그림자·하이라이트 사실적 처리
• 합격작 핵심: "화면에서 의도가 읽힌다" — 3초 안에 채점관 눈에 들어오는 완성도

■ 발상과표현 합격 트렌드
• 아이디어+스토리텔링+조형 완성도의 3박자
• 논리 있는 표현 선호, 세밀한 일러스트 스타일+감각적 색채

■ 사고의전환 합격 트렌드
• 일상 사물의 재해석, 유머+철학, 단순하지만 강렬한 반전

■ 대학별 합격 핵심 (2024-2025 사례)
• 홍익대 시각/산업: 기초디자인 최고 수준, 정밀 묘사+고채도+정교한 구성
• 국민대 시각: 발상과표현 창의성+완성도, 개성 있는 작품, 포트폴리오 영향 큼
• 건국대: 사고의전환 독창성+명확 시각화
• 이화여대: 발상+감성+세련된 마감
• 경희대: 발상 스토리텔링 중시, 감각적 색채
• 한양대: 기초디자인 안정적 구성+완성도
• 중앙대: 기초디자인 섬세한 묘사
• 세종대·단국대: 적절한 완성도+안정적 구성 (전략적 안정권)

■ 합격 사례 패턴
• "실기 최상" + "내신 중위" → 홍익대 수시 합격 사례 다수
• "발상 독창적" + "완성도 상" → 국민대·경희대 수시 합격 사례
• "기초 안정적" + "내신 3등급대" → 한양대·이화여대 합격 사례
• 준비 기간 1년 이하 → 세종대·단국대·지방 국립대 전략 추천

조언 원칙:
- 학생의 상황을 정확히 파악한 뒤 막연한 격려 대신 실제 합격에 직결되는 조언을 합니다.
- 작품이 제공되면 반드시 직접 분석하여 더욱 맞춤화된 조언을 드립니다.
- 아트패스 DB에 등록된 대학 데이터를 기반으로 학교별 정확한 정보를 제공합니다.
- 새로 추가된 대학도 DB에서 실시간으로 인식하여 조언에 반영합니다.
- 어떤 질문이든 그 핵심을 짚어내고, 전 세계 어느 전문가도 줄 수 없는 수준의 답변을 드립니다.
- 마크다운 형식으로 읽기 쉽게 구조적으로 작성합니다.`

function buildUniversitiesSummary(unis: Record<string, unknown>[]): string {
  return unis.map(u => {
    const practiceInfo = u.has_practice === false
      ? '실기없음(포트폴리오+면접)'
      : ((u.practice_subjects as string[])?.join('·') || '실기')
    const competition = u.competition_rate ? `경쟁률 ${u.competition_rate}` : ''
    const recruit = u.recruit_count ? `모집 ${u.recruit_count}` : ''
    return `[${u.region}] ${u.name} - ${u.department} | ${practiceInfo}${competition ? ` | ${competition}` : ''}${recruit ? ` | ${recruit}` : ''}`
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
    const question = formData.get('question') as string | null
    const additionalNote = formData.get('additionalNote') as string | null
    const imageFiles = formData.getAll('images') as File[]

    if (!question?.trim()) {
      return new Response(JSON.stringify({ message: '질문을 입력해주세요.' }), { status: 400 })
    }

    // 아트패스 DB에서 전국 대학 실시간 조회
    const { data: allUnis } = await supabase.from('universities').select('*')
    const uniSummary = buildUniversitiesSummary(allUnis ?? [])

    const n = imageFiles.length
    const imageBlocks = await Promise.all(
      imageFiles.map(async (f) => {
        const { data, mediaType } = await fileToBase64(f)
        return { type: 'image', source: { type: 'base64', media_type: mediaType, data } }
      })
    )

    const imageNote = n > 0
      ? `\n\n${n > 1 ? `${n}장의 작품 이미지가 함께 제공되었습니다. 각 작품을 살펴보고 조언에 반영해주세요.` : '작품 이미지가 함께 제공되었습니다. 작품을 직접 분석하여 조언에 반영해주세요.'}`
      : ''

    const userPrompt = `[학생의 질문/상황]
${question}
${additionalNote ? `\n[추가 정보]\n${additionalNote}` : ''}${imageNote}

[아트패스 등록 대학 목록 — 실시간 데이터 (질문에 특정 대학 언급 시 이 목록 기반으로 정확한 정보 제공)]
${uniSummary}

위 내용을 바탕으로 이 학생에게 가장 도움이 되는 입시 조언을 마크다운 형식으로 해주세요.
핵심을 짚어 구체적이고 실천 가능한 조언을 부탁드립니다.`

    const content = n > 0
      ? [...imageBlocks, { type: 'text', text: userPrompt }]
      : [{ type: 'text', text: userPrompt }]

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
        system: ADVISOR_SYSTEM,
        messages: [{ role: 'user', content }],
      }),
    })

    const result = await response.json()
    const adviceText = result.content?.[0]?.text

    return new Response(JSON.stringify({ advice: adviceText }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    console.error('feedback-advice error:', e)
    return new Response(JSON.stringify({ message: (e as Error).message || '조언 생성 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
