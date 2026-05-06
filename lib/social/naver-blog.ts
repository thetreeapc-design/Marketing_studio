import type { Content } from '@/types/database'

export async function publishPost(_content: Content): Promise<{ postId: string }> {
  throw new Error('NotImplemented: 네이버 블로그 공식 발행 API 미지원')
}
