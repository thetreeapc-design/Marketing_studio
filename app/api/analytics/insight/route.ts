import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(_req: NextRequest) {
  const supabase = createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const { data: analytics } = await supabase
    .from('analytics')
    .select('platform, views, likes, comments, shares, saves, clicks, recorded_at')
    .gte('recorded_at', thirtyDaysAgo)
    .order('views', { ascending: false })
    .limit(10)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const messageStream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: '농업 마케팅 성과 분석가입니다. 주어진 analytics 데이터를 바탕으로 한국어로 핵심 인사이트를 3줄로 제공하세요. 구체적인 수치를 언급하고 개선 방향을 제안하세요.',
        messages: [
          {
            role: 'user',
            content: `최근 30일 콘텐츠 성과 데이터:\n${JSON.stringify(analytics, null, 2)}`,
          },
        ],
      })

      for await (const chunk of messageStream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
