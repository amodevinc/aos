'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Mic, MicOff, Send, RotateCcw, History, ChevronDown, ChevronUp, Undo2, Sparkles, AlertTriangle,
} from 'lucide-react'

import { ActionPreview } from '@/components/capture/ActionPreview'

import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition'
import { buildAOSContext } from '@/lib/ai/context'
import { apiKeyStorage } from '@/lib/ai/storage'
import {
  dailyStorage, goalStorage, decisionStorage,
  weeklyStorage, compassStorage, contactStorage,
} from '@/lib/storage'
import { executeActions, undoSession } from '@/lib/agent/executor'
import { captureSessionStorage } from '@/lib/agent/storage'
import { classifyDomains, buildTrimmedContext, buildStateSnapshot } from '@/lib/agent/context-trim'
import { preResolveActions } from '@/lib/agent/preresolve'
import { parseError } from '@/lib/utils/errors'
import { cn, todayISO, formatDate } from '@/lib/utils'
import { useToast } from '@/lib/hooks/useToast'

import type { AgentResponse, AppliedAction, CaptureAction, CaptureSession, ObservabilityMetadata } from '@/lib/agent/types'
import type { PreResolvedAction } from '@/lib/agent/preresolve'
import type { CaptureContextData } from '@/lib/agent/context-trim'

type PageState = 'idle' | 'processing' | 'preview' | 'done'

// ─── History row ─────────────────────────────────────────────────────────────

