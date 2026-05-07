import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [
    { data: analytics },
    { count: purchaseInquiries },
    { count: publishedContents },
    { data: allContents },
  ] = await Promise.all([
    supabase
      .from('analytics')
      .select('*')
      .gte('recorded_at', thirtyDaysAgo)
      .order('recorded_at'),
    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'purchase')
      .gte('created_at', monthStart),
    supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', monthStart),
    supabase.from('contents').select('type').eq('status', 'published'),
  ])

  const list = analytics ?? []
  const monthList = list.filter((a) => a.recorded_at >= monthStart)

  const totalViews = monthList.reduce((s, a) => s + (a.views ?? 0), 0)
  const totalLikes = monthList.reduce((s, a) => s + (a.likes ?? 0), 0)

  const platformMap: Record<string, { views: number; likes: number; comments: number }> = {}
  const dailyMap: Record<string, number> = {}

  for (const a of list) {
    if (!platformMap[a.platform]) platformMap[a.platform] = { views: 0, likes: 0, comments: 0 }
    platformMap[a.platform].views += a.views ?? 0
    platformMap[a.platform].likes += a.likes ?? 0
    platformMap[a.platform].comments += a.comments ?? 0

    const date = (a.recorded_at as string).split('T')[0]
    dailyMap[date] = (dailyMap[date] ?? 0) + (a.views ?? 0)
  }

  const platformStats = Object.entries(platformMap).map(([platform, s]) => ({ platform, ...s }))
  const dailyViews = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, views]) => ({ date, views }))

  const typeMap: Record<string, number> = {}
  for (const c of allContents ?? []) {
    typeMap[c.type] = (typeMap[c.type] ?? 0) + 1
  }
  const contentTypeBreakdown = Object.entries(typeMap).map(([type, count]) => ({ type, count }))

  const top5 = list
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 5)

  return NextResponse.json({
    metrics: {
      totalViews,
      totalLikes,
      purchaseInquiries: purchaseInquiries ?? 0,
      publishedContents: publishedContents ?? 0,
    },
    platformStats,
    dailyViews,
    contentTypeBreakdown,
    top5,
  })
}
