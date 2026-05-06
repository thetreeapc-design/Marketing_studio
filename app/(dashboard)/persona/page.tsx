'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { buildSystemPrompt } from '@/lib/prompts'
import type { Persona } from '@/types/database'

const CERTIFICATIONS = ['GAP인증', '친환경인증', '무농약', 'FDA FSMA', '수상이력']
const TARGET_CUSTOMERS = ['일반소비자', '친환경소비자', '도매바이어', '급식단체']

const schema = z.object({
  name: z.string().min(1, '페르소나 이름을 입력하세요'),
  brandName: z.string().min(1, '브랜드명을 입력하세요'),
  farmLocation: z.string(),
  mainProducts: z.array(z.string()).min(1, '상품을 하나 이상 추가하세요'),
  certifications: z.array(z.string()),
  brandPhilosophy: z.string().max(500),
  tone: z.number().min(0).max(100),
  targetCustomer: z.array(z.string()),
  b2bMode: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export default function PersonaPage() {
  const [savedPersonaId, setSavedPersonaId] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState<{ platform: string; body: string; hashtags: string[] }[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      brandName: '열매나무',
      farmLocation: '경남 거창',
      mainProducts: [],
      certifications: [],
      brandPhilosophy: '',
      tone: 70,
      targetCustomer: [],
      b2bMode: false,
    },
  })

  const mainProducts = watch('mainProducts')
  const tone = watch('tone')

  function addTag() {
    const val = tagInput.trim()
    if (!val || mainProducts.includes(val)) return
    setValue('mainProducts', [...mainProducts, val])
    setTagInput('')
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  function removeTag(tag: string) {
    setValue('mainProducts', mainProducts.filter((p) => p !== tag))
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    const personaData = {
      id: savedPersonaId ?? undefined,
      name: values.name,
      brand_name: values.brandName,
      farm_location: values.farmLocation,
      main_products: values.mainProducts,
      certifications: values.certifications,
      brand_philosophy: values.brandPhilosophy,
      tone: String(values.tone),
      target_customer: values.targetCustomer,
      b2b_mode: values.b2bMode,
      system_prompt: buildSystemPrompt({
        id: savedPersonaId ?? '',
        owner_id: '',
        name: values.name,
        brand_name: values.brandName,
        farm_location: values.farmLocation,
        main_products: values.mainProducts,
        certifications: values.certifications,
        brand_philosophy: values.brandPhilosophy,
        tone: String(values.tone),
        target_customer: values.targetCustomer,
        b2b_mode: values.b2bMode,
        system_prompt: null,
        created_at: '',
      } as Persona),
    }

    const res = await fetch('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(personaData),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error('저장 실패: ' + (data.error ?? '알 수 없는 오류'))
      return
    }

    setSavedPersonaId(data.persona.id)
    toast.success('페르소나 저장 완료')
  }

  async function handlePreview() {
    if (!savedPersonaId) {
      toast.error('먼저 페르소나를 저장하세요')
      return
    }
    setPreviewing(true)
    const res = await fetch('/api/generate/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personaId: savedPersonaId,
        topic: '딸기 수확 소식',
        platforms: ['instagram', 'kakao_channel'],
      }),
    })
    const data = await res.json()
    setPreviewing(false)

    if (!res.ok) {
      toast.error('미리보기 실패')
      return
    }

    setPreviewContent(
      (data.contents ?? []).map((c: { platform: string[]; body: string; hashtags: string[] }) => ({
        platform: c.platform[0],
        body: c.body,
        hashtags: c.hashtags,
      }))
    )
    setPreviewOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2D6A4F]">페르소나 설정</h1>
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={previewing || !savedPersonaId}
          className="border-[#2D6A4F] text-[#2D6A4F]"
        >
          {previewing ? '생성 중...' : '미리보기'}
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">페르소나 이름</Label>
              <Input
                id="name"
                placeholder="예: 친근한 엄마톤"
                {...register('name')}
                className="mt-1"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="brandName">브랜드명</Label>
              <Input id="brandName" {...register('brandName')} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="farmLocation">농장 위치</Label>
              <Input
                id="farmLocation"
                placeholder="예: 경남 거창"
                {...register('farmLocation')}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">주요 상품</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                ref={tagInputRef}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="상품명 입력 후 Enter"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                추가
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {mainProducts.map((p) => (
                <span
                  key={p}
                  className="bg-[#2D6A4F]/10 text-[#2D6A4F] px-3 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {p}
                  <button
                    type="button"
                    onClick={() => removeTag(p)}
                    className="text-[#2D6A4F]/60 hover:text-[#2D6A4F] ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {errors.mainProducts && (
              <p className="text-xs text-red-500 mt-1">{errors.mainProducts.message}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">인증</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="certifications"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {CERTIFICATIONS.map((cert) => (
                    <div key={cert} className="flex items-center gap-2">
                      <Checkbox
                        id={cert}
                        checked={field.value.includes(cert)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...field.value, cert]
                              : field.value.filter((c) => c !== cert)
                          )
                        }
                      />
                      <Label htmlFor={cert} className="cursor-pointer">
                        {cert}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">브랜드 철학</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="브랜드의 핵심 가치와 철학을 입력하세요 (최대 500자)"
              maxLength={500}
              rows={4}
              {...register('brandPhilosophy')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              톤 설정
              <span className="ml-2 text-sm font-normal text-gray-500">
                {tone < 30 ? '격식체' : tone < 70 ? '중립' : '친근체'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 shrink-0">격식체</span>
              <Controller
                name="tone"
                control={control}
                render={({ field }) => (
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="flex-1"
                  />
                )}
              />
              <span className="text-sm text-gray-500 shrink-0">친근체</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">타겟 고객</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="targetCustomer"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {TARGET_CUSTOMERS.map((customer) => (
                    <div key={customer} className="flex items-center gap-2">
                      <Checkbox
                        id={customer}
                        checked={field.value.includes(customer)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...field.value, customer]
                              : field.value.filter((c) => c !== customer)
                          )
                        }
                      />
                      <Label htmlFor={customer} className="cursor-pointer">
                        {customer}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">B2B 모드</p>
                <p className="text-sm text-gray-500">도매·기업 바이어 대상 콘텐츠</p>
              </div>
              <Controller
                name="b2bMode"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={saving}
          className="w-full bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white"
        >
          {saving ? '저장 중...' : '페르소나 저장'}
        </Button>
      </form>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>콘텐츠 미리보기 — 딸기 수확 소식</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {previewContent.map((c) => (
              <Card key={c.platform}>
                <CardHeader>
                  <CardTitle className="text-sm uppercase text-[#2D6A4F]">
                    {c.platform.replace('_', ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                  {c.hashtags.length > 0 && (
                    <p className="text-xs text-[#52B788]">{c.hashtags.join(' ')}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
