import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase/admin'
import { publishPost as publishInstagram } from '@/lib/social/instagram'
import { publishPost as publishNaverBlog } from '@/lib/social/naver-blog'
import { publishPost as publishKakaoChannel } from '@/lib/social/kakao-channel'
import type { Content, Platform } from '@/types/database'

const schema = z.object({
  contentId: z.string().uuid(),
  publishAt: z.string().datetime().optional(),
})

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [1000, 2000, 4000]
  for (let i = 0; i < 3; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i === 2) throw e
      await new Promise((r) => setTimeout(r, delays[i]))
    }
  }
  throw new Error('unreachable')
}

const publishers: Record<Platform, (content: Content) => Promise<{ postId: string }>> = {
  instagram: publishInstagram,
  naver_blog: publishNaverBlog,
  kakao_channel: publishKakaoChannel,
  youtube: async () => {
    throw new Error('NotImplemented: youtube')
  },
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { contentId, publishAt } = parsed.data
  const supabase = getAdminClient()

  const { data: content, error: contentError } = await supabase
    .from('contents')
    .select('*')
    .eq('id', contentId)
    .single()

  if (contentError || !content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }

  if (publishAt) {
    await supabase
      .from('contents')
      .update({ scheduled_at: publishAt })
      .eq('id', contentId)
    return NextResponse.json({ scheduled: true, scheduledAt: publishAt })
  }

  const results: { platform: string; status: string; postId?: string }[] = []

  for (const platform of content.platform as Platform[]) {
    let postId: string | undefined
    let status: 'success' | 'failed' = 'success'
    let errorMessage: string | undefined

    try {
      const result = await withRetry(() => publishers[platform](content as Content))
      postId = result.postId
    } catch (e) {
      status = 'failed'
      errorMessage = e instanceof Error ? e.message : 'Unknown error'
    }

    await supabase.from('publish_logs').insert({
      content_id: contentId,
      platform,
      status,
      platform_post_id: postId ?? null,
      error_message: errorMessage ?? null,
    })

    results.push({ platform, status, postId })
  }

  if (results.every((r) => r.status === 'success')) {
    await supabase
      .from('contents')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', contentId)
  }

  return NextResponse.json({ results })
}
