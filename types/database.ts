export type Platform = 'instagram' | 'naver_blog' | 'kakao_channel' | 'youtube'
export type ContentType = 'card_news' | 'sns_post' | 'blog' | 'short_form_script'
export type ContentStatus = 'draft' | 'pending_approval' | 'approved' | 'published' | 'rejected'
export type PublishStatus = 'success' | 'failed' | 'pending'
export type InquiryStatus = 'pending' | 'ai_replied' | 'human_replied' | 'dismissed'

export type Persona = {
  id: string
  owner_id: string
  name: string
  brand_name: string
  tone: string | null
  target_customer: string[] | null
  brand_philosophy: string | null
  certifications: string[]
  farm_location: string | null
  main_products: string[]
  b2b_mode: boolean
  system_prompt: string | null
  created_at: string
}

export type HarvestCalendar = {
  id: string
  owner_id: string
  crop_name: string
  variety: string | null
  harvest_start: string
  harvest_end: string
  expected_volume: number | null
  price_per_kg: number | null
  notes: string | null
  created_at: string
}

export type Content = {
  id: string
  persona_id: string
  type: ContentType
  platform: Platform[]
  title: string | null
  body: string | null
  image_urls: string[]
  hashtags: string[]
  status: ContentStatus
  input_source: string | null
  input_data: Record<string, unknown> | null
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type PublishLog = {
  id: string
  content_id: string
  platform: Platform
  status: PublishStatus
  platform_post_id: string | null
  error_message: string | null
  published_at: string
}

export type Analytics = {
  id: string
  content_id: string
  platform: Platform
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  recorded_at: string
}

export type Inquiry = {
  id: string
  content_id: string
  platform: Platform
  platform_comment_id: string | null
  user_name: string | null
  message: string
  category: string | null
  ai_response: string | null
  status: InquiryStatus
  is_sales_lead: boolean
  created_at: string
}
