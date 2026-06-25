import type { DailyEntry, Goal, Decision, WeeklyReview, LifeCompass, Contact } from '@/types'
import { computeStreak, rollingAverage } from '@/lib/scoring/daily'
import { computePillarScores } from '@/lib/scoring/weekly'
import { networkHealthScore, getTouchQueue, TIER_META, RELATIONSHIP_LABELS } from '@/lib/scoring/crm'
import { getWeekRange, todayISO, PILLAR_META, PILLARS } from '@/lib/utils'

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

  // Sort entries descending once — reused throughout
  const entriesByDate = [...allEntries].sort((a, b) => b.date.localeCompare(a.date))
  const todayEntry = entriesByDate.find((e) => e.date === today)
  const weekEntries = allEntries.filter((e) => e.date >= weekStart && e.date <= weekEnd)

  const scoredEntries = entriesByDate.filter((e) => e.alignmentScore !== undefined)
  const streak = computeStreak(allEntries)
  const avgLast30 = rollingAverage(scoredEntries.slice(0, 30).map((e) => e.alignmentScore!))
  const avgLast7 = rollingAverage(scoredEntries.slice(0, 7).map((e) => e.alignmentScore!))
  const pillarScores = computePillarScores(weekEntries)

  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status === 'completed').length
  const recentDecisions = [...decisions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)

  // Last 4 weekly reviews for trend visibility
  const reviews = [...weeklyReviews]
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, 4)

  const parts: string[] = []

  // ── Identity & Mission ────────────────────────────────────────────────────────
  parts.push('=== IDENTITY & MISSION ===')
  if (compass.missionStatement) parts.push(`Mission: ${compass.missionStatement}`)
  if (compass.identityStatement) parts.push(`Identity: ${compass.identityStatement}`)
  if (compass.currentSeason) parts.push(`Current season: ${compass.currentSeason}`)
  if (compass.tenYearVision) parts.push(`10-year vision: ${compass.tenYearVision}`)
  if (compass.threeYearMission) parts.push(`3-year mission: ${compass.threeYearMission}`)
  if (compass.coreValues.length > 0) parts.push(`Core values: ${compass.coreValues.join(', ')}`)
  if (compass.personalRules.length > 0) parts.push(`Rules: ${compass.personalRules.join(' | ')}`)
  if (compass.antiRules.length > 0) parts.push(`Anti-rules: ${compass.antiRules.join(' | ')}`)
  if (compass.nonNegotiables.length > 0) parts.push(`Non-negotiables: ${compass.nonNegotiables.join(' | ')}`)

  // ── Performance summary ───────────────────────────────────────────────────────
  parts.push('\n=== PERFORMANCE SUMMARY ===')
  parts.push(`Today: ${today}`)
  parts.push(`Streak: ${streak} day${streak !== 1 ? 's' : ''}`)
  parts.push(`Avg alignment — last 7 days: ${avgLast7}/100`)
  parts.push(`Avg alignment — last 30 days: ${avgLast30}/100`)
  parts.push(`Total days logged: ${scoredEntries.length}`)
  parts.push(`Goals completed all-time: ${completedGoals}`)
  parts.push('Pillar scores this week:')
  PILLARS.forEach((p) => parts.push(`  ${PILLAR_META[p].label}: ${pillarScores[p]}/100`))

  // ── Computed patterns ─────────────────────────────────────────────────────────
  // These surface trends the raw numbers don't — the coach should reference them.
  parts.push('\n=== PATTERNS (computed) ===')
  const patterns = computePatterns(scoredEntries, allEntries, pillarScores)
  if (patterns.length > 0) {
    patterns.forEach((p) => parts.push(`- ${p}`))
  } else {
    parts.push('Not enough data yet to detect patterns.')
  }

  // ── Today ─────────────────────────────────────────────────────────────────────
  parts.push('\n=== TODAY ===')
  if (todayEntry?.morning) {
    const m = todayEntry.morning
    parts.push(`Top 3 priorities: ${m.top3Priorities.filter(Boolean).join(' | ')}`)
    if (m.healthAction) parts.push(`Health action: ${m.healthAction}`)
    if (m.capabilityAction) parts.push(`Capability action: ${m.capabilityAction}`)
    if (m.networkAction) parts.push(`Network action: ${m.networkAction}`)
    if (m.wealthAction) parts.push(`Wealth action: ${m.wealthAction}`)
    if (m.identityStatement) parts.push(`Identity statement: ${m.identityStatement}`)
    if (m.biggestRisk) parts.push(`Biggest risk today: ${m.biggestRisk}`)
  } else {
    parts.push('No morning plan recorded today.')
  }
  if (todayEntry?.evening) {
    const e = todayEntry.evening
    parts.push(`Evening score: ${todayEntry.alignmentScore}/100`)
    const checks = [
      e.didTrain && 'trained',
      e.didEatWell && 'ate well',
      e.didRecover && 'recovered',
      e.didLearn && 'learned/built',
      e.didMoveProject && 'moved a project',
      e.didStrengthenRelationship && 'strengthened a relationship',
      e.didCreateValue && 'created value',
      e.didAvoidDistractions && 'avoided distractions',
      e.didActInAlignment && 'acted in alignment',
    ].filter(Boolean)
    const missed = [
      !e.didTrain && 'did NOT train',
      !e.didLearn && 'did NOT learn/build',
      !e.didMoveProject && 'did NOT move a project',
      !e.didCreateValue && 'did NOT create value',
      !e.didActInAlignment && 'did NOT act in alignment',
    ].filter(Boolean)
    if (checks.length > 0) parts.push(`Done: ${checks.join(', ')}`)
    if (missed.length > 0) parts.push(`Missed: ${missed.join(', ')}`)
    if (e.biggestWin) parts.push(`Win: ${e.biggestWin}`)
    if (e.biggestMistake) parts.push(`Mistake: ${e.biggestMistake}`)
    if (e.lessonLearned) parts.push(`Lesson: ${e.lessonLearned}`)
    if (e.adjustmentTomorrow) parts.push(`Tomorrow adjustment: ${e.adjustmentTomorrow}`)
  }

  // ── Recent daily scores (14 days) ────────────────────────────────────────────
  parts.push('\n=== RECENT SCORES (14 days) ===')
  entriesByDate.slice(0, 14).forEach((e) => {
    const score = e.alignmentScore !== undefined ? `${e.alignmentScore}/100` : 'no review'
    parts.push(`  ${e.date}: ${score}`)
  })

  // ── Active goals ─────────────────────────────────────────────────────────────
  parts.push('\n=== ACTIVE GOALS ===')
  if (activeGoals.length === 0) {
    parts.push('No active goals.')
  } else {
    activeGoals.forEach((g) => {
      parts.push(`[${PILLAR_META[g.pillar].label}] ${g.title} — ${g.progress}% — Due: ${g.deadline || 'no deadline'}`)
      if (g.description) parts.push(`  Description: ${g.description}`)
      if (g.whyItMatters) parts.push(`  Why: ${g.whyItMatters}`)
      if (g.nextAction) parts.push(`  Next action: ${g.nextAction}`)
    })
  }

  // ── Recent decisions (with full dimension breakdown) ──────────────────────────
  if (recentDecisions.length > 0) {
    parts.push('\n=== RECENT DECISIONS ===')
    recentDecisions.forEach((d) => {
      parts.push(`${d.title} — Score: ${d.compositeScore}/100 — ${d.recommendation.toUpperCase()}`)
      if (d.description) parts.push(`  Context: ${d.description}`)
      // Dimension breakdown — critical for the coach to understand why a decision scored the way it did
      parts.push(
        `  Dimensions: health=${d.scores.healthImpact} capability=${d.scores.capabilityImpact} network=${d.scores.networkImpact} wealth=${d.scores.wealthImpact} mission=${d.scores.missionAlignment} leverage=${d.scores.longTermLeverage} time=${d.scores.timeRequirement} risk=${d.scores.risk} distraction=${d.scores.distractionRisk}`
      )
      if (d.mainUpside) parts.push(`  Upside: ${d.mainUpside}`)
      if (d.mainDownside) parts.push(`  Downside: ${d.mainDownside}`)
      if (d.outcome) parts.push(`  Actual outcome: ${d.outcome}`)
    })
  }

  // ── Weekly reviews (last 4) ───────────────────────────────────────────────────
  if (reviews.length > 0) {
    parts.push('\n=== WEEKLY REVIEW HISTORY ===')
    reviews.forEach((r, i) => {
      parts.push(`Week ${i === 0 ? '(latest)' : i === 1 ? '(prev)' : `(-${i})`}: ${r.weekStart} — Score: ${r.weeklyScore}/100`)
      parts.push(`  Pillars: H=${r.pillarScores.health} C=${r.pillarScores.capability} N=${r.pillarScores.network} W=${r.pillarScores.wealth} M=${r.pillarScores.mission}`)
      if (r.whatCreatedLeverage) parts.push(`  Leverage: ${r.whatCreatedLeverage}`)
      if (r.whatWastedTime) parts.push(`  Wasted: ${r.whatWastedTime}`)
      if (r.whatDoubleDown) parts.push(`  Double down: ${r.whatDoubleDown}`)
      if (r.whatEliminate) parts.push(`  Eliminate: ${r.whatEliminate}`)
      if (r.mainFocusNextWeek && i === 0) parts.push(`  This week's focus: ${r.mainFocusNextWeek}`)
    })
  }

  // ── Network ───────────────────────────────────────────────────────────────────
  if (contacts.length > 0) {
    const activeContacts = contacts.filter((c) => c.status === 'active')
    const tier1 = contacts.filter((c) => c.tier === 1)
    const networkHealth = networkHealthScore(activeContacts)
    const overdue = getTouchQueue(contacts)

    parts.push('\n=== NETWORK ===')
    parts.push(`Total contacts: ${contacts.length} (${activeContacts.length} active, ${contacts.filter((c) => c.status === 'prospect').length} prospects)`)
    parts.push(`Network health: ${networkHealth}/100`)
    parts.push(`Tier 1 contacts: ${tier1.length}`)

    if (tier1.length > 0) {
      parts.push('Tier 1:')
      tier1.forEach((c) => {
        const lastContact = c.lastContactDate ? ` — last: ${c.lastContactDate}` : ' — never contacted'
        parts.push(`  ${c.name} (${RELATIONSHIP_LABELS[c.relationship]}${c.company ? ` @ ${c.company}` : ''})${lastContact}`)
        if (c.whatTheyCanOffer) parts.push(`    Value: ${c.whatTheyCanOffer}`)
      })
    }

    if (overdue.length > 0) {
      parts.push(`Overdue for outreach (${overdue.length}):`)
      overdue.slice(0, 6).forEach((c) => {
        parts.push(`  ${c.name} (T${c.tier}) — ${TIER_META[c.tier].label}`)
      })
    }
  }

  return parts.join('\n')
}

