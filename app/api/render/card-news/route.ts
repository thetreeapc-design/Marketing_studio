import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const execAsync = promisify(exec)

const schema = z.object({
  topic: z.string().min(1),
  slides: z.array(
    z.object({
      order: z.number(),
      heading: z.string(),
      body: z.string(),
      cta: z.string().optional(),
    })
  ),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { topic, slides } = parsed.data

  // 임시 디렉토리
  const tmpDir = join(tmpdir(), `card-news-${Date.now()}`)
  const inputFile = join(tmpDir, 'input.json')
  mkdirSync(tmpDir, { recursive: true })
  writeFileSync(inputFile, JSON.stringify({ topic, slides }))

  const rendererPath = join(process.cwd(), 'renderer', 'render.py')

  // python3 폴백
  async function tryRender(pythonCmd: string): Promise<{ stdout: string; stderr: string }> {
    const cmd = `${pythonCmd} "${rendererPath}" --input "${inputFile}" --output "${tmpDir}"`
    return execAsync(cmd, { timeout: 60000 })
  }

  let stdout: string
  try {
    const result = await tryRender('python').catch(() => tryRender('python3'))
    stdout = result.stdout
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Render error:', message)
    return NextResponse.json({ error: 'Render failed', detail: message }, { status: 500 })
  }

  let result: { files: string[]; count: number }
  try {
    result = JSON.parse(stdout.trim())
  } catch {
    return NextResponse.json({ error: 'Render output parse failed', detail: stdout }, { status: 500 })
  }

  // PNG 파일들을 base64로 인코딩해서 반환
  const images = result.files.map((filePath: string) => {
    const data = readFileSync(filePath)
    const filename = filePath.split(/[\\/]/).pop() ?? `slide.png`
    return {
      filename,
      base64: data.toString('base64'),
      mimeType: 'image/png' as const,
    }
  })

  return NextResponse.json({ images, count: images.length })
}
