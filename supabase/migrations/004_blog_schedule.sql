CREATE TABLE IF NOT EXISTS blog_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_date DATE NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('네이버', '티스토리')),
  title TEXT NOT NULL,
  category TEXT,
  keywords TEXT[] DEFAULT '{}',
  fruit TEXT,
  content_type TEXT CHECK (content_type IN ('seo', 'recipe', 'story')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'published', 'skipped')),
  content_id UUID REFERENCES contents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_schedule_date ON blog_schedule(publish_date);
CREATE INDEX IF NOT EXISTS idx_blog_schedule_status ON blog_schedule(status);

GRANT ALL PRIVILEGES ON blog_schedule TO anon, authenticated;
