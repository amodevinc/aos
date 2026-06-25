import type { CaptureResult } from './capture'
import { tierLabel } from '@/lib/agent/action-pipeline'
import { ACTION_LABELS } from '@/lib/agent/types'

export function compactJson(value: unknown): string {
  return JSON.stringify(value)
}

export function formatCaptureSummary(
  result: CaptureResult,
  options?: {
    captureId?: string
    vaultSync?: { filesWritten: number; exportedAt: string }
    includeFull?: boolean
  }
): string {
  const lines: string[] = []

  if (options?.captureId) {
    lines.push(`Capture ID: ${options.captureId} (use with apply_auto/apply_all to skip re-parsing)`)
  }

  lines.push(`Mode: ${result.mode}`, `Summary: ${result.summary}`, '')

  if (result.applied.length > 0) {
    lines.push('Applied:')
    for (const a of result.applied) {
      lines.push(`  ✓ ${ACTION_LABELS[a.kind]} (${tierLabel(a.tier)})`)
    }
    lines.push('')
  }

  if (result.pending.length > 0) {
    lines.push('Pending (apply via apply_actions or capture with capture_id):')
    for (const a of result.pending) {
      lines.push(`  • ${ACTION_LABELS[a.kind]} — ${tierLabel(a.tier)}`)
    }
    lines.push('')
  }

  if (result.execution.failed.length > 0) {
    lines.push('Failed:')
    for (const f of result.execution.failed) {
      lines.push(`  ✗ ${ACTION_LABELS[f.action.kind]}: ${f.error}`)
    }
    lines.push('')
  }

  const ambiguous = result.preResolved.filter((p) => p.resolution.status === 'ambiguous')
  if (ambiguous.length > 0) {
    lines.push('Disambiguation needed before apply:')
    for (const p of ambiguous) {
      if (p.resolution.status !== 'ambiguous') continue
      lines.push(`  ${p.resolution.name}: ${p.resolution.candidates.map((c) => c.label).join(' | ')}`)
    }
    lines.push('')
  }

  if (result.execution.sessionId) {
    lines.push(`Session: ${result.execution.sessionId} (undo_session to revert)`)
  }

  if (options?.vaultSync) {
    lines.push(`Vault synced: ${options.vaultSync.filesWritten} files at ${options.vaultSync.exportedAt}`)
  }

  if (options?.includeFull) {
    lines.push('', '---', compactJson(result))
  }

  return lines.join('\n')
}
