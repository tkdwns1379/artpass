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
    return `[${u.region}] ${u.name} - ${u.department} | ${practiceInfo} | 평가: ${scoring} | ${competition}`
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

    // 전국 대학 목록 조회
    const { data: allUnis } = await supabase.from('universities').select('*')
    const uniSummary = buildUniversitiesSummary(allUnis ?? [])

    const imageBlocks = await Promise.all(
      imageFiles.map(async (f) => {
        const { data, mediaType } = await fileToBase64(f)
        return { type: 'image', source: { type: 'base64', media_type: mediaType, data } }
      })
    )

    const n = imageFiles.length
    const userPrompt = `${n > 1 ? `${n}장의 실기 작품이 제공되었습니다. 전체 작품을 종합적으로 분석하여` : '이 실기 작품을 보고,'} 아래 대학 목록 중 이 학생에게 가장 잘 맞는 대학을 추천해주세요.

[전국 미대 목록]
${uniSummary}

${additionalNote ? `수험생 추가 정보: ${additionalNote}\n\n` : ''}${n > 1 ? '작품들의 전반적인 스타일·완성도·강점·약점을 종합 분석하고 ' : '작품의 스타일·완성도·강점·약점을 분석하고 '}다음 형식으로 답해주세요:

## 작품 분석 요약
(스타일, 강점, 현재 수준 한 줄 요약)

## 추천 대학 TOP 5

### 1위: [대학명] - [학과]
**추천 이유:** (이 대학 전형 특성과 작품 스타일이 맞는 이유)
**준비 포인트:** (합격을 위해 보완해야 할 부분)

### 2위 ~ 5위 동일 형식

## 전반적인 조언
(현재 수준에서 가장 효율적인 입시 전략)`

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
