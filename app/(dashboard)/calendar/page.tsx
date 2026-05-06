'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import type { HarvestCalendar, Content } from '@/types/database'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function getCropEmoji(name: string) {
  if (name.includes('딸기')) return '🍓'
  if (name.includes('사과')) return '🍎'
  if (name.includes('머스캣') || name.includes('포도')) return '🍇'
  if (name.includes('복숭아')) return '🍑'
  if (name.includes('배')) return '🍐'
  return '🌾'
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function CalendarGrid({
  year,
  month,
  harvests,
  scheduledContents,
  selectedDate,
  onDateClick,
}: {
  year: number
  month: number
  harvests: HarvestCalendar[]
  scheduledContents: Content[]
  selectedDate: Date | null
  onDateClick: (d: Date) => void
}) {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function hasHarvest(day: number) {
    const ds = toDateStr(year, month, day)
    return harvests.some((h) => ds >= h.harvest_start && ds <= h.harvest_end)
  }

  function hasScheduled(day: number) {
    const ds = toDateStr(year, month, day)
    return scheduledContents.some((c) => c.scheduled_at?.startsWith(ds))
  }

  const today = new Date()
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  const isSelected = (day: number) =>
    selectedDate?.getFullYear() === year &&
    selectedDate?.getMonth() === month &&
    selectedDate?.getDate() === day

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400 mb-1">
        {DAY_LABELS.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => (
          <div
            key={i}
            onClick={() => day && onDateClick(new Date(year, month, day))}
            className={[
              'aspect-square flex flex-col items-center justify-center rounded-lg text-sm select-none',
              day ? 'cursor-pointer' : '',
              day && isSelected(day) ? 'bg-[#2D6A4F] text-white' : '',
              day && !isSelected(day) && isToday(day) ? 'border border-[#2D6A4F] text-[#2D6A4F] font-bold' : '',
              day && !isSelected(day) && !isToday(day) ? 'hover:bg-gray-100' : '',
            ].join(' ')}
          >
            {day && (
              <>
                <span className="text-xs leading-none">{day}</span>
                <div className="flex gap-0.5 mt-0.5">
                  {hasHarvest(day) && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                  {hasScheduled(day) && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DayDetail({
  date,
  harvests,
  contents,
  onAdd,
}: {
  date: Date
  harvests: HarvestCalendar[]
  contents: Content[]
  onAdd: () => void
}) {
  const ds = date.toISOString().split('T')[0]
  const dayHarvests = harvests.filter((h) => ds >= h.harvest_start && ds <= h.harvest_end)
  const dayContents = contents.filter((c) => c.scheduled_at?.startsWith(ds))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#2D6A4F]">
          {date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
        </h3>
        <Button size="sm" variant="outline" onClick={onAdd} className="text-xs">
          + 수확일정 추가
        </Button>
      </div>

      {dayHarvests.length === 0 && dayContents.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">일정이 없습니다</p>
      )}

      {dayHarvests.map((h) => (
        <Card key={h.id} className="border-green-200 bg-green-50">
          <CardContent className="py-2 px-3">
            <p className="text-sm font-medium">
              {getCropEmoji(h.crop_name)} {h.crop_name} {h.variety ?? ''}
            </p>
            <p className="text-xs text-gray-500">
              {h.harvest_start} ~ {h.harvest_end}
              {h.expected_volume ? ` · ${h.expected_volume}kg` : ''}
            </p>
          </CardContent>
        </Card>
      ))}

      {dayContents.map((c) => (
        <Card key={c.id} className="border-blue-200 bg-blue-50">
          <CardContent className="py-2 px-3">
            <p className="text-sm font-medium truncate">{c.title ?? c.body?.slice(0, 30)}</p>
            <p className="text-xs text-gray-500">
              예약 · {c.platform.join(', ')}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AiSuggestions({ harvests }: { harvests: HarvestCalendar[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limit = new Date(today.getTime() + 14 * 86400000)

  const upcoming = harvests.filter((h) => {
    const start = new Date(h.harvest_start)
    return start >= today && start <= limit
  })

  if (upcoming.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-[#2D6A4F]">AI 기획 제안</h2>
      <div className="flex flex-wrap gap-2">
        {upcoming.flatMap((h) => {
          const start = new Date(h.harvest_start)
          const daysUntil = Math.floor((start.getTime() - today.getTime()) / 86400000)
          const emoji = getCropEmoji(h.crop_name)
          const base = `/content/new?source=harvest&id=${h.id}`
          const chips: { label: string; href: string }[] = []
          if (daysUntil <= 14) chips.push({ label: `${emoji} 수확 준비 스토리`, href: `${base}&template=prep` })
          if (daysUntil <= 7) chips.push({ label: `${emoji} 곧 출하 예고`, href: `${base}&template=preview` })
          if (daysUntil <= 0) chips.push({ label: `${emoji} 지금 수확 중`, href: `${base}&template=live` })
          return chips
        }).map((chip, i) => (
          <Link
            key={i}
            href={chip.href}
            className="bg-[#2D6A4F] text-white text-sm px-3 py-1.5 rounded-full hover:bg-[#2D6A4F]/90 transition-colors"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

type HarvestForm = {
  crop_name: string
  variety: string
  harvest_start: string
  harvest_end: string
  expected_volume: string
  price_per_kg: string
  notes: string
}

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)
  const [harvests, setHarvests] = useState<HarvestCalendar[]>([])
  const [scheduledContents, setScheduledContents] = useState<Content[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<HarvestForm>({
    crop_name: '',
    variety: '',
    harvest_start: today.toISOString().split('T')[0],
    harvest_end: today.toISOString().split('T')[0],
    expected_volume: '',
    price_per_kg: '',
    notes: '',
  })

  const supabase = createClient()

  useEffect(() => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

    supabase
      .from('harvest_calendar')
      .select('*')
      .or(`harvest_start.lte.${end},harvest_end.gte.${start}`)
      .then(({ data }) => setHarvests((data as HarvestCalendar[]) ?? []))

    supabase
      .from('contents')
      .select('id,title,body,platform,scheduled_at')
      .gte('scheduled_at', `${start}T00:00:00`)
      .lte('scheduled_at', `${end}T23:59:59`)
      .then(({ data }) => setScheduledContents((data as Content[]) ?? []))
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function openModal() {
    const ds = selectedDate?.toISOString().split('T')[0] ?? today.toISOString().split('T')[0]
    setForm(f => ({ ...f, harvest_start: ds, harvest_end: ds }))
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.crop_name) { toast.error('작물명을 입력하세요'); return }
    setSaving(true)

    const res = await fetch('/api/harvest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crop_name: form.crop_name,
        variety: form.variety || undefined,
        harvest_start: form.harvest_start,
        harvest_end: form.harvest_end,
        expected_volume: form.expected_volume ? Number(form.expected_volume) : undefined,
        price_per_kg: form.price_per_kg ? Number(form.price_per_kg) : undefined,
        notes: form.notes || undefined,
      }),
    })

    setSaving(false)
    if (!res.ok) { toast.error('저장 실패'); return }

    const { harvest } = await res.json()
    setHarvests(prev => [...prev, harvest])
    setModalOpen(false)
    toast.success('출하일정 추가 완료')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#2D6A4F]">출하 캘린더</h1>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">‹</button>
            <span className="font-semibold text-gray-800">
              {year}년 {month + 1}월
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">›</button>
          </div>

          <CalendarGrid
            year={year}
            month={month}
            harvests={harvests}
            scheduledContents={scheduledContents}
            selectedDate={selectedDate}
            onDateClick={setSelectedDate}
          />

          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />수확일정</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />예약콘텐츠</span>
          </div>
        </div>

        {selectedDate && (
          <div className="md:w-64 border rounded-xl p-4 bg-white">
            <DayDetail
              date={selectedDate}
              harvests={harvests}
              contents={scheduledContents}
              onAdd={openModal}
            />
          </div>
        )}
      </div>

      <AiSuggestions harvests={harvests} />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>수확일정 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>작물명 *</Label>
              <Input
                placeholder="예: 딸기"
                value={form.crop_name}
                onChange={(e) => setForm(f => ({ ...f, crop_name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>품종</Label>
              <Input
                placeholder="예: 설향"
                value={form.variety}
                onChange={(e) => setForm(f => ({ ...f, variety: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>수확 시작</Label>
                <Input
                  type="date"
                  value={form.harvest_start}
                  onChange={(e) => setForm(f => ({ ...f, harvest_start: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>수확 종료</Label>
                <Input
                  type="date"
                  value={form.harvest_end}
                  onChange={(e) => setForm(f => ({ ...f, harvest_end: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>예상 물량(kg)</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={form.expected_volume}
                  onChange={(e) => setForm(f => ({ ...f, expected_volume: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>단가(원/kg)</Label>
                <Input
                  type="number"
                  placeholder="5000"
                  value={form.price_per_kg}
                  onChange={(e) => setForm(f => ({ ...f, price_per_kg: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>메모</Label>
              <Input
                placeholder="특이사항"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1"
              />
            </div>
            <Button
              className="w-full bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
