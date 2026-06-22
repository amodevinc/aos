import type { EveningReview } from '@/types'

// ─── Daily Alignment Score (0–100) ───────────────────────────────────────────
//
// Design philosophy: not all execution is equal. Questions are weighted by
// their leverage on long-term compounding. Physical training and deep work
// compound hardest, so they receive the highest weights.
//
// Weight table (sums to 100):
//   didTrain                 — 14  Health: hardest to do, highest long-term ROI
//   didEatWell               —  8  Health: supporting pillar
//   didRecover               —  5  Health: often skipped, low-leverage but cumulative
//   didLearn                 — 16  Capability: the highest-leverage daily act
//   didMoveProject           — 15  Wealth/Mission: forward motion on actual output
//   didStrengthenRelation    — 10  Network: relationship capital compounds slowly
//   didCreateValue           — 15  Mission/Wealth: value creation is the core signal
//   didAvoidDistractions     — 10  All pillars: distraction is the silent killer
//   didActInAlignment        —  7  Mission: meta-question covering the whole day
//                              ─── total: 100

const WEIGHTS: Record<keyof EveningReview, number> = {
  didTrain: 14,
  didEatWell: 8,
  didRecover: 5,
  didLearn: 16,
  didMoveProject: 15,
  didStrengthenRelationship: 10,
  didCreateValue: 15,
  didAvoidDistractions: 10,
  didActInAlignment: 7,
  // reflection fields do not contribute to the numeric score
  biggestWin: 0,
  biggestMistake: 0,
  lessonLearned: 0,
  adjustmentTomorrow: 0,
}

export function computeDailyAlignmentScore(review: EveningReview): number {
  const booleanKeys: Array<keyof EveningReview> = [
    'didTrain',
    'didEatWell',
    'didRecover',
    'didLearn',
    'didMoveProject',
    'didStrengthenRelationship',
    'didCreateValue',
    'didAvoidDistractions',
    'didActInAlignment',
  ]

  const score = booleanKeys.reduce((acc, key) => {
    return acc + (review[key] === true ? WEIGHTS[key] : 0)
  }, 0)

  return Math.round(score)
}

// Classify a score into a tier for display
export function scoreToTier(score: number): {
  label: string
  color: string
} {
  if (score >= 85) return { label: 'Elite', color: 'text-emerald-400' }
  if (score >= 70) return { label: 'Strong', color: 'text-blue-400' }
  if (score >= 55) return { label: 'Solid', color: 'text-yellow-400' }
  if (score >= 40) return { label: 'Weak', color: 'text-orange-400' }
  return { label: 'Off', color: 'text-red-400' }
}

// Rolling average alignment from an array of scores
export function rollingAverage(scores: number[]): number {
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

// Compute current streak of days with score >= threshold
export function computeStreak(
  entries: Array<{ date: string; alignmentScore?: number }>,
  threshold = 1
): number {
  if (entries.length === 0) return 0

  // Sort descending by date
  const sorted = [...entries]
    .filter((e) => e.alignmentScore !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))

  let streak = 0
  let expected = sorted[0]?.date

  for (const entry of sorted) {
    if (entry.date !== expected) break
    if ((entry.alignmentScore ?? 0) >= threshold) {
      streak++
      // Move expected date one day back
      const d = new Date(expected)
      d.setDate(d.getDate() - 1)
      expected = d.toISOString().slice(0, 10)
    } else {
      break
    }
  }

  return streak
}
