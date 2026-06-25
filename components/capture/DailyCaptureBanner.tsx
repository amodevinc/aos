'use client'

import Link from 'next/link'
import { Mic } from 'lucide-react'
import { getCapturePhase, primaryCaptureHref, promptsForPhase } from '@/lib/capture/daily-prompts'

interface DailyCaptureBannerProps {
  hasMorning: boolean
  hasEvening: boolean
}

export function DailyCaptureBanner({ hasMorning, hasEvening }: DailyCaptureBannerProps) {
  const phase = getCapturePhase()
  const prompts = promptsForPhase(phase)

  const focus =
    phase === 'morning' && !hasMorning
      ? prompts.find((p) => p.id === 'morning-plan')
      : (phase === 'evening' || phase === 'night') && !hasEvening
      ? prompts.find((p) => p.id === 'evening-review')
      : prompts.find((p) => p.id === 'midday-check') ?? prompts[0]

  if (!focus) return null

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium text-indigo-300">Prefer voice?</p>
        <p className="mt-0.5 text-sm text-[#6b6b88]">
          Capture updates in natural language — the agent fills in your daily entry.
        </p>
      </div>
      <Link
        href={primaryCaptureHref(focus.starter, true)}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-300 ring-1 ring-indigo-500/30 transition-colors hover:bg-indigo-500/30"
      >
        <Mic className="h-4 w-4" />
        {focus.label}
      </Link>
    </div>
  )
}
