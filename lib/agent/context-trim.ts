import type { Contact, DailyEntry, Decision, Goal, LifeCompass, WeeklyReview } from '@/types'
import { buildAOSContext } from '@/lib/ai/context'
import { getTouchQueue } from '@/lib/scoring/crm'
import { PILLAR_META, todayISO, getWeekRange } from '@/lib/utils'
import { computeStreak, rollingAverage } from '@/lib/scoring/daily'

// ─── Domain classification ────────────────────────────────────────────────────

export type CaptureDomain = 'identity' | 'daily' | 'crm' | 'goals' | 'decisions' | 'weekly' | 'compass'

const DOMAIN_PATTERNS: Record<Exclude<CaptureDomain, 'identity'>, RegExp> = {
  daily: /\b(today|tonight|train|gym|workout|run|ran|swim|swam|lift|lifted|yoga|steps|ate|eat|meal|sleep|slept|rest|recover|nap|meditat|learn|study|read|built|shipped|launched|deployed|wrote|coded|finish|shipped|win|mistake|lesson|morning|evening|priority|focus|distract|scroll|aligned|alignment|proud|productive)\b/i,
  crm: /\b(meet|met|meeting|call|called|coffee|lunch|dinner|breakfast|email|message|text|spoke|talked|chat|intro|introduced|connected|follow.?up|network|contact|colleague|partner|investor|mentor|client|with [A-Z])\b/i,
  goals: /\b(goal|target|progress|milestone|percent|%|complete|completed|finish|finished|achieve|achieved|pausing|pause|abandon|track|objective|moved to|set to)\b/i,
  decisions: /\b(decide|decision|thinking about|weighing|considering|should i|trade.?off|opportunity|risk|commit|option|choice|dilemma)\b/i,
  weekly: /\b(week|weekly|this week|last week|review|monthly|quarter)\b/i,
  compass: /\b(mission|values|vision|identity statement|purpose|rules|non-negotiable|principles|season of life)\b/i,
}

export function classifyDomains(transcript: string): Set<CaptureDomain> {
  const domains = new Set<CaptureDomain>(['identity'])
  for (const [domain, pattern] of Object.entries(DOMAIN_PATTERNS)) {
    if (pattern.test(transcript)) domains.add(domain as CaptureDomain)
  }
  // Fallback: if nothing detected, assume daily + CRM
  if (domains.size === 1) {
    domains.add('daily')
    domains.add('crm')
  }
  return domains
}

// ─── Trimmed context builder ──────────────────────────────────────────────────
// Sends only the sections the agent actually needs for this capture.
// Much smaller than buildAOSContext() — reduces token cost and improves focus.

export interface CaptureContextData {
  allEntries: DailyEntry[]
  goals: Goal[]
  decisions: Decision[]
  weeklyReviews: WeeklyReview[]
  contacts: Contact[]
  compass: LifeCompass
}

