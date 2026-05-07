import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') ?? 'all'

  const supabase = getAdminClient()
  let query = supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (filter === 'purchase') query = query.eq('category', 'purchase')
  else if (filter === 'shipping') query = query.eq('category', 'shipping')
  else if (filter === 'sales_lead') query = query.eq('is_sales_lead', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inquiries: data })
}
