'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { callAI } from '@/lib/ai/client'
import { buildAOSContext } from '@/lib/ai/context'
import { INSIGHTS_SYSTEM_PROMPT } from '@/lib/ai/prompts'
import { apiKeyStorage, insightsStorage } from '@/lib/ai/storage'
import {
  dailyStorage,
  goalStorage,
  decisionStorage,
  weeklyStorage,
  compassStorage,
  contactStorage,
} from '@/lib/storage'
import { cn } from '@/lib/utils'

function parseInsights(raw: string): string[] {
  return raw
    .split('\n')
    .filter((l) => l.trim().startsWith('-'))
    .map((l) => l.replace(/^-\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
}

export function AIInsights() {
  const [insights, setInsights] = useState<string[]>(() => insightsStorage.get())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const hasKey = !!apiKeyStorage.get()

  const generate = async () => {
    const key = apiKeyStorage.get()
    if (!key) return
    setLoading(true)
    setError('')

    try {
      const [allEntries, goals, decisions, weeklyReviews, contacts, compass] = await Promise.all([
        dailyStorage.getAll(),
        goalStorage.getAll(),
        decisionStorage.getAll(),
        weeklyStorage.getAll(),
        contactStorage.getAll(),
        compassStorage.get(),
      ])
      const context = buildAOSContext({ allEntries, goals, decisions, weeklyReviews, contacts, compass })

      const raw = await callAI({
        apiKey: key,
        system: INSIGHTS_SYSTEM_PROMPT(context),
        messages: [{ role: 'user', content: 'Generate my 3 AOS insights.' }],
        maxTokens: 512,
      })

      const parsed = parseInsights(raw)
      if (parsed.length > 0) {
        setInsights(parsed)
        insightsStorage.save(parsed)
      } else {
        setError('Could not parse insights. Try again.')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!hasKey) return null

  return (
    <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4a4a60]">
            AI Insights
          </h2>
          {insightsStorage.isStale() && insights.length > 0 && (
            <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
              stale
            </span>
          )}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={cn(
            'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
            loading
              ? 'text-[#4a4a60]'
              : 'text-indigo-400 hover:bg-indigo-500/10'
          )}
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          {loading ? 'Analyzing…' : insights.length > 0 ? 'Refresh' : 'Generate'}
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {insights.length === 0 && !loading ? (
        <p className="text-sm text-[#3a3a50]">
          Click Generate to get AI-powered pattern analysis of your data.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500/60" />
              <p className="text-sm leading-relaxed text-[#a0a0c0]">{insight}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
