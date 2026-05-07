'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Content, ContentStatus } from '@/types/database'

const STATUS_TABS = [
  { value: 'all', label: '전체' },
  { value: 'pending_approval', label: '승인대기' },
  { value: 'approved', label: '승인완료' },
  { value: 'published', label: '발행완료' },
  { value: 'rejected', label: '반려' },
]

const PLATFORM_STYLES: Record<string, string> = {
  instagram: 'bg-pink-100 text-pink-700',
  naver_blog: 'bg-green-100 text-green-700',
  kakao_channel: 'bg-yellow-100 text-yellow-700',
  youtube: 'bg-red-100 text-red-700',
}
const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'IG',
  naver_blog: 'Naver',
  kakao_channel: 'Kakao',
  youtube: 'YT',
}
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  pending_approval: '승인대기',
  approved: '승인완료',
  published: '발행완료',
  rejected: '반려',
}

function SwipeCard({
  onApprove,
  onReject,
  children,
}: {
  onApprove: () => void
  onReject: () => void
  children: React.ReactNode
}) {
  const [offsetX, setOffsetX] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (isHorizontal.current === null) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy)
    }
    if (isHorizontal.current) {
      e.preventDefault()
      setOffsetX(dx)
    }
  }

  function onTouchEnd() {
    if (offsetX > 80) onApprove()
    else if (offsetX < -80) onReject()
    setOffsetX(0)
    isHorizontal.current = null
  }

  const ratio = Math.min(Math.abs(offsetX) / 80, 1)
  const isRight = offsetX > 20
  const isLeft = offsetX < -20

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {isRight && (
        <div
          className="absolute inset-0 bg-green-500 flex items-center pl-5 z-0 rounded-lg"
          style={{ opacity: ratio * 0.7 }}
        >
          <span className="text-white font-bold text-lg">✓ 승인</span>
        </div>
      )}
      {isLeft && (
        <div
          className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 z-0 rounded-lg"
          style={{ opacity: ratio * 0.7 }}
        >
          <span className="text-white font-bold text-lg">✗ 반려</span>
        </div>
      )}
      <div
        className="relative z-10"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: offsetX === 0 ? 'transform 0.2s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function ContentCard({
  content,
  onPreview,
  onApprove,
  onReject,
}: {
  content: Content
  onPreview: () => void
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <Card>
      <CardContent className="pt-3 pb-3 px-4 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {content.platform.map((p) => (
              <span
                key={p}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_STYLES[p] ?? 'bg-gray-100 text-gray-600'}`}
              >
                {PLATFORM_LABELS[p] ?? p}
              </span>
            ))}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[content.status]}`}
          >
            {STATUS_LABELS[content.status]}
          </span>
        </div>

        <p className="text-sm line-clamp-2 text-gray-700 leading-relaxed">{content.body}</p>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs text-gray-400">
            {new Date(content.created_at).toLocaleDateString('ko-KR')}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onPreview}>
              미리보기
            </Button>
            {content.status === 'pending_approval' && (
              <>
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white"
                  onClick={onApprove}
                >
                  승인
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs text-red-500 border-red-200 hover:bg-red-50"
                  onClick={onReject}
                >
                  반려
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ApproveDialog({
  open,
  onClose,
  onImmediate,
  onScheduled,
}: {
  open: boolean
  onClose: () => void
  onImmediate: () => void
  onScheduled: (dt: string) => void
}) {
  const [scheduledAt, setScheduledAt] = useState('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>발행 방식 선택</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <Button
            className="w-full bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white"
            onClick={onImmediate}
          >
            즉시 발행
          </Button>
          <div className="space-y-2">
            <Label>예약 발행</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <Button
              variant="outline"
              className="w-full border-[#2D6A4F] text-[#2D6A4F]"
              disabled={!scheduledAt}
              onClick={() => onScheduled(scheduledAt)}
            >
              예약 발행
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ContentPage() {
  const [statusTab, setStatusTab] = useState('all')
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const [approvingContent, setApprovingContent] = useState<Content | null>(null)
  const [previewContent, setPreviewContent] = useState<Content | null>(null)

  const supabase = createClient()

  useEffect(() => {
    setLoading(true)
    let query = supabase
      .from('contents')
      .select('*')
      .order('created_at', { ascending: false })

    if (statusTab !== 'all') {
      query = query.eq('status', statusTab as ContentStatus)
    }

    query.then(({ data }) => {
      setContents((data as Content[]) ?? [])
      setLoading(false)
      setNewCount(0)
    })
  }, [statusTab])

  useEffect(() => {
    const channel = supabase
      .channel('contents-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contents' },
        (payload) => {
          const incoming = payload.new as Content
          if (statusTab === 'all' || incoming.status === statusTab) {
            setContents((prev) => [incoming, ...prev])
          }
          setNewCount((n) => n + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [statusTab])

  function updateStatus(id: string, status: ContentStatus) {
    setContents((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
  }

  async function handleReject(content: Content) {
    const res = await fetch(`/api/contents/${content.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    })
    if (res.ok) {
      toast.success('반려됨')
      updateStatus(content.id, 'rejected')
    } else {
      toast.error('실패')
    }
  }

  async function handleApproveImmediate(content: Content) {
    setApprovingContent(null)
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: content.id }),
    })
    if (res.ok) {
      toast.success('발행 완료')
      updateStatus(content.id, 'published')
    } else {
      toast.error('발행 실패')
    }
  }

  async function handleApproveScheduled(content: Content, dt: string) {
    setApprovingContent(null)
    const res = await fetch(`/api/contents/${content.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'approved',
        scheduled_at: new Date(dt).toISOString(),
      }),
    })
    if (res.ok) {
      toast.success('예약 발행 설정 완료')
      updateStatus(content.id, 'approved')
    } else {
      toast.error('설정 실패')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2D6A4F]">콘텐츠 관리</h1>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <Badge className="bg-[#F4A261] text-white cursor-pointer" onClick={() => setNewCount(0)}>
              {newCount} 신규
            </Badge>
          )}
          <Link
            href="/content/new"
            className="bg-[#2D6A4F] text-white text-sm px-3 py-1.5 rounded-lg hover:bg-[#2D6A4F]/90 transition-colors font-medium"
          >
            + 새 콘텐츠
          </Link>
        </div>
      </div>

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="w-full">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1 text-xs px-1">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : contents.length === 0 ? (
        <p className="text-center text-gray-400 py-12">콘텐츠가 없습니다</p>
      ) : (
        <div className="space-y-3">
          {contents.map((content) => (
            <SwipeCard
              key={content.id}
              onApprove={() => setApprovingContent(content)}
              onReject={() => handleReject(content)}
            >
              <ContentCard
                content={content}
                onPreview={() => setPreviewContent(content)}
                onApprove={() => setApprovingContent(content)}
                onReject={() => handleReject(content)}
              />
            </SwipeCard>
          ))}
        </div>
      )}

      {approvingContent && (
        <ApproveDialog
          open
          onClose={() => setApprovingContent(null)}
          onImmediate={() => handleApproveImmediate(approvingContent)}
          onScheduled={(dt) => handleApproveScheduled(approvingContent, dt)}
        />
      )}

      <Dialog open={!!previewContent} onOpenChange={() => setPreviewContent(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewContent?.title ?? '미리보기'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{previewContent?.body}</p>
            {(previewContent?.hashtags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {previewContent?.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs bg-[#2D6A4F]/10 text-[#2D6A4F]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
