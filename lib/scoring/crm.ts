import type { Contact, ContactTier } from '@/types'

// ─── Relationship Health Score (0–100) ───────────────────────────────────────
//
// Health measures how well you're maintaining your stated cadence for each
// contact. It penalizes being overdue, weighted by tier — a Tier 1 contact
// going silent costs more than a Tier 3.
//
// Score bands:
//   100 — on time or ahead of schedule
//    80 — slightly overdue (< 25% past target)
//    60 — moderately overdue (25–75% past target)
//    30 — significantly overdue (75–150% past target)
//    10 — severely neglected (> 150% past target)
//     0 — prospect (no interaction expected yet) or never logged

export function computeRelationshipHealth(contact: Contact): number {
  if (contact.status === 'prospect') return -1  // -1 = N/A for prospects
  if (!contact.lastContactDate) return 0

  const now = Date.now()
  const lastMs = new Date(contact.lastContactDate).getTime()
  if (isNaN(lastMs)) return 0

  const daysSince = (now - lastMs) / 86_400_000
  const freq = contact.touchFrequencyDays || defaultFrequency(contact.tier)

  const ratio = daysSince / freq

  if (ratio <= 1.0) return 100
  if (ratio <= 1.25) return 80
  if (ratio <= 1.75) return 60
  if (ratio <= 2.50) return 30
  return 10
}

export function defaultFrequency(tier: ContactTier): number {
  if (tier === 1) return 21
  if (tier === 2) return 45
  return 90
}

// Days until the next touch is due (negative = overdue)
export function daysUntilDue(contact: Contact): number {
  if (!contact.lastContactDate) return -999
  const freq = contact.touchFrequencyDays || defaultFrequency(contact.tier)
  const daysSince = (Date.now() - new Date(contact.lastContactDate).getTime()) / 86_400_000
  return Math.round(freq - daysSince)
}

// Average health across all active contacts
export function networkHealthScore(contacts: Contact[]): number {
  const active = contacts.filter((c) => c.status === 'active' && c.lastContactDate)
  if (active.length === 0) return 0
  const total = active.reduce((sum, c) => sum + computeRelationshipHealth(c), 0)
  return Math.round(total / active.length)
}

// Contacts that need attention, sorted by urgency (most overdue first, tier-weighted)
export function getTouchQueue(contacts: Contact[]): Contact[] {
  return contacts
    .filter((c) => c.status === 'active')
    .filter((c) => {
      const due = daysUntilDue(c)
      return due <= 7 || !c.lastContactDate  // due within 7 days or never contacted
    })
    .sort((a, b) => {
      // Primary: tier (1 first)
      if (a.tier !== b.tier) return a.tier - b.tier
      // Secondary: most overdue first
      return daysUntilDue(a) - daysUntilDue(b)
    })
}

export function healthColor(score: number): string {
  if (score < 0) return 'text-[#5a5a75]'       // prospect / N/A
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-blue-400'
  if (score >= 30) return 'text-yellow-400'
  return 'text-red-400'
}

export function healthBg(score: number): string {
  if (score < 0) return 'bg-[#1a1a22]'
  if (score >= 80) return 'bg-emerald-400/10'
  if (score >= 60) return 'bg-blue-400/10'
  if (score >= 30) return 'bg-yellow-400/10'
  return 'bg-red-400/10'
}

export const RELATIONSHIP_LABELS: Record<string, string> = {
  mentor: 'Mentor',
  peer: 'Peer / Builder',
  collaborator: 'Collaborator',
  investor: 'Investor / VC',
  advisor: 'Advisor',
  client: 'Client',
  connector: 'Connector',
  other: 'Other',
}

export const TIER_META: Record<number, { label: string; color: string; description: string }> = {
  1: { label: 'Tier 1', color: 'text-indigo-400', description: 'Critical — mentors, key investors, close collaborators' },
  2: { label: 'Tier 2', color: 'text-blue-400', description: 'Important — strong network contacts' },
  3: { label: 'Tier 3', color: 'text-[#6b6b88]', description: 'Peripheral — valuable but lower priority' },
}

export const SENTIMENT_META: Record<string, { label: string; color: string }> = {
  great: { label: 'Great', color: 'text-emerald-400' },
  good: { label: 'Good', color: 'text-blue-400' },
  neutral: { label: 'Neutral', color: 'text-[#6b6b88]' },
  difficult: { label: 'Difficult', color: 'text-orange-400' },
}
