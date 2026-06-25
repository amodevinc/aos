import type { Contact, Goal } from '@/types'
import type { CaptureAction } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Candidate {
  id: string
  label: string
}

export type EntityResolution =
  | { status: 'resolved'; id: string }
  | { status: 'ambiguous'; name: string; entityType: 'contact' | 'goal'; candidates: Candidate[] }
  | { status: 'not_found'; name: string; entityType: 'contact' | 'goal' }
  | { status: 'na' }  // action doesn't need entity resolution

export interface PreResolvedAction {
  action: CaptureAction     // payload updated with resolved id where unambiguous
  resolution: EntityResolution
}

// ─── Matching helpers ─────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

function contactCandidates(contacts: Contact[], name: string): Contact[] {
  const needle = norm(name)
  const exact = contacts.find((c) => norm(c.name) === needle)
  if (exact) return [exact]

  const words = needle.split(' ').filter(Boolean)
  return contacts.filter((c) => {
    const hay = norm(c.name)
    return words.some((w) => hay.includes(w))
  })
}

function goalCandidates(goals: Goal[], titleHint: string): Goal[] {
  const needle = norm(titleHint)
  const exact = goals.find((g) => norm(g.title) === needle)
  if (exact) return [exact]

  const words = needle.split(' ').filter(Boolean)
  return goals.filter((g) => {
    const hay = norm(g.title)
    return words.some((w) => hay.includes(w))
  })
}

function contactLabel(c: Contact): string {
  const parts = [c.name]
  if (c.company) parts.push(`@ ${c.company}`)
  parts.push(`(T${c.tier})`)
  return parts.join(' ')
}

function goalLabel(g: Goal): string {
  return `${g.title} · ${g.progress}% · ${g.pillar}`
}

// ─── Main function ────────────────────────────────────────────────────────────

export function preResolveActions(
  actions: CaptureAction[],
  contacts: Contact[],
  goals: Goal[]
): PreResolvedAction[] {
  return actions.map((action) => {
    // Actions that need contact resolution
    if (action.kind === 'log_interaction' || action.kind === 'update_contact') {
      if (action.payload.contactId) {
        // Already resolved (e.g., agent had access to ID)
        return { action, resolution: { status: 'resolved', id: action.payload.contactId } }
      }
      const name = action.payload.contactName
      const candidates = contactCandidates(contacts, name)

      if (candidates.length === 0) {
        return { action, resolution: { status: 'not_found', name, entityType: 'contact' } }
      }
      if (candidates.length === 1) {
        // Auto-resolve: patch the action payload with the resolved ID
        const resolved = { ...action, payload: { ...action.payload, contactId: candidates[0].id } }
        return { action: resolved as CaptureAction, resolution: { status: 'resolved', id: candidates[0].id } }
      }
      // Multiple candidates — need disambiguation
      return {
        action,
        resolution: {
          status: 'ambiguous',
          name,
          entityType: 'contact',
          candidates: candidates.slice(0, 5).map((c) => ({ id: c.id, label: contactLabel(c) })),
        },
      }
    }

    // Actions that need goal resolution
    if (action.kind === 'update_goal') {
      if (action.payload.goalId) {
        return { action, resolution: { status: 'resolved', id: action.payload.goalId } }
      }
      const title = action.payload.goalTitle ?? ''
      if (!title) {
        return { action, resolution: { status: 'not_found', name: '(no title)', entityType: 'goal' } }
      }
      const candidates = goalCandidates(goals, title)

      if (candidates.length === 0) {
        return { action, resolution: { status: 'not_found', name: title, entityType: 'goal' } }
      }
      if (candidates.length === 1) {
        const resolved = { ...action, payload: { ...action.payload, goalId: candidates[0].id } }
        return { action: resolved as CaptureAction, resolution: { status: 'resolved', id: candidates[0].id } }
      }
      return {
        action,
        resolution: {
          status: 'ambiguous',
          name: title,
          entityType: 'goal',
          candidates: candidates.slice(0, 5).map((g) => ({ id: g.id, label: goalLabel(g) })),
        },
      }
    }

    return { action, resolution: { status: 'na' } }
  })
}

// Patch a resolved action's payload with the user-chosen ID
export function resolveAction(
  preResolved: PreResolvedAction,
  chosenId: string
): PreResolvedAction {
  const { action } = preResolved
  let patched: CaptureAction

  if (action.kind === 'log_interaction' || action.kind === 'update_contact') {
    patched = { ...action, payload: { ...action.payload, contactId: chosenId } } as CaptureAction
  } else if (action.kind === 'update_goal') {
    patched = { ...action, payload: { ...action.payload, goalId: chosenId } } as CaptureAction
  } else {
    patched = action
  }

  return { action: patched, resolution: { status: 'resolved', id: chosenId } }
}
