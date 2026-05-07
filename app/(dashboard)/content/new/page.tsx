'use client'

import { useState, useEffect } from 'react'
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
import type { Content, HarvestCalendar, Persona } from '@/types/database'

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

function ContentPreview({ contents, onRegenerate }: { contents: Content[]; onRegenerate: () => void }) {
  const [activeTab, setActiveTab] = useState<string>(contents[0]?.platform[0] ?? contents[0]?.type ?? '')
  const [bodies, setBodies] = useState<Record<string, string>>(
    Object.fromEntries(contents.map((c) => [c.id, c.body ?? '']))
  )

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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default function ContentNewPage() {
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
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[#2D6A4F]">콘텐츠 생성</h1>

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
        <ContentPreview contents={generatedContents} onRegenerate={handleGenerate} />
      )}
    </div>
  )
}
