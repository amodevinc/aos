'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { compassStorage } from '@/lib/storage'
import type { LifeCompass } from '@/types'
import { cn } from '@/lib/utils'

// Tagline list editor for arrays like coreValues, personalRules, etc.
function TaglistEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    if (!draft.trim()) return
    onChange([...values, draft.trim()])
    setDraft('')
  }

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i))

  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-[#6b6b88]">{label}</label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 rounded-md border border-[#1e1e2a] bg-[#0a0a0c] px-2.5 py-1 text-xs text-[#c0c0d8]"
          >
            {v}
            <button
              onClick={() => remove(i)}
              className="text-[#4a4a60] hover:text-red-400 transition-colors"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-1.5 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
        />
        <button
          onClick={add}
          className="rounded-lg bg-[#1a1a22] px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-[#22223a] transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

const defaultCompass: LifeCompass = {
  missionStatement: '',
  tenYearVision: '',
  threeYearMission: '',
  currentSeason: '',
  coreValues: [],
  personalRules: [],
  antiRules: [],
  nonNegotiables: [],
  identityStatement: '',
  updatedAt: '',
}

export default function CompassPage() {
  const [compass, setCompass] = useState<LifeCompass>(defaultCompass)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    compassStorage.get().then(setCompass)
  }, [])

  const update = (key: keyof LifeCompass, value: string | string[]) => {
    setCompass((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    await compassStorage.save({ ...compass, updatedAt: new Date().toISOString() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const TextBlock = ({
    label,
    field,
    placeholder,
    rows = 3,
  }: {
    label: string
    field: keyof LifeCompass
    placeholder: string
    rows?: number
  }) => (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#6b6b88]">{label}</label>
      <textarea
        value={compass[field] as string}
        onChange={(e) => update(field, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2.5 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
      />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Life Compass"
        subtitle="Your personal constitution. Read this when you need to remember who you are."
        action={
          <button
            onClick={handleSave}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-semibold transition-all',
              saved
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-indigo-500 text-white hover:bg-indigo-400'
            )}
          >
            {saved ? '✓ Saved' : 'Save Compass'}
          </button>
        }
      />

      <div className="space-y-6">
        {/* Mission & Vision */}
        <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            Mission & Vision
          </h2>
          <div className="space-y-4">
            <TextBlock
              label="Mission Statement"
              field="missionStatement"
              placeholder="In one sentence, what is your purpose and who do you serve…"
              rows={2}
            />
            <TextBlock
              label="10-Year Vision"
              field="tenYearVision"
              placeholder="Describe your life and impact a decade from now in vivid detail…"
              rows={4}
            />
            <TextBlock
              label="3-Year Mission"
              field="threeYearMission"
              placeholder="What must be true in 3 years for you to be on track…"
              rows={3}
            />
            <TextBlock
              label="Current Season"
              field="currentSeason"
              placeholder="What season of life are you in? What is this phase about…"
              rows={2}
            />
          </div>
        </section>

        {/* Identity */}
        <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            Identity
          </h2>
          <TextBlock
            label="Identity Statement"
            field="identityStatement"
            placeholder="I am the kind of person who…"
            rows={3}
          />
        </section>

        {/* Values & Rules */}
        <section className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            Values & Operating Rules
          </h2>
          <div className="space-y-5">
            <TaglistEditor
              label="Core Values"
              values={compass.coreValues}
              onChange={(v) => update('coreValues', v)}
              placeholder="Add a core value (press Enter)…"
            />
            <TaglistEditor
              label="Personal Rules"
              values={compass.personalRules}
              onChange={(v) => update('personalRules', v)}
              placeholder="Add a personal rule (press Enter)…"
            />
            <TaglistEditor
              label="Anti-Rules (what you never do)"
              values={compass.antiRules}
              onChange={(v) => update('antiRules', v)}
              placeholder="Add an anti-rule (press Enter)…"
            />
            <TaglistEditor
              label="Non-Negotiables"
              values={compass.nonNegotiables}
              onChange={(v) => update('nonNegotiables', v)}
              placeholder="Add a non-negotiable (press Enter)…"
            />
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
          {saved ? '✓ Compass Saved' : 'Save Life Compass'}
        </button>
      </div>
    </div>
  )
}
