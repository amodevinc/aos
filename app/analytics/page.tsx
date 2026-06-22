'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/layout/StatCard'
import { dailyStorage, weeklyStorage, decisionStorage, goalStorage } from '@/lib/storage'
import { computeStreak, rollingAverage } from '@/lib/scoring/daily'
import { computePillarScores } from '@/lib/scoring/weekly'
import {
  formatDateShort,
  PILLAR_CHART_COLORS,
  PILLARS,
  PILLAR_META,
  scoreColor,
  cn,
} from '@/lib/utils'
import type { DailyEntry, WeeklyReview } from '@/types'

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#111116',
    border: '1px solid #1e1e2a',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: '#e8e8f0' },
  itemStyle: { color: '#a0a0c0' },
}

export default function AnalyticsPage() {
  const [dailyData, setDailyData] = useState<Array<{ date: string; score: number }>>([])
  const [weeklyData, setWeeklyData] = useState<Array<{ week: string; score: number; health: number; capability: number; network: number; wealth: number; mission: number }>>([])
  const [decisionData, setDecisionData] = useState<Array<{ name: string; score: number }>>([])
  const [stats, setStats] = useState({
    totalDays: 0,
    avgAlignment: 0,
    streak: 0,
    goalsCompleted: 0,
    totalDecisions: 0,
    avgDecisionScore: 0,
  })

  useEffect(() => {
    async function load() {
      const [entries, reviews, decisions, goals] = await Promise.all([
        dailyStorage.getAll(),
        weeklyStorage.getAll(),
        decisionStorage.getAll(),
        goalStorage.getAll(),
      ])
      entries.sort((a, b) => a.date.localeCompare(b.date))
      reviews.sort((a, b) => a.weekStart.localeCompare(b.weekStart))

      const daily = entries
        .filter((e) => e.alignmentScore !== undefined)
        .slice(-30)
        .map((e) => ({ date: formatDateShort(e.date), score: e.alignmentScore! }))
      setDailyData(daily)

      const weekly = reviews.slice(-12).map((r) => ({
        week: formatDateShort(r.weekStart),
        score: r.weeklyScore,
        health: r.pillarScores.health,
        capability: r.pillarScores.capability,
        network: r.pillarScores.network,
        wealth: r.pillarScores.wealth,
        mission: r.pillarScores.mission,
      }))
      setWeeklyData(weekly)

      const dec = decisions
        .slice(-12)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((d) => ({ name: d.title.slice(0, 20), score: d.compositeScore }))
      setDecisionData(dec)

      const scores = entries.map((e) => e.alignmentScore).filter((s): s is number => s !== undefined)
      const completedGoals = goals.filter((g) => g.status === 'completed').length
      const decScores = decisions.map((d) => d.compositeScore)

      setStats({
        totalDays: scores.length,
        avgAlignment: rollingAverage(scores),
        streak: computeStreak(entries),
        goalsCompleted: completedGoals,
        totalDecisions: decisions.length,
        avgDecisionScore: decScores.length > 0
          ? Math.round(decScores.reduce((a, b) => a + b, 0) / decScores.length)
          : 0,
      })
    }
    load()
  }, [])

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Trends and patterns across time. Consistency compounds."
      />

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Days Logged" value={stats.totalDays} />
        <StatCard
          label="Avg Alignment"
          value={stats.avgAlignment}
          accent={scoreColor(stats.avgAlignment)}
        />
        <StatCard label="Streak" value={`${stats.streak}d`} accent="text-amber-400" />
        <StatCard label="Goals Done" value={stats.goalsCompleted} accent="text-emerald-400" />
        <StatCard label="Decisions" value={stats.totalDecisions} />
        <StatCard
          label="Avg Decision"
          value={stats.avgDecisionScore}
          accent={scoreColor(stats.avgDecisionScore)}
        />
      </div>

      <div className="space-y-6">
        {/* Daily alignment trend */}
        <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            Daily Alignment — Last 30 Days
          </h2>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#5a5a75', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#5a5a75', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#5b6af5"
                  strokeWidth={2}
                  dot={{ fill: '#5b6af5', r: 2 }}
                  activeDot={{ r: 4 }}
                  name="Alignment"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-[#4a4a60]">
              Complete evening reviews to see your alignment trend.
            </p>
          )}
        </div>

        {/* Weekly pillar breakdown */}
        <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            Weekly Pillar Performance
          </h2>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} barSize={10} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#5a5a75', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#5a5a75', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#6b6b88' }}
                />
                {PILLARS.map((p) => (
                  <Bar
                    key={p}
                    dataKey={p}
                    name={PILLAR_META[p].label}
                    fill={PILLAR_CHART_COLORS[p]}
                    fillOpacity={0.8}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-[#4a4a60]">
              Complete weekly reviews to see pillar trends.
            </p>
          )}
        </div>

        {/* Decision quality chart */}
        <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            Decision Quality
          </h2>
          {decisionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={decisionData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#5a5a75', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#5a5a75', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="score" name="Score" fill="#5b6af5" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-[#4a4a60]">
              Log decisions to see quality trends.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
