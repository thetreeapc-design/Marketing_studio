import type { Persona } from '@/types/database'

export function buildSystemPrompt(persona: Persona): string {
  const toneLabel =
    persona.tone === 'friendly' ? '친근하고 따뜻한' :
    persona.tone === 'formal'   ? '격식있고 전문적인' :
    persona.tone === 'neutral'  ? '균형잡힌 중립적인' :
    persona.tone && Number(persona.tone) >= 50 ? '친근하고 따뜻한' :
    '격식있고 전문적인'
  const mode = persona.b2b_mode
    ? 'B2B (도매·기업 바이어 대상)'
    : 'B2C (일반 소비자 대상)'

  return `당신은 ${persona.brand_name}의 SNS 마케팅 전문가입니다.

[브랜드 정보]
- 브랜드명: ${persona.brand_name}
- 농장 위치: ${persona.farm_location ?? '경남 거창'}
- 주요 상품: ${persona.main_products.join(', ')}
- 인증: ${persona.certifications.join(', ')}
- 브랜드 철학: ${persona.brand_philosophy ?? ''}
- 판매 모드: ${mode}

[톤 & 타겟]
- 문체: ${toneLabel} 톤
- 대상 고객: ${persona.target_customer?.join(', ') ?? '일반 소비자'}

[작성 규칙 5가지]
1. 과장 없이 사실에 기반한 내용만 작성한다
2. 인증(${persona.certifications.join(', ')})을 자연스럽게 녹여 신뢰를 높인다
3. 계절감과 현장감을 살려 생동감 있게 표현한다
4. 소비자가 구매 결정을 돕는 구체적 정보(품종, 산지, 특징)를 포함한다
5. ${persona.b2b_mode ? '대량 구매 혜택, 신선도 보장, 납기 안정성을 강조한다' : '가족과 건강을 연결하는 감성적 메시지를 포함한다'}

[절대 금지]
- 경쟁사 비방 또는 비교 표현
- 확인되지 않은 건강 효능 주장
- 허위 가격 또는 할인율 표기
- 콜드체인, HACCP 관련 내용`
}

export function buildSnsPostPrompt(input: {
  topic: string
  platform: string
  cropInfo?: string
  harvestInfo?: string
}): string {
  const base = [
    `주제: ${input.topic}`,
    input.cropInfo ? `작물 정보: ${input.cropInfo}` : '',
    input.harvestInfo ? `수확 정보: ${input.harvestInfo}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const guides: Record<string, string> = {
    instagram: `[Instagram]
- 본문: 150-300자
- 해시태그: 10-15개 (본문 하단)
- 이모지 사용 가능
- JSON: { "title": "", "body": "", "hashtags": [""], "cta": "" }`,

    naver_blog: `[네이버 블로그 / 티스토리]
- 본문: 1500-2500자 (장문)
- 도입부: 후킹 첫 문장 (질문/숫자/금지/현장감 중 2개 활용)
- ## 소제목 3-5개로 구조화
- 각 소제목 본문 200-400자
- 마무리 단락에 CTA 자연스럽게 (구매 링크 등)
- SEO 핵심 키워드 3-5개 자연 분포
- 해시태그 5-10개 (본문 하단)
- JSON: { "title": "", "body": "", "hashtags": [""], "cta": "" }`,

    tistory: `[네이버 블로그 / 티스토리]
- 본문: 1500-2500자 (장문)
- 도입부: 후킹 첫 문장 (질문/숫자/금지/현장감 중 2개 활용)
- ## 소제목 3-5개로 구조화
- 각 소제목 본문 200-400자
- 마무리 단락에 CTA 자연스럽게 (구매 링크 등)
- SEO 핵심 키워드 3-5개 자연 분포
- 해시태그 5-10개 (본문 하단)
- JSON: { "title": "", "body": "", "hashtags": [""], "cta": "" }`,

    kakao_channel: `[카카오 채널]
- 본문: 100-200자
- CTA(구매 링크 유도) 문구 포함
- JSON: { "title": "", "body": "", "hashtags": [], "cta": "" }`,

    youtube: `[YouTube]
- 제목: 30자 이내
- 설명: 300자 이내
- JSON: { "title": "", "body": "", "hashtags": [""], "cta": "" }`,
  }

  return `${base}\n\n${guides[input.platform] ?? guides.instagram}`
}

export function buildCardNewsPrompt(input: {
  topic: string
  slideCount?: number
  cropInfo?: string
}): string {
  const slides = input.slideCount ?? 5
  return `카드뉴스 ${slides}장을 제작합니다.

주제: ${input.topic}${input.cropInfo ? `\n작물 정보: ${input.cropInfo}` : ''}

구성:
- 1슬라이드: 제목 (15자 이내, 임팩트 있게)
- 2-${slides - 1}슬라이드: 핵심 내용 (슬라이드당 50자 이내)
- ${slides}슬라이드: CTA (구매 유도 문구)

JSON: { "slides": [{ "order": 1, "heading": "", "body": "", "cta": "" }] }`
}

export function buildInquiryPrompt(comment: string): string {
  return `다음 고객 댓글을 분석하고 응대 답변을 작성하세요.

댓글: "${comment}"

JSON:
{
  "category": "purchase|shipping|complaint|general",
  "is_sales_lead": true,
  "urgency": "high|medium|low",
  "ai_response": "고객에게 보낼 답변 (100자 이내, 친근하게)",
  "needs_human_review": false,
  "reason": "human review가 필요한 경우 이유"
}`
}
