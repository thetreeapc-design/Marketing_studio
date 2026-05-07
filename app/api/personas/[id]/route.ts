import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'

const schema = z.object({
  name: z.string().min(1).optional(),
  brand_name: z.string().min(1).optional(),
  farm_location: z.string().optional(),
  main_products: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  brand_philosophy: z.string().max(500).nullable().optional(),
  tone: z.string().nullable().optional(),
  target_customer: z.array(z.string()).optional(),
  b2b_mode: z.boolean().optional(),
  system_prompt: z.string().nullable().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await adminClient
    .from('personas')
    .select('*')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ persona: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('personas')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ persona: data })
}
