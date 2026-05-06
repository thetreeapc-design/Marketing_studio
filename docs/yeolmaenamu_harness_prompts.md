# 열매나무 Claude Code 하네스 프롬프트 가이드

> 하네스 엔지니어링(Plan→Work→Review) + 토큰 최적화 적용
> 모델 전략: Opus=설계, Sonnet=구현, Haiku=단순작업

---

## 핵심 원칙 (읽고 시작)

```
CLAUDE.md → 컨텍스트 기준선 (모든 세션에 자동 로드)
/compact   → 50턴 이후 또는 작업 전환 시
/clear     → 완전히 다른 작업 시작 시
/cost      → 작업 완료 후 토큰 확인
Shift+Tab  → Plan Mode 진입 (비싼 작업 전 필수)
```

---

## PHASE 0 — 세션 시작 의식 (매번 실행)

```
# 터미널에서
claude --session-id yeolmaenamu-[작업명]

# Claude Code 첫 메시지
Read CLAUDE.md. Confirm: stack, theme, DB tables, model rule.
Output: 3-line summary only.
```

**토큰 절약**: 첫 메시지를 짧게 → CLAUDE.md가 컨텍스트 담당

---

## PHASE 1 — 아키텍처 설계 (Opus 사용)

```
/model opus
[Shift+Tab → Plan Mode]

TASK: Design yeolmaenamu AI marketing system architecture.

CONSTRAINTS:
- Next.js 14 App Router + Supabase + Claude API
- Mobile-first (staff approves content on phone)
- 6 core modules: persona/content-gen/calendar/approval/publish/analytics

OUTPUT FORMAT:
1. Directory tree (2 levels max)
2. Data flow: input→AI→approval→publish
3. API routes list (path + method + purpose, one line each)
4. DB schema summary (table + key columns only)
5. Risk items (max 3)

No code. No explanations. Lists only.
```

**토큰 절약**: "No code. No explanations. Lists only." → 출력 70% 감소

---

## PHASE 2 — DB 스키마 생성 (Sonnet)

```
/model sonnet
/clear

Context: Next.js14 + Supabase PostgreSQL. Yeolmaenamu farm AI marketing system.

CREATE these tables with RLS:

personas: id,name,brand_name,tone,target_customer,brand_philosophy,certifications(text[]),farm_location,main_products(text[]),b2b_mode(bool),system_prompt,created_at

harvest_calendar: id,crop_name,variety,harvest_start(date),harvest_end(date),expected_volume,price_per_kg(numeric),notes,created_at

contents: id,persona_id(fk→personas),type,platform(text[]),title,body,image_urls(text[]),hashtags(text[]),status(default:'draft'),input_source,input_data(jsonb),scheduled_at,published_at,created_at,updated_at

publish_logs: id,content_id(fk),platform,status,platform_post_id,error_message,published_at

analytics: id,content_id(fk),platform,views,likes,comments,shares,saves,clicks,recorded_at

inquiries: id,content_id(fk),platform,platform_comment_id,user_name,message,category,ai_response,status(default:'pending'),is_sales_lead(bool),created_at

ALSO ADD:
- updated_at trigger for contents
- indexes: contents(status), contents(persona_id,created_at DESC), analytics(content_id,recorded_at DESC)
- RLS: persona_id-based isolation

FILE: supabase/migrations/001_initial_schema.sql
```

---

## PHASE 3 — Claude API 유틸리티 (Sonnet)

```
/clear

Create lib/claude.ts:

FUNCTIONS:
1. generateContent(systemPrompt,userPrompt,opts?:{maxTokens?,temperature?}):Promise<string>
   - model: claude-sonnet-4-6
   - max_tokens default: 2000
   - extract text block, throw if missing

2. generateJSON<T>(systemPrompt,userPrompt):Promise<T>
   - calls generateContent with appended: "Output valid JSON only. No markdown fences."
   - strips ```json fences before JSON.parse
   - returns typed T

ALSO create lib/prompts/index.ts exporting:
- buildSystemPrompt(persona:Persona):string
- buildSnsPostPrompt(input:{topic,platform,cropInfo?,harvestInfo?}):string  
- buildCardNewsPrompt(input:{topic,slideCount?,cropInfo?}):string
- buildInquiryPrompt(comment:string):string

