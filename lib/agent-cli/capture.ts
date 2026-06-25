import Anthropic from '@anthropic-ai/sdk'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent/prompts'
import { parseAgentResponse } from '@/lib/agent/parser'
import { runEvaluator } from '@/lib/agent/evaluator'
import { buildStateSnapshot, buildTrimmedContext, classifyDomains } from '@/lib/agent/context-trim'
import { preResolveActions, type PreResolvedAction } from '@/lib/agent/preresolve'
import { executeActions } from '@/lib/agent/executor'
import { actionsForApplyMode, pendingActions } from '@/lib/agent/action-pipeline'
import { confidenceToTier } from '@/lib/agent/types'
import type { StorageBundle } from '@/lib/storage/factory'
import type { CaptureAction, ExecutionResult, ObservabilityMetadata } from '@/lib/agent/types'
import { todayISO } from '@/lib/utils'
import { requireEnv } from './env'

export type CaptureApplyMode = 'preview' | 'auto_only' | 'all'

export interface CaptureResult {
  actions: CaptureAction[]
  summary: string
  mode: CaptureApplyMode
  preResolved: PreResolvedAction[]
  applied: CaptureAction[]
  pending: CaptureAction[]
  execution: ExecutionResult
  metadata: ObservabilityMetadata
}

function resolveApplyMode(options?: {
  dryRun?: boolean
  applyMode?: CaptureApplyMode
}): CaptureApplyMode {
  if (options?.applyMode) return options.applyMode
  if (options?.dryRun === true) return 'preview'
  if (options?.dryRun === false) return 'auto_only'
  return 'preview'
}

export async function runCapture(
  storage: StorageBundle,
  transcript: string,
  options?: { dryRun?: boolean; applyMode?: CaptureApplyMode }
): Promise<CaptureResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey?.startsWith('sk-ant-')) {
    throw new Error('Missing ANTHROPIC_API_KEY on the server.')
  }

  const mode = resolveApplyMode(options)
  const data = await storage.exportAll()
  const today = todayISO()
  const domains = classifyDomains(transcript)
  const context = buildTrimmedContext({
    allEntries: data.dailyEntries,
    goals: data.goals,
    decisions: data.decisions,
    weeklyReviews: data.weeklyReviews,
    contacts: data.contacts,
    compass: data.compass,
  }, domains, { transcript })
  const stateSnapshot = buildStateSnapshot({
    allEntries: data.dailyEntries,
    goals: data.goals,
    decisions: data.decisions,
    weeklyReviews: data.weeklyReviews,
    contacts: data.contacts,
    compass: data.compass,
  })

  const client = new Anthropic({ apiKey })
  const requestStart = Date.now()
  const extractionStart = Date.now()

  const extractionResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: AGENT_SYSTEM_PROMPT(context, today),
    messages: [{ role: 'user', content: transcript.trim() }],
  })
  const extractionMs = Date.now() - extractionStart

  const extractionText = extractionResponse.content.find((b) => b.type === 'text')?.text ?? ''
  const parsed = parseAgentResponse(extractionText)

  let evaluatorCorrections: string[] = []
  let evaluatorInputTokens = 0
  let evaluatorOutputTokens = 0
  let finalActions = parsed.actions

  if (parsed.actions.length > 0) {
    const evalResult = await runEvaluator(apiKey, parsed.actions, stateSnapshot, transcript)
    finalActions = evalResult.actions
    evaluatorCorrections = evalResult.corrections
    evaluatorInputTokens = Math.round(evalResult.tokensUsed * 0.75)
    evaluatorOutputTokens = evalResult.tokensUsed - evaluatorInputTokens
  }

  const preResolved = preResolveActions(finalActions, data.contacts, data.goals)
  const actions = preResolved.map(({ action: a }) => ({
    ...a,
    tier: confidenceToTier(a.confidence, a.kind),
  }))

  const metadata: ObservabilityMetadata = {
    extractionMs,
    totalMs: Date.now() - requestStart,
    extractionInputTokens: extractionResponse.usage.input_tokens,
    extractionOutputTokens: extractionResponse.usage.output_tokens,
    evaluatorInputTokens,
    evaluatorOutputTokens,
    evaluatorCorrections,
    domainsDetected: [...domains],
  }

  const emptyExecution: ExecutionResult = { applied: [], failed: [], sessionId: '' }

  if (mode === 'preview') {
    return {
      actions,
      summary: parsed.summary,
      mode,
      preResolved,
      applied: [],
      pending: actions,
      execution: emptyExecution,
      metadata,
    }
  }

  const toApply = actionsForApplyMode(actions, mode)
  const execution = toApply.length > 0
    ? await executeActions(toApply, transcript, parsed.summary, metadata, storage)
    : emptyExecution

  const applied = execution.applied.map(({ action }) => action)
  const pending = pendingActions(actions, applied, mode)

  return {
    actions,
    summary: parsed.summary,
    mode,
    preResolved,
    applied,
    pending,
    execution,
    metadata,
  }
}

export function getAnthropicApiKey(): string {
  return requireEnv('ANTHROPIC_API_KEY')
}
