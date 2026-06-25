import { confidenceToTier } from './types'
import type { AgentResponse, CaptureAction } from './types'

// Strip markdown code fences if Claude wrapped the JSON
function extractJSON(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fence) return fence[1]
  const trimmed = text.trim()
  // Find first { and last } to handle any leading/trailing prose
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1) return trimmed.slice(start, end + 1)
  return trimmed
}

function isValidActionKind(kind: string): boolean {
  return [
    'upsert_daily', 'log_interaction', 'create_contact', 'update_contact',
    'create_goal', 'update_goal', 'create_decision', 'update_weekly', 'update_compass',
  ].includes(kind)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function coerceAction(raw: any): CaptureAction {
  const kind = String(raw.kind ?? '')
  if (!isValidActionKind(kind)) throw new Error(`Unknown action kind: ${kind}`)

  const confidence = Math.max(0, Math.min(1, Number(raw.confidence ?? 0.5)))
  const reasoning = String(raw.reasoning ?? '')
  const payload = raw.payload ?? {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tier = confidenceToTier(confidence, kind as any)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { kind, confidence, tier, reasoning, payload } as any
}

export function parseAgentResponse(text: string): AgentResponse {
  if (!text?.trim()) {
    return { actions: [], summary: 'No response from agent.' }
  }

  let raw: unknown
  try {
    raw = JSON.parse(extractJSON(text))
  } catch {
    return { actions: [], summary: 'Agent returned unparseable output.' }
  }

  if (typeof raw !== 'object' || raw === null) {
    return { actions: [], summary: 'Agent returned unexpected output format.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = raw as Record<string, any>
  const summary = typeof obj.summary === 'string' ? obj.summary : ''
  const rawActions = Array.isArray(obj.actions) ? obj.actions : []

  const actions: CaptureAction[] = []
  for (const raw of rawActions) {
    try {
      actions.push(coerceAction(raw))
    } catch {
      // Skip malformed actions silently; the user sees the summary regardless
    }
  }

  return { actions, summary }
}