PERSONA SYSTEM PROMPT must include:
- brand name, farm location, main products, certifications
- tone, target customer, brand philosophy
- 5 writing rules (no exaggeration, include certs naturally, seasonal feel)
- b2b vs b2c mode switch
- forbidden: competitor attacks, unverified health claims, fake prices

SNS POST prompt must branch by platform with char limits:
- instagram: 150-300 chars, 10-15 hashtags, emoji ok
- naver_blog: 800-1500 chars, SEO keywords x3-5, ## headings
- kakao_channel: 100-200 chars, CTA link
- youtube: title≤30 chars + description≤300 chars

OUTPUT: valid TypeScript, no comments, strict types
```

**토큰 절약**: 구현 명세를 목록으로 → 설명 없이 코드만 출력 지시

---

## PHASE 4 — 핵심 API 라우트 (Sonnet, 파일별 분리)

### 4-A. 콘텐츠 생성 엔드포인트

```
/clear

Create app/api/generate/content/route.ts (POST handler only):

FLOW:
1. Parse body: {personaId,topic,platforms[],cropInfo?,harvestId?,inputSource?}
2. Load persona from supabase (single query)
3. If harvestId: load harvest_calendar row
4. buildSystemPrompt(persona)
5. For each platform in platforms[]:
   a. buildSnsPostPrompt({topic,platform,cropInfo,harvestInfo})
   b. generateJSON<{title,body,hashtags,cta}>(systemPrompt,userPrompt)
   c. INSERT into contents with status:'pending_approval'
6. Return {contents:[]}

ERROR: return {error:string} with appropriate status codes
IMPORT: @/lib/claude, @/lib/supabase, @/lib/prompts

No logging. No comments. Types inline.
```

### 4-B. 발행 엔드포인트

```
/clear

Create app/api/publish/route.ts (POST handler):

BODY: {contentId, publishAt?:string}

FLOW:
1. Load content from DB (include platform array)
2. If publishAt: update scheduled_at, return
3. For each platform in content.platform[]:
   a. Call platform publisher (lib/social/{platform}.ts)
   b. INSERT publish_logs row (success or failed)
4. UPDATE contents.status='published', published_at=now()
5. Return {results:[{platform,status,postId?}]}

Create lib/social/instagram.ts:
- publishPost(content:Content):Promise<{postId:string}>
- uses META_ACCESS_TOKEN, META_INSTAGRAM_ACCOUNT_ID env vars
- supports single image and carousel (image_urls.length > 1)
- endpoint: https://graph.facebook.com/v18.0/

Create lib/social/naver-blog.ts stub (API not available yet, throw NotImplemented)
Create lib/social/kakao-channel.ts stub (same)

Retry logic: max 3 attempts, 1s/2s/4s backoff
```

---

## PHASE 5 — 페르소나 설정 UI (Sonnet)

```
/clear

Create app/(dashboard)/persona/page.tsx:

FORM FIELDS (React Hook Form + Zod):
- brandName: string (default "열매나무")
- farmLocation: string
- mainProducts: string[] (tag input, add on Enter)
- certifications: enum[] (GAP인증|친환경인증|무농약|HACCP|수상이력) checkboxes
- brandPhilosophy: textarea (max 500 chars)
- tone: slider 0-100 (0=격식체, 100=친근체)
- targetCustomer: string[] checkboxes (일반소비자|친환경소비자|도매바이어|급식단체)
- b2bMode: boolean toggle

ON SAVE:
- call buildSystemPrompt(formData)
- INSERT/UPDATE personas table
- show toast "페르소나 저장 완료"

PREVIEW BUTTON:
- call POST /api/generate/content with personaId + sample topic "딸기 수확 소식"
- show result in modal

STYLE: primary:#2D6A4F, shadcn/ui components, Noto Sans KR, mobile-friendly
No comments. Export default.
```

---

## PHASE 6 — 콘텐츠 생성 UI (Sonnet)

```
/clear

Create app/(dashboard)/content/new/page.tsx:

3 TABS (shadcn Tabs):

