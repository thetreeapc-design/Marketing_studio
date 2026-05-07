'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { buildSystemPrompt } from '@/lib/prompts'
import type { Persona } from '@/types/database'

// ─── 상수 ─────────────────────────────────────────────────

const CERTIFICATIONS = ['GAP인증', '친환경인증', '무농약', 'FDA FSMA', '수상이력']
const TARGET_CUSTOMERS = ['일반소비자', '친환경소비자', '도매바이어', '급식단체']

const TONE_OPTIONS = [
  {
    value: 'friendly',
    label: '친근체',
    badge: '😊',
    example: '"올해 딸기 첫 수확이에요! 달콤한 향기가 벌써 느껴지시나요? 🍓"',
  },
  {
    value: 'neutral',
    label: '중립',
    badge: '📋',
    example: '"2025년 딸기 수확이 시작되었습니다. GAP인증 농산물로 안전하게 재배되었습니다."',
  },
  {
    value: 'formal',
    label: '격식체',
    badge: '🏢',
    example: '"금번 딸기 수확은 GAP인증 기준에 의거하여 진행되었으며, 당사 품질 기준을 충족하는 제품만을 출하합니다."',
  },
]

const TEMPLATES = [
  {
    id: 'b2c_friendly',
    icon: '🍎',
    label: 'B2C 친근체',
    desc: '일반 소비자, SNS 감성 마케팅',
    values: {
      name: 'B2C 친근 마케터',
      brandName: '열매나무',
      farmLocation: '경남 거창',
      mainProducts: ['부사 사과', '샤인머스캣', '딸기'],
      certifications: ['GAP인증'],
      toneStyle: 'friendly' as const,
      targetCustomer: ['일반소비자', '친환경소비자'],
      b2bMode: false,
      brandPhilosophy: '경남 거창의 맑은 공기와 일교차 속에서 자란 정직한 과일을 식탁에 전합니다.',
    },
  },
  {
    id: 'b2b_professional',
    icon: '📦',
    label: 'B2B 전문체',
    desc: '도매바이어·급식단체 대상',
    values: {
      name: 'B2B 전문 바이어 채널',
      brandName: '열매나무',
      farmLocation: '경남 거창',
      mainProducts: ['부사 사과', '샤인머스캣', '딸기'],
      certifications: ['GAP인증'],
      toneStyle: 'formal' as const,
      targetCustomer: ['도매바이어', '급식단체'],
      b2bMode: true,
      brandPhilosophy: 'GAP인증 고품질 농산물의 안정적 공급으로 파트너 비즈니스를 지원합니다.',
    },
  },
  {
    id: 'export_premium',
    icon: '✈️',
    label: '수출 / 프리미엄',
    desc: '미국·UAE·대만, THE TREE 브랜드',
    values: {
      name: '수출 프리미엄 채널',
      brandName: 'THE TREE',
      farmLocation: '경남 거창',
      mainProducts: ['부사 사과', '샤인머스캣', '딸기'],
      certifications: ['GAP인증', 'FDA FSMA'],
      toneStyle: 'neutral' as const,
      targetCustomer: ['일반소비자', '도매바이어'],
      b2bMode: false,
      brandPhilosophy: 'FDA FSMA 기준을 충족하는 프리미엄 한국 농산물을 글로벌 시장에 소개합니다.',
    },
  },
]

const TONE_LABEL: Record<string, string> = { friendly: '친근체', neutral: '중립', formal: '격식체' }

// ─── Zod 스키마 ─────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, '페르소나 이름을 입력하세요'),
  brandName: z.string().min(1),
  farmLocation: z.string(),
  mainProducts: z.array(z.string()).min(1, '상품을 하나 이상 추가하세요'),
  certifications: z.array(z.string()),
  brandPhilosophy: z.string().max(500),
  toneStyle: z.enum(['friendly', 'neutral', 'formal']),
  targetCustomer: z.array(z.string()),
  b2bMode: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  name: '',
  brandName: '열매나무',
  farmLocation: '경남 거창',
  mainProducts: ['부사 사과', '샤인머스캣', '딸기'],
  certifications: ['GAP인증'],
  brandPhilosophy: '',
  toneStyle: 'friendly',
  targetCustomer: [],
  b2bMode: false,
}

