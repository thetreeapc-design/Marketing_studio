import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function generateContent(
  systemPrompt: string,
  userPrompt: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: opts?.maxTokens ?? 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    ...(opts?.temperature !== undefined && { temperature: opts.temperature }),
  })

  const block = response.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') {
    throw new Error('No text block in Claude response')
  }
  return block.text
}

export async function generateJSON<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const raw = await generateContent(
    systemPrompt,
    userPrompt + '\n\nOutput valid JSON only. No markdown fences.',
  )
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as T
}
