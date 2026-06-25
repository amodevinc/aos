import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { requireSessionUser, resolveAnthropicKey } from '@/lib/security/auth'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

const INSIGHT_SYSTEM = `You are a brief pattern-recognition engine for AOS — Alain Morris's personal operating system.

The user just captured something and actions were applied. Generate 1-2 sentences that:
- Connect this specific capture to an active goal, pillar weakness, or compounding opportunity
- Reference real data (goal names, pillar scores, contact names if relevant)
- Are honest and direct — no fluff, no affirmation, no generic praise

Start directly with the insight, not "This capture..." or "Great work...".
Examples of the right tone:
- "Your meeting with Sarah feeds directly into the Network pillar, which is your weakest at 38/100 this week."
- "Shipping today makes three consecutive days of didMoveProject — that's the streak behavior that compounds into your Belize mission goal."
- "No training again — that's 4 of the last 7 days. Health is bleeding while Capability and Mission are up."

AOS CONTEXT:
`

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(`insight:${clientIp(req)}`, 30, 60_000)
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const session = await requireSessionUser()
  if ('error' in session) return session.error

  try {
    const { apiKey, transcript, summary, actionKinds, context } = await req.json() as {
      apiKey?: string
      transcript: string
      summary: string
      actionKinds: string[]
      context: string
    }

    const resolvedKey = resolveAnthropicKey(apiKey)
    if (!resolvedKey) {
      return Response.json({ error: 'Anthropic API key not configured.' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: resolvedKey })

    const userMessage = `Transcript: "${transcript}"

What was applied: ${actionKinds.join(', ')}
Agent summary: ${summary}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: INSIGHT_SYSTEM + context,
      messages: [{ role: 'user', content: userMessage }],
    })

    const insight = response.content.find((b) => b.type === 'text')?.text?.trim() ?? ''
    return Response.json({ insight })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
