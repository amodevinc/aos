import type { CaptureAction, ConfidenceTier } from './types'

/** Ensures create_contact runs before log_interaction for the same person. */
const KIND_ORDER: Record<CaptureAction['kind'], number> = {
  create_contact: 0,
  update_contact: 1,
  log_interaction: 2,
  upsert_daily: 3,
  update_goal: 4,
  create_goal: 5,
  create_decision: 6,
  update_weekly: 7,
  update_compass: 8,
}

export function sortActionsForExecution(actions: CaptureAction[]): CaptureAction[] {
  return [...actions].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}

export function partitionActionsByTier(actions: CaptureAction[]): {
  auto: CaptureAction[]
  confirm: CaptureAction[]
  hold: CaptureAction[]
} {
  const auto: CaptureAction[] = []
  const confirm: CaptureAction[] = []
  const hold: CaptureAction[] = []
  for (const action of actions) {
    if (action.tier === 'auto') auto.push(action)
    else if (action.tier === 'confirm') confirm.push(action)
    else hold.push(action)
  }
  return { auto, confirm, hold }
}

export function actionsForApplyMode(
  actions: CaptureAction[],
  mode: 'preview' | 'auto_only' | 'all'
): CaptureAction[] {
  if (mode === 'preview') return []
  if (mode === 'all') return sortActionsForExecution(actions)
  return sortActionsForExecution(partitionActionsByTier(actions).auto)
}

export function pendingActions(
  actions: CaptureAction[],
  applied: CaptureAction[],
  mode: 'preview' | 'auto_only' | 'all'
): CaptureAction[] {
  if (mode === 'all') {
    const appliedSet = new Set(applied)
    return actions.filter((a) => !appliedSet.has(a))
  }
  if (mode === 'preview') return actions
  const { confirm, hold } = partitionActionsByTier(actions)
  return [...confirm, ...hold]
}

export function tierLabel(tier: ConfidenceTier): string {
  if (tier === 'auto') return 'Auto-applied'
  if (tier === 'confirm') return 'Needs confirmation'
  return 'Review required'
}
