'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { WeeklyReviewForm } from '@/components/weekly/WeeklyReviewForm'
import { weeklyStorage, dailyStorage } from '@/lib/storage'
import { computeWeeklyScore, computePillarScores } from '@/lib/scoring/weekly'
import { getWeekRange, scoreColor, PILLAR_META, PILLARS, cn } from '@/lib/utils'
import type { WeeklyReview } from '@/types'

export default function WeeklyPage() {
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [weeklyContext, setWeeklyContext] = useState({
    pillarScores: { health: 0, capability: 0, network: 0, wealth: 0, mission: 0 },
    avgAlignment: 0,
  })

  const load = async () => {
    const all = await weeklyStorage.getAll()
    setReviews([...all].sort((a, b) => b.weekStart.localeCompare(a.weekStart)))
  }

  useEffect(() => {
    load()
    async function loadWeekContext() {
      const { start: s, end: e } = getWeekRange()
      const allEntries = await dailyStorage.getAll()
      const weekEntries = allEntries.filter((en) => en.date >= s && en.date <= e)
      const pillarScores = computePillarScores(weekEntries)
      const scored = weekEntries.filter((en) => en.alignmentScore !== undefined)
      const avg = scored.length > 0
        ? Math.round(scored.reduce((a, en) => a + (en.alignmentScore ?? 0), 0) / scored.length)
        : 0
      setWeeklyContext({ pillarScores, avgAlignment: avg })
    }
    loadWeekContext()
  }, [])

  const { start: thisWeekStart, end: thisWeekEnd } = getWeekRange()
  const hasThisWeek = reviews.some((r) => r.weekStart === thisWeekStart)
  const precomputedPillarScores = weeklyContext.pillarScores
  const precomputedAvg = weeklyContext.avgAlignment

  const handleSave = async (review: WeeklyReview) => {
    await weeklyStorage.save(review)
    load()
    setShowForm(false)
  }

  const SECTIONS = [
    { key: 'whatImproved', label: 'What improved?' },
    { key: 'whatRegressed', label: 'What regressed?' },
    { key: 'whatCreatedLeverage', label: 'What created leverage?' },
    { key: 'whatWastedTime', label: 'What wasted time?' },
    { key: 'whoConnectedWith', label: 'Who did you connect with?' },
    { key: 'whatBuilt', label: 'What did you build?' },
    { key: 'whatLearned', label: 'What did you learn?' },
    { key: 'whatDoubleDown', label: 'What to double down on?' },
    { key: 'whatEliminate', label: 'What to eliminate?' },
    { key: 'mainFocusNextWeek', label: 'Main focus next week' },
  ] as const

  return (
    <div>
      <PageHeader
        title="Weekly Review"
        subtitle="Honest reflection compounds. Do this every Sunday."
        action={
          !hasThisWeek && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
            >
              <Plus className="h-4 w-4" /> This Week
            </button>
          )
        }
      />

      {showForm && (
        <div className="mb-6">
          <WeeklyReviewForm
            weekStart={thisWeekStart}
            weekEnd={thisWeekEnd}
            precomputedPillarScores={precomputedPillarScores}
            precomputedAvgAlignment={precomputedAvg}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="space-y-3">
        {reviews.length === 0 && !showForm && (
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-10 text-center">
            <p className="text-sm text-[#4a4a60]">No weekly reviews yet. Start your first review above.</p>
          </div>
        )}

        {reviews.map((r) => {
          const expanded = expandedId === r.id
          return (
            <div key={r.id} className="rounded-xl border border-[#1e1e2a] bg-[#111116] overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4">
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#1e1e2a] bg-[#0a0a0c]')}>
                  <span className={cn('text-lg font-bold', scoreColor(r.weeklyScore))}>{r.weeklyScore}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#e8e8f0]">
                    Week of {format(parseISO(r.weekStart), 'MMM d')} — {format(parseISO(r.weekEnd), 'MMM d, yyyy')}
                  </p>
                  <div className="mt-1 flex gap-3">
                    {PILLARS.map((p) => (
                      <span key={p} className={cn('text-xs font-medium', PILLAR_META[p].color)}>
                        {r.pillarScores[p]}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="rounded-md p-1.5 text-[#4a4a60] hover:text-[#a0a0c0] hover:bg-[#1a1a22] transition-all"
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {expanded && (
                <div className="border-t border-[#1e1e2a] px-5 py-4">
                  {/* Pillar scores */}
                  <div className="mb-4 flex gap-4">
                    {PILLARS.map((p) => {
                      const meta = PILLAR_META[p]
                      return (
                        <div key={p} className="flex flex-col items-center gap-0.5">
                          <span className={cn('text-sm font-bold', meta.color)}>{r.pillarScores[p]}</span>
                          <span className="text-[10px] text-[#4a4a60]">{meta.label}</span>
                        </div>
                      )
                    })}
                  </div>
                  {/* Q&A */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SECTIONS.map(({ key, label }) =>
                      r[key] ? (
                        <div key={key}>
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">{label}</p>
                          <p className="text-sm text-[#c0c0d8]">{r[key]}</p>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
