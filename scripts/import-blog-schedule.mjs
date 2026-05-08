import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8')
const get = (key) => env.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim()

const supabase = createClient(
  get('NEXT_PUBLIC_SUPABASE_URL'),
  get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

const PLAT = ['휴', '티스토리', '네이버', '티스토리', '네이버', '티스토리', '휴']

const SCHEDULE_PATH = 'D:\\클로드코드\\열매나무_블로그\\assets\\schedule.js'
const raw = readFileSync(SCHEDULE_PATH, 'utf-8')

// CONTENT 객체 본문 추출
const contentMatch = raw.match(/export const CONTENT\s*=\s*\{([\s\S]*?)\n\};/)
if (!contentMatch) {
  console.error('CONTENT 객체를 찾을 수 없습니다.')
  process.exit(1)
}
const body = contentMatch[1]

// 항목 파싱: 'YYYY-MM-DD':{title:'...',cat:'...',kw:[...],fruit:'...',type:'...'}
const itemRe = /'(\d{4}-\d{2}-\d{2})'\s*:\s*\{\s*title\s*:\s*'((?:[^'\\]|\\.)*)'\s*,\s*cat\s*:\s*'((?:[^'\\]|\\.)*)'\s*,\s*kw\s*:\s*\[([^\]]*)\]\s*,\s*fruit\s*:\s*'((?:[^'\\]|\\.)*)'\s*,\s*type\s*:\s*'((?:[^'\\]|\\.)*)'\s*\}/g

const parseKw = (s) =>
  [...s.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"))

const items = []
let m
while ((m = itemRe.exec(body)) !== null) {
  const [, date, title, cat, kwStr, fruit, type] = m
  items.push({
    publish_date: date,
    title: title.replace(/\\'/g, "'"),
    category: cat.replace(/\\'/g, "'"),
    keywords: parseKw(kwStr),
    fruit: fruit.replace(/\\'/g, "'"),
    content_type: type,
  })
}

console.log(`파싱된 항목: ${items.length}개`)

const { data: existing } = await supabase
  .from('blog_schedule')
  .select('publish_date')
const existingDates = new Set(existing?.map((r) => r.publish_date) ?? [])

let added = 0
let skipped = 0

for (const item of items) {
  if (existingDates.has(item.publish_date)) {
    skipped++
    continue
  }
  const day = new Date(item.publish_date + 'T00:00:00').getDay()
  const platform = PLAT[day]
  if (platform === '휴') {
    skipped++
    continue
  }
  const { error } = await supabase.from('blog_schedule').insert({
    publish_date: item.publish_date,
    platform,
    title: item.title,
    category: item.category,
    keywords: item.keywords,
    fruit: item.fruit,
    content_type: item.content_type,
  })
  if (error) {
    console.error(`실패 ${item.publish_date}: ${error.message}`)
    skipped++
  } else {
    added++
  }
}

console.log(`✅ 추가됨: ${added}개 / ⏭️ 건너뜀: ${skipped}개`)
