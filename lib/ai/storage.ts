'use client'

import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { createClient } from '@/lib/supabase/client'

const LOCAL_KEYS = {
  API_KEY: 'aos:ai:apikey',
  INSIGHTS: 'aos:ai:insights',
  INSIGHTS_TS: 'aos:ai:insights_ts',
} as const

// ─── API Key (localStorage only — never leaves browser) ───────────────────────

export const apiKeyStorage = {
  get: (): string => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(LOCAL_KEYS.API_KEY) ?? ''
  },
  set: (key: string): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(LOCAL_KEYS.API_KEY, key)
  },
  clear: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(LOCAL_KEYS.API_KEY)
  },
}

// ─── Conversation (Supabase — syncs across devices) ───────────────────────────
// One active conversation per user. Stored as JSONB messages array.

export const conversationStorage = {
  get: async (): Promise<MessageParam[]> => {
    const { data } = await createClient()
      .from('coach_conversations')
      .select('messages')
      .maybeSingle()
    return (data?.messages as MessageParam[]) ?? []
  },

  save: async (messages: MessageParam[]): Promise<void> => {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return
    await createClient().from('coach_conversations').upsert(
      { user_id: user.id, messages, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  },

  clear: async (): Promise<void> => {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user) return
    await createClient()
      .from('coach_conversations')
      .delete()
      .eq('user_id', user.id)
  },
}

// ─── Cached AI Insights (localStorage — per-device, cheap to regenerate) ──────

export const insightsStorage = {
  get: (): string[] => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEYS.INSIGHTS) ?? '[]') as string[]
    } catch { return [] }
  },
  save: (insights: string[]): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(LOCAL_KEYS.INSIGHTS, JSON.stringify(insights))
    localStorage.setItem(LOCAL_KEYS.INSIGHTS_TS, String(Date.now()))
  },
  isStale: (): boolean => {
    if (typeof window === 'undefined') return true
    const ts = Number(localStorage.getItem(LOCAL_KEYS.INSIGHTS_TS) ?? 0)
    return Date.now() - ts > 4 * 60 * 60 * 1000
  },
}
