'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowRight,
  Flame,
  TrendingUp,
  Target,
  GitBranch,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/layout/StatCard'
import { AlignmentRing } from '@/components/dashboard/AlignmentRing'
import { PillarScoreRow } from '@/components/dashboard/PillarScoreRow'
import { PillarRadar } from '@/components/dashboard/PillarRadar'
import { AIInsights } from '@/components/dashboard/AIInsights'

import { dailyStorage, goalStorage, decisionStorage } from '@/lib/storage'
import { captureSessionStorage } from '@/lib/agent/storage'
import { DashboardCaptureHero } from '@/components/capture/DashboardCaptureHero'
import { useToast } from '@/lib/hooks/useToast'
import { parseError } from '@/lib/utils/errors'
import { computeStreak, rollingAverage } from '@/lib/scoring/daily'
import { computePillarScores } from '@/lib/scoring/weekly'
import {
  todayISO,
  getWeekRange,
  formatDate,
  scoreColor,
  PILLAR_META,
  truncate,
} from '@/lib/utils'
import type { Goal, Decision, PillarScores } from '@/types'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const [todayScore, setTodayScore] = useState(0)
  const [weeklyAvg, setWeeklyAvg] = useState(0)
  const [streak, setStreak] = useState(0)
  const [pillarScores, setPillarScores] = useState<PillarScores>({
    health: 0,
    capability: 0,
    network: 0,
    wealth: 0,
    mission: 0,
  })
  const [activeGoals, setActiveGoals] = useState<Goal[]>([])
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([])
  const [hasMorning, setHasMorning] = useState(false)
  const [hasEvening, setHasEvening] = useState(false)
  const [captureCountToday, setCaptureCountToday] = useState(0)
  const [top3, setTop3] = useState<string[]>([])
  const toast = useToast()

  useEffect(() => {
    async function load() {
      try {
        const today = todayISO()
        const { start, end } = getWeekRange()

        const allEntries = await dailyStorage.getAll()
        const todayEntry = allEntries.find((e) => e.date === today)
        const weekEntries = allEntries.filter((e) => e.date >= start && e.date <= end)

        setTodayScore(todayEntry?.alignmentScore ?? 0)
        setHasMorning(!!todayEntry?.morning)
        setHasEvening(!!todayEntry?.evening)
        setTop3(todayEntry?.morning?.top3Priorities ?? [])

        const weekScores = weekEntries
          .map((e) => e.alignmentScore)
          .filter((s): s is number => s !== undefined)
        setWeeklyAvg(rollingAverage(weekScores))

        setStreak(computeStreak(allEntries))
        setPillarScores(computePillarScores(weekEntries))

        const goals = await goalStorage.getAll()
        setActiveGoals(goals.filter((g) => g.status === 'active').slice(0, 5))

        const decisions = await decisionStorage.getAll()
        setRecentDecisions(
          [...decisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)
        )

        try {
          const today = todayISO()
          const sessions = await captureSessionStorage.getRecent(20)
          setCaptureCountToday(
            sessions.filter((s) => s.createdAt.startsWith(today) && s.status === 'applied').length
          )
        } catch {
          // Non-fatal
        }
      } catch (err) {
        toast.error('Failed to load dashboard', parseError(err))
      }
    }
    load()
  }, [])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <PageHeader
        title={`${greeting}, Alain`}
        subtitle={format(now, 'EEEE, MMMM d, yyyy')}
        action={
          <Link
            href="/daily"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/15 px-3 py-1.5 text-sm font-medium text-indigo-300 ring-1 ring-indigo-500/20 transition-colors hover:bg-indigo-500/25"
          >
            {hasMorning && !hasEvening ? 'Evening review' : hasMorning ? 'View day' : 'Start day'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <DashboardCaptureHero
        hasMorning={hasMorning}
        hasEvening={hasEvening}
        captureCountToday={captureCountToday}
      />

      {/* Alignment scores row */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="col-span-2 flex items-center justify-center gap-8 rounded-xl border border-[#1e1e2a] bg-[#111116] p-6 sm:col-span-1">
          <AlignmentRing score={todayScore} label="Today" />
        </div>
        <div className="flex items-center justify-center rounded-xl border border-[#1e1e2a] bg-[#111116] p-6">
          <AlignmentRing score={weeklyAvg} size={90} label="Week" />
        </div>
        <StatCard
          label="Streak"
          value={`${streak}d`}
          sub={streak > 0 ? 'Keep going' : 'Start today'}
          accent="text-amber-400"
          className="flex flex-col justify-center"
        />
        <StatCard
          label="Active Goals"
          value={activeGoals.length}
          sub="in progress"
          className="flex flex-col justify-center"
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Pillar scores + Today's priorities */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pillar scores */}
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
              Pillar Scores — This Week
            </h2>
            <PillarScoreRow scores={pillarScores} />
          </div>

          {/* Today's top 3 */}
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
                Today&apos;s Top 3
              </h2>
              {!hasMorning && (
                <Link
                  href="/daily"
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Plan day →
                </Link>
              )}
            </div>
            {top3.length > 0 ? (
              <ol className="space-y-2.5">
                {top3.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-[10px] font-bold text-indigo-400">
                      {i + 1}
                    </span>
                    <span className="text-sm text-[#c0c0d8]">{p}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[#4a4a60]">
                No morning plan yet.{' '}
                <Link href="/daily" className="text-indigo-400 hover:text-indigo-300">
                  Start your day →
                </Link>
              </p>
            )}
          </div>

          {/* Active goals */}
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
                Active Goals
              </h2>
              <Link href="/goals" className="text-xs text-indigo-400 hover:text-indigo-300">
                All goals →
              </Link>
            </div>
            {activeGoals.length > 0 ? (
              <div className="space-y-3">
                {activeGoals.map((goal) => {
                  const meta = PILLAR_META[goal.pillar]
                  return (
                    <div key={goal.id} className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          meta.color.replace('text-', 'bg-')
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm text-[#c0c0d8]">{goal.title}</p>
                          <span className="shrink-0 text-xs font-medium text-[#6b6b88]">
                            {goal.progress}%
                          </span>
                        </div>
                        <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-[#1e1e2a]">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              meta.bg.replace('/10', '/50')
                            )}
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[#4a4a60]">
                No active goals.{' '}
                <Link href="/goals" className="text-indigo-400 hover:text-indigo-300">
                  Create one →
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Right: Radar + Recent decisions */}
        <div className="space-y-6">
          {/* Radar */}
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
              Pillar Balance
            </h2>
            <PillarRadar scores={pillarScores} />
          </div>

          {/* Recent decisions */}
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
                Recent Decisions
              </h2>
              <Link href="/decisions" className="text-xs text-indigo-400 hover:text-indigo-300">
                All →
              </Link>
            </div>
            {recentDecisions.length > 0 ? (
              <div className="space-y-2.5">
                {recentDecisions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-[#c0c0d8]">{truncate(d.title, 30)}</p>
                    <span
                      className={cn(
                        'shrink-0 text-xs font-semibold',
                        scoreColor(d.compositeScore)
                      )}
                    >
                      {d.compositeScore}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#4a4a60]">
                No decisions logged.{' '}
                <Link href="/decisions" className="text-indigo-400 hover:text-indigo-300">
                  Add one →
                </Link>
              </p>
            )}
          </div>

          {/* AI Insights */}
          <AIInsights />
        </div>
      </div>
    </div>
  )
}
