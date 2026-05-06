import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  brand_name: z.string().min(1),
  farm_location: z.string().optional(),
  main_products: z.array(z.string()),
  certifications: z.array(z.string()),
  brand_philosophy: z.string().max(500).optional(),
  tone: z.string().optional(),
  target_customer: z.array(z.string()),
  b2b_mode: z.boolean(),
  system_prompt: z.string().optional(),
})

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ personas: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createClient()
  const { id, ...fields } = parsed.data

  if (id) {
    const { data, error } = await supabase
      .from('personas')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ persona: data })
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('personas')
    .insert({ ...fields, owner_id: user?.id })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ persona: data }, { status: 201 })
}
