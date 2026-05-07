import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  crop_name: z.string().min(1).optional(),
  variety: z.string().optional(),
  harvest_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  harvest_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expected_volume: z.number().positive().nullable().optional(),
  price_per_kg: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('harvest_calendar')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ harvest: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getAdminClient()
  const { error } = await supabase.from('harvest_calendar').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
