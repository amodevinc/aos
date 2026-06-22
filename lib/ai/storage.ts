'use client'

import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

const KEYS = {
  API_KEY: 'aos:ai:apikey',
  CONVERSATIONS: 'aos:ai:conversations',
  INSIGHTS: 'aos:ai:insights',
  INSIGHTS_TS: 'aos:ai:insights_ts',
} as const

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(val))
}

// ─── API Key ─────────────────────────────────────────────────────────────────

export const apiKeyStorage = {
  get: (): string => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(KEYS.API_KEY) ?? ''
  },
  set: (key: string): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(KEYS.API_KEY, key)
  },
  clear: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(KEYS.API_KEY)
  },
}

// ─── Conversation history ─────────────────────────────────────────────────────

export interface Conversation {
  id: string
  messages: MessageParam[]
  createdAt: string
  updatedAt: string
}

export const conversationStorage = {
  get: (): Conversation | null => read<Conversation | null>(KEYS.CONVERSATIONS, null),
  save: (conv: Conversation): void => write(KEYS.CONVERSATIONS, conv),
  clear: (): void => {
    if (typeof window !== 'undefined') localStorage.removeItem(KEYS.CONVERSATIONS)
  },
}

// ─── Cached AI Insights ───────────────────────────────────────────────────────

export const insightsStorage = {
  get: (): string[] => read<string[]>(KEYS.INSIGHTS, []),
  getTimestamp: (): number => read<number>(KEYS.INSIGHTS_TS, 0),
  save: (insights: string[]): void => {
    write(KEYS.INSIGHTS, insights)
    write(KEYS.INSIGHTS_TS, Date.now())
  },
  // Insights older than 4 hours are considered stale
  isStale: (): boolean => Date.now() - read<number>(KEYS.INSIGHTS_TS, 0) > 4 * 60 * 60 * 1000,
}