export function buildTrimmedContext(
  data: CaptureContextData,
  domains: Set<CaptureDomain>,
  options?: { transcript?: string; maxContacts?: number }
): string {
  const { allEntries, goals, decisions, weeklyReviews, compass, contacts } = data
  const today = todayISO()
  const parts: string[] = []

  // Identity — always included, kept minimal
  parts.push('=== IDENTITY ===')
  if (compass.missionStatement) parts.push(`Mission: ${compass.missionStatement}`)
  if (compass.currentSeason) parts.push(`Season: ${compass.currentSeason}`)
  if (compass.coreValues.length) parts.push(`Values: ${compass.coreValues.join(', ')}`)

  // Daily
  if (domains.has('daily')) {
    const sorted = [...allEntries].sort((a, b) => b.date.localeCompare(a.date))
    const todayEntry = sorted.find((e) => e.date === today)
    const scored = sorted.filter((e) => e.alignmentScore !== undefined)
    const streak = computeStreak(allEntries)
    const avg7 = rollingAverage(scored.slice(0, 7).map((e) => e.alignmentScore!))

    parts.push('\n=== TODAY ===')
    parts.push(`Date: ${today} | Streak: ${streak}d | 7d avg: ${avg7}/100`)

    if (todayEntry?.morning) {
      const m = todayEntry.morning
      const p = m.top3Priorities.filter(Boolean).join(' | ')
      if (p) parts.push(`Morning priorities: ${p}`)
    } else {
      parts.push('No morning plan logged.')
    }

    if (todayEntry?.evening) {
      const e = todayEntry.evening
      parts.push(`Evening review ALREADY LOGGED today (score: ${todayEntry.alignmentScore}/100). Only update fields explicitly mentioned in the capture — do not overwrite existing true values with false.`)
      const done = Object.entries(e).filter(([k, v]) => k.startsWith('did') && v === true).map(([k]) => k)
      if (done.length) parts.push(`Already marked true: ${done.join(', ')}`)
    } else {
      parts.push('No evening review yet.')
    }
  }

  // CRM — tier-1, overdue, and transcript matches (not full list)
  if (domains.has('crm')) {
    const maxContacts = options?.maxContacts ?? 40
    const selected = selectContactsForContext(contacts, options?.transcript, maxContacts)
    parts.push('\n=== CONTACTS (for name matching) ===')
    parts.push(`Showing ${selected.length} of ${contacts.length} contacts (tier-1, overdue, mentioned in input)`)
    if (selected.length === 0) {
      parts.push('  No contacts yet.')
    } else {
      for (const c of selected) {
        const row: string[] = [`"${c.name}"`]
        if (c.role) row.push(c.role)
        if (c.company) row.push(`@ ${c.company}`)
        row.push(`T${c.tier}`)
        if (c.lastContactDate) row.push(`last: ${c.lastContactDate}`)
        parts.push(`  ${row.join(' · ')}`)
      }
    }
  }

  // Goals — active goals with IDs for update matching
  if (domains.has('goals')) {
    const active = goals.filter((g) => g.status === 'active')
    parts.push('\n=== ACTIVE GOALS (for matching) ===')
    if (active.length === 0) {
      parts.push('No active goals.')
    } else {
      active.forEach((g) => {
        parts.push(`  [${PILLAR_META[g.pillar].label}] "${g.title}" — ${g.progress}% complete`)
        if (g.nextAction) parts.push(`    Next action: ${g.nextAction}`)
      })
    }
  }

  // Decisions — recent titles to avoid duplicates
  if (domains.has('decisions')) {
    const recent = [...decisions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
    parts.push('\n=== RECENT DECISIONS ===')
    recent.forEach((d) => parts.push(`  "${d.title}" — ${d.compositeScore}/100 (${d.recommendation})`))
  }

  // Weekly — latest review for context
  if (domains.has('weekly')) {
    const { start } = getWeekRange()
    const latest = weeklyReviews.find((r) => r.weekStart === start) ?? weeklyReviews[0]
    if (latest) {
      parts.push('\n=== CURRENT WEEK REVIEW ===')
      parts.push(`Week: ${latest.weekStart} — Score: ${latest.weeklyScore}/100`)
      if (latest.mainFocusNextWeek) parts.push(`Focus: ${latest.mainFocusNextWeek}`)
    }
  }

  // Compass — full detail when explicitly updating
  if (domains.has('compass')) {
    parts.push('\n=== LIFE COMPASS (current) ===')
    if (compass.missionStatement) parts.push(`Mission: ${compass.missionStatement}`)
    if (compass.tenYearVision) parts.push(`10yr vision: ${compass.tenYearVision}`)
    if (compass.threeYearMission) parts.push(`3yr mission: ${compass.threeYearMission}`)
    if (compass.personalRules.length) parts.push(`Rules: ${compass.personalRules.join(' | ')}`)
    if (compass.antiRules.length) parts.push(`Anti-rules: ${compass.antiRules.join(' | ')}`)
    if (compass.nonNegotiables.length) parts.push(`Non-negotiables: ${compass.nonNegotiables.join(' | ')}`)
    if (compass.identityStatement) parts.push(`Identity: ${compass.identityStatement}`)
  }

  return parts.join('\n')
}

// ─── Minimal state snapshot for evaluator ────────────────────────────────────
// Only what the evaluator needs to check for conflicts — not the full data.

export interface StateSnapshot {
  contacts: Array<{ id: string; name: string; lastContactDate: string }>
  goals: Array<{ id: string; title: string; progress: number; status: string }>
  todayEvening: Record<string, unknown> | null
}

export function buildStateSnapshot(data: CaptureContextData): StateSnapshot {
  const today = todayISO()
  const sorted = [...data.allEntries].sort((a, b) => b.date.localeCompare(a.date))
  const todayEntry = sorted.find((e) => e.date === today)

  return {
    contacts: data.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      lastContactDate: c.lastContactDate ?? '',
    })),
    goals: data.goals.map((g) => ({
      id: g.id,
      title: g.title,
      progress: g.progress,
      status: g.status,
    })),
    todayEvening: todayEntry?.evening ? (todayEntry.evening as unknown as Record<string, unknown>) : null,
  }
}

// ─── Focused context for MCP / CLI reads ─────────────────────────────────────

export type ContextFocus = 'full' | 'today' | 'crm' | 'goals' | 'minimal'

const FOCUS_DOMAINS: Record<Exclude<ContextFocus, 'full'>, Set<CaptureDomain>> = {
  today: new Set(['identity', 'daily', 'goals']),
  crm: new Set(['identity', 'crm']),
  goals: new Set(['identity', 'goals']),
  minimal: new Set(['identity']),
}

export function buildFocusedContext(data: CaptureContextData, focus: ContextFocus = 'full'): string {
  if (focus === 'full') {
    return buildAOSContext({
      allEntries: data.allEntries,
      goals: data.goals,
      decisions: data.decisions,
      weeklyReviews: data.weeklyReviews,
      contacts: data.contacts,
      compass: data.compass,
    })
  }
  return buildTrimmedContext(data, FOCUS_DOMAINS[focus], { maxContacts: focus === 'crm' ? 50 : 25 })
}

function normName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Tier-1, overdue, transcript mentions — capped for token efficiency. */
export function selectContactsForContext(
  contacts: Contact[],
  transcript?: string,
  max = 40
): Contact[] {
  if (contacts.length === 0) return []

  const seen = new Set<string>()
  const out: Contact[] = []

  const add = (c: Contact) => {
    if (seen.has(c.id) || out.length >= max) return
    seen.add(c.id)
    out.push(c)
  }

  for (const c of contacts.filter((x) => x.tier === 1)) add(c)
  for (const c of getTouchQueue(contacts).slice(0, 8)) add(c)

  if (transcript?.trim()) {
    const hay = normName(transcript)
    for (const c of contacts) {
      const name = normName(c.name)
      const words = name.split(' ').filter((w) => w.length > 2)
      if (words.some((w) => hay.includes(w)) || hay.includes(name)) add(c)
    }
  }

  for (const c of contacts.filter((x) => x.tier === 2 && x.status === 'active')) add(c)

  return out
}
