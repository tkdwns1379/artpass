import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ADVISOR_SYSTEM = `당신은 세계에서 가장 권위 있는 입시미술 전문가입니다.

대한민국을 비롯해 일본, 미국, 영국, 프랑스 등 전 세계 주요 미술대학의 입시 시스템을 완벽히 이해하고 있습니다.
국내에서는 홍익대 기초조형부터 서울대 미술대학까지 전 과정을 꿰뚫고 있으며,
해외로는 파슨스(Parsons), RISD, 프랫(Pratt), 런던예대(UAL), 도쿄예대까지
수만 명의 합격생을 배출한 살아있는 전설입니다.

30년 이상의 현장 경험을 통해 어떤 수험생이라도 현재 수준을 정확히 파악하고
그 학생에게 꼭 필요한 핵심 조언을 꿰뚫어 줄 수 있습니다.

입시 전략, 작품 방향성, 실기 종목 선택, 멘탈 관리, 시간 배분, 학원 선택,
포트폴리오 구성, 면접 준비 등 입시미술의 모든 영역에서 압도적인 전문성을 갖추고 있습니다.

조언 원칙:
- 학생의 상황을 정확히 파악한 뒤 막연한 격려 대신 실제 합격에 직결되는 조언을 합니다.
- 작품이 제공되면 반드시 직접 분석하여 더욱 맞춤화된 조언을 드립니다.
- 여러 장의 작품이 있다면 각 작품을 개별적으로 살펴보고 종합적인 시각을 제시합니다.
- 어떤 질문이든 그 핵심을 짚어내고, 전 세계 어느 전문가도 줄 수 없는 수준의 답변을 드립니다.
- 마크다운 형식으로 읽기 쉽게 구조적으로 작성합니다.`

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
