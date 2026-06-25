import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent/prompts'
import { parseAgentResponse } from '@/lib/agent/parser'
import { runEvaluator } from '@/lib/agent/evaluator'
import { requireSessionUser, resolveAnthropicKey } from '@/lib/security/auth'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/security/rate-limit'
import type { StateSnapshot } from '@/lib/agent/context-trim'
import type { ObservabilityMetadata } from '@/lib/agent/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const requestStart = Date.now()

  const rl = checkRateLimit(`agent:${clientIp(req)}`, 20, 60_000)
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const session = await requireSessionUser()
  if ('error' in session) return session.error

  try {
    const { apiKey, transcript, context, today, stateSnapshot } = await req.json() as {
      apiKey?: string
      transcript: string
      context: string
      today: string
      stateSnapshot?: StateSnapshot
    }

    const resolvedKey = resolveAnthropicKey(apiKey)
    if (!resolvedKey) {
      return Response.json(
        { error: 'Anthropic API key not configured. Add it in Settings or set ANTHROPIC_API_KEY on the server.' },
        { status: 400 }
      )
    }

    if (!transcript?.trim()) {
      return Response.json({ error: 'Transcript is empty.' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: resolvedKey })

    // ── Pass 1: Extraction ────────────────────────────────────────────────────
    const extractionStart = Date.now()
    const extractionResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: AGENT_SYSTEM_PROMPT(context ?? '', today ?? new Date().toISOString().slice(0, 10)),
      messages: [{ role: 'user', content: transcript.trim() }],
    })
    const extractionMs = Date.now() - extractionStart

    const extractionText = extractionResponse.content.find((b) => b.type === 'text')?.text ?? ''
    const parsed = parseAgentResponse(extractionText)

    // ── Pass 2: Evaluator (Haiku) ─────────────────────────────────────────────
    let evaluatorCorrections: string[] = []
    let evaluatorInputTokens = 0
    let evaluatorOutputTokens = 0
    let finalActions = parsed.actions

    if (stateSnapshot && parsed.actions.length > 0) {
      const evalResult = await runEvaluator(resolvedKey, parsed.actions, stateSnapshot, transcript)
      finalActions = evalResult.actions
      evaluatorCorrections = evalResult.corrections
      // Haiku usage is tracked as total tokens; split evenly as an approximation
      evaluatorInputTokens = Math.round(evalResult.tokensUsed * 0.75)
      evaluatorOutputTokens = evalResult.tokensUsed - evaluatorInputTokens
    }

    const totalMs = Date.now() - requestStart

    const metadata: ObservabilityMetadata = {
      extractionMs,
      totalMs,
      extractionInputTokens: extractionResponse.usage.input_tokens,
      extractionOutputTokens: extractionResponse.usage.output_tokens,
      evaluatorInputTokens,
      evaluatorOutputTokens,
      evaluatorCorrections,
      domainsDetected: [],  // filled client-side from classifyDomains()
    }

    return Response.json({ actions: finalActions, summary: parsed.summary, metadata })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
