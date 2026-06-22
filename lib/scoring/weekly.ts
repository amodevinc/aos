import type { DailyEntry, PillarScores } from '@/types'

// ─── Weekly Score (0–100) ─────────────────────────────────────────────────────
//
// Composite of:
//   50% — average daily alignment score for the week (execution signal)
//   50% — derived from how many days had entries (consistency signal)
//         A week with 7 entries beats a week with 3 high-scoring days.
//
// Rationale: consistency matters as much as daily quality. A 70/7 week
// outperforms a 95/3 week in long-term compounding.

export function computeWeeklyScore(
  weekEntries: DailyEntry[],
  totalDaysInWeek = 7
): number {
  if (weekEntries.length === 0) return 0

  const entriesWithScores = weekEntries.filter(
    (e) => e.alignmentScore !== undefined
  )

  if (entriesWithScores.length === 0) return 0

  const avgAlignment =
    entriesWithScores.reduce((acc, e) => acc + (e.alignmentScore ?? 0), 0) /
    entriesWithScores.length

  // Consistency: fraction of days that had a completed evening review
  const consistencyRatio = entriesWithScores.length / totalDaysInWeek
  const consistencyScore = consistencyRatio * 100

  const weekly = avgAlignment * 0.5 + consistencyScore * 0.5
  return Math.round(Math.max(0, Math.min(100, weekly)))
}

// Derive per-pillar scores from a set of daily entries.
// Each pillar maps to specific evening review questions.
// Score = percentage of days where the pillar-relevant checks passed.
export function computePillarScores(weekEntries: DailyEntry[]): PillarScores {
  const entries = weekEntries.filter((e) => e.evening)
  if (entries.length === 0) {
    return { health: 0, capability: 0, network: 0, wealth: 0, mission: 0 }
  }

  const n = entries.length

  const health =
    entries.reduce((acc, e) => {
      const ev = e.evening!
      const healthScore = ((ev.didTrain ? 1 : 0) + (ev.didEatWell ? 1 : 0) + (ev.didRecover ? 1 : 0)) / 3
      return acc + healthScore
    }, 0) / n

  const capability =
    entries.reduce((acc, e) => acc + (e.evening!.didLearn ? 1 : 0), 0) / n

  const network =
    entries.reduce(
      (acc, e) => acc + (e.evening!.didStrengthenRelationship ? 1 : 0),
      0
    ) / n

  const wealth =
    entries.reduce((acc, e) => {
      const ev = e.evening!
      return acc + ((ev.didMoveProject ? 1 : 0) + (ev.didCreateValue ? 1 : 0)) / 2
    }, 0) / n

  const mission =
    entries.reduce((acc, e) => {
      const ev = e.evening!
      return acc + ((ev.didActInAlignment ? 1 : 0) + (ev.didAvoidDistractions ? 1 : 0)) / 2
    }, 0) / n

  return {
    health: Math.round(health * 100),
    capability: Math.round(capability * 100),
    network: Math.round(network * 100),
    wealth: Math.round(wealth * 100),
    mission: Math.round(mission * 100),
  }
}
