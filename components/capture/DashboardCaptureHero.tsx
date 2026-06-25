'use client'

import Link from 'next/link'
import { Mic, ArrowRight } from 'lucide-react'
import {
  getCapturePhase,
  phaseHeadline,
  promptsForPhase,
  primaryCaptureHref,
} from '@/lib/capture/daily-prompts'
import { DailyRitualStrip } from '@/components/capture/DailyRitualStrip'
import { cn } from '@/lib/utils'

interface DashboardCaptureHeroProps {
  hasMorning: boolean
  hasEvening: boolean
  captureCountToday: number
}

export function DashboardCaptureHero({
  hasMorning,
  hasEvening,
  captureCountToday,
}: DashboardCaptureHeroProps) {
  const phase = getCapturePhase()
  const { title, subtitle } = phaseHeadline(phase)
  const prompts = promptsForPhase(phase).slice(0, 4)

  const suggestedStarter =
    phase === 'morning' && !hasMorning
      ? promptsForPhase('morning')[0]?.starter ?? ''
      : (phase === 'evening' || phase === 'night') && !hasEvening
      ? promptsForPhase('evening')[0]?.starter ?? ''
      : ''

  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-[#111116] to-[#111116] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400/70">
            Daily capture
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-[#6b6b88]">{subtitle}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {prompts.map((p) => (
              <Link
                key={p.id}
                href={primaryCaptureHref(p.starter)}
                className="rounded-full border border-[#1e1e2a] bg-[#0a0a0c]/80 px-3 py-1.5 text-xs font-medium text-[#8080a0] transition-colors hover:border-indigo-500/40 hover:text-indigo-300"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        <Link
          href={primaryCaptureHref(suggestedStarter, true)}
          className={cn(
            'flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all',
            'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400',
            'sm:flex-col sm:px-6 sm:py-5'
          )}
        >
          <Mic className="h-5 w-5 sm:h-7 sm:w-7" />
          <span>Capture now</span>
        </Link>
      </div>

      <DailyRitualStrip
        hasMorning={hasMorning}
        hasEvening={hasEvening}
        captureCountToday={captureCountToday}
      />

      {!hasMorning && phase !== 'night' && (
        <Link
          href="/daily"
          className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-400/80 hover:text-indigo-300"
        >
          Or use structured morning plan <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </section>
  )
}
