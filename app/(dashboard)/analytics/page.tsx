'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const AnalyticsCharts = dynamic(
  () => import('@/components/analytics/AnalyticsCharts'),
  { ssr: false, loading: () => <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div> }
)

type Metrics = {
  totalViews: number
  totalLikes: number
  purchaseInquiries: number
  publishedContents: number
}

type PlatformStat = { platform: string; views: number; likes: number; comments: number }
type DailyView = { date: string; views: number }
type TypeBreakdown = { type: string; count: number }
type Top5Row = { platform: string; views: number; likes: number; comments: number; recorded_at: string }

const METRIC_CARDS = [
  { key: 'totalViews', label: '이번달 조회수', emoji: '👁' },
  { key: 'totalLikes', label: '이번달 좋아요', emoji: '❤️' },
  { key: 'purchaseInquiries', label: '구매문의', emoji: '💬' },
  { key: 'publishedContents', label: '발행 콘텐츠', emoji: '📢' },
]

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  naver_blog: '네이버',
  kakao_channel: '카카오',
  youtube: 'YouTube',
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [platformStats, setPlatformStats] = useState<PlatformStat[]>([])
  const [dailyViews, setDailyViews] = useState<DailyView[]>([])
  const [contentTypeBreakdown, setContentTypeBreakdown] = useState<TypeBreakdown[]>([])
  const [top5, setTop5] = useState<Top5Row[]>([])
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState('')
  const [streaming, setStreaming] = useState(false)

  useEffect(() => {
    fetch('/api/analytics/summary')
      .then((r) => r.json())
      .then((d) => {
        setMetrics(d.metrics)
        setPlatformStats(d.platformStats ?? [])
        setDailyViews(d.dailyViews ?? [])
        setContentTypeBreakdown(d.contentTypeBreakdown ?? [])
        setTop5(d.top5 ?? [])
        setLoading(false)
      })
  }, [])

  async function handleInsight() {
    setInsight('')
    setStreaming(true)
    const res = await fetch('/api/analytics/insight', { method: 'POST' })
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    if (!reader) { setStreaming(false); return }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      setInsight((prev) => prev + decoder.decode(value, { stream: true }))
    }
    setStreaming(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#2D6A4F]">성과 분석</h1>

      <div className="grid grid-cols-2 gap-3">
        {METRIC_CARDS.map(({ key, label, emoji }) => (
          <Card key={key}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">{label}</p>
              {loading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-[#2D6A4F] mt-0.5">
                  {emoji} {(metrics?.[key as keyof Metrics] ?? 0).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && (
        <AnalyticsCharts
          platformStats={platformStats}
          dailyViews={dailyViews}
          contentTypeBreakdown={contentTypeBreakdown}
        />
      )}

      {top5.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-[#2D6A4F]">TOP 5 콘텐츠</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {top5.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#2D6A4F] font-bold shrink-0">{i + 1}</span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {PLATFORM_LABELS[row.platform] ?? row.platform}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {new Date(row.recorded_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500 shrink-0">
                    <span>👁 {row.views.toLocaleString()}</span>
                    <span>❤️ {row.likes.toLocaleString()}</span>
                    <span>💬 {row.comments.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-[#2D6A4F]">AI 인사이트</CardTitle>
            <Button
              size="sm"
              onClick={handleInsight}
              disabled={streaming}
              className="bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white h-7 text-xs"
            >
              {streaming ? '분석 중...' : 'AI 분석 요청'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {insight ? (
            <div className="bg-[#2D6A4F]/5 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {insight}
              {streaming && <span className="animate-pulse">▌</span>}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">
              AI 분석 요청 버튼을 클릭하면 최근 30일 성과를 분석합니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
