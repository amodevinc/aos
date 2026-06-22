'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Sun, Moon, CheckCircle2 } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { MorningPlanForm } from '@/components/daily/MorningPlanForm'
import { EveningReviewForm } from '@/components/daily/EveningReviewForm'
import { AlignmentRing } from '@/components/dashboard/AlignmentRing'

import { dailyStorage } from '@/lib/storage'
import { todayISO, generateId } from '@/lib/utils'
import type { DailyEntry } from '@/types'
import { cn } from '@/lib/utils'

type Tab = 'morning' | 'evening'

export default function DailyPage() {
  const [tab, setTab] = useState<Tab>('morning')
  const [entry, setEntry] = useState<DailyEntry | null>(null)

  useEffect(() => {
    async function load() {
      const today = todayISO()
      const existing = await dailyStorage.getByDate(today)
      if (existing) {
        setEntry(existing)
        if (existing.morning) setTab('evening')
      } else {
        const newEntry: DailyEntry = {
          id: generateId(),
          date: today,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setEntry(newEntry)
      }
    }
    load()
  }, [])

  const handleEntryUpdate = async (updated: DailyEntry) => {
    await dailyStorage.save(updated)
    setEntry(updated)
  }

  const hasMorning = !!entry?.morning
  const hasEvening = !!entry?.evening
  const score = entry?.alignmentScore

  return (
    <div>
      <PageHeader
        title="Daily Command Center"
        subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
        action={
          score !== undefined ? (
            <AlignmentRing score={score} size={80} label="Today" />
          ) : undefined
        }
      />

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-xl border border-[#1e1e2a] bg-[#111116] p-1">
        <button
          onClick={() => setTab('morning')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all',
            tab === 'morning'
              ? 'bg-[#1e1e2a] text-white'
              : 'text-[#6b6b88] hover:text-[#a0a0c0]'
          )}
        >
          <Sun className="h-4 w-4" />
          Morning Plan
          {hasMorning && (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          )}
        </button>
        <button
          onClick={() => setTab('evening')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all',
            tab === 'evening'
              ? 'bg-[#1e1e2a] text-white'
              : 'text-[#6b6b88] hover:text-[#a0a0c0]'
          )}
        >
          <Moon className="h-4 w-4" />
          Evening Review
          {hasEvening && (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          )}
        </button>
      </div>

      {entry && tab === 'morning' && (
        <MorningPlanForm entry={entry} onSave={handleEntryUpdate} />
      )}
      {entry && tab === 'evening' && (
        <EveningReviewForm entry={entry} onSave={handleEntryUpdate} />
      )}
    </div>
  )
}
