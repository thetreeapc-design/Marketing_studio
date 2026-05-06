# 열매나무 AI 마케팅 시스템 — 아키텍처 (Phase 1)

> 모델: Opus 4.7 / 산출물 형식: lists only
> 스택: Next.js 14 App Router + TypeScript + Tailwind + Supabase + Claude API + shadcn/ui
> 6 모듈: persona / content-gen / calendar / approval / publish / analytics
> 모바일 우선 — 현장 직원이 휴대폰에서 콘텐츠 승인

---

## 1. Directory Tree (2-level)

```
app/
├── (dashboard)/        # persona, content, calendar, inquiries, analytics
├── api/                # generate, publish, contents, harvest, webhook, cron
├── layout.tsx
└── page.tsx
components/
├── ui/                 # shadcn 원시 컴포넌트
└── shared/             # BottomNav, ContentCard, PlatformBadge, SwipeCard
lib/
├── claude.ts           # generateContent / generateJSON
├── supabase/           # server client / browser client
├── prompts/            # persona, sns-post, card-news, inquiry
└── social/             # instagram, naver-blog (stub), kakao-channel (stub), youtube (stub)
types/
└── database.ts         # supabase gen types
supabase/
├── migrations/         # 001_initial_schema.sql
└── seed.sql
public/
├── icons/
└── manifest.json
docs/
├── architecture.md
└── yeolmaenamu_harness_prompts.md
```

---

## 2. Data Flow

```
[입력 소스]                  [생성]              [검토]                [발행]
직접입력  ┐                                    ┌→ approved ────┐
캘린더   ─┼→ persona prompt → Claude(JSON) → contents.pending → ┤            → analytics
URL변환  ┘                                    └→ rejected      └→ publish_logs
                                                                    ↓
                                            모바일 스와이프 승인     platform adapter
                                                                    (instagram|naver|kakao|youtube)
                                                                    ↓
                                                              댓글 → webhook → inquiries → AI 응답
```

---

## 3. API Routes

| Path | Method | Purpose |
|---|---|---|
| `/api/personas` | GET/POST | 페르소나 목록·생성 |
| `/api/personas/[id]` | GET/PATCH | 단일 페르소나 조회·수정 |
| `/api/generate/content` | POST | 토픽+페르소나+플랫폼 → Claude → contents insert |
| `/api/generate/from-url` | POST | URL 스크래핑 → 콘텐츠 변환 (stub) |
| `/api/contents` | GET | 상태 필터 콘텐츠 목록 |
| `/api/contents/[id]` | PATCH/DELETE | 콘텐츠 수정·승인·반려·삭제 |
| `/api/harvest` | GET/POST | 출하 일정 조회·추가 |
| `/api/harvest/[id]` | PATCH/DELETE | 출하 일정 수정·삭제 |
| `/api/publish` | POST | 즉시 발행 또는 예약 등록 |
| `/api/webhook/instagram` | GET/POST | Meta 검증·댓글 수신 |
| `/api/inquiries` | GET | 문의 목록 |
| `/api/inquiries/[id]/reply` | POST | 수동 답글 게시 |
| `/api/analytics/summary` | GET | 메트릭 카드 데이터 |
| `/api/analytics/insight` | POST | Claude 스트리밍 인사이트 |
| `/api/cron/publish-scheduled` | POST | 예약 콘텐츠 발행 (Vercel Cron) |
| `/api/cron/sync-analytics` | POST | 플랫폼 메트릭 동기화 (Vercel Cron) |

---

## 4. DB Schema Summary

| Table | Key Columns |
|---|---|
| `personas` | id, brand_name, tone, target_customer, certifications[], main_products[], b2b_mode, system_prompt |
| `harvest_calendar` | id, crop_name, variety, harvest_start, harvest_end, expected_volume, price_per_kg |
| `contents` | id, persona_id(fk), type, platform[], title, body, image_urls[], hashtags[], status, input_data(jsonb), scheduled_at, published_at |
| `publish_logs` | id, content_id(fk), platform, status, platform_post_id, error_message |
| `analytics` | id, content_id(fk), platform, views, likes, comments, shares, saves, clicks, recorded_at |
| `inquiries` | id, content_id(fk), platform_comment_id, message, category, ai_response, status, is_sales_lead |

- **RLS:** `persona_id` 기반 격리
- **인덱스:** `contents(status)`, `contents(persona_id, created_at DESC)`, `analytics(content_id, recorded_at DESC)`
- **트리거:** `contents.updated_at` 자동 갱신

---

## 5. Risk Items

1. **네이버 블로그·카카오 채널 공식 발행 API 부재**
   Phase 4-B에서 stub 처리. 운영 단계에서 수동 발행 또는 비공식 자동화 필요 → 발행 워크플로 일관성 손상 위험. 완화책: 네이버 SmartPlace API·카카오 비즈니스 채널 알림톡으로 대체 검토.

2. **Meta 액세스 토큰 60일 만료**
   자동 갱신·만료 알림 미구현 시 댓글 응대·발행 중단. 완화책: Long-Lived Token 발급 + 만료 D-7 알림 cron + 만료 시 즉시 대시보드 배너.

3. **Claude JSON 응답 견고성**
   ```` ```json ```` 펜스 strip만으로 부족 — 잘림, markdown 혼입, 따옴표 이스케이프 실패 가능. 완화책: zod 스키마 검증 + 1회 재시도 + 실패 시 raw text 보존.
