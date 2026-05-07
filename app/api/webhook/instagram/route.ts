import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { generateJSON } from '@/lib/claude'
import { buildSystemPrompt, buildInquiryPrompt } from '@/lib/prompts'

const BASE = 'https://graph.facebook.com/v18.0'

async function postReply(commentId: string, message: string) {
  await fetch(`${BASE}/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: process.env.META_ACCESS_TOKEN }),
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (body.object !== 'instagram') return NextResponse.json({ ok: true })

  const adminClient = getAdminClient()

  const { data: persona } = await adminClient
    .from('personas')
    .select('*')
    .order('created_at')
    .limit(1)
    .single()

  if (!persona) return NextResponse.json({ error: 'No persona configured' }, { status: 500 })

  const systemPrompt = buildSystemPrompt(persona)

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'comments') continue

      const value = change.value
      const commentId: string = value.id
      const message: string = value.text ?? ''
      const userName: string = value.from?.username ?? ''

      const analysis = await generateJSON<{
        category: string
        is_sales_lead: boolean
        urgency: string
        ai_response: string
        needs_human_review: boolean
        reason: string
      }>(systemPrompt, buildInquiryPrompt(message))

      await adminClient.from('inquiries').insert({
        platform: 'instagram',
        platform_comment_id: commentId,
        user_name: userName,
        message,
        category: analysis.category,
        ai_response: analysis.ai_response,
        status: 'pending',
        is_sales_lead: analysis.is_sales_lead,
      })

      if (!analysis.needs_human_review && analysis.category !== 'complaint') {
        await postReply(commentId, analysis.ai_response)
        await adminClient
          .from('inquiries')
          .update({ status: 'ai_replied' })
          .eq('platform_comment_id', commentId)
      }

      if (analysis.is_sales_lead) {
        console.log('[SALES LEAD]', { userName, message, response: analysis.ai_response })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
