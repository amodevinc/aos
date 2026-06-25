'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Clock, AlertCircle, ChevronDown, ChevronUp, Users, Target, GitBranch } from 'lucide-react'
import { cn, PILLAR_META } from '@/lib/utils'
import { computeDecisionScore, scoreToRecommendation, RECOMMENDATION_META } from '@/lib/scoring/decision'
import type { AppliedAction, CaptureAction } from '@/lib/agent/types'
import { ACTION_LABELS, TIER_META } from '@/lib/agent/types'
import type { PreResolvedAction } from '@/lib/agent/preresolve'
import { resolveAction } from '@/lib/agent/preresolve'

// ─── Rich detail: Daily ───────────────────────────────────────────────────────

function DailyDetail({ action }: { action: Extract<CaptureAction, { kind: 'upsert_daily' }> }) {
  const { evening, morning } = action.payload

  const doneChecks = evening
    ? Object.entries(evening)
        .filter(([k, v]) => k.startsWith('did') && v === true)
        .map(([k]) =>
          k.replace('did', '').replace(/([A-Z])/g, ' $1').trim()
        )
    : []
  const missedChecks = evening
    ? Object.entries(evening)
        .filter(([k, v]) => k.startsWith('did') && v === false)
        .map(([k]) =>
          k.replace('did', '').replace(/([A-Z])/g, ' $1').trim()
        )
    : []

  const textFields = evening
    ? ([
        ['Win', evening.biggestWin],
        ['Mistake', evening.biggestMistake],
        ['Lesson', evening.lessonLearned],
        ['Tomorrow', evening.adjustmentTomorrow],
      ] as const).filter(([, v]) => !!v)
    : []

  const morningFields = morning
    ? ([
        ['Top 3', Array.isArray(morning.top3Priorities) ? morning.top3Priorities.filter(Boolean).join(' · ') : undefined],
        ['Health', morning.healthAction],
        ['Capability', morning.capabilityAction],
        ['Network', morning.networkAction],
        ['Wealth', morning.wealthAction],
        ['Risk', morning.biggestRisk],
      ] as const).filter(([, v]) => !!v)
    : []

  return (
    <div className="mt-3 space-y-2">
      {doneChecks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doneChecks.map((c) => (
            <span key={c} className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-400">
              ✓ {c}
            </span>
          ))}
        </div>
      )}
      {missedChecks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {missedChecks.map((c) => (
            <span key={c} className="rounded-md bg-red-400/10 px-2 py-0.5 text-[11px] text-red-400">
              ✗ {c}
            </span>
          ))}
        </div>
      )}
      {textFields.map(([label, value]) => (
        <p key={label} className="text-xs text-[#6b6b88]">
          <span className="text-[#3a3a50]">{label}:</span> {value}
        </p>
      ))}
      {morningFields.map(([label, value]) => (
        <p key={label} className="text-xs text-[#6b6b88]">
          <span className="text-[#3a3a50]">{label}:</span> {value}
        </p>
      ))}
    </div>
  )
}

// ─── Rich detail: Goal ────────────────────────────────────────────────────────

function GoalDetail({ action }: { action: Extract<CaptureAction, { kind: 'create_goal' | 'update_goal' }> }) {
  if (action.kind === 'create_goal') {
    const pillar = action.payload.pillar
    const meta = PILLAR_META[pillar]
    const progress = action.payload.progress ?? 0
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', meta.bg, meta.color)}>
            {meta.label}
          </span>
          {action.payload.deadline && (
            <span className="text-[11px] text-[#4a4a60]">Due {action.payload.deadline}</span>
          )}
        </div>
        {progress > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-[#1e1e2a]">
              <div className={cn('h-full rounded-full', meta.bg)} style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[11px] text-[#4a4a60]">{progress}%</span>
          </div>
        )}
        {action.payload.whyItMatters && (
          <p className="text-xs text-[#5a5a75]">Why: {action.payload.whyItMatters}</p>
        )}
        {action.payload.nextAction && (
          <p className="text-xs text-[#5a5a75]">Next: {action.payload.nextAction}</p>
        )}
      </div>
    )
  }

  // update_goal
  const fields = action.payload.fields
  const newProgress = fields.progress
  return (
    <div className="mt-3 space-y-1.5">
      {newProgress !== undefined && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-[#1e1e2a]">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${newProgress}%` }} />
          </div>
          <span className="text-[11px] text-indigo-400">{newProgress}%</span>
        </div>
      )}
      {fields.status && (
        <span className={cn(
          'inline-block rounded-md px-2 py-0.5 text-[11px] font-medium',
          fields.status === 'completed' ? 'bg-emerald-400/10 text-emerald-400' :
          fields.status === 'paused' ? 'bg-amber-400/10 text-amber-400' :
          fields.status === 'abandoned' ? 'bg-red-400/10 text-red-400' :
          'bg-indigo-400/10 text-indigo-400'
        )}>
          {fields.status}
        </span>
      )}
      {fields.nextAction && <p className="text-xs text-[#5a5a75]">Next: {fields.nextAction}</p>}
    </div>
  )
}

