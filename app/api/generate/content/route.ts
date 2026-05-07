import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'
import { generateJSON } from '@/lib/claude'
import { buildSystemPrompt, buildSnsPostPrompt, buildCardNewsPrompt, buildInquiryPrompt } from '@/lib/prompts'

const schema = z.object({
  personaId: z.string().uuid(),
  contentType: z.enum(['sns_post', 'card_news', 'blog', 'short_form_script']).default('sns_post'),
  topic: z.string().min(1),
  platforms: z.array(z.enum(['instagram', 'naver_blog', 'kakao_channel', 'youtube'])).min(1),
  cropInfo: z.string().optional(),
  harvestId: z.string().uuid().optional(),
  inputSource: z.string().optional(),
  slideCount: z.number().optional(),
  duration: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { personaId, contentType, topic, platforms, cropInfo, harvestId, inputSource, slideCount, duration } = parsed.data

  const { data: persona, error: personaError } = await adminClient
    .from('personas')
    .select('*')
    .eq('id', personaId)
    .single()

  if (personaError || !persona) {
    return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
  }

  let harvestInfo: string | undefined
  if (harvestId) {
    const { data: harvest } = await adminClient
      .from('harvest_calendar')
      .select('*')
      .eq('id', harvestId)
      .single()
    if (harvest) {
      harvestInfo = [
        `${harvest.crop_name} ${harvest.variety ?? ''}`.trim(),
        `수확: ${harvest.harvest_start}~${harvest.harvest_end}`,
        harvest.expected_volume ? `예상량: ${harvest.expected_volume}kg` : '',
        harvest.price_per_kg ? `단가: ${harvest.price_per_kg}원/kg` : '',
      ].filter(Boolean).join(' / ')
    }
  }

  const systemPrompt = buildSystemPrompt(persona)
  const contents: unknown[] = []

  if (contentType === 'card_news') {
    const userPrompt = buildCardNewsPrompt({ topic, slideCount, cropInfo })
    const generated = await generateJSON<{ slides: { order: number; heading: string; body: string; cta: string }[] }>(systemPrompt, userPrompt)

    const { data: content, error } = await adminClient
      .from('contents')
      .insert({
        persona_id: personaId,
        type: 'card_news',
        platform: platforms,
        title: topic,
        body: generated.slides.map(s => `[${s.order}] ${s.heading}\n${s.body}`).join('\n\n'),
        hashtags: [],
        status: 'pending_approval',
        input_source: inputSource ?? 'direct',
        input_data: { topic, cropInfo, slideCount, slides: generated.slides },
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    contents.push(content)

  } else if (contentType === 'short_form_script') {
    const scriptPrompt = `영상 스크립트를 작성하세요.
주제: ${topic}
길이: ${duration ?? '60초'}
${cropInfo ? `작물 정보: ${cropInfo}` : ''}

JSON: { "title": "", "hook": "시청자를 잡는 첫 3초 문구", "body": "본문 스크립트", "cta": "마지막 행동 유도", "hashtags": [] }`

    const generated = await generateJSON<{ title: string; hook: string; body: string; cta: string; hashtags: string[] }>(systemPrompt, scriptPrompt)

    const { data: content, error } = await adminClient
      .from('contents')
      .insert({
        persona_id: personaId,
        type: 'short_form_script',
        platform: platforms,
        title: generated.title,
        body: `[훅]\n${generated.hook}\n\n[본문]\n${generated.body}\n\n[CTA]\n${generated.cta}`,
        hashtags: generated.hashtags,
        status: 'pending_approval',
        input_source: inputSource ?? 'direct',
        input_data: { topic, cropInfo, duration },
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    contents.push(content)

  } else {
    for (const platform of platforms) {
      const userPrompt = buildSnsPostPrompt({ topic, platform, cropInfo, harvestInfo })
      const generated = await generateJSON<{ title: string; body: string; hashtags: string[]; cta: string }>(systemPrompt, userPrompt)

      const { data: content, error } = await adminClient
        .from('contents')
        .insert({
          persona_id: personaId,
          type: contentType,
          platform: [platform],
          title: generated.title,
          body: generated.body,
          hashtags: generated.hashtags,
          status: 'pending_approval',
          input_source: inputSource ?? 'direct',
          input_data: { topic, cropInfo, harvestId, cta: generated.cta },
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      contents.push(content)
    }
  }

  return NextResponse.json({ contents })
}
