import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const today = new Date().toISOString().split('T')[0]
  const from = searchParams.get('from') ?? today
  const toDate = new Date()
  toDate.setDate(toDate.getDate() + 30)
  const to = searchParams.get('to') ?? toDate.toISOString().split('T')[0]

  const db = getAdminClient()
  const { data, error } = await db
    .from('blog_schedule')
    .select('*')
    .gte('publish_date', from)
    .lte('publish_date', to)
    .order('publish_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedules: data })
}