[직접입력]
- topic: textarea placeholder "예: 딸기 수확이 시작됐습니다"
- cropName: select from persona.main_products
- cropVariety,cropFeatures,cropBenefits: text inputs

[출하캘린더연동]
- fetch harvest_calendar WHERE harvest_end >= today ORDER BY harvest_start
- render as cards: crop|dates|volume
- click card → populate fields

[URL변환]
- url: text input
- on submit: POST /api/generate/from-url (stub, show "준비중" toast)

PLATFORM CHECKBOXES: instagram|naver_blog|kakao_channel|youtube

GENERATE BUTTON:
- POST /api/generate/content
- show skeleton loader
- on success: render ContentPreview component

ContentPreview (same file, not exported):
- Tabs per platform
- contentEditable body
- buttons: [승인요청] → PATCH content status:'pending_approval'
           [재생성] → call API again
           [복사] → clipboard

STYLE: shadcn/ui, green theme, compact mobile layout
```

---

## PHASE 7 — 출하 캘린더 (Sonnet)

```
/clear

Create app/(dashboard)/calendar/page.tsx:

LEFT PANEL (70%): Monthly calendar grid
- 7-col CSS grid (no library)
- green dots for harvest_calendar entries
- blue dots for contents WHERE scheduled_at IS NOT NULL
- click date → show day detail in RIGHT PANEL

RIGHT PANEL (30%): Day detail
- harvest entries for selected date
- scheduled contents list
- "+ 수확일정 추가" button → modal

HARVEST MODAL (same file):
- cropName,variety,harvestStart,harvestEnd,expectedVolume,pricePerKg,notes
- INSERT harvest_calendar

AI 기획 제안 (below calendar):
- query: harvest entries where harvest_start BETWEEN today AND today+14
- for each entry render suggestion chips:
  D-14: "수확 준비 스토리" → link to /content/new?source=harvest&id={id}&template=prep
  D-7:  "곧 출하 예고"    → link same, template=preview  
  D-0:  "지금 수확 중"    → link same, template=live
- chips: green bg, crop emoji prefix

DATA: supabase client, no SSR needed here
```

---

## PHASE 8 — 승인 대시보드 (Sonnet)

```
/clear

Create app/(dashboard)/content/page.tsx:

STATUS FILTER TABS: 전체|승인대기|승인완료|발행완료|반려

CONTENT LIST:
- fetch contents ORDER BY created_at DESC, filter by status tab
- Card per content: platform badges|body preview (2 lines)|created_at|status badge
- action buttons: [미리보기 modal][수정 → /content/{id}][승인][반려]

APPROVE FLOW:
1. click 승인 → bottom sheet (mobile) or modal (desktop)
2. options: 즉시발행 | 예약발행(date-time picker)
3. 즉시: POST /api/publish → toast
   예약: PATCH content scheduled_at → toast

MOBILE SWIPE:
- touch-action: pan-y on cards
- swipe right (>80px) → approve
- swipe left (>80px) → reject
- visual feedback: green/red overlay during swipe

REALTIME:
- supabase.channel('contents').on('INSERT',...) → prepend to list + badge count

No external gesture library. Vanilla touch events.
```

---

## PHASE 9 — 문의 응대 시스템 (Sonnet)

```
/clear

Create app/api/webhook/instagram/route.ts:

GET handler: verify_token check (META_WEBHOOK_VERIFY_TOKEN env)
POST handler:
1. Parse Meta webhook body
2. Extract comments from entry[].changes[].value
3. For each comment:
   a. generateJSON<{category,is_sales_lead,urgency,ai_response,needs_human_review,reason}>(
        system: persona system prompt,
        user: buildInquiryPrompt(comment.message)
      )
   b. INSERT inquiries row
   c. if !needs_human_review AND category !== 'complaint': 
        POST reply to Meta Graph API
   d. if is_sales_lead: 
        INSERT notification (stub table or console.log for now)

Create app/(dashboard)/inquiries/page.tsx:
- filter tabs: 전체|구매문의|배송문의|세일즈리드
- table: user|message|category|ai_response|status|created_at
- [게시] button → POST Meta reply + update status:'human_replied'
- is_sales_lead rows: amber left border accent
```

---

## PHASE 10 — 성과 분석 (Sonnet)

```
/clear

