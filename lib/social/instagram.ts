import type { Content } from '@/types/database'

const BASE = 'https://graph.facebook.com/v18.0'

async function apiPost(
  path: string,
  params: Record<string, string>
): Promise<{ id: string }> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, access_token: process.env.META_ACCESS_TOKEN }),
  })
  const data = (await res.json()) as { id?: string; error?: { message: string } }
  if (data.error) throw new Error(data.error.message)
  if (!data.id) throw new Error('No id in Meta API response')
  return { id: data.id }
}

export async function publishPost(content: Content): Promise<{ postId: string }> {
  const igId = process.env.META_INSTAGRAM_ACCOUNT_ID
  if (!igId) throw new Error('META_INSTAGRAM_ACCOUNT_ID not set')

  const caption = [content.body, content.hashtags.join(' ')]
    .filter(Boolean)
    .join('\n\n')

  if (content.image_urls.length > 1) {
    const childIds: string[] = []
    for (const imageUrl of content.image_urls) {
      const { id } = await apiPost(`/${igId}/media`, {
        image_url: imageUrl,
        is_carousel_item: 'true',
      })
      childIds.push(id)
    }

    const { id: carouselId } = await apiPost(`/${igId}/media`, {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption,
    })

    const { id: postId } = await apiPost(`/${igId}/media_publish`, {
      creation_id: carouselId,
    })
    return { postId }
  }

  if (!content.image_urls[0]) throw new Error('Instagram post requires at least one image')

  const { id: mediaId } = await apiPost(`/${igId}/media`, {
    image_url: content.image_urls[0],
    caption,
  })

  const { id: postId } = await apiPost(`/${igId}/media_publish`, {
    creation_id: mediaId,
  })
  return { postId }
}