// ── Pattern detection ─────────────────────────────────────────────────────────
// Surfaces trends that a coach would notice but raw scores don't say directly.

function computePatterns(
  scoredEntries: DailyEntry[],
  allEntries: DailyEntry[],
  pillarScores: Record<string, number>
): string[] {
  const patterns: string[] = []
  if (scoredEntries.length < 5) return patterns

  const scores7 = scoredEntries.slice(0, 7).map((e) => e.alignmentScore!)
  const scores30 = scoredEntries.slice(0, 30).map((e) => e.alignmentScore!)
  const avg7 = rollingAverage(scores7)
  const avg30 = rollingAverage(scores30)

  // Trend: improving or declining
  if (scoredEntries.length >= 14) {
    const prev7 = scoredEntries.slice(7, 14).map((e) => e.alignmentScore!)
    const prevAvg = rollingAverage(prev7)
    const delta = avg7 - prevAvg
    if (delta >= 10) patterns.push(`Positive momentum: avg score up ${delta} points week-over-week (${prevAvg} → ${avg7})`)
    else if (delta <= -10) patterns.push(`Declining trend: avg score down ${Math.abs(delta)} points week-over-week (${prevAvg} → ${avg7})`)
  }

  // Consistency gap: high average but low consistency
  const daysWithReview = allEntries.filter((e) => e.alignmentScore !== undefined).length
  const totalDays = allEntries.length
  if (totalDays > 7) {
    const consistency = Math.round((daysWithReview / totalDays) * 100)
    if (consistency < 60) patterns.push(`Low consistency: only ${consistency}% of days have a completed evening review — the biggest compounding risk`)
  }

  // Weakest pillar
  const weakest = Object.entries(pillarScores).sort((a, b) => a[1] - b[1])[0]
  if (weakest && weakest[1] < 40) patterns.push(`Critical weakness: ${weakest[0]} pillar at ${weakest[1]}/100 this week — significantly underperforming`)
  else if (weakest && weakest[1] < 60) patterns.push(`Lagging pillar: ${weakest[0]} at ${weakest[1]}/100 this week`)

  // Strong/weak specific days by analyzing all historical entries
  if (scoredEntries.length >= 14) {
    const byDay: Record<number, number[]> = {}
    scoredEntries.slice(0, 60).forEach((e) => {
      const day = new Date(e.date).getDay()
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(e.alignmentScore!)
    })
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayAvgs = Object.entries(byDay)
      .filter(([, vals]) => vals.length >= 2)
      .map(([day, vals]) => ({ day: Number(day), avg: rollingAverage(vals) }))

    if (dayAvgs.length >= 5) {
      const best = dayAvgs.sort((a, b) => b.avg - a.avg)[0]
      const worst = dayAvgs.sort((a, b) => a.avg - b.avg)[0]
      if (best.avg - worst.avg > 20) {
        patterns.push(`Day pattern: ${dayNames[best.day]}s are strongest (avg ${best.avg}), ${dayNames[worst.day]}s are weakest (avg ${worst.avg})`)
      }
    }
  }

  // High recent average with low floor
  const minScore = Math.min(...scores7)
  if (avg7 >= 70 && minScore < 40) {
    patterns.push(`Inconsistency: strong 7-day avg (${avg7}) but hit a ${minScore} this week — volatile execution`)
  }

  // All-zeroes morning plans
  const morningsMissed = allEntries.slice(0, 7).filter((e) => !e.morning).length
  if (morningsMissed >= 4) {
    patterns.push(`Missing morning plans: ${morningsMissed}/7 days last week had no morning plan — reactive mode`)
  }

  return patterns
}
