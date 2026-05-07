import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/admin'
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
  const db = getAdminClient()
  const { data, error } = await db
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

  const db = getAdminClient()
  const { id, ...fields } = parsed.data

  if (id) {
    const { data, error } = await db
      .from('personas')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ persona: data })
  }

  // 로그인된 사용자 UUID 가져오기
  let ownerId: string
  try {
    const serverClient = createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    ownerId = user?.id ?? '00000000-0000-0000-0000-000000000001'
  } catch {
    ownerId = '00000000-0000-0000-0000-000000000001'
  }

  // FK 제약이 있으면 제약 없이 재시도
  const { data, error } = await db
    .from('personas')
    .insert({ ...fields, owner_id: ownerId })
    .select()
    .single()

  if (error?.message?.includes('foreign key')) {
    // FK 제약 위반 시 owner_id 없이 저장 시도
    const { data: data2, error: error2 } = await db
      .from('personas')
      .insert(fields)
      .select()
      .single()
    if (error2) return NextResponse.json({ error: error2.message }, { status: 500 })
    return NextResponse.json({ persona: data2 }, { status: 201 })
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ persona: data }, { status: 201 })
}
