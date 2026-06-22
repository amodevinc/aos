'use client'

import { useState } from 'react'
import { Brain } from 'lucide-react'
import type { Decision } from '@/types'
import { callAI } from '@/lib/ai/client'
import { buildAOSContext } from '@/lib/ai/context'
import { DECISION_ANALYSIS_PROMPT } from '@/lib/ai/prompts'
import { apiKeyStorage } from '@/lib/ai/storage'
import {
  dailyStorage,
  goalStorage,
  decisionStorage,
  weeklyStorage,
  compassStorage,
} from '@/lib/storage'

interface AIDecisionAnalysisProps {
  decision: Decision
}

function buildDecisionSummary(d: Decision): string {
  return [
    `Decision: ${d.title}`,
    d.description ? `Context: ${d.description}` : '',
    `Composite score: ${d.compositeScore}/100`,
    `Recommendation: ${d.recommendation}`,
    `Health impact: ${d.scores.healthImpact}`,
    `Capability impact: ${d.scores.capabilityImpact}`,
    `Network impact: ${d.scores.networkImpact}`,
    `Wealth impact: ${d.scores.wealthImpact}`,
    `Mission alignment: ${d.scores.missionAlignment}`,
    `Long-term leverage: ${d.scores.longTermLeverage}`,
    `Time requirement: ${d.scores.timeRequirement}`,
    `Risk: ${d.scores.risk}`,
    `Distraction risk: ${d.scores.distractionRisk}`,
    `Main upside: ${d.mainUpside}`,
    `Main downside: ${d.mainDownside}`,
    `Opportunity cost: ${d.opportunityCost}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function AIDecisionAnalysis({ decision }: AIDecisionAnalysisProps) {
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasKey = !!apiKeyStorage.get()

  if (!hasKey) return null

  const generate = async () => {
    const key = apiKeyStorage.get()
    if (!key) return
    setLoading(true)
    setError('')

    try {
      const [allEntries, goals, decisions, weeklyReviews, compass] = await Promise.all([
        dailyStorage.getAll(),
        goalStorage.getAll(),
        decisionStorage.getAll(),
        weeklyStorage.getAll(),
        compassStorage.get(),
      ])
      const context = buildAOSContext({ allEntries, goals, decisions, weeklyReviews, compass })

      const raw = await callAI({
        apiKey: key,
        system: DECISION_ANALYSIS_PROMPT(context, buildDecisionSummary(decision)),
        messages: [{ role: 'user', content: 'Give me your analysis of this decision.' }],
        maxTokens: 500,
      })

      setAnalysis(raw)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-indigo-400" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400/70">
            AI Second Opinion
          </p>
        </div>
        {!analysis && (
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-md bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-400 hover:bg-indigo-500/25 transition-colors disabled:opacity-50"
          >
            {loading ? 'Analyzing…' : 'Get Analysis'}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {analysis && (
        <div className="mt-3 space-y-2">
          {analysis.split('\n\n').map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-[#c0c0d8]">
              {para}
            </p>
          ))}
          <button
            onClick={() => { setAnalysis(''); generate() }}
            disabled={loading}
            className="text-[10px] text-[#4a4a60] hover:text-indigo-400 transition-colors"
          >
            Regenerate
          </button>
        </div>
      )}

      {loading && !analysis && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="h-1 w-1 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
          <div className="h-1 w-1 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
          <div className="h-1 w-1 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
          <span className="text-xs text-[#4a4a60]">Thinking…</span>
        </div>
      )}
    </div>
  )
}
