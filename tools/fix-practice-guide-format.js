const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 기간 번호(① ② ③ ...) 패턴으로 문자열 분리
function parseCircleNumbers(str) {
  return str
    .split(/(?=[①②③④⑤⑥⑦⑧⑨⑩])/)
    .map(s => s.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '').trim())
    .filter(s => s.length > 0)
}

// scoring 문자열 → { item, detail }[] 배열
function parseScoring(scoring) {
  if (Array.isArray(scoring)) return scoring
  if (typeof scoring !== 'string') return []

  const parts = parseCircleNumbers(scoring)
  if (parts.length > 1) {
    return parts.map(part => {
      const colonIdx = part.indexOf(':')
      if (colonIdx === -1) return { item: part.trim(), detail: '' }
      return {
        item: part.substring(0, colonIdx).trim(),
        detail: part.substring(colonIdx + 1).trim()
      }
    })
  }

  // ① 패턴이 없는 경우 - 문장 단위로 분리 후 단일 항목 처리
  return [{ item: '평가 기준', detail: scoring.trim() }]
}

// trends 문자열 → { year, topic }[] 배열
function parseTrends(trends) {
  if (Array.isArray(trends)) return trends
  if (typeof trends !== 'string') return []

  // '202X 주제' 패턴 찾기
  const yearMatches = []
  const yearPattern = /(202\d)[^\s,]*\s+([^,]+?)(?=,\s*202\d|$)/g
  let m
  while ((m = yearPattern.exec(trends)) !== null) {
    yearMatches.push({ year: m[1], topic: m[2].trim().replace(/\.$/, '') })
  }
  if (yearMatches.length > 0) return yearMatches

  // '숫자년도: 내용' 패턴
  const colonPattern = /(202\d)[^\s]*[:\s]+([^\n.]+)/g
  while ((m = colonPattern.exec(trends)) !== null) {
    yearMatches.push({ year: m[1], topic: m[2].trim() })
  }
  if (yearMatches.length > 0) return yearMatches

  // 패턴 없으면 전체를 '최근 경향'으로
  return [{ year: '최근', topic: trends.trim() }]
}

// cautions 문자열 → string[] 배열
function parseCautions(cautions) {
  if (Array.isArray(cautions)) return cautions
  if (typeof cautions !== 'string') return []

  // '. ' 또는 마침표+공백 기준으로 분리
  const sentences = cautions
    .split(/(?<=\.)\s+(?=[가-힣A-Za-z\(])/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  return sentences
}

// strategy 문자열 → string[] 배열
function parseStrategy(strategy) {
  if (Array.isArray(strategy)) return strategy
  if (typeof strategy !== 'string') return []

  const parts = parseCircleNumbers(strategy)
  if (parts.length > 1) return parts

  return [strategy.trim()]
}

// examInfo 필드 정규화 (time/paper/materials 필드 통일)
function fixExamInfo(examInfo) {
  if (!examInfo) return { time: '', paper: '해당없음', materials: '' }
  return {
    time: examInfo.time || examInfo.duration || '',
    paper: examInfo.paper || '해당없음',
    materials: examInfo.materials || ''
  }
}

async function run() {
  // 새로 추가된 17개 학과 조회
  const targets = [
    { name: '동덕여자대학교', department: '미디어디자인전공' },
    { name: '동덕여자대학교', department: '패션디자인전공' },
    { name: '동아방송예술대학교', department: '엔터테인먼트경영과' },
    { name: '동아방송예술대학교', department: '음향제작과' },
    { name: '동아방송예술대학교', department: '작곡과' },
    { name: '동아방송예술대학교', department: '보컬과' },
    { name: '동아방송예술대학교', department: '기악과' },
    { name: '동아방송예술대학교', department: 'K-POP과' },
    { name: '동아방송예술대학교', department: '뮤지컬과' },
    { name: '동아방송예술대학교', department: '연극과' },
    { name: '명지대학교', department: '디자인학부' },
    { name: '서경대학교', department: '디자인학부(라이프스타일디자인)' },
    { name: '서울과학기술대학교', department: '디자인학과(산업디자인전공)' },
    { name: '서울여자대학교', department: '산업디자인학과' },
    { name: '수원대학교', department: '조형예술학부(회화전공)' },
    { name: '숙명여자대학교', department: '산업디자인과' },
    { name: '전북대학교', department: '산업디자인학과(시각영상디자인)' },
  ]

  let success = 0
  let fail = 0

  for (const target of targets) {
    const { data, error: fetchErr } = await supabase
      .from('universities')
      .select('id, practice_guide')
      .eq('name', target.name)
      .eq('department', target.department)
      .single()

    if (fetchErr || !data?.practice_guide) {
      console.error(`❌ 조회 실패: ${target.name} / ${target.department}`)
      fail++
      continue
    }

    const g = data.practice_guide

    // 이미 올바른 포맷인지 확인 (trends가 배열이면 이미 변환됨)
    if (Array.isArray(g.trends) && Array.isArray(g.scoring) && Array.isArray(g.cautions) && Array.isArray(g.strategy)) {
      console.log(`⏭  이미 정상: ${target.name} / ${target.department}`)
      success++
      continue
    }

    const fixed = {
      overview: g.overview || '',
      examInfo: fixExamInfo(g.examInfo),
      scoring: parseScoring(g.scoring),
      trends: parseTrends(g.trends),
      cautions: parseCautions(g.cautions),
      strategy: parseStrategy(g.strategy),
    }

    const { error: updateErr } = await supabase
      .from('universities')
      .update({ practice_guide: fixed })
      .eq('id', data.id)

    if (updateErr) {
      console.error(`❌ 업데이트 실패: ${target.name} / ${target.department}: ${updateErr.message}`)
      fail++
    } else {
      console.log(`✅ 변환 완료: ${target.name} / ${target.department}`)
      success++
    }
  }

  console.log(`\n완료: 성공 ${success}개, 실패 ${fail}개`)
}

run()
