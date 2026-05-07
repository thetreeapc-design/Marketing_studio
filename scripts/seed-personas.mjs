import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// .env.local에서 키 읽기
const env = readFileSync('.env.local', 'utf-8')
const get = (key) => env.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim()

const supabase = createClient(
  get('NEXT_PUBLIC_SUPABASE_URL'),
  get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

const OWNER_ID = '00000000-0000-0000-0000-000000000001'

const personas = [
  {
    owner_id: OWNER_ID,
    name: 'B2C 친근 마케터',
    brand_name: '열매나무',
    farm_location: '경남 거창',
    main_products: ['부사 사과', '샤인머스캣', '딸기'],
    certifications: ['GAP인증'],
    brand_philosophy: '경남 거창의 맑은 공기와 큰 일교차 속에서 자란 정직한 과일을 식탁에 전합니다.',
    tone: 'friendly',
    target_customer: ['일반소비자', '친환경소비자'],
    b2b_mode: false,
    system_prompt: '열매나무 B2C 마케팅 전문가',
  },
  {
    owner_id: OWNER_ID,
    name: 'B2B 전문 바이어 채널',
    brand_name: '열매나무',
    farm_location: '경남 거창',
    main_products: ['부사 사과', '샤인머스캣', '딸기'],
    certifications: ['GAP인증'],
    brand_philosophy: 'GAP인증 고품질 농산물의 안정적 공급으로 파트너 비즈니스를 지원합니다.',
    tone: 'formal',
    target_customer: ['도매바이어', '급식단체'],
    b2b_mode: true,
    system_prompt: '열매나무 B2B 전문 마케터',
  },
  {
    owner_id: OWNER_ID,
    name: '수출 프리미엄 채널',
    brand_name: 'THE TREE',
    farm_location: '경남 거창',
    main_products: ['부사 사과', '샤인머스캣', '딸기'],
    certifications: ['GAP인증', 'FDA FSMA'],
    brand_philosophy: 'FDA FSMA 기준을 충족하는 프리미엄 한국 농산물을 글로벌 시장에 소개합니다.',
    tone: 'neutral',
    target_customer: ['일반소비자', '도매바이어'],
    b2b_mode: false,
    system_prompt: 'THE TREE 수출 프리미엄 마케터',
  },
]

// 기존 페르소나 확인
const { data: existing } = await supabase.from('personas').select('name')
const existingNames = existing?.map(p => p.name) ?? []

let inserted = 0
for (const persona of personas) {
  if (existingNames.includes(persona.name)) {
    console.log(`건너뜀 (이미 존재): ${persona.name}`)
    continue
  }
  const { error } = await supabase.from('personas').insert(persona)
  if (error) {
    console.error(`실패: ${persona.name}`, error.message)
  } else {
    console.log(`✅ 추가됨: ${persona.name}`)
    inserted++
  }
}

console.log(`\n완료. ${inserted}개 추가됨.`)
