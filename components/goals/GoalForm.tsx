'use client'

import { useState } from 'react'
import type { Goal, Pillar, GoalStatus } from '@/types'
import { PILLARS, PILLAR_META, generateId, cn } from '@/lib/utils'

interface GoalFormProps {
  initial?: Goal
  onSave: (goal: Goal) => void
  onCancel: () => void
}

export function GoalForm({ initial, onSave, onCancel }: GoalFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [pillar, setPillar] = useState<Pillar>(initial?.pillar ?? 'health')
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')
  const [status, setStatus] = useState<GoalStatus>(initial?.status ?? 'active')
  const [progress, setProgress] = useState(initial?.progress ?? 0)
  const [whyItMatters, setWhyItMatters] = useState(initial?.whyItMatters ?? '')
  const [nextAction, setNextAction] = useState(initial?.nextAction ?? '')

  const handleSubmit = () => {
    if (!title.trim()) return
    const now = new Date().toISOString()
    const goal: Goal = {
      id: initial?.id ?? generateId(),
      title,
      description,
      pillar,
      deadline,
      status,
      progress,
      whyItMatters,
      nextAction,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    }
    onSave(goal)
  }

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-[#111116] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">
        {initial ? 'Edit Goal' : 'New Goal'}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#6b6b88]">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal title…"
            className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Pillar */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6b88]">Pillar</label>
            <div className="flex flex-wrap gap-1.5">
              {PILLARS.map((p) => {
                const meta = PILLAR_META[p]
                return (
                  <button
                    key={p}
                    onClick={() => setPillar(p)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                      pillar === p
                        ? cn(meta.bg, meta.color, 'ring-1', meta.ring)
                        : 'bg-[#1a1a22] text-[#5a5a75] hover:text-[#a0a0c0]'
                    )}
                  >
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6b88]">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GoalStatus)}
              className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] outline-none focus:border-indigo-500/50"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6b88]">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] outline-none focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b6b88]">Progress: {progress}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="mt-2 w-full accent-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#6b6b88]">Why it matters</label>
          <textarea
            value={whyItMatters}
            onChange={(e) => setWhyItMatters(e.target.value)}
            placeholder="Why does this goal matter to your mission…"
            rows={2}
            className="w-full resize-none rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#6b6b88]">Next action</label>
          <input
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="Immediate next step…"
            className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-indigo-500 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
          >
            {initial ? 'Update Goal' : 'Create Goal'}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-[#1e1e2a] px-4 py-2 text-sm text-[#6b6b88] hover:text-[#a0a0c0] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
