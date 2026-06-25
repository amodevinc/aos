import Anthropic from '@anthropic-ai/sdk'
import { confidenceToTier } from './types'
import type { CaptureAction } from './types'
import type { StateSnapshot } from './context-trim'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvaluatorResult {
  actions: CaptureAction[]
  corrections: string[]
  tokensUsed: number
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const EVALUATOR_SYSTEM = `You are a conflict-detection agent for AOS (Alain's personal operating system).

Your job: review a list of extracted capture actions for errors or conflicts with the current system state before they're written to the database.

CHECKS TO PERFORM:

1. create_contact: If a contact with the same or very similar name already exists in state.contacts, do NOT create a new contact. Change the action to log_interaction instead, using the existing contact's id as contactId. Flag this correction.

2. update_goal: If the new progress value is LOWER than the current progress, flag it as suspicious. Only allow regression if the word "back", "dropped", "actually", or "revised" appears clearly in the context. Otherwise raise the confidence to trigger a Hold tier by setting confidence to 0.5.

3. log_interaction: If contactId is missing and you can find a matching name in state.contacts (case-insensitive), set contactId on the payload. This is a safe auto-fix.

4. create_decision: Clamp scores to valid ranges: healthImpact/capabilityImpact/networkImpact/wealthImpact/missionAlignment/longTermLeverage must be -5 to +5; timeRequirement/risk/distractionRisk must be -5 to 0. Fix silently.

5. upsert_daily: If state.todayEvening is not null (evening already logged today), do NOT set any boolean field to false unless that field was explicitly mentioned in the user's input. Merge, never overwrite. If unsure, remove the boolean field from the payload.

OUTPUT: ONLY valid JSON — no markdown, no explanation:
{
  "actions": [...same structure as input, with any corrections applied...],
  "corrections": ["human-readable description of each change made"]
}

If no corrections are needed, return the actions unchanged with an empty corrections array.`

// ─── Main function ────────────────────────────────────────────────────────────

export async function runEvaluator(
  apiKey: string,
  actions: CaptureAction[],
  state: StateSnapshot,
  transcript: string
): Promise<EvaluatorResult> {
  if (actions.length === 0) {
    return { actions, corrections: [], tokensUsed: 0 }
  }

  const client = new Anthropic({ apiKey })

  const userMessage = JSON.stringify({
    transcript,
    actions,
    state,
  }, null, 2)

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: EVALUATOR_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content.find((b) => b.type === 'text')?.text ?? ''
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

    // Extract JSON from response
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return { actions, corrections: [], tokensUsed }
    }

    const parsed = JSON.parse(text.slice(start, end + 1)) as {
      actions?: unknown[]
      corrections?: string[]
    }

    const rawActions = Array.isArray(parsed.actions) ? parsed.actions : null
    const corrections = Array.isArray(parsed.corrections) ? parsed.corrections as string[] : []

    if (!rawActions) {
      return { actions, corrections, tokensUsed }
    }

    // Re-derive tier from confidence in case evaluator changed confidence values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const correctedActions = rawActions.map((raw: any) => ({
      ...raw,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tier: confidenceToTier(Number(raw.confidence ?? 0.5), raw.kind as any),
    })) as CaptureAction[]

    return { actions: correctedActions, corrections, tokensUsed }
  } catch {
    // Evaluator failure is non-fatal — return original actions unchanged
    return { actions, corrections: [], tokensUsed: 0 }
  }
}
