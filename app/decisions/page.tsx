'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DecisionForm } from '@/components/decisions/DecisionForm'
import { AIDecisionAnalysis } from '@/components/decisions/AIDecisionAnalysis'
import { decisionStorage } from '@/lib/storage'
import { RECOMMENDATION_META } from '@/lib/scoring/decision'
import { scoreColor, formatDate, cn, truncate } from '@/lib/utils'
import { useToast } from '@/lib/hooks/useToast'
import { parseError } from '@/lib/utils/errors'
import type { Decision } from '@/types'

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toast = useToast()

  const load = async () => {
    try {
      const all = await decisionStorage.getAll()
      setDecisions([...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    } catch (err) {
      toast.error('Failed to load decisions', parseError(err))
    }
  }
  useEffect(() => { load() }, [])

  const handleSave = async (d: Decision) => {
    try {
      await decisionStorage.save(d)
      load()
      setShowForm(false)
      toast.success('Decision logged')
    } catch (err) {
      toast.error('Failed to save decision', parseError(err))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this decision?')) return
    try {
      await decisionStorage.delete(id)
      load()
    } catch (err) {
      toast.error('Failed to delete decision', parseError(err))
    }
  }

  return (
    <div>
      <PageHeader
        title="Decision Engine"
        subtitle="Score opportunities against your five pillars before committing"
        action={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            <Plus className="h-4 w-4" /> Evaluate Decision
          </button>
        }
      />

      {showForm && (
        <div className="mb-6">
          <DecisionForm
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="space-y-3">
        {decisions.length === 0 && !showForm && (
          <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-10 text-center">
            <p className="mb-1 text-sm text-[#4a4a60]">No decisions logged yet.</p>
            <p className="text-xs text-[#3a3a50]">
              Use the engine before committing to any significant opportunity.
            </p>
          </div>
        )}

        {decisions.map((d) => {
          const recMeta = RECOMMENDATION_META[d.recommendation]
          const expanded = expandedId === d.id

          return (
            <div
              key={d.id}
              className="rounded-xl border border-[#1e1e2a] bg-[#111116] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 py-4">
                {/* Score ring */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#1e1e2a] bg-[#0a0a0c]">
                  <span className={cn('text-lg font-bold', scoreColor(d.compositeScore))}>
                    {d.compositeScore}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#e8e8f0]">{d.title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={cn('text-xs font-semibold', recMeta.color)}>
                      {recMeta.label}
                    </span>
                    <span className="text-xs text-[#4a4a60]">{formatDate(d.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="rounded-md p-1.5 text-[#4a4a60] hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedId(expanded ? null : d.id)}
                    className="rounded-md p-1.5 text-[#4a4a60] hover:text-[#a0a0c0] hover:bg-[#1a1a22] transition-all"
                  >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-[#1e1e2a] px-5 py-4 space-y-4">
                  {d.description && (
                    <p className="text-sm text-[#8080a0]">{d.description}</p>
                  )}

                  {/* Score breakdown */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
                      Score Breakdown
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                      {(
                        [
                          ['Health Impact', d.scores.healthImpact],
                          ['Capability Impact', d.scores.capabilityImpact],
                          ['Network Impact', d.scores.networkImpact],
                          ['Wealth Impact', d.scores.wealthImpact],
                          ['Mission Alignment', d.scores.missionAlignment],
                          ['Long-term Leverage', d.scores.longTermLeverage],
                          ['Time Cost', d.scores.timeRequirement],
                          ['Risk', d.scores.risk],
                          ['Distraction Risk', d.scores.distractionRisk],
                        ] as [string, number][]
                      ).map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-[#6b6b88]">{label}</span>
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              val > 0 ? 'text-emerald-400' : val < 0 ? 'text-red-400' : 'text-[#5a5a75]'
                            )}
                          >
                            {val > 0 ? '+' : ''}{val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-[#0a0a0c] p-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">Upside</p>
                      <p className="text-xs text-[#c0c0d8]">{d.mainUpside}</p>
                    </div>
                    <div className="rounded-lg bg-[#0a0a0c] p-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">Downside</p>
                      <p className="text-xs text-[#c0c0d8]">{d.mainDownside}</p>
                    </div>
                    <div className="rounded-lg bg-[#0a0a0c] p-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">Opp. Cost</p>
                      <p className="text-xs text-[#c0c0d8]">{d.opportunityCost}</p>
                    </div>
                  </div>

                  <div className={cn('rounded-lg border p-3', recMeta.bg)}>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a60]">
                      Suggested Action
                    </p>
                    <p className={cn('text-sm font-medium', recMeta.color)}>{d.suggestedAction}</p>
                  </div>

                  {/* AI second opinion */}
                  <AIDecisionAnalysis decision={d} />

                  {/* Outcome notes */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6b6b88]">
                      Outcome / retrospective (optional)
                    </label>
                    <textarea
                      defaultValue={d.outcome ?? ''}
                      onBlur={async (e) => {
                        try {
                          const updated = { ...d, outcome: e.target.value, updatedAt: new Date().toISOString() }
                          await decisionStorage.save(updated)
                          load()
                        } catch (err) {
                          toast.error('Failed to save outcome', parseError(err))
                        }
                      }}
                      placeholder="How did this play out…"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none focus:border-indigo-500/50"
                    />
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
