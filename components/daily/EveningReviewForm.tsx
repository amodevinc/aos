'use client'

import { useState } from 'react'
import type { DailyEntry, EveningReview } from '@/types'
import { computeDailyAlignmentScore, scoreToTier } from '@/lib/scoring/daily'
import { cn } from '@/lib/utils'
import { AIReflection } from '@/components/daily/AIReflection'

interface EveningReviewFormProps {
  entry: DailyEntry
  onSave: (entry: DailyEntry) => void
}

interface CheckQuestion {
  key: keyof Pick<
    EveningReview,
    | 'didTrain'
    | 'didEatWell'
    | 'didRecover'
    | 'didLearn'
    | 'didMoveProject'
    | 'didStrengthenRelationship'
    | 'didCreateValue'
    | 'didAvoidDistractions'
    | 'didActInAlignment'
  >
  label: string
  pillar: string
  pillarColor: string
  weight: number
}

const CHECKS: CheckQuestion[] = [
  { key: 'didTrain', label: 'Did I train / exercise?', pillar: 'Health', pillarColor: 'text-emerald-400', weight: 14 },
  { key: 'didEatWell', label: 'Did I eat according to my goals?', pillar: 'Health', pillarColor: 'text-emerald-400', weight: 8 },
  { key: 'didRecover', label: 'Did I recover / sleep adequately?', pillar: 'Health', pillarColor: 'text-emerald-400', weight: 5 },
  { key: 'didLearn', label: 'Did I learn or build something meaningful?', pillar: 'Capability', pillarColor: 'text-blue-400', weight: 16 },
  { key: 'didMoveProject', label: 'Did I move a project or goal forward?', pillar: 'Wealth', pillarColor: 'text-amber-400', weight: 15 },
  { key: 'didStrengthenRelationship', label: 'Did I strengthen a key relationship?', pillar: 'Network', pillarColor: 'text-violet-400', weight: 10 },
  { key: 'didCreateValue', label: 'Did I create real value today?', pillar: 'Mission', pillarColor: 'text-rose-400', weight: 15 },
  { key: 'didAvoidDistractions', label: 'Did I avoid major distractions?', pillar: 'All', pillarColor: 'text-[#8080a0]', weight: 10 },
  { key: 'didActInAlignment', label: 'Did I act in alignment with who I am becoming?', pillar: 'Mission', pillarColor: 'text-rose-400', weight: 7 },
]

export function EveningReviewForm({ entry, onSave }: EveningReviewFormProps) {
  const init = entry.evening
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(
      CHECKS.map((c) => [c.key, init ? (init[c.key] as boolean) : false])
    )
  )
  const [biggestWin, setBiggestWin] = useState(init?.biggestWin ?? '')
  const [biggestMistake, setBiggestMistake] = useState(init?.biggestMistake ?? '')
  const [lessonLearned, setLessonLearned] = useState(init?.lessonLearned ?? '')
  const [adjustment, setAdjustment] = useState(init?.adjustmentTomorrow ?? '')
  const [saved, setSaved] = useState(false)
  const [savedEntry, setSavedEntry] = useState<DailyEntry | null>(null)

  const toggle = (key: string) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const previewScore = computeDailyAlignmentScore({
    ...(checks as unknown as EveningReview),
    biggestWin,
    biggestMistake,
    lessonLearned,
    adjustmentTomorrow: adjustment,
  })
  const tier = scoreToTier(previewScore)

  const handleSave = () => {
    const evening: EveningReview = {
      didTrain: !!checks.didTrain,
      didEatWell: !!checks.didEatWell,
      didRecover: !!checks.didRecover,
      didLearn: !!checks.didLearn,
      didMoveProject: !!checks.didMoveProject,
      didStrengthenRelationship: !!checks.didStrengthenRelationship,
      didCreateValue: !!checks.didCreateValue,
      didAvoidDistractions: !!checks.didAvoidDistractions,
      didActInAlignment: !!checks.didActInAlignment,
      biggestWin,
      biggestMistake,
      lessonLearned,
      adjustmentTomorrow: adjustment,
    }
    const updated: DailyEntry = {
      ...entry,
      evening,
      alignmentScore: computeDailyAlignmentScore(evening),
      updatedAt: new Date().toISOString(),
    }
    onSave(updated)
    setSaved(true)
    setSavedEntry(updated)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Live score preview */}
      <div className="flex items-center justify-between rounded-xl border border-[#1e1e2a] bg-[#111116] px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#4a4a60]">
            Alignment Score Preview
          </p>
          <p className="mt-0.5 text-xs text-[#5a5a75]">
            Updates as you check boxes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-3xl font-bold', tier.color)}>
            {previewScore}
          </span>
          <span className={cn('text-sm font-semibold', tier.color)}>
            {tier.label}
          </span>
        </div>
      </div>

      {/* Execution checks */}
      <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
          Execution Check
        </h3>
        <div className="space-y-2">
          {CHECKS.map(({ key, label, pillar, pillarColor, weight }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all',
                checks[key]
                  ? 'border-indigo-500/30 bg-indigo-500/8'
                  : 'border-[#1e1e2a] bg-[#0a0a0c] hover:border-[#2a2a38]'
              )}
            >
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                  checks[key]
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-[#2a2a38]'
                )}
              >
                {checks[key] && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="flex-1 text-sm text-[#c0c0d8]">{label}</span>
              <span className={cn('shrink-0 text-[10px] font-semibold uppercase', pillarColor)}>
                {pillar}
              </span>
              <span className="shrink-0 text-[10px] font-medium text-[#4a4a60]">
                +{weight}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Reflection */}
      <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
          Reflection
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Biggest win', val: biggestWin, set: setBiggestWin, ph: 'What went well…' },
            { label: 'Biggest mistake', val: biggestMistake, set: setBiggestMistake, ph: 'What failed or fell short…' },
            { label: 'Lesson learned', val: lessonLearned, set: setLessonLearned, ph: 'What will you carry forward…' },
            { label: 'Adjustment for tomorrow', val: adjustment, set: setAdjustment, ph: 'One thing to do differently…' },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label className="mb-1.5 block text-xs font-medium text-[#6b6b88]">
                {label}
              </label>
              <textarea
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder={ph}
                rows={2}
                className="w-full resize-none rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={handleSave}
        className={cn(
          'w-full rounded-lg py-3 text-sm font-semibold transition-all',
          saved
            ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
            : 'bg-indigo-500 text-white hover:bg-indigo-400'
        )}
      >
        {saved ? '✓ Saved' : `Save Evening Review  ·  Score: ${previewScore}`}
      </button>

      {savedEntry && <AIReflection entry={savedEntry} />}
    </div>
  )
}
