import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

// Thin proxy: receives the API key from the client request body (key lives in
// browser localStorage, not in server env), makes the Anthropic call server-side
// to avoid CORS restrictions, and streams the response back.

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { apiKey, messages, system, maxTokens = 2048 } = await req.json() as {
    apiKey: string
    messages: MessageParam[]
    system: string
    maxTokens?: number
  }

  if (!apiKey?.startsWith('sk-ant-')) {
    return new Response(
      JSON.stringify({ error: 'Invalid or missing Anthropic API key.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const client = new Anthropic({ apiKey })

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    })

    const readable = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(enc.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
      cancel() {
        stream.abort()
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
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