// ─── Rich detail: Decision ────────────────────────────────────────────────────

function DecisionDetail({ action }: { action: Extract<CaptureAction, { kind: 'create_decision' }> }) {
  const { scores } = action.payload
  const compositeScore = computeDecisionScore(scores)
  const rec = scoreToRecommendation(compositeScore)
  const recMeta = RECOMMENDATION_META[rec]

  const positiveDims = [
    { label: 'Health', value: scores.healthImpact },
    { label: 'Capability', value: scores.capabilityImpact },
    { label: 'Network', value: scores.networkImpact },
    { label: 'Wealth', value: scores.wealthImpact },
    { label: 'Mission', value: scores.missionAlignment },
    { label: 'Leverage', value: scores.longTermLeverage },
  ]
  const costDims = [
    { label: 'Time', value: scores.timeRequirement },
    { label: 'Risk', value: scores.risk },
    { label: 'Distraction', value: scores.distractionRisk },
  ]

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg px-3 py-1 text-sm font-semibold', recMeta.bg, recMeta.color)}>
          {compositeScore}/100
        </div>
        <span className={cn('text-sm font-medium', recMeta.color)}>{recMeta.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {positiveDims.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between rounded-md bg-[#0a0a0c] px-2 py-1">
            <span className="text-[10px] text-[#3a3a50]">{label}</span>
            <span className={cn(
              'text-[11px] font-medium tabular-nums',
              value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-[#4a4a60]'
            )}>
              {value > 0 ? '+' : ''}{value}
            </span>
          </div>
        ))}
        {costDims.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between rounded-md bg-[#0a0a0c] px-2 py-1">
            <span className="text-[10px] text-[#3a3a50]">{label}</span>
            <span className={cn(
              'text-[11px] font-medium tabular-nums',
              value < -3 ? 'text-red-400' : value < -1 ? 'text-amber-400' : 'text-[#4a4a60]'
            )}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Disambiguation card ──────────────────────────────────────────────────────

interface DisambiguationDetailProps {
  entityType: 'contact' | 'goal'
  name: string
  candidates: Array<{ id: string; label: string }>
  notFound: boolean
  onPick: (id: string) => void
  onCreateNew?: () => void
  onDismiss: () => void
}

function DisambiguationDetail({
  entityType, name, candidates, notFound, onPick, onDismiss,
}: DisambiguationDetailProps) {
  const Icon = entityType === 'contact' ? Users : Target

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
        <Icon className="h-3 w-3" />
        {notFound
          ? `No ${entityType} named "${name}" found`
          : `Multiple ${entityType === 'contact' ? 'contacts' : 'goals'} match "${name}" — pick one:`}
      </div>
      {!notFound && (
        <div className="space-y-1">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              className="w-full rounded-lg border border-[#1e1e2a] px-3 py-1.5 text-left text-xs text-[#8080a0] transition-all hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:text-indigo-300"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={onDismiss}
        className="text-[10px] text-[#3a3a50] hover:text-[#5a5a75] transition-colors"
      >
        Dismiss this action
      </button>
    </div>
  )
}

// ─── Payload summary (one-liner) ──────────────────────────────────────────────

function payloadSummary(action: CaptureAction): string {
  switch (action.kind) {
    case 'upsert_daily': {
      const parts: string[] = []
      if (action.payload.morning) parts.push('morning plan')
      if (action.payload.evening) {
        const count = Object.entries(action.payload.evening).filter(([k, v]) => k.startsWith('did') && v !== undefined).length
        if (count) parts.push(`${count} evening field${count !== 1 ? 's' : ''}`)
        if (action.payload.evening.biggestWin) parts.push(`win: ${action.payload.evening.biggestWin.slice(0, 50)}`)
      }
      return parts.join(' · ') || 'Daily entry update'
    }
    case 'log_interaction':
      return `${action.payload.type} with ${action.payload.contactName} — ${action.payload.summary.slice(0, 80)}`
    case 'create_contact':
      return `New: ${action.payload.name}${action.payload.role ? ` (${action.payload.role})` : ''}`
    case 'update_contact':
      return `${action.payload.contactName} — ${Object.keys(action.payload.fields).join(', ')}`
    case 'create_goal':
      return `"${action.payload.title}"`
    case 'update_goal':
      return action.payload.goalTitle
        ? `"${action.payload.goalTitle}" — ${Object.entries(action.payload.fields).map(([k, v]) => `${k}: ${v}`).join(', ')}`
        : Object.entries(action.payload.fields).map(([k, v]) => `${k}: ${v}`).join(', ')
    case 'create_decision':
      return `"${action.payload.title}"`
    case 'update_weekly':
      return Object.keys(action.payload.fields).join(', ')
    case 'update_compass':
      return [
        ...Object.keys(action.payload.fields ?? {}),
        ...(action.payload.addCoreValues?.map(() => 'core value') ?? []),
        ...(action.payload.addPersonalRules?.map(() => 'rule') ?? []),
      ].join(', ') || 'Compass update'
    default:
      return ''
  }
}

// ─── Single action card ───────────────────────────────────────────────────────

type CardStatus = 'disambiguating' | 'pending' | 'applying' | 'applied' | 'dismissed'

interface CardState {
  preResolved: PreResolvedAction
  status: CardStatus
  countdownSeconds: number
}

interface ActionCardProps {
  card: CardState
  onApply: () => void
  onDismiss: () => void
  onDisambiguate: (chosenId: string) => void
  showDebug: boolean
}

function ActionCard({ card, onApply, onDismiss, onDisambiguate, showDebug }: ActionCardProps) {
  const { preResolved, status, countdownSeconds } = card
  const { action, resolution } = preResolved
  const [debugOpen, setDebugOpen] = useState(false)
  const meta = TIER_META[action.tier]

  const isDone = status === 'applied' || status === 'dismissed'
  const isDisambig = status === 'disambiguating'
  const needsDisambig = resolution.status === 'ambiguous' || resolution.status === 'not_found'

  const borderColor =
    status === 'applied' ? 'border-emerald-400/20' :
    status === 'dismissed' ? 'border-[#1e1e2a]' :
    isDisambig ? 'border-amber-400/20' :
    action.tier === 'auto' ? 'border-emerald-400/15' :
    action.tier === 'confirm' ? 'border-amber-400/20' :
    'border-orange-400/20'

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all duration-200',
      borderColor,
      'bg-[#0d0d12]',
      isDone && 'opacity-60',
    )}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          status === 'applied' ? 'bg-emerald-400/20' :
          isDisambig ? 'bg-amber-400/10' :
          action.tier === 'auto' ? 'bg-emerald-400/10' :
          action.tier === 'confirm' ? 'bg-amber-400/10' :
          'bg-orange-400/10'
        )}>
          {status === 'applied' ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : status === 'applying' ? (
            <div className="h-3 w-3 animate-spin rounded-full border border-emerald-400 border-t-transparent" />
          ) : isDisambig ? (
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
          ) : (
            <div className={cn(
              'h-2 w-2 rounded-full',
              action.tier === 'auto' ? 'bg-emerald-400' :
              action.tier === 'confirm' ? 'bg-amber-400' :
              'bg-orange-400'
            )} />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4a4a60]">
              {ACTION_LABELS[action.kind]}
            </span>
            <span className={cn(
              'text-[10px] font-medium',
              status === 'applied' ? 'text-emerald-400' :
              status === 'dismissed' ? 'text-[#3a3a50]' :
              isDisambig ? 'text-amber-400' :
              meta.color
            )}>
              {status === 'applied' ? 'Applied' :
               status === 'dismissed' ? 'Dismissed' :
               isDisambig ? 'Needs clarification' :
               meta.label}
            </span>
          </div>

          {/* Summary line */}
          <p className="mt-0.5 text-sm text-[#c0c0d8]">{payloadSummary(action)}</p>

          {/* Rich detail */}
          {!isDone && (
            <>
              {isDisambig && resolution.status !== 'na' && (resolution.status === 'ambiguous' || resolution.status === 'not_found') && (
                <DisambiguationDetail
                  entityType={resolution.entityType}
                  name={resolution.name}
                  candidates={resolution.status === 'ambiguous' ? resolution.candidates : []}
                  notFound={resolution.status === 'not_found'}
                  onPick={onDisambiguate}
                  onDismiss={onDismiss}
                />
              )}
              {!isDisambig && action.kind === 'upsert_daily' && <DailyDetail action={action} />}
              {!isDisambig && (action.kind === 'create_goal' || action.kind === 'update_goal') && <GoalDetail action={action} />}
              {!isDisambig && action.kind === 'create_decision' && <DecisionDetail action={action} />}
            </>
          )}

          {/* Debug */}
          {showDebug && (
            <button
              onClick={() => setDebugOpen((v) => !v)}
              className="mt-2 flex items-center gap-1 text-[10px] text-[#3a3a50] hover:text-[#6b6b88]"
            >
              {debugOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Debug
            </button>
          )}
          {showDebug && debugOpen && (
            <div className="mt-2 rounded-lg bg-[#0a0a0c] p-2 text-[10px] font-mono text-[#4a4a60]">
              <p>Confidence: {(action.confidence * 100).toFixed(0)}%</p>
              <p>Reasoning: {action.reasoning}</p>
              <pre className="mt-1 whitespace-pre-wrap break-all">{JSON.stringify(action.payload, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Apply / dismiss buttons */}
        {!isDone && !isDisambig && action.tier !== 'auto' && status !== 'applying' && (
          <div className="flex shrink-0 items-center gap-2">
            {action.tier === 'confirm' && (
              <span className="text-[11px] text-amber-400">{countdownSeconds}s</span>
            )}
            <button
              onClick={onDismiss}
              className="rounded-md border border-[#1e1e2a] px-2 py-1 text-[11px] text-[#5a5a75] transition-colors hover:border-red-400/30 hover:text-red-400"
            >
              Dismiss
            </button>
            <button
              onClick={onApply}
              className={cn(
                'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                action.tier === 'confirm'
                  ? 'bg-amber-400/15 text-amber-300 hover:bg-amber-400/25'
                  : 'bg-orange-400/15 text-orange-300 hover:bg-orange-400/25'
              )}
            >
              Apply
            </button>
          </div>
        )}
        {!isDone && !isDisambig && action.tier === 'auto' && status !== 'applying' && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-md border border-[#1e1e2a] px-2 py-1 text-[11px] text-[#3a3a50] transition-colors hover:text-[#5a5a75]"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ActionPreview (orchestrator) ────────────────────────────────────────────

const CONFIRM_COUNTDOWN = 5

export interface ActionPreviewProps {
  preResolvedActions: PreResolvedAction[]
  onApplied: (applied: AppliedAction[]) => void
  onAllDone: () => void
  onExecute: (actions: CaptureAction[]) => Promise<AppliedAction[]>
  showDebug?: boolean
}

export function ActionPreview({
  preResolvedActions,
  onApplied,
  onAllDone,
  onExecute,
  showDebug = false,
}: ActionPreviewProps) {
  const [cards, setCards] = useState<CardState[]>(() =>
    preResolvedActions.map((pr) => ({
      preResolved: pr,
      // Ambiguous/not-found entities start in disambiguating state
      status: (pr.resolution.status === 'ambiguous' || pr.resolution.status === 'not_found')
        ? 'disambiguating'
        : 'pending',
      countdownSeconds: CONFIRM_COUNTDOWN,
    }))
  )

  const timersRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map())
  const processingRef = useRef(false)

  const checkAllDone = useCallback(() => {
    setTimeout(() => {
      setCards((prev) => {
        const allDone = prev.every((c) => c.status === 'applied' || c.status === 'dismissed')
        if (allDone) onAllDone()
        return prev
      })
    }, 100)
  }, [onAllDone])

  const applyIndices = useCallback(async (indices: number[]) => {
    if (processingRef.current) return
    processingRef.current = true

    // Snapshot current card state at call time
    setCards((prev) => {
      const updated = [...prev]
      for (const i of indices) {
        if (updated[i]?.status === 'pending') {
          updated[i] = { ...updated[i], status: 'applying' }
        }
      }
      return updated
    })

    // Yield to let the state update render before we read
    await new Promise((r) => setTimeout(r, 0))

    setCards((prev) => {
      const toApply = indices
        .filter((i) => prev[i]?.status === 'applying')
        .map((i) => prev[i].preResolved.action)

      if (toApply.length > 0) {
        onExecute(toApply)
          .then((result) => {
            onApplied(result)
            setCards((s) => {
              const u = [...s]
              for (const i of indices) {
                if (u[i]?.status === 'applying') u[i] = { ...u[i], status: 'applied' }
              }
              return u
            })
            processingRef.current = false
            checkAllDone()
          })
          .catch(() => {
            setCards((s) => {
              const u = [...s]
              for (const i of indices) {
                if (u[i]?.status === 'applying') u[i] = { ...u[i], status: 'dismissed' }
              }
              return u
            })
            processingRef.current = false
            checkAllDone()
          })
      } else {
        processingRef.current = false
      }

      return prev
    })
  }, [onExecute, onApplied, checkAllDone])

  const startCountdown = useCallback((index: number) => {
    const interval = setInterval(() => {
      setCards((prev) => {
        const card = prev[index]
        if (!card || card.status !== 'pending') {
          clearInterval(timersRef.current.get(index))
          return prev
        }
        const next = card.countdownSeconds - 1
        if (next <= 0) {
          clearInterval(timersRef.current.get(index))
          applyIndices([index])
          return prev
        }
        const updated = [...prev]
        updated[index] = { ...card, countdownSeconds: next }
        return updated
      })
    }, 1000)
    timersRef.current.set(index, interval)
  }, [applyIndices])

  // Auto-apply 'auto' tier and start 'confirm' countdowns on mount
  useEffect(() => {
    const autoIndices: number[] = []
    cards.forEach((card, i) => {
      if (card.status === 'pending') {
        if (card.preResolved.action.tier === 'auto') autoIndices.push(i)
        else if (card.preResolved.action.tier === 'confirm') startCountdown(i)
      }
    })
    if (autoIndices.length > 0) applyIndices(autoIndices)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismissIndex = useCallback((index: number) => {
    clearInterval(timersRef.current.get(index))
    setCards((prev) => {
      const updated = [...prev]
      if (updated[index] && updated[index].status !== 'applied') {
        updated[index] = { ...updated[index], status: 'dismissed' }
      }
      return updated
    })
    checkAllDone()
  }, [checkAllDone])

  const disambiguate = useCallback((index: number, chosenId: string) => {
    setCards((prev) => {
      const updated = [...prev]
      const card = updated[index]
      if (!card) return prev
      const resolvedPR = resolveAction(card.preResolved, chosenId)
      updated[index] = { ...card, preResolved: resolvedPR, status: 'pending' }
      return updated
    })
    // After disambiguating, trigger auto/confirm logic for this card
    setTimeout(() => {
      setCards((prev) => {
        const card = prev[index]
        if (!card || card.status !== 'pending') return prev
        if (card.preResolved.action.tier === 'auto') {
          applyIndices([index])
        } else if (card.preResolved.action.tier === 'confirm') {
          startCountdown(index)
        }
        return prev
      })
    }, 50)
  }, [applyIndices, startCountdown])

  useEffect(() => {
    return () => { timersRef.current.forEach(clearInterval) }
  }, [])

  const appliedCount = cards.filter((c) => c.status === 'applied').length

  if (preResolvedActions.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[#1e1e2a] bg-[#0d0d12] p-4">
        <AlertCircle className="h-4 w-4 text-[#4a4a60]" />
        <p className="text-sm text-[#4a4a60]">No actions extracted from this input.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-[#5a5a75]">
        <Clock className="h-3.5 w-3.5" />
        <span>
          {appliedCount}/{preResolvedActions.length} applied
          {cards.some((c) => c.status === 'disambiguating') && ' · clarification needed'}
        </span>
      </div>
      {cards.map((card, i) => (
        <ActionCard
          key={i}
          card={card}
          onApply={() => applyIndices([i])}
          onDismiss={() => dismissIndex(i)}
          onDisambiguate={(id) => disambiguate(i, id)}
          showDebug={showDebug}
        />
      ))}
    </div>
  )
}
