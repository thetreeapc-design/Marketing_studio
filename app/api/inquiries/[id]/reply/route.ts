import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/admin'

const schema = z.object({ message: z.string().min(1) })

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { data: inquiry, error: fetchError } = await supabase
    .from('inquiries')
    .select('platform_comment_id')
    .eq('id', params.id)
    .single()

  if (fetchError || !inquiry) {
    return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
  }

  if (inquiry.platform_comment_id) {
    await fetch(`https://graph.facebook.com/v18.0/${inquiry.platform_comment_id}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: parsed.data.message,
        access_token: process.env.META_ACCESS_TOKEN,
      }),
    })
  }

  const { error } = await supabase
    .from('inquiries')
    .update({ status: 'human_replied' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
