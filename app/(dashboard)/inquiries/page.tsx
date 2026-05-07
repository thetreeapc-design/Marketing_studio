'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Inquiry } from '@/types/database'

const FILTER_TABS = [
  { value: 'all', label: '전체' },
  { value: 'purchase', label: '구매문의' },
  { value: 'shipping', label: '배송문의' },
  { value: 'sales_lead', label: '세일즈리드' },
]

const CATEGORY_LABELS: Record<string, string> = {
  purchase: '구매문의',
  shipping: '배송문의',
  complaint: '불만',
  general: '일반',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  ai_replied: 'bg-blue-100 text-blue-700',
  human_replied: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  ai_replied: 'AI 답변',
  human_replied: '직접 답변',
  dismissed: '종료',
}

function InquiryCard({
  inquiry,
  onReply,
}: {
  inquiry: Inquiry
  onReply: (inquiry: Inquiry) => void
}) {
  return (
    <Card
      className={`overflow-hidden ${inquiry.is_sales_lead ? 'border-l-4 border-l-amber-400' : ''}`}
    >
      <CardContent className="pt-3 pb-3 px-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">
                @{inquiry.user_name ?? '알 수 없음'}
              </span>
              {inquiry.is_sales_lead && (
                <Badge className="bg-amber-400 text-white text-xs">세일즈리드</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {CATEGORY_LABELS[inquiry.category ?? ''] ?? inquiry.category ?? '일반'} ·{' '}
              {new Date(inquiry.created_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[inquiry.status]}`}
          >
            {STATUS_LABELS[inquiry.status]}
          </span>
        </div>

        <p className="text-sm text-gray-800 line-clamp-2">{inquiry.message}</p>

        {inquiry.ai_response && (
          <div className="bg-[#2D6A4F]/5 rounded-md px-3 py-2">
            <p className="text-xs text-[#2D6A4F] font-medium mb-0.5">AI 답변</p>
            <p className="text-xs text-gray-600 line-clamp-2">{inquiry.ai_response}</p>
          </div>
        )}

        {inquiry.status !== 'human_replied' && (
          <div className="flex justify-end pt-0.5">
            <Button
              size="sm"
              className="h-7 px-3 text-xs bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white"
              onClick={() => onReply(inquiry)}
            >
              게시
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function InquiriesPage() {
  const [filter, setFilter] = useState('all')
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [replyTarget, setReplyTarget] = useState<Inquiry | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/inquiries?filter=${filter}`)
      .then((r) => r.json())
      .then((d) => {
        setInquiries(d.inquiries ?? [])
        setLoading(false)
      })
  }, [filter])

  function openReply(inquiry: Inquiry) {
    setReplyTarget(inquiry)
    setReplyMessage(inquiry.ai_response ?? '')
  }

  async function handlePost() {
    if (!replyTarget || !replyMessage.trim()) return
    setPosting(true)

    const res = await fetch(`/api/inquiries/${replyTarget.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: replyMessage }),
    })

    setPosting(false)

    if (res.ok) {
      toast.success('답변 게시 완료')
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === replyTarget.id ? { ...i, status: 'human_replied' as const } : i
        )
      )
      setReplyTarget(null)
    } else {
      toast.error('게시 실패')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#2D6A4F]">문의 응대</h1>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="w-full">
          {FILTER_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1 text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : inquiries.length === 0 ? (
        <p className="text-center text-gray-400 py-12">문의가 없습니다</p>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} onReply={openReply} />
          ))}
        </div>
      )}

      <Dialog open={!!replyTarget} onOpenChange={() => setReplyTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>답변 게시 — @{replyTarget?.user_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="bg-gray-50 rounded-md p-3">
              <p className="text-xs text-gray-500 mb-1">원본 댓글</p>
              <p className="text-sm">{replyTarget?.message}</p>
            </div>
            <div>
              <Label>답변 내용</Label>
              <Textarea
                rows={4}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="mt-1"
                placeholder="Instagram에 게시될 답변을 입력하세요"
              />
            </div>
            <Button
              className="w-full bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white"
              onClick={handlePost}
              disabled={posting || !replyMessage.trim()}
            >
              {posting ? '게시 중...' : 'Instagram에 게시'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
