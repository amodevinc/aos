'use client'

import { useState } from 'react'
import type { Interaction, InteractionType, InteractionSentiment } from '@/types'
import { generateId, todayISO, cn } from '@/lib/utils'
import { SENTIMENT_META } from '@/lib/scoring/crm'

interface InteractionFormProps {
  contactId: string
  onSave: (i: Interaction) => void
  onCancel?: () => void
}

const TYPES: { value: InteractionType; label: string }[] = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Call' },
  { value: 'message', label: 'Message' },
  { value: 'email', label: 'Email' },
  { value: 'event', label: 'Event' },
  { value: 'intro', label: 'Intro made' },
  { value: 'other', label: 'Other' },
]

export function InteractionForm({ contactId, onSave, onCancel }: InteractionFormProps) {
  const [date, setDate] = useState(todayISO())
  const [type, setType] = useState<InteractionType>('meeting')
  const [sentiment, setSentiment] = useState<InteractionSentiment>('good')
  const [summary, setSummary] = useState('')
  const [keyInsight, setKeyInsight] = useState('')
  const [nextStep, setNextStep] = useState('')

  const handleSave = () => {
    if (!summary.trim()) return
    const interaction: Interaction = {
      id: generateId(),
      contactId,
      date,
      type,
      sentiment,
      summary,
      keyInsight,
      nextStep,
      createdAt: new Date().toISOString(),
    }
    onSave(interaction)
    setSummary('')
    setKeyInsight('')
    setNextStep('')
    setDate(todayISO())
  }

  return (
    <div className="rounded-xl border border-[#1e1e2a] bg-[#0a0a0c] p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">Log Interaction</p>

      <div className="flex flex-wrap gap-2">
        {/* Date */}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-[#1e1e2a] bg-[#111116] px-3 py-1.5 text-xs text-[#e8e8f0] outline-none focus:border-indigo-500/50"
        />
        {/* Type */}
        <select
          value={type}
          onChange={(e) => setType(e.target.value as InteractionType)}
          className="rounded-lg border border-[#1e1e2a] bg-[#111116] px-3 py-1.5 text-xs text-[#e8e8f0] outline-none"
        >
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {/* Sentiment */}
        <div className="flex gap-1">
          {(['great', 'good', 'neutral', 'difficult'] as InteractionSentiment[]).map((s) => (
            <button
              key={s}
              onClick={() => setSentiment(s)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-all capitalize',
                sentiment === s
                  ? cn('bg-[#1e1e2a]', SENTIMENT_META[s].color)
                  : 'text-[#4a4a60] hover:text-[#8080a0]'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="What happened? What did you discuss?*"
        rows={2}
        className="w-full resize-none rounded-lg border border-[#1e1e2a] bg-[#111116] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={keyInsight}
          onChange={(e) => setKeyInsight(e.target.value)}
          placeholder="Key insight or thing they said…"
          className="rounded-lg border border-[#1e1e2a] bg-[#111116] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
        />
        <input
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          placeholder="Next step…"
          className="rounded-lg border border-[#1e1e2a] bg-[#111116] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!summary.trim()}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors disabled:opacity-40"
        >
          Log
        </button>
        {onCancel && (
          <button onClick={onCancel} className="rounded-lg border border-[#1e1e2a] px-3 py-2 text-sm text-[#6b6b88] hover:text-[#a0a0c0]">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
