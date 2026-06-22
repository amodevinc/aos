'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { GoalForm } from '@/components/goals/GoalForm'
import { goalStorage, projectStorage } from '@/lib/storage'
import { PILLAR_META, PILLARS, formatDate, generateId, cn } from '@/lib/utils'
import type { Goal, Project, Pillar, GoalStatus } from '@/types'

const STATUS_META: Record<GoalStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'text-emerald-400' },
  completed: { label: 'Completed', color: 'text-blue-400' },
  paused: { label: 'Paused', color: 'text-yellow-400' },
  abandoned: { label: 'Abandoned', color: 'text-[#5a5a75]' },
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterPillar, setFilterPillar] = useState<Pillar | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<GoalStatus | 'all'>('all')

  const load = async () => setGoals(await goalStorage.getAll())
  useEffect(() => { load() }, [])

  const filtered = goals
    .filter((g) => filterPillar === 'all' || g.pillar === filterPillar)
    .filter((g) => filterStatus === 'all' || g.status === filterStatus)
    .sort((a, b) => a.status.localeCompare(b.status) || b.updatedAt.localeCompare(a.updatedAt))

  const handleSave = async (goal: Goal) => {
    await goalStorage.save(goal)
    load()
    setShowForm(false)
    setEditingGoal(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    await goalStorage.delete(id)
    load()
  }

  const handleProgressChange = async (goal: Goal, progress: number) => {
    const updated = { ...goal, progress, updatedAt: new Date().toISOString() }
    await goalStorage.save(updated)
    load()
  }

  return (
    <div>
      <PageHeader
        title="Goals"
        subtitle="Track progress on your five-pillar objectives"
        action={
          <button
            onClick={() => { setEditingGoal(null); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Goal
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg border border-[#1e1e2a] bg-[#111116] p-1">
          {(['all', ...PILLARS] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPillar(p)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-all capitalize',
                filterPillar === p
                  ? 'bg-[#1e1e2a] text-white'
                  : 'text-[#5a5a75] hover:text-[#a0a0c0]'
              )}
            >
              {p === 'all' ? 'All' : PILLAR_META[p].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border border-[#1e1e2a] bg-[#111116] p-1">
          {(['all', 'active', 'paused', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-all capitalize',
                filterStatus === s
                  ? 'bg-[#1e1e2a] text-white'
                  : 'text-[#5a5a75] hover:text-[#a0a0c0]'
              )}
            >
              {s === 'all' ? 'All' : STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Goal form */}
      {(showForm || editingGoal) && (
        <div className="mb-6">
          <GoalForm
            initial={editingGoal ?? undefined}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingGoal(null) }}
          />
        </div>
      )}

      {/* Goal list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-10 text-center">
            <p className="text-sm text-[#4a4a60]">No goals found. Create your first goal.</p>
          </div>
        )}
        {filtered.map((goal) => {
          const meta = PILLAR_META[goal.pillar]
          const statusMeta = STATUS_META[goal.status]
          const expanded = expandedId === goal.id

          return (
            <div
              key={goal.id}
              className="rounded-xl border border-[#1e1e2a] bg-[#111116] overflow-hidden"
            >
              {/* Header row */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', meta.color.replace('text-', 'bg-'))} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-[#e8e8f0]">{goal.title}</p>
                    <span className={cn('shrink-0 text-xs font-medium', statusMeta.color)}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="h-1 w-32 overflow-hidden rounded-full bg-[#1e1e2a]">
                      <div
                        className={cn('h-full rounded-full', meta.bg.replace('/10', '/60'))}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#5a5a75]">{goal.progress}%</span>
                    <span className={cn('text-xs font-medium', meta.color)}>{meta.label}</span>
                    {goal.deadline && (
                      <span className="text-xs text-[#4a4a60]">Due {formatDate(goal.deadline)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingGoal(goal); setShowForm(false) }}
                    className="rounded-md p-1.5 text-[#4a4a60] hover:text-[#a0a0c0] hover:bg-[#1a1a22] transition-all"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="rounded-md p-1.5 text-[#4a4a60] hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedId(expanded ? null : goal.id)}
                    className="rounded-md p-1.5 text-[#4a4a60] hover:text-[#a0a0c0] hover:bg-[#1a1a22] transition-all"
                  >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded && (
                <div className="border-t border-[#1e1e2a] px-5 py-4 space-y-4">
                  {goal.description && (
                    <p className="text-sm text-[#8080a0]">{goal.description}</p>
                  )}
                  {goal.whyItMatters && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#4a4a60] mb-1">Why it matters</p>
                      <p className="text-sm text-[#8080a0]">{goal.whyItMatters}</p>
                    </div>
                  )}
                  {goal.nextAction && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#4a4a60] mb-1">Next action</p>
                      <p className="text-sm text-emerald-400">{goal.nextAction}</p>
                    </div>
                  )}
                  {/* Progress slider */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[#4a4a60] mb-2">Progress</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={goal.progress}
                        onChange={(e) => handleProgressChange(goal, Number(e.target.value))}
                        className="flex-1 accent-indigo-500"
                      />
                      <span className="w-10 text-right text-sm font-semibold text-indigo-400">
                        {goal.progress}%
                      </span>
                    </div>
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
