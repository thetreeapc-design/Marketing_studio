import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/admin'

const patchSchema = z.object({
  status: z.enum(['pending', 'generated', 'published', 'skipped']).optional(),
  content_id: z.string().uuid().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getAdminClient()
  const { data, error } = await db
    .from('blog_schedule')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ schedule: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const db = getAdminClient()
  const { data, error } = await db
    .from('blog_schedule')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data })
}
