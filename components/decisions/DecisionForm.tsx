'use client'

import { useState } from 'react'
import type { Decision, DecisionScores } from '@/types'
import {
  computeDecisionScore,
  scoreToRecommendation,
  generateDecisionNarrative,
  RECOMMENDATION_META,
} from '@/lib/scoring/decision'
import { generateId, scoreColor, cn } from '@/lib/utils'

interface DecisionFormProps {
  onSave: (d: Decision) => void
  onCancel: () => void
}

interface DimConfig {
  key: keyof DecisionScores
  label: string
  description: string
  min: number
  max: number
  leftLabel: string
  rightLabel: string
}

const POSITIVE_DIMS: DimConfig[] = [
  {
    key: 'healthImpact',
    label: 'Health Impact',
    description: 'Effect on physical health, energy, and body composition',
    min: -5, max: 5,
    leftLabel: 'Harmful', rightLabel: 'Very beneficial',
  },
  {
    key: 'capabilityImpact',
    label: 'Capability Impact',
    description: 'Skills, knowledge, and AI/technical growth',
    min: -5, max: 5,
    leftLabel: 'Degrades skills', rightLabel: 'Major skill gain',
  },
  {
    key: 'networkImpact',
    label: 'Network Impact',
    description: 'Quality of professional relationships and access',
    min: -5, max: 5,
    leftLabel: 'Isolating', rightLabel: 'Powerful connections',
  },
  {
    key: 'wealthImpact',
    label: 'Wealth Impact',
    description: 'Income, business, and financial independence',
    min: -5, max: 5,
    leftLabel: 'Costs money', rightLabel: 'High income potential',
  },
  {
    key: 'missionAlignment',
    label: 'Mission Alignment',
    description: 'Coherence with long-term vision and identity',
    min: -5, max: 5,
    leftLabel: 'Off-mission', rightLabel: 'Core to mission',
  },
  {
    key: 'longTermLeverage',
    label: 'Long-term Leverage',
    description: 'Compounds value over years, not just months',
    min: -5, max: 5,
    leftLabel: 'One-time', rightLabel: 'Exponential compound',
  },
]

const COST_DIMS: DimConfig[] = [
  {
    key: 'timeRequirement',
    label: 'Time Requirement',
    description: 'Hours per week this consumes (0 = minimal, -5 = massive)',
    min: -5, max: 0,
    leftLabel: 'All my time', rightLabel: 'Negligible',
  },
  {
    key: 'risk',
    label: 'Risk Level',
    description: 'Execution, financial, or reputational risk',
    min: -5, max: 0,
    leftLabel: 'Extremely risky', rightLabel: 'No risk',
  },
  {
    key: 'distractionRisk',
    label: 'Distraction Risk',
    description: 'Risk of fragmenting focus away from core priorities',
    min: -5, max: 0,
    leftLabel: 'Total derail', rightLabel: 'No distraction',
  },
]

const defaultScores: DecisionScores = {
  healthImpact: 0,
  capabilityImpact: 0,
  networkImpact: 0,
  wealthImpact: 0,
  missionAlignment: 0,
  longTermLeverage: 0,
  timeRequirement: 0,
  risk: 0,
  distractionRisk: 0,
}

function ScoreSlider({
  config,
  value,
  onChange,
}: {
  config: DimConfig
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#c0c0d8]">{config.label}</p>
          <p className="text-xs text-[#5a5a75]">{config.description}</p>
        </div>
        <span
          className={cn(
            'ml-4 shrink-0 text-lg font-bold',
            value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-[#5a5a75]'
          )}
        >
          {value > 0 ? '+' : ''}{value}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-20 text-right text-[10px] text-[#4a4a60]">{config.leftLabel}</span>
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
        <span className="w-20 text-[10px] text-[#4a4a60]">{config.rightLabel}</span>
      </div>
    </div>
  )
}

export function DecisionForm({ onSave, onCancel }: DecisionFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scores, setScores] = useState<DecisionScores>(defaultScores)

  const setScore = (key: keyof DecisionScores, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }))
  }

  const composite = computeDecisionScore(scores)
  const recommendation = scoreToRecommendation(composite)
  const recMeta = RECOMMENDATION_META[recommendation]

  const handleSave = () => {
    if (!title.trim()) return
    const { opportunityCost, mainUpside, mainDownside, suggestedAction } =
      generateDecisionNarrative(scores, composite, recommendation)

    const now = new Date().toISOString()
    const decision: Decision = {
      id: generateId(),
      title,
      description,
      scores,
      compositeScore: composite,
      recommendation,
      opportunityCost,
      mainUpside,
      mainDownside,
      suggestedAction,
      createdAt: now,
      updatedAt: now,
    }
    onSave(decision)
  }

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-[#111116] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Evaluate Opportunity</h3>
        {/* Live composite score */}
        <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-1.5', recMeta.bg)}>
          <span className={cn('text-xl font-bold', scoreColor(composite))}>{composite}</span>
          <span className={cn('text-xs font-semibold', recMeta.color)}>{recMeta.label}</span>
        </div>
      </div>

      <div className="space-y-5">
        {/* Title & description */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6b88]">Opportunity / Decision *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Join startup as advisor, Take online AI course…"
              className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6b88]">Context (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief context…"
              className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Positive impact */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            Positive Impact Dimensions
          </p>
          <div className="space-y-5">
            {POSITIVE_DIMS.map((dim) => (
              <ScoreSlider
                key={dim.key}
                config={dim}
                value={scores[dim.key] as number}
                onChange={(v) => setScore(dim.key, v)}
              />
            ))}
          </div>
        </div>

        {/* Cost dimensions */}
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            Cost & Risk Dimensions
          </p>
          <div className="space-y-5">
            {COST_DIMS.map((dim) => (
              <ScoreSlider
                key={dim.key}
                config={dim}
                value={scores[dim.key] as number}
                onChange={(v) => setScore(dim.key, v)}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 rounded-lg bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Log Decision
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-[#1e1e2a] px-4 py-2 text-sm text-[#6b6b88] hover:text-[#a0a0c0] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
