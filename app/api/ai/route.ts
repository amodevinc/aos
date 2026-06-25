import { NextRequest } from 'next/server'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import Anthropic from '@anthropic-ai/sdk'
import { requireSessionUser, resolveAnthropicKey } from '@/lib/security/auth'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`ai:${clientIp(req)}`, 30, 60_000)
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const session = await requireSessionUser()
  if ('error' in session) return session.error

  try {
    const { apiKey, messages, system, maxTokens = 2048 } = await req.json() as {
      apiKey?: string
      messages: MessageParam[]
      system: string
      maxTokens?: number
    }

    const resolvedKey = resolveAnthropicKey(apiKey)
    if (!resolvedKey) {
      return Response.json(
        { error: 'Anthropic API key not configured. Add it in Settings or set ANTHROPIC_API_KEY on the server.' },
        { status: 400 }
      )
    }

    const client = new Anthropic({ apiKey: resolvedKey })

    // `await` here makes the HTTP request eagerly and waits for response headers.
    // Auth errors, invalid params, and network failures are thrown before we commit
    // to a 200 streaming response — so the catch block below handles them correctly.
    // This is the key difference vs client.messages.stream() which fires asynchronously
    // inside a ReadableStream where errors escape the try/catch.
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
      stream: true,
    })

    const enc = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(enc.encode(chunk.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          // Mid-stream error — can't change status code but signal the client
          try { controller.error(err) } catch { /* already closed */ }
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
