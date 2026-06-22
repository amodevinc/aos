'use client'

import { useState } from 'react'
import type { DailyEntry, MorningPlan } from '@/types'
import { cn } from '@/lib/utils'

interface MorningPlanFormProps {
  entry: DailyEntry
  onSave: (entry: DailyEntry) => void
}

const PILLAR_FIELDS: Array<{
  key: keyof Pick<MorningPlan, 'healthAction' | 'capabilityAction' | 'networkAction' | 'wealthAction'>
  label: string
  color: string
  placeholder: string
}> = [
  {
    key: 'healthAction',
    label: 'Health',
    color: 'text-emerald-400',
    placeholder: 'Train, eat, sleep action for today…',
  },
  {
    key: 'capabilityAction',
    label: 'Capability',
    color: 'text-blue-400',
    placeholder: 'What will you learn or build today…',
  },
  {
    key: 'networkAction',
    label: 'Network',
    color: 'text-violet-400',
    placeholder: 'Who will you reach out to or deepen with…',
  },
  {
    key: 'wealthAction',
    label: 'Wealth',
    color: 'text-amber-400',
    placeholder: 'Revenue, business, or investment action today…',
  },
]

export function MorningPlanForm({ entry, onSave }: MorningPlanFormProps) {
  const init = entry.morning
  const [p1, setP1] = useState(init?.top3Priorities[0] ?? '')
  const [p2, setP2] = useState(init?.top3Priorities[1] ?? '')
  const [p3, setP3] = useState(init?.top3Priorities[2] ?? '')
  const [pillarActions, setPillarActions] = useState<
    Record<string, string>
  >({
    healthAction: init?.healthAction ?? '',
    capabilityAction: init?.capabilityAction ?? '',
    networkAction: init?.networkAction ?? '',
    wealthAction: init?.wealthAction ?? '',
  })
  const [biggestRisk, setBiggestRisk] = useState(init?.biggestRisk ?? '')
  const [identity, setIdentity] = useState(init?.identityStatement ?? '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const morning: MorningPlan = {
      top3Priorities: [p1, p2, p3],
      healthAction: pillarActions.healthAction,
      capabilityAction: pillarActions.capabilityAction,
      networkAction: pillarActions.networkAction,
      wealthAction: pillarActions.wealthAction,
      biggestRisk,
      identityStatement: identity,
    }
    const updated: DailyEntry = {
      ...entry,
      morning,
      updatedAt: new Date().toISOString(),
    }
    onSave(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Top 3 */}
      <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
          Top 3 Priorities
        </h3>
        <div className="space-y-2.5">
          {[
            { n: 1, val: p1, set: setP1, ph: 'Most important thing today…' },
            { n: 2, val: p2, set: setP2, ph: 'Second priority…' },
            { n: 3, val: p3, set: setP3, ph: 'Third priority…' },
          ].map(({ n, val, set, ph }) => (
            <div key={n} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-400">
                {n}
              </span>
              <input
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder={ph}
                className="flex-1 rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Pillar actions */}
      <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
          Pillar Actions
        </h3>
        <div className="space-y-3">
          {PILLAR_FIELDS.map(({ key, label, color, placeholder }) => (
            <div key={key} className="flex items-center gap-3">
              <span className={cn('w-24 shrink-0 text-xs font-semibold', color)}>
                {label}
              </span>
              <input
                value={pillarActions[key]}
                onChange={(e) =>
                  setPillarActions((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={placeholder}
                className="flex-1 rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Risk + Identity */}
      <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
          Risk & Identity
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6b6b88]">
              Biggest risk / distraction today
            </label>
            <input
              value={biggestRisk}
              onChange={(e) => setBiggestRisk(e.target.value)}
              placeholder="What could derail the day…"
              className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6b6b88]">
              Identity statement
            </label>
            <textarea
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="I am the kind of person who…"
              rows={2}
              className="w-full resize-none rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>
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
        {saved ? '✓ Saved' : 'Save Morning Plan'}
      </button>
    </div>
  )
}
