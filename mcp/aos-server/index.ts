#!/usr/bin/env npx tsx
/**
 * AOS MCP server — talks to production API via device token (npm run aos:install).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { loadEnv } from '../../lib/agent-cli/env'
import { requireConfig } from '../../lib/agent-cli/config'
import {
  fetchContext,
  fetchDaily,
  fetchGoals,
  fetchDecisions,
  fetchWeekly,
  fetchCompass,
  searchContacts,
  captureTranscript,
  applyActions,
  undoCaptureSession,
} from '../../lib/agent-cli/api-client'
import { syncVaultMirror } from '../../lib/agent-cli/vault-sync'
import { compactJson, formatCaptureSummary } from '../../lib/agent-cli/mcp-format'
import { getPreview, storePreview, deletePreview } from '../../lib/agent-cli/preview-cache'
import { actionsForApplyMode, pendingActions } from '../../lib/agent/action-pipeline'
import type { CaptureApplyMode, CaptureResult } from '../../lib/agent-cli/capture'
import type { CaptureAction } from '../../lib/agent/types'

loadEnv()
requireConfig()

const server = new McpServer({ name: 'aos', version: '2.2.0' })

async function syncVaultAfterWrite(appliedCount: number): Promise<string | undefined> {
  if (appliedCount === 0) return undefined
  try {
    const sync = await syncVaultMirror()
    return `Vault synced: ${sync.filesWritten} files at ${sync.exportedAt}`
  } catch {
    return 'Vault sync failed — run sync_vault manually'
  }
}

async function applyFromCachedPreview(
  cached: CaptureResult,
  transcript: string,
  mode: 'auto_only' | 'all'
): Promise<CaptureResult> {
  const toApply = actionsForApplyMode(cached.actions, mode)
  if (toApply.length === 0) {
    return {
      ...cached,
      mode,
      applied: [],
      pending: cached.actions,
      execution: { applied: [], failed: [], sessionId: '' },
    }
  }

  const execution = await applyActions(toApply, transcript, cached.summary)
  const applied = execution.applied.map(({ action }) => action)
  return {
    ...cached,
    mode,
    applied,
    pending: pendingActions(cached.actions, applied, mode),
    execution,
  }
}

server.tool(
  'get_context',
  'Live AOS context. Default focus=today (light). Use full only for deep reviews — costs many tokens.',
  {
    focus: z.enum(['full', 'today', 'crm', 'goals', 'minimal']).optional()
      .describe('today=identity+daily+goals (default). full=entire history (heavy).'),
  },
  async ({ focus }) => {
    const { context } = await fetchContext(focus ?? 'today')
    return { content: [{ type: 'text', text: context }] }
  }
)

server.tool('get_daily', 'Daily entry by date (YYYY-MM-DD). Defaults to today.', {
  date: z.string().optional(),
}, async ({ date }) => {
  const { entry } = await fetchDaily(date)
  return { content: [{ type: 'text', text: compactJson(entry) }] }
})

server.tool('list_goals', 'List goals.', {
  status: z.enum(['active', 'completed', 'paused', 'abandoned']).optional(),
}, async ({ status }) => {
  const { goals } = await fetchGoals(status)
  return { content: [{ type: 'text', text: compactJson(goals) }] }
})

server.tool('list_decisions', 'Recent decisions.', {
  limit: z.number().int().min(1).max(50).optional(),
}, async ({ limit }) => {
  const { decisions } = await fetchDecisions(limit ?? 10)
  return { content: [{ type: 'text', text: compactJson(decisions) }] }
})

server.tool('search_contacts', 'Search contacts by name.', {
  query: z.string(),
}, async ({ query }) => {
  const result = await searchContacts(query)
  return { content: [{ type: 'text', text: compactJson(result) }] }
})

server.tool('get_weekly', 'Weekly review(s).', {
  weekStart: z.string().optional(),
}, async ({ weekStart }) => {
  const result = await fetchWeekly(weekStart)
  return { content: [{ type: 'text', text: compactJson(result) }] }
})

server.tool('get_compass', 'Life compass (mission, values, rules).', {}, async () => {
  const { compass } = await fetchCompass()
  return { content: [{ type: 'text', text: compactJson(compass) }] }
})

server.tool('sync_vault', 'Sync ~/vault/aos/ mirror from live AOS data.', {}, async () => {
  const sync = await syncVaultMirror()
  return {
    content: [{
      type: 'text',
      text: `Synced ${sync.filesWritten} files to ${sync.vaultPath}/aos/ at ${sync.exportedAt}`,
    }],
  }
})

server.tool(
  'capture',
  'Parse NL into AOS actions. Default: preview only (no writes, no DB cost for apply). Use capture_id with apply_auto to avoid re-parsing.',
  {
    transcript: z.string().optional().describe('Required for preview; omit when using capture_id to apply'),
    preview: z.boolean().optional().describe('Default true — no writes'),
    apply_auto: z.boolean().optional().describe('Apply auto-tier actions. Use capture_id from preview to skip re-parsing.'),
    apply_all: z.boolean().optional().describe('Apply all tiers. Only with explicit user approval.'),
    capture_id: z.string().optional().describe('From a prior preview — avoids a second LLM parse'),
    force_reparse: z.boolean().optional().describe('Re-run LLM parse on apply (default false — use capture_id instead)'),
    include_full: z.boolean().optional().describe('Include full JSON in response (default false, saves tokens)'),
  },
  async ({ transcript, preview, apply_auto, apply_all, capture_id, force_reparse, include_full }) => {
    let applyMode: CaptureApplyMode = 'preview'
    if (apply_all) applyMode = 'all'
    else if (apply_auto || preview === false) applyMode = 'auto_only'

    if (applyMode !== 'preview' && !capture_id && !force_reparse) {
      return {
        content: [{
          type: 'text',
          text: 'To apply without re-parsing, pass capture_id from preview. Or set force_reparse=true to run the agent again.',
        }],
      }
    }

    // Apply from cached preview — no second LLM call
    if (capture_id && applyMode !== 'preview') {
      const cached = getPreview(capture_id)
      if (!cached) {
        return {
          content: [{
            type: 'text',
            text: `Capture ID "${capture_id}" expired or not found. Run capture preview again.`,
          }],
        }
      }

      const result = await applyFromCachedPreview(cached.result, cached.transcript, applyMode)
      const vaultSync = result.applied.length > 0
        ? await syncVaultMirror().catch(() => null)
        : null
      if (applyMode === 'all' || result.pending.length === 0) {
        deletePreview(capture_id)
      }

      return {
        content: [{
          type: 'text',
          text: formatCaptureSummary(result, {
            captureId: result.pending.length > 0 ? capture_id : undefined,
            vaultSync: vaultSync ?? undefined,
            includeFull: include_full,
          }),
        }],
      }
    }

    if (!transcript?.trim()) {
      return {
        content: [{
          type: 'text',
          text: 'transcript is required for preview (or pass capture_id with apply_auto/apply_all)',
        }],
      }
    }

    const result = await captureTranscript(transcript, { applyMode })

    let captureId: string | undefined
    if (applyMode === 'preview') {
      captureId = storePreview(result, transcript)
    }

    const vaultSync = applyMode !== 'preview' && result.applied.length > 0
      ? await syncVaultMirror().catch(() => null)
      : null

    return {
      content: [{
        type: 'text',
        text: formatCaptureSummary(result, {
          captureId,
          vaultSync: vaultSync ?? undefined,
          includeFull: include_full,
        }),
      }],
    }
  }
)

server.tool(
  'apply_actions',
  'Apply user-approved CaptureAction[] — no LLM cost. Prefer over capture(apply_auto) when you already have actions from preview.',
  {
    actions: z.array(z.record(z.string(), z.unknown())),
    transcript: z.string().optional(),
    summary: z.string().optional(),
  },
  async ({ actions, transcript, summary }) => {
    const result = await applyActions(actions as unknown as CaptureAction[], transcript, summary)
    const vaultNote = await syncVaultAfterWrite(result.applied.length)
    const text = [
      `Applied ${result.applied.length} action(s).`,
      result.failed.length > 0 ? `Failed: ${result.failed.map((f) => f.error).join('; ')}` : '',
      result.sessionId ? `Session: ${result.sessionId}` : '',
      vaultNote ?? '',
    ].filter(Boolean).join('\n')
    return { content: [{ type: 'text', text }] }
  }
)

server.tool('undo_session', 'Undo a capture session.', {
  session_id: z.string(),
}, async ({ session_id }) => {
  await undoCaptureSession(session_id)
  const vaultNote = await syncVaultAfterWrite(1)
  return {
    content: [{
      type: 'text',
      text: `Session ${session_id} undone.${vaultNote ? `\n${vaultNote}` : ''}`,
    }],
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('AOS MCP server failed:', err)
  process.exit(1)
})
