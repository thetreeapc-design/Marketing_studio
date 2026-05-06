-- Phase 2: Initial schema for Yeolmaenamu AI marketing system
-- 6 tables + RLS (auth.uid() based isolation) + updated_at trigger + indexes

create extension if not exists "pgcrypto";

-- ========================================================================
-- 1. personas
-- ========================================================================
create table personas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand_name text not null default '열매나무',
  tone text,
  target_customer text[],
  brand_philosophy text,
  certifications text[] not null default '{}',
  farm_location text,
  main_products text[] not null default '{}',
  b2b_mode boolean not null default false,
  system_prompt text,
  created_at timestamptz not null default now()
);

-- ========================================================================
-- 2. harvest_calendar
-- ========================================================================
create table harvest_calendar (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  crop_name text not null,
  variety text,
  harvest_start date not null,
  harvest_end date not null,
  expected_volume numeric,
  price_per_kg numeric,
  notes text,
  created_at timestamptz not null default now(),
  constraint harvest_calendar_dates_chk check (harvest_end >= harvest_start)
);

-- ========================================================================
-- 3. contents
-- ========================================================================
create table contents (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  type text not null check (type in ('card_news','sns_post','blog','short_form_script')),
  platform text[] not null default '{}',
  title text,
  body text,
  image_urls text[] not null default '{}',
  hashtags text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft','pending_approval','approved','published','rejected')),
  input_source text,
  input_data jsonb,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========================================================================
-- 4. publish_logs
-- ========================================================================
create table publish_logs (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references contents(id) on delete cascade,
  platform text not null check (platform in ('instagram','naver_blog','kakao_channel','youtube')),
  status text not null check (status in ('success','failed','pending')),
  platform_post_id text,
  error_message text,
  published_at timestamptz not null default now()
);

-- ========================================================================
-- 5. analytics
-- ========================================================================
create table analytics (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references contents(id) on delete cascade,
  platform text not null check (platform in ('instagram','naver_blog','kakao_channel','youtube')),
  views integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  saves integer not null default 0,
  clicks integer not null default 0,
  recorded_at timestamptz not null default now()
);

-- ========================================================================
-- 6. inquiries
-- ========================================================================
create table inquiries (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references contents(id) on delete cascade,
  platform text not null check (platform in ('instagram','naver_blog','kakao_channel','youtube')),
  platform_comment_id text,
  user_name text,
  message text not null,
  category text,
  ai_response text,
  status text not null default 'pending'
    check (status in ('pending','ai_replied','human_replied','dismissed')),
  is_sales_lead boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========================================================================
-- updated_at trigger (contents only)
-- ========================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contents_set_updated_at
  before update on contents
  for each row execute function set_updated_at();

-- ========================================================================
-- Indexes
-- ========================================================================
create index contents_status_idx          on contents (status);
create index contents_persona_created_idx on contents (persona_id, created_at desc);
create index contents_scheduled_idx       on contents (scheduled_at) where scheduled_at is not null;
create index analytics_content_recorded_idx on analytics (content_id, recorded_at desc);
create index harvest_calendar_dates_idx   on harvest_calendar (harvest_start, harvest_end);
create index harvest_calendar_owner_idx   on harvest_calendar (owner_id);
create index publish_logs_content_idx     on publish_logs (content_id);
create index inquiries_status_idx         on inquiries (status);
create index personas_owner_idx           on personas (owner_id);

-- ========================================================================
-- Row-Level Security
-- ========================================================================
alter table personas         enable row level security;
alter table harvest_calendar enable row level security;
alter table contents         enable row level security;
alter table publish_logs     enable row level security;
alter table analytics        enable row level security;
alter table inquiries        enable row level security;

-- personas: owner == auth.uid()
create policy personas_owner_all on personas
  for all
  using      (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- harvest_calendar: owner == auth.uid()
create policy harvest_calendar_owner_all on harvest_calendar
  for all
  using      (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- contents: persona owned by auth.uid()
create policy contents_owner_all on contents
  for all
  using      (persona_id in (select id from personas where owner_id = auth.uid()))
  with check (persona_id in (select id from personas where owner_id = auth.uid()));

-- publish_logs / analytics / inquiries: content's persona owned by auth.uid()
create policy publish_logs_owner_all on publish_logs
  for all
  using      (content_id in (select c.id from contents c join personas p on p.id = c.persona_id where p.owner_id = auth.uid()))
  with check (content_id in (select c.id from contents c join personas p on p.id = c.persona_id where p.owner_id = auth.uid()));

create policy analytics_owner_all on analytics
  for all
  using      (content_id in (select c.id from contents c join personas p on p.id = c.persona_id where p.owner_id = auth.uid()))
  with check (content_id in (select c.id from contents c join personas p on p.id = c.persona_id where p.owner_id = auth.uid()));

create policy inquiries_owner_all on inquiries
  for all
  using      (content_id in (select c.id from contents c join personas p on p.id = c.persona_id where p.owner_id = auth.uid()))
  with check (content_id in (select c.id from contents c join personas p on p.id = c.persona_id where p.owner_id = auth.uid()));
