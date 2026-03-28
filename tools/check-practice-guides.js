const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run() {
  const { data, error } = await supabase
    .from('universities')
    .select('name, department, practice_guide')
    .order('name')

  if (error) { console.error(error); process.exit(1) }

  const withGuide = data.filter(r => r.practice_guide)
  const withoutGuide = data.filter(r => !r.practice_guide)

  console.log(`\n=== practice_guide 있음 (${withGuide.length}개) ===`)
  withGuide.forEach(r => console.log(`  ✅ ${r.name} / ${r.department}`))

  console.log(`\n=== practice_guide 없음 (${withoutGuide.length}개) ===`)
  withoutGuide.forEach(r => console.log(`  ❌ ${r.name} / ${r.department}`))
}

run()
