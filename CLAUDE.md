# 열매나무 AI 마케팅 시스템

## Stack
Next.js14 App Router|TypeScript|Tailwind|Supabase|Claude API(claude-sonnet-4-6)|shadcn/ui

## Env vars (never hardcode)
ANTHROPIC_API_KEY|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|META_ACCESS_TOKEN|META_INSTAGRAM_ACCOUNT_ID|NAVER_CLIENT_ID|NAVER_CLIENT_SECRET|KAKAO_REST_API_KEY

## Theme
primary:#2D6A4F secondary:#52B788 accent:#F4A261 font:Noto Sans KR

## Conventions
- imports: @/ absolute
- async/await only (no .then)
- zod validation on all API routes
- supabase server client in server components, browser client in client components
- all Claude API calls via lib/claude.ts wrapper
- JSON.parse from Claude: strip ```json fences first

## DB tables
personas|harvest_calendar|contents|publish_logs|analytics|inquiries

## Content statuses
draft→pending_approval→approved→published|rejected

## Content types
card_news|sns_post|blog|short_form_script

## Platforms
instagram|naver_blog|kakao_channel|youtube

## Claude model rule
plan/arch→opus | implement/test→sonnet | rename/format→haiku

## Commands
npm run dev|npm run build|npm run test|npx supabase db push

## DO NOT
- hardcode API keys
- skip zod validation
- use Promise.then chains
- load entire files into context (pipe only needed sections)
