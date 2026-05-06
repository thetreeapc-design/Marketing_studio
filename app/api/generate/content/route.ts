import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/claude'
import { buildSystemPrompt, buildSnsPostPrompt } from '@/lib/prompts'

const schema = z.object({
  personaId: z.string().uuid(),
  topic: z.string().min(1),
  platforms: z
    .array(z.enum(['instagram', 'naver_blog', 'kakao_channel', 'youtube']))
    .min(1),
  cropInfo: z.string().optional(),
  harvestId: z.string().uuid().optional(),
  inputSource: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { personaId, topic, platforms, cropInfo, harvestId, inputSource } = parsed.data
  const supabase = createClient()

  const { data: persona, error: personaError } = await supabase
    .from('personas')
    .select('*')
    .eq('id', personaId)
    .single()

  if (personaError || !persona) {
    return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
  }

  let harvestInfo: string | undefined
  if (harvestId) {
    const { data: harvest } = await supabase
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
      ]
        .filter(Boolean)
        .join(' / ')
    }
  }

  const systemPrompt = buildSystemPrompt(persona)
  const contents: unknown[] = []

  for (const platform of platforms) {
    const userPrompt = buildSnsPostPrompt({ topic, platform, cropInfo, harvestInfo })

    const generated = await generateJSON<{
      title: string
      body: string
      hashtags: string[]
      cta: string
    }>(systemPrompt, userPrompt)

    const { data: content, error: insertError } = await supabase
      .from('contents')
      .insert({
        persona_id: personaId,
        type: 'sns_post',
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

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    contents.push(content)
  }

  return NextResponse.json({ contents })
}