function SessionRow({ session, onUndo }: { session: CaptureSession; onUndo: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const meta = session.metadata

  return (
    <div className="rounded-xl border border-[#1e1e2a] bg-[#0d0d12]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-[10px] font-semibold uppercase tracking-widest',
              session.status === 'undone' ? 'text-[#3a3a50]' : 'text-indigo-400'
            )}>
              {session.status === 'undone' ? 'Undone' : `${session.actions.length} action${session.actions.length !== 1 ? 's' : ''}`}
            </span>
            <span className="text-[10px] text-[#3a3a50]">{formatDate(session.createdAt)}</span>
            {meta && (
              <span className="text-[10px] text-[#2a2a38]">
                {(meta.extractionInputTokens + meta.extractionOutputTokens).toLocaleString()} tok · {meta.totalMs}ms
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-[#8080a0]">{session.summary || session.transcript.slice(0, 120)}</p>
        </div>
        {open ? <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-[#3a3a50]" /> : <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-[#3a3a50]" />}
      </button>

      {open && (
        <div className="border-t border-[#1e1e2a] px-4 pb-4">
          <p className="mt-3 text-xs italic text-[#4a4a60]">"{session.transcript}"</p>
          {session.actions.length > 0 && (
            <div className="mt-3 space-y-1">
              {session.actions.map(({ action }: AppliedAction, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#5a5a75]">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500/40" />
                  <span className="font-medium text-[#6b6b88]">{action.kind.replace(/_/g, ' ')}</span>
                  <span className="text-[#3a3a50]">·</span>
                  <span className="line-clamp-1">{action.reasoning}</span>
                </div>
              ))}
            </div>
          )}
          {meta?.evaluatorCorrections && meta.evaluatorCorrections.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/60">Evaluator corrections</p>
              {meta.evaluatorCorrections.map((c, i) => (
                <p key={i} className="text-[11px] text-amber-400/70">· {c}</p>
              ))}
            </div>
          )}
          {session.status === 'applied' && session.actions.length > 0 && (
            <button
              onClick={() => onUndo(session.id)}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#1e1e2a] px-3 py-1.5 text-xs text-[#5a5a75] hover:border-red-400/30 hover:text-red-400 transition-colors"
            >
              <Undo2 className="h-3 w-3" /> Undo this session
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Observability panel (shown in debug mode) ────────────────────────────────

function ObservabilityPanel({ metadata, domains }: { metadata: ObservabilityMetadata; domains: string[] }) {
  const extractionTok = metadata.extractionInputTokens + metadata.extractionOutputTokens
  const evaluatorTok = metadata.evaluatorInputTokens + metadata.evaluatorOutputTokens
  return (
    <div className="rounded-xl border border-[#1e1e2a] bg-[#08080c] p-4 font-mono text-[10px] text-[#3a3a50] space-y-1">
      <p className="text-[#4a4a60] font-semibold">Observability</p>
      <p>Domains detected: <span className="text-indigo-400/60">{domains.join(', ') || 'none'}</span></p>
      <p>Extraction: <span className="text-[#4a4a60]">{metadata.extractionMs}ms</span> · {extractionTok.toLocaleString()} tokens ({metadata.extractionInputTokens.toLocaleString()} in / {metadata.extractionOutputTokens.toLocaleString()} out)</p>
      {evaluatorTok > 0 && (
        <p>Evaluator (Haiku): <span className="text-[#4a4a60]">{evaluatorTok.toLocaleString()} tokens</span></p>
      )}
      <p>Total latency: <span className="text-[#4a4a60]">{metadata.totalMs}ms</span></p>
      {metadata.evaluatorCorrections.length > 0 && (
        <div className="mt-2 border-t border-[#1e1e2a] pt-2 space-y-0.5">
          <p className="text-amber-500/60">Evaluator corrections ({metadata.evaluatorCorrections.length}):</p>
          {metadata.evaluatorCorrections.map((c, i) => <p key={i} className="text-amber-400/50">· {c}</p>)}
        </div>
      )}
    </div>
  )
}

// ─── No API key gate ─────────────────────────────────────────────────────────

function NoKeyGate() {
  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10">
          <Mic className="h-6 w-6 text-indigo-400" />
        </div>
        <p className="font-medium text-white">API key required</p>
        <p className="mt-1 text-sm text-[#5a5a75]">
          Go to{' '}
          <a href="/settings" className="text-indigo-400 underline-offset-2 hover:underline">Settings</a>{' '}
          and enter your Anthropic API key to use voice capture.
        </p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CapturePage() {
  const toast = useToast()
  const { transcript, interimTranscript, state: voiceState, isSupported, errorMessage, start, stop, reset } =
    useSpeechRecognition()

  const [textInput, setTextInput] = useState('')
  const [pageState, setPageState] = useState<PageState>('idle')
  const [agentResult, setAgentResult] = useState<AgentResponse | null>(null)
  const [preResolved, setPreResolved] = useState<PreResolvedAction[]>([])
  const [insight, setInsight] = useState('')
  const [insightLoading, setInsightLoading] = useState(false)
  const [metadata, setMetadata] = useState<ObservabilityMetadata | null>(null)
  const [detectedDomains, setDetectedDomains] = useState<string[]>([])
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [history, setHistory] = useState<CaptureSession[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [lastSessionId, setLastSessionId] = useState<string | null>(null)
  const [undoTimeoutRef] = useState<{ current: ReturnType<typeof setTimeout> | null }>({ current: null })

  // Raw data refs — used for trimmed context + state snapshot + preresolve
  const dataRef = useRef<CaptureContextData | null>(null)
  const appliedActionsRef = useRef<CaptureAction[]>([])

  const activeTranscript = transcript || textInput
  const displayTranscript = voiceState === 'listening'
    ? transcript + (interimTranscript ? ' ' + interimTranscript : '')
    : activeTranscript

  // Init
  useEffect(() => {
    const key = apiKeyStorage.get()
    if (key) setApiKey(key)
    loadData()
    loadHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [allEntries, goals, decisions, weeklyReviews, contacts, compass] = await Promise.all([
        dailyStorage.getAll(), goalStorage.getAll(), decisionStorage.getAll(),
        weeklyStorage.getAll(), contactStorage.getAll(), compassStorage.get(),
      ])
      dataRef.current = { allEntries, goals, decisions, weeklyReviews, contacts, compass }
    } catch {
      // Non-fatal
    }
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await captureSessionStorage.getRecent(10))
    } catch {
      // Non-fatal
    }
  }, [])

  useEffect(() => {
    if (transcript) setTextInput(transcript)
  }, [transcript])

  const toggleMic = () => {
    if (voiceState === 'listening') { stop() } else { reset(); start() }
  }

  const process = async () => {
    const text = activeTranscript.trim()
    if (!text || pageState === 'processing') return

    setPageState('processing')
    setError('')
    setAgentResult(null)
    setPreResolved([])
    setInsight('')
    setMetadata(null)

    // ── Build trimmed context from raw data ──────────────────────────────────
    const data = dataRef.current
    const domains = classifyDomains(text)
    setDetectedDomains([...domains])

    const trimmedContext = data
      ? buildTrimmedContext(data, domains, { transcript: text })
      : buildAOSContext({ // fallback if data not loaded yet
          allEntries: [], goals: [], decisions: [], weeklyReviews: [],
          contacts: [], compass: { missionStatement: '', tenYearVision: '', threeYearMission: '',
            currentSeason: '', coreValues: [], personalRules: [], antiRules: [], nonNegotiables: [],
            identityStatement: '', updatedAt: '' }
        })

    const stateSnapshot = data ? buildStateSnapshot(data) : undefined

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          transcript: text,
          context: trimmedContext,
          today: todayISO(),
          stateSnapshot,
        }),
      })

      const data2 = await res.json()
      if (!res.ok || data2.error) throw new Error(data2.error ?? 'Agent failed')

      const result = data2 as AgentResponse
      setAgentResult(result)

      // Attach detected domains to metadata before storing
      if (result.metadata) {
        const fullMeta = { ...result.metadata, domainsDetected: [...domains] }
        setMetadata(fullMeta)
      }

      // Pre-resolve entities against local data
      const contacts = dataRef.current?.contacts ?? []
      const goals = dataRef.current?.goals ?? []
      const resolved = preResolveActions(result.actions, contacts, goals)
      setPreResolved(resolved)
      setPageState('preview')
    } catch (err) {
      setError(parseError(err))
      setPageState('idle')
    }
  }

  const handleExecute = useCallback(async (actions: CaptureAction[]): Promise<AppliedAction[]> => {
    const text = activeTranscript.trim()
    const summary = agentResult?.summary ?? ''
    const metaToSave = metadata ? { ...metadata } : undefined
    const result = await executeActions(actions, text, summary, metaToSave)

    if (result.sessionId) setLastSessionId(result.sessionId)
    appliedActionsRef.current = [...appliedActionsRef.current, ...actions]

    if (result.failed.length > 0) {
      result.failed.forEach(({ action, error }) => toast.error(`Failed: ${action.kind}`, error))
    }

    return result.applied
  }, [activeTranscript, agentResult, metadata, toast])

  const handleApplied = useCallback((applied: AppliedAction[]) => {
    if (applied.length === 0) return
    toast.success(
      `${applied.length} action${applied.length !== 1 ? 's' : ''} applied`,
      'Tap Undo below to revert.'
    )
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    undoTimeoutRef.current = setTimeout(() => setLastSessionId(null), 30_000)
    loadData()
  }, [toast, loadData, undoTimeoutRef])

  const handleAllDone = useCallback(async () => {
    setPageState('done')
    loadHistory()

    // ── Post-capture insight ─────────────────────────────────────────────────
    const text = activeTranscript.trim()
    const summary = agentResult?.summary ?? ''
    const kindsSeen = appliedActionsRef.current.map((a) => a.kind)
    if (!kindsSeen.length || !apiKey) return

    setInsightLoading(true)
    try {
      // Build a minimal identity + goals context for the insight call
      const data = dataRef.current
      const insightContext = data
        ? buildTrimmedContext(data, new Set(['identity', 'goals', 'daily']))
        : ''

      const res = await fetch('/api/agent/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey, transcript: text, summary,
          actionKinds: kindsSeen,
          context: insightContext,
        }),
      })
      const json = await res.json()
      if (json.insight) setInsight(json.insight)
    } catch {
      // Non-fatal — insight is optional
    } finally {
      setInsightLoading(false)
      appliedActionsRef.current = []
    }
  }, [activeTranscript, agentResult, apiKey, loadHistory])

  const handleUndo = useCallback(async (sessionId: string) => {
    try {
      await undoSession(sessionId)
      toast.info('Capture undone', 'All actions from this session were reversed.')
      await loadHistory()
      await loadData()
    } catch (err) {
      toast.error('Undo failed', parseError(err))
    }
  }, [toast, loadHistory, loadData])

  const clearAndReset = () => {
    reset()
    setTextInput('')
    setPageState('idle')
    setAgentResult(null)
    setPreResolved([])
    setInsight('')
    setMetadata(null)
    setError('')
    setLastSessionId(null)
    appliedActionsRef.current = []
  }

  if (!apiKey) return <div><NoKeyGate /></div>

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Capture</h1>
          <p className="mt-0.5 text-sm text-[#6b6b88]">Speak or type — the agent structures your input automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          {(pageState === 'preview' || pageState === 'done') && (
            <button
              onClick={clearAndReset}
              className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2a] px-3 py-1.5 text-xs text-[#5a5a75] hover:text-[#a0a0c0] transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> New capture
            </button>
          )}
          <button
            onClick={() => setShowDebug((v) => !v)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs transition-colors',
              showDebug ? 'border-indigo-500/30 text-indigo-400' : 'border-[#1e1e2a] text-[#3a3a50] hover:text-[#5a5a75]'
            )}
          >
            Debug
          </button>
        </div>
      </div>

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      {(pageState === 'idle' || pageState === 'processing') && (
        <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-4">
          <div className="mb-4 flex justify-center">
            <button
              onClick={toggleMic}
              disabled={!isSupported}
              className={cn(
                'flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-200',
                voiceState === 'listening'
                  ? 'animate-pulse border-indigo-400 bg-indigo-500/20 text-indigo-300'
                  : isSupported
                  ? 'border-[#1e1e2a] bg-[#0d0d12] text-[#5a5a75] hover:border-indigo-500/50 hover:text-indigo-400'
                  : 'border-[#1a1a22] bg-[#0a0a0c] text-[#2a2a38] cursor-not-allowed'
              )}
            >
              {voiceState === 'listening' ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>
          </div>

          <p className="mb-3 text-center text-xs text-[#4a4a60]">
            {voiceState === 'listening'
              ? 'Listening… tap to stop'
              : !isSupported
              ? 'Voice not supported — type below'
              : 'Tap mic to speak, or type below'}
          </p>

          {errorMessage && <p className="mb-3 text-center text-xs text-amber-400">{errorMessage}</p>}

          <div className="relative">
            <textarea
              value={displayTranscript}
              onChange={(e) => {
                if (voiceState !== 'listening') { setTextInput(e.target.value); reset() }
              }}
              placeholder="Your capture will appear here as you speak. You can also type directly…"
              rows={4}
              className="w-full resize-none rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2.5 text-sm text-[#e8e8f0] placeholder-[#2a2a3a] outline-none focus:border-indigo-500/50"
              style={{ minHeight: 100 }}
              disabled={voiceState === 'listening'}
            />
            {interimTranscript && (
              <p className="absolute bottom-2 right-2 text-[10px] italic text-indigo-400/60">{interimTranscript}</p>
            )}
          </div>

          {/* Domain preview */}
          {showDebug && activeTranscript.trim() && (
            <p className="mt-2 text-[10px] text-[#3a3a50]">
              Domains: {[...classifyDomains(activeTranscript)].join(', ')}
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={process}
              disabled={!activeTranscript.trim() || pageState === 'processing'}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                activeTranscript.trim() && pageState !== 'processing'
                  ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                  : 'bg-[#1a1a22] text-[#3a3a50] cursor-not-allowed'
              )}
            >
              {pageState === 'processing' ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" /> Processing…</>
              ) : (
                <><Send className="h-3.5 w-3.5" /> Process</>
              )}
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}

      {/* ── Agent summary ───────────────────────────────────────────────────── */}
      {(pageState === 'preview' || pageState === 'done') && agentResult && (
        <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-4">
          <p className="text-sm font-medium text-indigo-300">{agentResult.summary}</p>
          <p className="mt-1.5 text-xs italic text-[#4a4a60]">
            "{activeTranscript.slice(0, 120)}{activeTranscript.length > 120 ? '…' : ''}"
          </p>
        </div>
      )}

      {/* ── Evaluator corrections (debug) ───────────────────────────────────── */}
      {showDebug && metadata && metadata.evaluatorCorrections.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">Evaluator corrected {metadata.evaluatorCorrections.length} issue{metadata.evaluatorCorrections.length !== 1 ? 's' : ''}</p>
            {metadata.evaluatorCorrections.map((c, i) => (
              <p key={i} className="text-xs text-amber-300/70">{c}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Observability panel (debug) ─────────────────────────────────────── */}
      {showDebug && metadata && pageState !== 'idle' && (
        <ObservabilityPanel metadata={metadata} domains={detectedDomains} />
      )}

      {/* ── Action preview ──────────────────────────────────────────────────── */}
      {pageState === 'preview' && preResolved.length > 0 && (
        <ActionPreview
          preResolvedActions={preResolved}
          onExecute={handleExecute}
          onApplied={handleApplied}
          onAllDone={handleAllDone}
          showDebug={showDebug}
        />
      )}

      {/* ── Done ────────────────────────────────────────────────────────────── */}
      {pageState === 'done' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <div className="h-5 w-5 flex items-center justify-center rounded-full bg-emerald-400/15">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            Capture complete
          </div>

          {/* Post-capture insight */}
          {(insightLoading || insight) && (
            <div className="rounded-xl border border-[#1e1e2a] bg-[#0d0d12] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400/60" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#3a3a50]">Insight</span>
              </div>
              {insightLoading ? (
                <div className="flex items-center gap-2 text-xs text-[#3a3a50]">
                  <div className="h-3 w-3 animate-spin rounded-full border border-indigo-500/30 border-t-indigo-400" />
                  Generating…
                </div>
              ) : (
                <p className="text-sm text-[#8080a0] leading-relaxed">{insight}</p>
              )}
            </div>
          )}

          {lastSessionId && (
            <button
              onClick={() => handleUndo(lastSessionId)}
              className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2a] px-3 py-1.5 text-xs text-[#5a5a75] hover:border-red-400/30 hover:text-red-400 transition-colors"
            >
              <Undo2 className="h-3 w-3" /> Undo this capture
            </button>
          )}
        </div>
      )}

      {/* ── History ─────────────────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-2 text-xs text-[#4a4a60] hover:text-[#6b6b88] transition-colors"
        >
          <History className="h-3.5 w-3.5" />
          {showHistory ? 'Hide' : 'Show'} capture history ({history.length})
          {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showHistory && (
          <div className="mt-3 space-y-2">
            {history.length === 0 ? (
              <p className="text-xs text-[#3a3a50]">No captures yet.</p>
            ) : (
              history.map((session) => (
                <SessionRow key={session.id} session={session} onUndo={handleUndo} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
