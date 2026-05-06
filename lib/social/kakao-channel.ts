import type { Content } from '@/types/database'

export async function publishPost(_content: Content): Promise<{ postId: string }> {
  throw new Error('NotImplemented: 카카오 채널 공식 발행 API 미지원')
}
