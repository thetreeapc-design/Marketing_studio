'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { BlogSchedule } from '@/types/database'

const PLATFORM_STYLE: Record<string, string> = {
  '네이버': 'bg-[#03C75A]/10 text-[#03C75A] border-[#03C75A]/30',
  '티스토리': 'bg-[#FF5A20]/10 text-[#FF5A20] border-[#FF5A20]/30',
}
const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  seo: { label: 'SEO', color: 'bg-blue-100 text-blue-700' },
  recipe: { label: '레시피', color: 'bg-pink-100 text-pink-700' },
  story: { label: '스토리', color: 'bg-purple-100 text-purple-700' },
}
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: '예정', color: 'bg-gray-100 text-gray-700' },
  generated: { label: '생성됨', color: 'bg-yellow-100 text-yellow-700' },
  published: { label: '발행됨', color: 'bg-green-100 text-green-700' },
  skipped: { label: '건너뜀', color: 'bg-red-100 text-red-700' },
}
const DAY = ['일', '월', '화', '수', '목', '금', '토']

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY[d.getDay()]})`
}

function ScheduleCard({ s, onCreate }: { s: BlogSchedule; onCreate: (s: BlogSchedule) => void }) {
  const typeMeta = TYPE_LABEL[s.content_type ?? ''] ?? { label: '-', color: 'bg-gray-100' }
  const statusMeta = STATUS_LABEL[s.status] ?? STATUS_LABEL.pending
  return (
    <Card className="hover:border-[#52B788] transition-colors">
      <CardContent className="pt-4 pb-3 px-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1">{formatDate(s.publish_date)}</p>
            <p className="font-semibold text-sm text-gray-900 line-clamp-2">{s.title}</p>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 ${PLATFORM_STYLE[s.platform] ?? ''}`}>
            {s.platform}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className={`text-xs ${typeMeta.color}`}>{typeMeta.label}</Badge>
          <Badge variant="secondary" className={`text-xs ${statusMeta.color}`}>{statusMeta.label}</Badge>
          {s.category && <Badge variant="secondary" className="text-xs">{s.category}</Badge>}
        </div>
        <div className="flex flex-wrap gap-1">
          {s.keywords.slice(0, 3).map(k => (
            <span key={k} className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">#{k}</span>
          ))}
          {s.keywords.length > 3 && <span className="text-xs text-gray-400">+{s.keywords.length - 3}</span>}
        </div>
        {s.status === 'pending' && (
          <Button
            size="sm"
            className="w-full bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white h-8 text-xs"
            onClick={() => onCreate(s)}
          >
            ✏️ 콘텐츠 생성
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function BlogSchedulePage() {
  const [schedules, setSchedules] = useState<BlogSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/blog-schedule')
      .then(r => r.json())
      .then(d => { setSchedules(d.schedules ?? []); setLoading(false) })
  }, [])

  function handleCreate(s: BlogSchedule) {
    router.push(`/content/new?from_schedule=${s.id}`)
  }

  // 그룹화
  const today = new Date().toISOString().split('T')[0]
  const weekFromNow = new Date()
  weekFromNow.setDate(weekFromNow.getDate() + 7)
  const weekStr = weekFromNow.toISOString().split('T')[0]

  const todayItems = schedules.filter(s => s.publish_date === today)
  const thisWeekItems = schedules.filter(s => s.publish_date > today && s.publish_date <= weekStr)
  const laterItems = schedules.filter(s => s.publish_date > weekStr)

  if (loading) return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold text-[#2D6A4F]">블로그 일정</h1>
      {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
    </div>
  )

  if (schedules.length === 0) return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[#2D6A4F]">블로그 일정</h1>
      <div className="text-center py-12">
        <p className="text-4xl mb-3">📅</p>
        <p className="text-gray-500 text-sm">다가오는 발행 일정이 없습니다</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[#2D6A4F]">블로그 일정</h1>

      {todayItems.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm text-[#2D6A4F]">오늘</h2>
            <Badge variant="secondary" className="text-xs">{todayItems.length}</Badge>
          </div>
          <div className="space-y-2">
            {todayItems.map(s => <ScheduleCard key={s.id} s={s} onCreate={handleCreate} />)}
          </div>
        </section>
      )}

      {thisWeekItems.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm text-[#2D6A4F]">이번 주</h2>
            <Badge variant="secondary" className="text-xs">{thisWeekItems.length}</Badge>
          </div>
          <div className="space-y-2">
            {thisWeekItems.map(s => <ScheduleCard key={s.id} s={s} onCreate={handleCreate} />)}
          </div>
        </section>
      )}

      {laterItems.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm text-gray-600">다음 주 이후</h2>
            <Badge variant="secondary" className="text-xs">{laterItems.length}</Badge>
          </div>
          <div className="space-y-2">
            {laterItems.map(s => <ScheduleCard key={s.id} s={s} onCreate={handleCreate} />)}
          </div>
        </section>
      )}
    </div>
  )
}
