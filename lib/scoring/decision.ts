import type { DecisionScores, DecisionRecommendation } from '@/types'

// ─── Decision Composite Score (0–100) ────────────────────────────────────────
//
// Model: separate positive impact dimensions from cost/risk dimensions.
//
// POSITIVE dimensions (each -5 to +5, weights sum to 100 after normalisation):
//   healthImpact        — 15  Body is the machine. Neglect compounds.
//   capabilityImpact    — 20  Skill accumulation is the highest-leverage asset.
//   networkImpact       — 15  Network determines opportunity access.
//   wealthImpact        — 20  Financial independence unlocks freedom.
//   missionAlignment    — 20  Non-alignment fragments identity.
//   longTermLeverage    —  10  Does it compound? Preferring leverage over income.
//
// COST dimensions (each -5 to 0, all negative):
//   timeRequirement     — weighed against leverage: high leverage justifies time
//   risk                — asymmetric risk tolerance: avoid ruin, not volatility
//   distractionRisk     — fragmentation is the biggest enemy of compounding
//
// Algorithm:
//   1. Normalise positive scores (–5→0, +5→100) and compute weighted average → P
//   2. Normalise cost scores (–5→0, 0→100) and compute simple average → C
//   3. composite = P * 0.70 + C * 0.30
//   4. Round to integer.

const POSITIVE_WEIGHTS: Record<string, number> = {
  healthImpact: 15,
  capabilityImpact: 20,
  networkImpact: 15,
  wealthImpact: 20,
  missionAlignment: 20,
  longTermLeverage: 10,
}

const POSITIVE_KEYS = Object.keys(POSITIVE_WEIGHTS) as Array<keyof DecisionScores>
const COST_KEYS: Array<keyof DecisionScores> = [
  'timeRequirement',
  'risk',
  'distractionRisk',
]

function normalise55(value: number): number {
  // Map -5..+5 → 0..100
  return ((value + 5) / 10) * 100
}

function normaliseCost(value: number): number {
  // Map -5..0 → 0..100 (0 = great, -5 = terrible)
  return ((value + 5) / 5) * 100
}

export function computeDecisionScore(scores: DecisionScores): number {
  // Weighted positive score
  const totalWeight = Object.values(POSITIVE_WEIGHTS).reduce((a, b) => a + b, 0)
  const positiveScore = POSITIVE_KEYS.reduce((acc, key) => {
    const normalised = normalise55(scores[key] as number)
    return acc + normalised * (POSITIVE_WEIGHTS[key] / totalWeight)
  }, 0)

  // Simple average of cost dimensions
  const costScore =
    COST_KEYS.reduce((acc, key) => acc + normaliseCost(scores[key] as number), 0) /
    COST_KEYS.length

  const composite = positiveScore * 0.7 + costScore * 0.3
  return Math.round(Math.max(0, Math.min(100, composite)))
}

export function scoreToRecommendation(score: number): DecisionRecommendation {
  if (score >= 80) return 'strong-yes'
  if (score >= 62) return 'yes'
  if (score >= 45) return 'neutral'
  if (score >= 30) return 'probably-no'
  return 'avoid'
}

export const RECOMMENDATION_META: Record<
  DecisionRecommendation,
  { label: string; color: string; bg: string }
> = {
  'strong-yes': {
    label: 'Strong Yes',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
  },
  yes: {
    label: 'Yes',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
  },
  neutral: {
    label: 'Neutral',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
  },
  'probably-no': {
    label: 'Probably No',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10 border-orange-400/20',
  },
  avoid: {
    label: 'Avoid',
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
  },
}

export function generateDecisionNarrative(
  scores: DecisionScores,
  composite: number,
  recommendation: DecisionRecommendation
): { opportunityCost: string; mainUpside: string; mainDownside: string; suggestedAction: string } {
  const bestPositive = POSITIVE_KEYS.reduce((best, key) =>
    (scores[key] as number) > (scores[best] as number) ? key : best
  )
  const worstCost = COST_KEYS.reduce((worst, key) =>
    (scores[key] as number) < (scores[worst] as number) ? key : worst
  )

  const upsideMap: Record<string, string> = {
    healthImpact: 'Positive impact on health and physical performance',
    capabilityImpact: 'Significant skill and knowledge gains',
    networkImpact: 'Valuable network and relationship development',
    wealthImpact: 'Strong financial upside and wealth potential',
    missionAlignment: 'Deep alignment with your long-term mission',
    longTermLeverage: 'High compounding leverage over time',
  }

  const downsideMap: Record<string, string> = {
    timeRequirement: 'Significant time investment required',
    risk: 'Meaningful execution or financial risk',
    distractionRisk: 'Risk of fragmentation and focus loss',
  }

  const actionMap: Record<DecisionRecommendation, string> = {
    'strong-yes': 'Commit fully and move fast. This is a high-leverage opportunity.',
    yes: 'Proceed with clear constraints on scope and time.',
    neutral: 'Gather more information before committing. Define what would make this a strong yes.',
    'probably-no': 'Decline unless constraints change significantly.',
    avoid: 'Do not pursue. The cost/distraction risk outweighs potential gain.',
  }

  const forgoneCapacity = 100 - composite
  const opportunityCost =
    forgoneCapacity > 50
      ? 'High opportunity cost — time and focus spent here cannot be deployed elsewhere.'
      : forgoneCapacity > 25
      ? 'Moderate opportunity cost. Consider what you would not do by saying yes.'
      : 'Low opportunity cost given the high composite score.'

  return {
    opportunityCost,
    mainUpside: upsideMap[bestPositive] ?? 'Multi-pillar positive impact',
    mainDownside: downsideMap[worstCost] ?? 'Resource cost',
    suggestedAction: actionMap[recommendation],
  }
}
