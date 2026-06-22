import type { DailyEntry, Goal, Decision, WeeklyReview, LifeCompass, Contact } from '@/types'
import { computeStreak, rollingAverage } from '@/lib/scoring/daily'
import { computePillarScores } from '@/lib/scoring/weekly'
import { networkHealthScore, getTouchQueue, TIER_META, RELATIONSHIP_LABELS } from '@/lib/scoring/crm'
import { getWeekRange, todayISO, PILLAR_META, PILLARS, formatDate } from '@/lib/utils'

// Build a rich context string from all AOS data that gets injected into the
// AI system prompt. The goal is to give the AI coach genuine situational
// awareness — specific numbers, patterns, and stated intentions — so it can
// coach precisely rather than generically.

export function buildAOSContext(data: {
  allEntries: DailyEntry[]
  goals: Goal[]
  decisions: Decision[]
  weeklyReviews: WeeklyReview[]
  contacts?: Contact[]
  compass: LifeCompass
}): string {
  const { allEntries, goals, decisions, weeklyReviews, compass, contacts = [] } = data
  const today = todayISO()
  const { start: weekStart, end: weekEnd } = getWeekRange()

  const todayEntry = allEntries.find((e) => e.date === today)
  const recentEntries = allEntries
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)
  const weekEntries = allEntries.filter(
    (e) => e.date >= weekStart && e.date <= weekEnd
  )

  const scores = allEntries
    .filter((e) => e.alignmentScore !== undefined)
    .map((e) => e.alignmentScore!)
  const streak = computeStreak(allEntries)
  const avgLast30 = rollingAverage(
    allEntries
      .filter((e) => e.alignmentScore !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)
      .map((e) => e.alignmentScore!)
  )
  const pillarScores = computePillarScores(weekEntries)

  const activeGoals = goals.filter((g) => g.status === 'active')
  const recentDecisions = decisions
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
  const lastReview = weeklyReviews.sort((a, b) =>
    b.weekStart.localeCompare(a.weekStart)
  )[0]

  const parts: string[] = []

  // ── Identity & Mission
  parts.push('=== IDENTITY & MISSION ===')
  if (compass.missionStatement) parts.push(`Mission: ${compass.missionStatement}`)
  if (compass.identityStatement) parts.push(`Identity: ${compass.identityStatement}`)
  if (compass.currentSeason) parts.push(`Current season: ${compass.currentSeason}`)
  if (compass.tenYearVision) parts.push(`10-year vision: ${compass.tenYearVision}`)
  if (compass.threeYearMission) parts.push(`3-year mission: ${compass.threeYearMission}`)
  if (compass.coreValues.length > 0)
    parts.push(`Core values: ${compass.coreValues.join(', ')}`)
  if (compass.personalRules.length > 0)
    parts.push(`Personal rules: ${compass.personalRules.join(' | ')}`)
  if (compass.antiRules.length > 0)
    parts.push(`Anti-rules (never do): ${compass.antiRules.join(' | ')}`)
  if (compass.nonNegotiables.length > 0)
    parts.push(`Non-negotiables: ${compass.nonNegotiables.join(' | ')}`)

  // ── Performance summary
  parts.push('\n=== PERFORMANCE SUMMARY ===')
  parts.push(`Today: ${today}`)
  parts.push(`Current streak: ${streak} day${streak !== 1 ? 's' : ''}`)
  parts.push(`Average alignment (last 30 days): ${avgLast30}/100`)
  parts.push('Pillar scores this week:')
  PILLARS.forEach((p) => {
    parts.push(`  ${PILLAR_META[p].label}: ${pillarScores[p]}/100`)
  })

  // ── Today
  parts.push('\n=== TODAY ===')
  if (todayEntry?.morning) {
    const m = todayEntry.morning
    parts.push(`Top 3 priorities: ${m.top3Priorities.filter(Boolean).join(' | ')}`)
    parts.push(`Health action: ${m.healthAction}`)
    parts.push(`Capability action: ${m.capabilityAction}`)
    parts.push(`Network action: ${m.networkAction}`)
    parts.push(`Wealth action: ${m.wealthAction}`)
    parts.push(`Identity statement: ${m.identityStatement}`)
    parts.push(`Biggest risk today: ${m.biggestRisk}`)
  } else {
    parts.push('No morning plan recorded today.')
  }
  if (todayEntry?.evening) {
    const e = todayEntry.evening
    parts.push(`Evening review completed. Score: ${todayEntry.alignmentScore}/100`)
    parts.push(
      `Execution: train=${e.didTrain} eat=${e.didEatWell} recover=${e.didRecover} learn=${e.didLearn} project=${e.didMoveProject} network=${e.didStrengthenRelationship} value=${e.didCreateValue} focus=${e.didAvoidDistractions} aligned=${e.didActInAlignment}`
    )
    if (e.biggestWin) parts.push(`Win: ${e.biggestWin}`)
    if (e.biggestMistake) parts.push(`Mistake: ${e.biggestMistake}`)
    if (e.lessonLearned) parts.push(`Lesson: ${e.lessonLearned}`)
  }

  // ── Recent days pattern
  parts.push('\n=== RECENT DAILY SCORES ===')
  recentEntries.slice(0, 7).forEach((e) => {
    const score = e.alignmentScore !== undefined ? `${e.alignmentScore}/100` : 'no review'
    parts.push(`  ${e.date}: ${score}`)
  })

  // ── Active goals
  parts.push('\n=== ACTIVE GOALS ===')
  if (activeGoals.length === 0) {
    parts.push('No active goals.')
  } else {
    activeGoals.forEach((g) => {
      parts.push(
        `[${PILLAR_META[g.pillar].label}] ${g.title} — ${g.progress}% — Due: ${g.deadline || 'no deadline'}`
      )
      if (g.nextAction) parts.push(`  Next action: ${g.nextAction}`)
      if (g.whyItMatters) parts.push(`  Why: ${g.whyItMatters}`)
    })
  }

  // ── Recent decisions
  if (recentDecisions.length > 0) {
    parts.push('\n=== RECENT DECISIONS ===')
    recentDecisions.forEach((d) => {
      parts.push(
        `${d.title} — Score: ${d.compositeScore}/100 — ${d.recommendation.toUpperCase()}`
      )
      if (d.outcome) parts.push(`  Outcome: ${d.outcome}`)
    })
  }

  // ── Last weekly review
  if (lastReview) {
    parts.push('\n=== LAST WEEKLY REVIEW ===')
    parts.push(`Week of ${lastReview.weekStart} — Score: ${lastReview.weeklyScore}/100`)
    if (lastReview.whatCreatedLeverage)
      parts.push(`Leverage created: ${lastReview.whatCreatedLeverage}`)
    if (lastReview.whatWastedTime)
      parts.push(`Time wasted: ${lastReview.whatWastedTime}`)
    if (lastReview.whatDoubleDown)
      parts.push(`Double down: ${lastReview.whatDoubleDown}`)
    if (lastReview.whatEliminate)
      parts.push(`Eliminate: ${lastReview.whatEliminate}`)
    if (lastReview.mainFocusNextWeek)
      parts.push(`Next week focus: ${lastReview.mainFocusNextWeek}`)
  }

  // ── Network / CRM
  if (contacts.length > 0) {
    const activeContacts = contacts.filter((c) => c.status === 'active')
    const tier1 = contacts.filter((c) => c.tier === 1)
    const networkHealth = networkHealthScore(activeContacts)
    const overdue = getTouchQueue(contacts)

    parts.push('\n=== NETWORK ===')
    parts.push(`Total contacts: ${contacts.length} (${activeContacts.length} active)`)
    parts.push(`Network health score: ${networkHealth}/100`)
    parts.push(`Tier 1 contacts: ${tier1.length}`)

    if (tier1.length > 0) {
      parts.push('Tier 1 relationships:')
      tier1.forEach((c) => {
        parts.push(
          `  ${c.name} — ${RELATIONSHIP_LABELS[c.relationship]}${c.company ? ` at ${c.company}` : ''}${c.lastContactDate ? ` — last contact: ${c.lastContactDate}` : ' — never contacted'}`
        )
      })
    }

    if (overdue.length > 0) {
      parts.push(`Overdue for contact (${overdue.length}):`)
      overdue.slice(0, 5).forEach((c) => {
        parts.push(`  ${c.name} (T${c.tier}) — ${TIER_META[c.tier].label}`)
      })
    }
  }

  return parts.join('\n')
}
