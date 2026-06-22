'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { WeeklyReview, PillarScores } from '@/types'
import { computeWeeklyScore } from '@/lib/scoring/weekly'
import { generateId, cn, PILLAR_META, PILLARS } from '@/lib/utils'

interface WeeklyReviewFormProps {
  weekStart: string
  weekEnd: string
  precomputedPillarScores: PillarScores
  precomputedAvgAlignment: number
  onSave: (review: WeeklyReview) => void
  onCancel: () => void
}

const SECTIONS = [
  { key: 'whatImproved', label: 'What improved this week?', ph: 'Areas of growth…' },
  { key: 'whatRegressed', label: 'What regressed?', ph: 'Honest assessment of what slipped…' },
  { key: 'whatCreatedLeverage', label: 'What created leverage?', ph: 'Actions with outsized future value…' },
  { key: 'whatWastedTime', label: 'What wasted time?', ph: 'Activities with no return…' },
  { key: 'whoConnectedWith', label: 'Who did you connect with?', ph: 'Key relationships deepened…' },
  { key: 'whatBuilt', label: 'What did you build?', ph: 'Tangible outputs this week…' },
  { key: 'whatLearned', label: 'What did you learn?', ph: 'Key insights or skills gained…' },
  { key: 'whatDoubleDown', label: 'What should you double down on?', ph: 'Highest leverage areas to accelerate…' },
  { key: 'whatEliminate', label: 'What should you eliminate?', ph: 'Cut ruthlessly…' },
  { key: 'mainFocusNextWeek', label: 'Main focus next week', ph: 'The single most important thing…' },
] as const

export function WeeklyReviewForm({
  weekStart,
  weekEnd,
  precomputedPillarScores,
  precomputedAvgAlignment,
  onSave,
  onCancel,
}: WeeklyReviewFormProps) {
  const [fields, setFields] = useState<Record<string, string>>(
    Object.fromEntries(SECTIONS.map((s) => [s.key, '']))
  )
  const [saved, setSaved] = useState(false)

  const setField = (key: string, val: string) =>
    setFields((prev) => ({ ...prev, [key]: val }))

  const weeklyScore = computeWeeklyScore(
    [], // we use precomputed avg instead
    7
  )
  // Manual score estimate: avg of precomputed pillar scores weighted with consistency
  const pillarAvg = Math.round(
    Object.values(precomputedPillarScores).reduce((a, b) => a + b, 0) / 5
  )
  const estimatedScore = Math.round(precomputedAvgAlignment * 0.5 + pillarAvg * 0.5)

  const handleSave = () => {
    const now = new Date().toISOString()
    const review: WeeklyReview = {
      id: generateId(),
      weekStart,
      weekEnd,
      whatImproved: fields.whatImproved,
      whatRegressed: fields.whatRegressed,
      whatCreatedLeverage: fields.whatCreatedLeverage,
      whatWastedTime: fields.whatWastedTime,
      whoConnectedWith: fields.whoConnectedWith,
      whatBuilt: fields.whatBuilt,
      whatLearned: fields.whatLearned,
      whatDoubleDown: fields.whatDoubleDown,
      whatEliminate: fields.whatEliminate,
      mainFocusNextWeek: fields.mainFocusNextWeek,
      weeklyScore: estimatedScore,
      pillarScores: precomputedPillarScores,
      avgDailyAlignment: precomputedAvgAlignment,
      createdAt: now,
      updatedAt: now,
    }
    onSave(review)
    setSaved(true)
  }

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-[#111116] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Weekly Review</h3>
          <p className="text-xs text-[#5a5a75]">
            {format(parseISO(weekStart), 'MMM d')} — {format(parseISO(weekEnd), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{estimatedScore}</p>
          <p className="text-[10px] text-[#4a4a60]">Estimated score</p>
        </div>
      </div>

      {/* Pillar scores preview */}
      <div className="mb-5 flex gap-3 rounded-lg bg-[#0a0a0c] px-4 py-3">
        {PILLARS.map((p) => {
          const meta = PILLAR_META[p]
          return (
            <div key={p} className="flex flex-col items-center gap-0.5">
              <span className={cn('text-sm font-bold', meta.color)}>
                {precomputedPillarScores[p]}
              </span>
              <span className="text-[9px] text-[#4a4a60]">{meta.label}</span>
            </div>
          )
        })}
        <div className="ml-auto flex flex-col items-center gap-0.5">
          <span className="text-sm font-bold text-indigo-400">{precomputedAvgAlignment}</span>
          <span className="text-[9px] text-[#4a4a60]">Avg align</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ key, label, ph }) => (
          <div key={key} className={key === 'mainFocusNextWeek' ? 'sm:col-span-2' : ''}>
            <label className="mb-1 block text-xs font-medium text-[#6b6b88]">{label}</label>
            <textarea
              value={fields[key]}
              onChange={(e) => setField(key, e.target.value)}
              placeholder={ph}
              rows={key === 'mainFocusNextWeek' ? 2 : 3}
              className="w-full resize-none rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          className={cn(
            'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all',
            saved
              ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
              : 'bg-indigo-500 text-white hover:bg-indigo-400'
          )}
        >
          {saved ? '✓ Saved' : 'Save Weekly Review'}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-[#1e1e2a] px-4 text-sm text-[#6b6b88] hover:text-[#a0a0c0] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
