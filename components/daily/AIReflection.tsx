'use client'

import { useState } from 'react'
import { Brain } from 'lucide-react'
import type { EveningReview, DailyEntry } from '@/types'
import { callAI } from '@/lib/ai/client'
import { buildAOSContext } from '@/lib/ai/context'
import { EVENING_REFLECTION_PROMPT } from '@/lib/ai/prompts'
import { apiKeyStorage } from '@/lib/ai/storage'
import {
  dailyStorage,
  goalStorage,
  decisionStorage,
  weeklyStorage,
  compassStorage,
} from '@/lib/storage'
import { cn } from '@/lib/utils'

interface AIReflectionProps {
  entry: DailyEntry
}

function buildReviewSummary(entry: DailyEntry): string {
  const { evening: e, alignmentScore } = entry
  if (!e) return 'No evening review completed.'

  const checks = [
    e.didTrain && 'trained',
    e.didEatWell && 'ate well',
    e.didRecover && 'recovered',
    e.didLearn && 'learned/built',
    e.didMoveProject && 'moved a project forward',
    e.didStrengthenRelationship && 'strengthened a relationship',
    e.didCreateValue && 'created value',
    e.didAvoidDistractions && 'avoided distractions',
    e.didActInAlignment && 'acted in alignment',
  ].filter(Boolean)

  const missed = [
    !e.didTrain && 'did NOT train',
    !e.didEatWell && 'did NOT eat well',
    !e.didLearn && 'did NOT learn/build',
    !e.didMoveProject && 'did NOT move a project forward',
    !e.didCreateValue && 'did NOT create value',
    !e.didActInAlignment && 'did NOT act in alignment',
  ].filter(Boolean)

  return [
    `Date: ${entry.date}`,
    `Alignment score: ${alignmentScore}/100`,
    `Completed: ${checks.join(', ') || 'nothing'}`,
    `Missed: ${missed.join(', ') || 'nothing'}`,
    e.biggestWin ? `Biggest win: ${e.biggestWin}` : '',
    e.biggestMistake ? `Biggest mistake: ${e.biggestMistake}` : '',
    e.lessonLearned ? `Lesson: ${e.lessonLearned}` : '',
    e.adjustmentTomorrow ? `Adjustment tomorrow: ${e.adjustmentTomorrow}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function AIReflection({ entry }: AIReflectionProps) {
  const [reflection, setReflection] = useState('')
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
      const reviewSummary = buildReviewSummary(entry)

      const raw = await callAI({
        apiKey: key,
        system: EVENING_REFLECTION_PROMPT(context, reviewSummary),
        messages: [{ role: 'user', content: 'Give me my evening reflection.' }],
        maxTokens: 600,
      })

      setReflection(raw)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400/70">
            AI Reflection
          </p>
        </div>
        {!reflection && (
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-lg bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/25 transition-colors ring-1 ring-indigo-500/20 disabled:opacity-50"
          >
            {loading ? 'Analyzing…' : 'Get Reflection'}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {reflection ? (
        <div className="space-y-2">
          {reflection.split('\n\n').map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-[#c0c0d8]">
              {para}
            </p>
          ))}
          <button
            onClick={() => { setReflection(''); generate() }}
            disabled={loading}
            className="mt-1 text-xs text-[#4a4a60] hover:text-indigo-400 transition-colors"
          >
            Regenerate
          </button>
        </div>
      ) : !loading ? (
        <p className="text-sm text-[#4a4a60]">
          Get an honest AI reflection on today based on your review and goals.
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
          <div className="h-1 w-1 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
          <div className="h-1 w-1 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
          <span className="text-xs text-[#4a4a60]">Coach is reflecting…</span>
        </div>
      )}
    </div>
  )
}
