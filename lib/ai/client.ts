import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

export interface StreamOptions {
  apiKey: string
  messages: MessageParam[]
  system: string
  maxTokens?: number
  onChunk: (text: string) => void
  onDone: (fullText: string) => void
  onError: (err: string) => void
}

// Calls our Next.js proxy route (/api/ai) and streams the response back.
// The API key is sent in the request body — it never touches a server env var.

export async function streamAI({
  apiKey,
  messages,
  system,
  maxTokens = 2048,
  onChunk,
  onDone,
  onError,
}: StreamOptions): Promise<AbortController> {
  const controller = new AbortController()

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, messages, system, maxTokens }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Request failed' }))
      onError(body.error ?? 'Request failed')
      return controller
    }

    const reader = res.body?.getReader()
    if (!reader) {
      onError('No response stream available')
      return controller
    }

    const dec = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = dec.decode(value, { stream: true })
      full += chunk
      onChunk(chunk)
    }

    onDone(full)
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      onError((err as Error).message ?? 'Unknown error')
    }
  }

  return controller
}

// Single-shot (non-streaming) call — used for insights and reflections where
// we only need the final result and don't need to show typing.
export async function callAI({
  apiKey,
  messages,
  system,
  maxTokens = 1024,
}: Omit<StreamOptions, 'onChunk' | 'onDone' | 'onError'>): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, messages, system, maxTokens }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(body.error ?? 'Request failed')
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response stream')

  const dec = new TextDecoder()
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    full += dec.decode(value, { stream: true })
  }
  return full
}