Create app/(dashboard)/analytics/page.tsx:

TOP METRICS (4 cards, shadcn Card):
- 이번달 총 조회수: SUM(analytics.views) WHERE month=current
- 이번달 좋아요: SUM(analytics.likes)
- 구매문의: COUNT(inquiries WHERE category='purchase' AND month=current)
- 발행 콘텐츠: COUNT(contents WHERE status='published' AND month=current)

CHARTS (Recharts, all responsive):
1. BarChart: platform x-axis, views/likes/comments bars (3 series)
2. LineChart: last 30 days daily views
3. PieChart: content type breakdown

TOP 5 TABLE: title|platform|views|likes|comments|published_at

AI INSIGHT PANEL:
- Button "AI 분석 요청"
- onClick: fetch top 10 analytics rows → POST /api/analytics/insight
- show streaming response in pre-styled box

Create app/api/analytics/insight/route.ts:
- load analytics JOIN contents last 30 days
- generateContent(
    system: "농업 마케팅 성과 분석가. 한국어로 3줄 인사이트 제공.",
    user: JSON.stringify(analyticsData)
  )
- stream response using ReadableStream

No recharts SSR issues: wrap charts in dynamic() with ssr:false
```

---

## PHASE 11 — PWA + 모바일 마무리 (Haiku)

```
/model haiku

Create these files (content below):

1. public/manifest.json:
   name:열매나무 마케팅|short_name:열매나무|theme_color:#2D6A4F|background_color:#fff|display:standalone|icons:[192,512 green leaf placeholder]

2. app/layout.tsx metadata:
   add viewport themeColor:#2D6A4F, manifest link

3. components/BottomNav.tsx:
   4 icons (Home|콘텐츠|캘린더|분석) using ti-home ti-file ti-calendar ti-chart-bar
   fixed bottom, safe-area-inset-bottom, active state green

4. .claudeignore:
   node_modules|.next|.git|*.log|coverage|dist|public/fonts

Simple implementations. No animations. Mobile safe-area support.
```

**토큰 절약**: 반복·기계적 작업 → Haiku로 전환, 비용 5배 절감

---

## 토큰 관리 명령어 치트시트

```bash
# 세션 시작
claude --session-id yeolmaenamu-phase1

# 중간 점검 (50턴 후)
/compact

# 다른 Phase 전환
/clear

# 비용 확인
/cost

# 모델 전환
/model sonnet   # 기본 작업
/model opus     # 설계/디버깅
/model haiku    # 단순 반복

# Plan Mode (비싼 작업 전)
Shift+Tab Shift+Tab

# 파일 일부만 전달 (전체 파일 금지)
sed -n '/^export function buildSystemPrompt/,/^}/p' lib/prompts/index.ts | claude -p "fix this function"

# 로그 끝부분만
tail -n 50 app.log | claude -p "find errors"

# 세션 재개
claude --resume yeolmaenamu-phase3
```

---

## .claudeignore (프로젝트 루트에 배치)

```
node_modules
.next
.git
*.log
coverage
dist
public/fonts
.env*
*.lock
```

---

## 하네스 루프 요약

```
Phase 0  세션 시작  →  CLAUDE.md 로드 확인 (3줄 요약)
Phase 1  설계       →  Opus + Plan Mode → 목록 출력만
Phase 2  DB         →  Sonnet + /clear → SQL만
Phase 3  유틸리티   →  Sonnet + /clear → TS만
Phase 4  API        →  Sonnet + /clear → 파일별 분리
Phase 5  페르소나UI →  Sonnet + /clear
Phase 6  생성UI     →  Sonnet + /clear
Phase 7  캘린더     →  Sonnet + /clear
Phase 8  승인       →  Sonnet + /clear
Phase 9  문의       →  Sonnet + /clear
Phase 10 분석       →  Sonnet + /clear
Phase 11 PWA        →  Haiku (단순파일)
```

**각 Phase 시작 전 `/clear` → 불필요한 컨텍스트 차단**  
**각 Phase 완료 후 `/cost` → 누적 비용 모니터링**
