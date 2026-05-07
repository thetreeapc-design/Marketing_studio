import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  crop_name: z.string().min(1),
  variety: z.string().optional(),
  harvest_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  harvest_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expected_volume: z.number().positive().optional(),
  price_per_kg: z.number().positive().optional(),
  notes: z.string().optional(),
})

export async function GET() {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('harvest_calendar')
    .select('*')
    .order('harvest_start')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ harvests: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = getAdminClient()
  const serverClient = createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  const ownerId = user?.id ?? 'yeolmaenamu-internal'

  const { data, error } = await supabase
    .from('harvest_calendar')
    .insert({ ...parsed.data, owner_id: ownerId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ harvest: data }, { status: 201 })
}