// ─── 페르소나 카드 ────────────────────────────────────────────

function PersonaCard({ persona, onEdit }: { persona: Persona; onEdit: (p: Persona) => void }) {
  const tone = TONE_LABEL[persona.tone ?? ''] ?? persona.tone ?? '-'
  return (
    <Card className="hover:border-[#52B788] transition-colors">
      <CardContent className="pt-4 pb-3 px-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-[#2D6A4F]">{persona.name}</p>
            <p className="text-xs text-gray-500">{persona.brand_name}</p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => onEdit(persona)}>
            수정
          </Button>
        </div>
        <div className="flex gap-1 flex-wrap">
          <Badge variant="secondary" className="text-xs bg-[#2D6A4F]/10 text-[#2D6A4F]">{tone}</Badge>
          {persona.b2b_mode && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">B2B</Badge>}
          {persona.certifications.map(c => (
            <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
          ))}
        </div>
        <p className="text-xs text-gray-400 truncate">{persona.main_products.join(' · ')}</p>
      </CardContent>
    </Card>
  )
}

// ─── 진행 표시기 ──────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex-1 flex flex-col items-center gap-1">
          <div className={`h-1.5 w-full rounded-full transition-all ${step >= s ? 'bg-[#2D6A4F]' : 'bg-gray-200'}`} />
          <span className={`text-xs ${step >= s ? 'text-[#2D6A4F] font-medium' : 'text-gray-400'}`}>
            {s === 1 ? '기본정보' : s === 2 ? '브랜드 목소리' : '저장'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────

export default function PersonaPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0) // 0=목록, 1=Template, 2-4=Steps
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  const { register, control, handleSubmit, watch, setValue, trigger, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  const mainProducts = watch('mainProducts')
  const values = watch()

  useEffect(() => {
    fetch('/api/personas')
      .then(r => r.json())
      .then(d => { setPersonas(d.personas ?? []); setLoading(false) })
  }, [])

  function startNew() {
    reset(DEFAULT_VALUES)
    setEditingId(null)
    setStep(1)
    setWizardStep(1)
  }

  function handleEdit(persona: Persona) {
    reset({
      name: persona.name,
      brandName: persona.brand_name,
      farmLocation: persona.farm_location ?? '',
      mainProducts: persona.main_products,
      certifications: persona.certifications,
      brandPhilosophy: persona.brand_philosophy ?? '',
      toneStyle: (['friendly', 'neutral', 'formal'].includes(persona.tone ?? '') ? persona.tone : 'friendly') as 'friendly' | 'neutral' | 'formal',
      targetCustomer: persona.target_customer ?? [],
      b2bMode: persona.b2b_mode,
    })
    setEditingId(persona.id)
    setStep(1)
    setWizardStep(2) // step1 바로
  }

  function applyTemplate(template: typeof TEMPLATES[0]) {
    reset({ ...DEFAULT_VALUES, ...template.values })
    setEditingId(null)
    setStep(1)
    setWizardStep(2)
  }

  function addTag() {
    const val = tagInput.trim()
    if (!val || mainProducts.includes(val)) return
    setValue('mainProducts', [...mainProducts, val])
    setTagInput('')
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addTag() }
  }

  function removeTag(tag: string) {
    setValue('mainProducts', mainProducts.filter(p => p !== tag))
  }

  async function goNext() {
    const fields: (keyof FormValues)[][] = [
      ['name', 'brandName', 'farmLocation', 'mainProducts'],
      ['toneStyle', 'targetCustomer', 'brandPhilosophy'],
    ]
    const ok = await trigger(fields[step - 1])
    if (ok) setStep(s => (s < 3 ? s + 1 : s) as 1 | 2 | 3)
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)

    const personaForPrompt: Persona = {
      id: editingId ?? '',
      owner_id: '',
      name: values.name,
      brand_name: values.brandName,
      farm_location: values.farmLocation,
      main_products: values.mainProducts,
      certifications: values.certifications,
      brand_philosophy: values.brandPhilosophy,
      tone: values.toneStyle,
      target_customer: values.targetCustomer,
      b2b_mode: values.b2bMode,
      system_prompt: null,
      created_at: '',
    }

    const body = {
      id: editingId ?? undefined,
      name: values.name,
      brand_name: values.brandName,
      farm_location: values.farmLocation,
      main_products: values.mainProducts,
      certifications: values.certifications,
      brand_philosophy: values.brandPhilosophy,
      tone: values.toneStyle,
      target_customer: values.targetCustomer,
      b2b_mode: values.b2bMode,
      system_prompt: buildSystemPrompt(personaForPrompt),
    }

    const res = await fetch('/api/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { toast.error('저장 실패: ' + (data.error ?? '오류')); return }

    const saved = data.persona as Persona
    if (editingId) {
      setPersonas(prev => prev.map(p => p.id === editingId ? saved : p))
    } else {
      setPersonas(prev => [saved, ...prev])
    }
    toast.success('페르소나 저장 완료')
    setWizardStep(0)
  }

  const liveSystemPrompt = buildSystemPrompt({
    id: '', owner_id: '', created_at: '',
    name: values.name,
    brand_name: values.brandName,
    farm_location: values.farmLocation,
    main_products: values.mainProducts,
    certifications: values.certifications,
    brand_philosophy: values.brandPhilosophy,
    tone: values.toneStyle,
    target_customer: values.targetCustomer,
    b2b_mode: values.b2bMode,
    system_prompt: null,
  } as Persona)

  // ── 목록 화면 ──
  if (wizardStep === 0) return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2D6A4F]">페르소나</h1>
        <Button className="bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white" onClick={startNew}>
          + 새로 만들기
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : personas.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-4xl">🌱</p>
          <p className="text-gray-500 text-sm">아직 페르소나가 없습니다</p>
          <p className="text-gray-400 text-xs">브랜드 목소리를 설정해야 콘텐츠를 생성할 수 있습니다</p>
          <Button className="bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white mt-2" onClick={startNew}>
            첫 페르소나 만들기
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {personas.map(p => <PersonaCard key={p.id} persona={p} onEdit={handleEdit} />)}
        </div>
      )}
    </div>
  )

  // ── 템플릿 선택 화면 ──
  if (wizardStep === 1) return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => setWizardStep(0)} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-2xl font-bold text-[#2D6A4F]">빠른 시작</h1>
      </div>
      <p className="text-sm text-gray-500">브랜드 목소리 템플릿을 선택하면 기본값이 자동으로 채워집니다.</p>

      <div className="space-y-3">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => applyTemplate(t)}
            className="w-full p-4 rounded-xl border border-gray-200 hover:border-[#2D6A4F] hover:bg-[#2D6A4F]/5 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{t.icon}</span>
              <div>
                <p className="font-semibold text-sm">{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
              </div>
            </div>
          </button>
        ))}

        <button
          onClick={() => { reset(DEFAULT_VALUES); setEditingId(null); setStep(1); setWizardStep(2) }}
          className="w-full p-4 rounded-xl border border-dashed border-gray-300 hover:border-[#2D6A4F] text-left text-sm text-gray-400 hover:text-[#2D6A4F] transition-all"
        >
          ✏️ 직접 처음부터 만들기
        </button>
      </div>
    </div>
  )

  // ── 위저드 폼 ──
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => { if (step === 1) setWizardStep(editingId ? 0 : 1); else setStep(s => (s - 1) as 1 | 2 | 3) }}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >←</button>
        <h1 className="text-xl font-bold text-[#2D6A4F]">
          {editingId ? '페르소나 수정' : '새 페르소나'}
        </h1>
      </div>

      <StepIndicator step={step} />

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ── Step 1: 기본정보 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>페르소나 이름 *</Label>
              <Input placeholder="예: B2C 친근 마케터" {...register('name')} className="mt-1" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>브랜드명</Label>
                <Input {...register('brandName')} className="mt-1" />
              </div>
              <div>
                <Label>농장 위치</Label>
                <Input placeholder="경남 거창" {...register('farmLocation')} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>주요 상품</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  ref={tagInputRef}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="상품명 입력 후 Enter"
                />
                <Button type="button" variant="outline" onClick={addTag}>추가</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {mainProducts.map(p => (
                  <span key={p} className="bg-[#2D6A4F]/10 text-[#2D6A4F] px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    {p}
                    <button type="button" onClick={() => removeTag(p)} className="ml-1 text-[#2D6A4F]/60 hover:text-[#2D6A4F]">×</button>
                  </span>
                ))}
              </div>
              {errors.mainProducts && <p className="text-xs text-red-500 mt-1">{errors.mainProducts.message}</p>}
            </div>

            <div>
              <Label className="mb-2 block">인증</Label>
              <Controller
                name="certifications"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {CERTIFICATIONS.map(cert => (
                      <div key={cert} className="flex items-center gap-2">
                        <Checkbox
                          id={cert}
                          checked={field.value.includes(cert)}
                          onCheckedChange={checked =>
                            field.onChange(checked ? [...field.value, cert] : field.value.filter(c => c !== cert))
                          }
                        />
                        <Label htmlFor={cert} className="cursor-pointer text-sm">{cert}</Label>
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: 브랜드 목소리 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">문체 스타일</Label>
              <Controller
                name="toneStyle"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    {TONE_OPTIONS.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => field.onChange(t.value)}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                          field.value === t.value
                            ? 'border-[#2D6A4F] bg-[#2D6A4F]/5 ring-1 ring-[#2D6A4F]'
                            : 'border-gray-200 hover:border-[#52B788]'
                        }`}
                      >
                        <p className="font-medium text-sm">{t.badge} {t.label}</p>
                        <p className="text-xs text-gray-400 mt-1 italic">{t.example}</p>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div>
              <Label className="mb-2 block">타겟 고객</Label>
              <Controller
                name="targetCustomer"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {TARGET_CUSTOMERS.map(c => (
                      <div key={c} className="flex items-center gap-2">
                        <Checkbox
                          id={c}
                          checked={field.value.includes(c)}
                          onCheckedChange={checked =>
                            field.onChange(checked ? [...field.value, c] : field.value.filter(v => v !== c))
                          }
                        />
                        <Label htmlFor={c} className="cursor-pointer text-sm">{c}</Label>
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>

            <div>
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <p className="font-medium text-sm">B2B 모드</p>
                  <p className="text-xs text-gray-400">도매·기업 바이어 대상 문체</p>
                </div>
                <Controller
                  name="b2bMode"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </div>

            <div>
              <Label>브랜드 철학 <span className="text-gray-400 text-xs">(선택)</span></Label>
              <Textarea
                placeholder="브랜드의 핵심 가치와 철학을 입력하세요 (최대 500자)"
                maxLength={500}
                rows={3}
                {...register('brandPhilosophy')}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* ── Step 3: 저장+미리보기 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="border-[#2D6A4F]/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-[#2D6A4F]">생성될 시스템 프롬프트</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2 text-[#2D6A4F]"
                    onClick={() => setPromptDialogOpen(true)}
                  >
                    전문 보기
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-48 bg-gray-50 rounded-md p-3 leading-relaxed">
                  {liveSystemPrompt}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">페르소나</span><span className="font-medium">{values.name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">브랜드</span><span className="font-medium">{values.brandName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">문체</span><span className="font-medium">{TONE_LABEL[values.toneStyle]}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">모드</span><span className="font-medium">{values.b2bMode ? 'B2B' : 'B2C'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">상품</span><span className="font-medium text-right">{values.mainProducts.join(', ') || '-'}</span></div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white h-12 text-base font-semibold"
            >
              {saving ? '저장 중...' : editingId ? '페르소나 수정 저장' : '페르소나 저장'}
            </Button>
          </div>
        )}

        {/* 네비게이션 버튼 */}
        {step < 3 && (
          <Button
            type="button"
            className="w-full mt-4 bg-[#2D6A4F] hover:bg-[#2D6A4F]/90 text-white h-12"
            onClick={goNext}
          >
            다음 →
          </Button>
        )}
      </form>

      {/* 시스템 프롬프트 전문 다이얼로그 */}
      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>시스템 프롬프트 전문</DialogTitle>
          </DialogHeader>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed mt-2">
            {liveSystemPrompt}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
