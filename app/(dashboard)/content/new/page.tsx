'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import type { BlogSchedule, Content, HarvestCalendar, Persona } from '@/types/database'

const CONTENT_TYPES = [
  { id: 'sns_post', label: 'SNS 포스트', emoji: '📱', desc: 'Instagram·카카오·블로그' },
  { id: 'card_news', label: '카드뉴스', emoji: '🃏', desc: '슬라이드형 이미지 콘텐츠' },
  { id: 'blog', label: '블로그', emoji: '📝', desc: '네이버 블로그 장문 포스팅' },
  { id: 'short_form_script', label: '영상 스크립트', emoji: '🎬', desc: 'YouTube·릴스 대본' },
]

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'naver_blog', label: '네이버 블로그' },
  { id: 'kakao_channel', label: '카카오 채널' },
  { id: 'youtube', label: 'YouTube' },
]

const PLATFORM_DEFAULTS: Record<string, string[]> = {
  sns_post: ['instagram'],
  card_news: ['instagram'],
  blog: ['naver_blog'],
  short_form_script: ['youtube'],
}

interface RenderedImage {
  filename: string
  base64: string
  mimeType: string
}

function safeFilename(title: string | null | undefined, max = 40) {
  return (title ?? '').replace(/[\\\/\:\*\?"<>\|]/g, '').slice(0, max).trim() || 'untitled'
}

function platformLabel(p: string) {
  const m: Record<string, string> = {
    naver_blog: '네이버',
    instagram: '인스타그램',
    kakao_channel: '카카오',
    youtube: '유튜브',
  }
  return m[p] ?? p
}

function handleDownloadTxt(c: Content, body: string) {
  const today = new Date().toISOString().split('T')[0]
  const platform = platformLabel(c.platform[0] ?? '')
  const filename = `${today}_${platform}_${safeFilename(c.title)}.txt`
  const hashtagsLine = c.hashtags?.length ? `해시태그: ${c.hashtags.map((t) => '#' + t).join(' ')}` : ''
  const ctaLine = (c.input_data as { cta?: string } | null)?.cta ? `CTA: ${(c.input_data as { cta?: string }).cta}` : ''
  const content = `${c.title}\n${'='.repeat(43)}\n\n${body}\n\n-----\n${hashtagsLine}\n${ctaLine}`.trim() + '\n'
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function CardNewsRenderSection({
  contents,
  topic,
}: {
  contents: Content[]
  topic: string
}) {
  const [renderedImages, setRenderedImages] = useState<RenderedImage[]>([])
  const [rendering, setRendering] = useState(false)

  // card_news body에서 슬라이드 배열 파싱
  function parseSlides(content: Content) {
    try {
      const parsed = JSON.parse(content.body ?? '[]')
      if (Array.isArray(parsed)) return parsed
    } catch {
      // body가 JSON이 아닌 경우 단순 텍스트로 단일 슬라이드 생성
    }
    return [{ order: 1, heading: content.title ?? '', body: content.body ?? '' }]
  }

  async function handleRender() {
    const cardContent = contents.find((c) => c.type === 'card_news') ?? contents[0]
    const slides = parseSlides(cardContent)

    setRendering(true)
    try {
      const res = await fetch('/api/render/card-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slides }),
      })
      const data = await res.json()
      if (res.ok) {
        setRenderedImages(data.images)
        toast.success(`${data.count}장 이미지 생성 완료`)
      } else {
        toast.error('렌더링 실패: ' + (data.error ?? '오류'))
      }
    } catch {
      toast.error('렌더링 중 오류가 발생했습니다')
    }
    setRendering(false)
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full bg-[#E8632A] hover:bg-[#E8632A]/90 text-white h-11 font-semibold"
        onClick={handleRender}
        disabled={rendering}
      >
        {rendering ? '렌더링 중... (약 15초)' : '🖼️ 이미지로 렌더링'}
      </Button>
      {rendering && (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="aspect-[4/5] w-full rounded-lg" />
          ))}
        </div>
      )}
      {renderedImages.length > 0 && !rendering && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#2D6A4F]">생성된 이미지 ({renderedImages.length}장)</p>
          <div className="grid grid-cols-2 gap-3">
            {renderedImages.map((img) => (
              <div key={img.filename} className="space-y-1">
                <img
                  src={`data:${img.mimeType};base64,${img.base64}`}
                  alt={img.filename}
                  className="w-full rounded-lg border"
                />
                <a
                  href={`data:${img.mimeType};base64,${img.base64}`}
                  download={img.filename}
                  className="block text-center text-xs py-1.5 rounded border border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F]/5 transition-colors"
                >
                  다운로드
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ContentPreview({ contents, onRegenerate, topic }: { contents: Content[]; onRegenerate: () => void; topic: string }) {
  const [activeTab, setActiveTab] = useState<string>(contents[0]?.platform[0] ?? contents[0]?.type ?? '')
  const [bodies, setBodies] = useState<Record<string, string>>(
    Object.fromEntries(contents.map((c) => [c.id, c.body ?? '']))
  )
  const isCardNews = contents.some((c) => c.type === 'card_news')

  async function handleApprove(content: Content) {
    const res = await fetch(`/api/contents/${content.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending_approval', body: bodies[content.id] }),
    })
    res.ok ? toast.success('승인 요청 완료') : toast.error('요청 실패')
  }

  function handleCopy(id: string) {
    navigator.clipboard.writeText(bodies[id] ?? '')
    toast.success('복사됨')
  }

  const tabKey = (c: Content) => c.platform[0] ?? c.id

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-[#2D6A4F]">생성된 콘텐츠</h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {contents.length > 1 && (
          <TabsList className="w-full">
            {contents.map((c) => (
              <TabsTrigger key={c.id} value={tabKey(c)} className="flex-1 text-xs">
                {PLATFORMS.find((p) => p.id === c.platform[0])?.label ?? c.platform[0]}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
        {contents.map((c) => (
          <TabsContent key={c.id} value={tabKey(c)}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#2D6A4F]">{c.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  className="text-sm whitespace-pre-wrap border rounded-md p-3 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                  onInput={(e) => setBodies((prev) => ({ ...prev, [c.id]: (e.target as HTMLDivElement).innerText }))}
                >
                  {c.body}
                </div>
                {c.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs bg-[#2D6A4F]/10 text-[#2D6A4F]">{tag}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white" onClick={() => handleApprove(c)}>승인요청</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={onRegenerate}>재생성</Button>
                  <Button size="sm" variant="outline" onClick={() => handleCopy(c.id)}>복사</Button>
                  {c.type === 'blog' && (
                    <Button size="sm" variant="outline" onClick={() => handleDownloadTxt(c, bodies[c.id] ?? '')}>
                      📄 txt
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      {isCardNews && <CardNewsRenderSection contents={contents} topic={topic} />}
    </div>
  )
}

export default function ContentNewPage() {
  const searchParams = useSearchParams()
  const fromScheduleId = searchParams.get('from_schedule')
  const [scheduleSource, setScheduleSource] = useState<BlogSchedule | null>(null)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [selectedPersonaId, setSelectedPersonaId] = useState('')
  const [contentType, setContentType] = useState('sns_post')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram'])
  const [inputTab, setInputTab] = useState('direct')
  const [generating, setGenerating] = useState(false)
  const [generatedContents, setGeneratedContents] = useState<Content[]>([])

  const [topic, setTopic] = useState('')
  const [cropName, setCropName] = useState('')
  const [cropVariety, setCropVariety] = useState('')
  const [cropFeatures, setCropFeatures] = useState('')
  const [cropBenefits, setCropBenefits] = useState('')
  const [slideCount, setSlideCount] = useState('5')
  const [duration, setDuration] = useState('60초')

  const [harvests, setHarvests] = useState<HarvestCalendar[]>([])
  const [selectedHarvestId, setSelectedHarvestId] = useState('')
  const [url, setUrl] = useState('')

  const supabase = createClient()
  const selectedPersona = personas.find((p) => p.id === selectedPersonaId)

  useEffect(() => {
    fetch('/api/personas')
      .then((r) => r.json())
      .then((d) => {
        const list: Persona[] = d.personas ?? []
        setPersonas(list)
        if (list.length > 0) setSelectedPersonaId(list[0].id)
      })
  }, [])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase.from('harvest_calendar').select('*').gte('harvest_end', today).order('harvest_start')
      .then(({ data }) => setHarvests((data as HarvestCalendar[]) ?? []))
  }, [])

  useEffect(() => {
    if (!fromScheduleId) return
    fetch(`/api/blog-schedule/${fromScheduleId}`)
      .then((r) => r.json())
      .then((d) => {
        const s = d.schedule as BlogSchedule | undefined
        if (!s) return
        setScheduleSource(s)
        setContentType('blog')
        setSelectedPlatforms(['naver_blog'])
        setTopic(s.title)
        setCropName(s.fruit ?? '')
        setCropFeatures(s.keywords.join(', '))
      })
      .catch(() => {})
  }, [fromScheduleId])

  function handleTypeChange(type: string) {
    setContentType(type)
    setSelectedPlatforms(PLATFORM_DEFAULTS[type] ?? ['instagram'])
    setGeneratedContents([])
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id])
  }

  function selectHarvest(h: HarvestCalendar) {
    setSelectedHarvestId(h.id)
    setTopic(`${h.crop_name}${h.variety ? ` ${h.variety}` : ''} 수확 소식`)
    setCropName(h.crop_name)
    setCropVariety(h.variety ?? '')
    setInputTab('direct')
  }

  function buildCropInfo() {
    return [cropName, cropVariety, cropFeatures, cropBenefits].filter(Boolean).join(' / ')
  }

  async function handleGenerate() {
    if (!selectedPersonaId) { toast.error('페르소나를 선택하세요'); return }
    if (!topic.trim()) { toast.error('주제를 입력하세요'); return }
    if (selectedPlatforms.length === 0) { toast.error('플랫폼을 하나 이상 선택하세요'); return }

    setGenerating(true)
    setGeneratedContents([])

    let res: Response
    let data: { contents?: unknown[]; error?: string }
    try {
      res = await fetch('/api/generate/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: selectedPersonaId,
          contentType,
          topic,
          platforms: selectedPlatforms,
          cropInfo: buildCropInfo() || undefined,
          harvestId: selectedHarvestId || undefined,
          inputSource: inputTab,
          slideCount: contentType === 'card_news' ? Number(slideCount) : undefined,
          duration: contentType === 'short_form_script' ? duration : undefined,
        }),
      })
      data = await res.json()
    } catch (e) {
      setGenerating(false)
      toast.error('생성 실패: 서버 연결 오류. API 키를 확인하세요.')
      return
    }

    setGenerating(false)
    if (!res.ok) { toast.error('생성 실패: ' + (data.error ?? '오류')); return }
    setGeneratedContents((data.contents ?? []) as Content[])

    if (fromScheduleId && data.contents?.[0]) {
      try {
        await fetch(`/api/blog-schedule/${fromScheduleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'generated',
            content_id: (data.contents[0] as { id: string }).id,
          }),
        })
      } catch {}
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[#2D6A4F]">콘텐츠 생성</h1>

      {scheduleSource && (
        <div className="bg-[#2D6A4F]/5 border border-[#2D6A4F]/20 rounded-xl p-3 flex items-start gap-2">
          <span className="text-xl">📅</span>
          <div className="flex-1 text-xs">
            <p className="text-[#2D6A4F] font-semibold">
              {new Date(scheduleSource.publish_date + 'T00:00:00').getMonth() + 1}월{' '}
              {new Date(scheduleSource.publish_date + 'T00:00:00').getDate()}일{' '}
              {scheduleSource.platform} 발행 일정
            </p>
            <p className="text-gray-600 mt-0.5 line-clamp-1">{scheduleSource.title}</p>
          </div>
        </div>
      )}

      {/* 페르소나 */}
      <div>
        <Label>페르소나</Label>
        <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="페르소나 선택" />
          </SelectTrigger>
          <SelectContent>
            {personas.length === 0
              ? <SelectItem value="none" disabled>페르소나 없음 → 먼저 페르소나 설정 필요</SelectItem>
              : personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.brand_name}</SelectItem>)
            }
          </SelectContent>
        </Select>
      </div>

      {/* 콘텐츠 유형 */}
      <div>
        <Label className="mb-2 block">콘텐츠 유형</Label>
        <div className="grid grid-cols-2 gap-2">
          {CONTENT_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTypeChange(t.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                contentType === t.id
                  ? 'border-[#2D6A4F] bg-[#2D6A4F]/5 ring-1 ring-[#2D6A4F]'
                  : 'border-gray-200 hover:border-[#52B788]'
              }`}
            >
              <p className="text-lg">{t.emoji}</p>
              <p className="font-medium text-sm mt-0.5">{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 유형별 옵션 */}
      {contentType === 'card_news' && (
        <Card>
          <CardContent className="pt-4">
            <Label>슬라이드 수</Label>
            <div className="flex gap-2 mt-2">
              {['3', '5', '7', '10'].map((n) => (
                <button
                  key={n}
                  onClick={() => setSlideCount(n)}
                  className={`px-4 py-1.5 rounded-lg text-sm border transition-all ${
                    slideCount === n ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]' : 'border-gray-200 hover:border-[#52B788]'
                  }`}
                >
                  {n}장
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {contentType === 'short_form_script' && (
        <Card>
          <CardContent className="pt-4">
            <Label>영상 길이</Label>
            <div className="flex gap-2 mt-2">
              {['15초', '30초', '60초', '3분'].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-4 py-1.5 rounded-lg text-sm border transition-all ${
                    duration === d ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]' : 'border-gray-200 hover:border-[#52B788]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 플랫폼 (SNS만 다중 선택, 나머지는 기본값) */}
      {contentType === 'sns_post' && (
        <Card>
          <CardContent className="pt-4">
            <Label className="mb-3 block">발행 플랫폼</Label>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`platform-${p.id}`}
                    checked={selectedPlatforms.includes(p.id)}
                    onCheckedChange={() => togglePlatform(p.id)}
                  />
                  <Label htmlFor={`platform-${p.id}`} className="cursor-pointer">{p.label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 입력 탭 */}
      <Tabs value={inputTab} onValueChange={setInputTab}>
        <TabsList className="w-full">
          <TabsTrigger value="direct" className="flex-1">직접입력</TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1">출하캘린더</TabsTrigger>
          <TabsTrigger value="url" className="flex-1">URL변환</TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-3 mt-3">
          <div>
            <Label>주제 *</Label>
            <Textarea
              placeholder={
                contentType === 'card_news' ? '예: 부사 사과 수확 시즌 시작' :
                contentType === 'blog' ? '예: 경남 거창 부사 사과의 특별한 재배 환경' :
                contentType === 'short_form_script' ? '예: 사과 수확하는 하루 브이로그' :
                '예: 딸기 수확이 시작됐습니다'
              }
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>작물명</Label>
              {selectedPersona?.main_products?.length ? (
                <Select value={cropName} onValueChange={setCropName}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {selectedPersona.main_products.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="예: 사과" value={cropName} onChange={(e) => setCropName(e.target.value)} className="mt-1" />
              )}
            </div>
            <div>
              <Label>품종</Label>
              <Input placeholder="예: 부사" value={cropVariety} onChange={(e) => setCropVariety(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>특징</Label>
            <Input placeholder="예: 당도 14 brix 이상, 아삭한 식감" value={cropFeatures} onChange={(e) => setCropFeatures(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>효능/장점</Label>
            <Input placeholder="예: 항산화 폴리페놀, 식이섬유 풍부" value={cropBenefits} onChange={(e) => setCropBenefits(e.target.value)} className="mt-1" />
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-3">
          {harvests.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">예정된 출하 일정이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {harvests.map((h) => (
                <Card
                  key={h.id}
                  className={`cursor-pointer transition-colors ${selectedHarvestId === h.id ? 'border-[#2D6A4F] bg-[#2D6A4F]/5' : 'hover:border-[#52B788]'}`}
                  onClick={() => selectHarvest(h)}
                >
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{h.crop_name} {h.variety ?? ''}</p>
                      <p className="text-xs text-gray-500">{h.harvest_start} ~ {h.harvest_end}</p>
                    </div>
                    {h.expected_volume && <span className="text-xs text-gray-400">{h.expected_volume}kg</span>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="url" className="mt-3 space-y-3">
          <div>
            <Label>URL</Label>
            <Input type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} className="mt-1" />
          </div>
          <Button variant="outline" className="w-full" onClick={() => toast.info('준비중입니다')}>URL 변환</Button>
        </TabsContent>
      </Tabs>

      <Button className="w-full bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white h-12 text-base font-semibold" onClick={handleGenerate} disabled={generating}>
        {generating ? '생성 중...' : `${CONTENT_TYPES.find(t => t.id === contentType)?.emoji} ${CONTENT_TYPES.find(t => t.id === contentType)?.label} 생성`}
      </Button>

      {generating && (
        <div className="space-y-3">
          {selectedPlatforms.map((p) => (
            <Card key={p}><CardContent className="pt-4 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
          ))}
        </div>
      )}

      {generatedContents.length > 0 && !generating && (
        <ContentPreview contents={generatedContents} onRegenerate={handleGenerate} topic={topic} />
      )}
    </div>
  )
}
