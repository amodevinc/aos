import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import type { Pillar, PillarScores } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── ID generation ───────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d')
}

export function getWeekRange(date: Date = new Date()): {
  start: string
  end: string
} {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }).toISOString().slice(0, 10),
    end: endOfWeek(date, { weekStartsOn: 1 }).toISOString().slice(0, 10),
  }
}

export function isToday(date: string): boolean {
  return date === todayISO()
}

// ─── Pillar config ────────────────────────────────────────────────────────────

export const PILLARS: Pillar[] = ['health', 'capability', 'network', 'wealth', 'mission']

export const PILLAR_META: Record<
  Pillar,
  { label: string; color: string; bg: string; ring: string; description: string }
> = {
  health: {
    label: 'Health',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    ring: 'ring-emerald-400/30',
    description: 'Physical performance, body composition, recovery',
  },
  capability: {
    label: 'Capability',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    ring: 'ring-blue-400/30',
    description: 'Skills, knowledge, AI proficiency, expertise',
  },
  network: {
    label: 'Network',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    ring: 'ring-violet-400/30',
    description: 'Professional relationships, mentors, collaborators',
  },
  wealth: {
    label: 'Wealth',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    ring: 'ring-amber-400/30',
    description: 'Income, businesses, investments, financial freedom',
  },
  mission: {
    label: 'Mission',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    ring: 'ring-rose-400/30',
    description: 'Long-term vision, influence, legacy, alignment',
  },
}

export const PILLAR_CHART_COLORS: Record<Pillar, string> = {
  health: '#34d399',
  capability: '#60a5fa',
  network: '#a78bfa',
  wealth: '#fbbf24',
  mission: '#fb7185',
}

// ─── Score display ────────────────────────────────────────────────────────────

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-blue-400'
  if (score >= 40) return 'text-yellow-400'
  if (score >= 20) return 'text-orange-400'
  return 'text-red-400'
}

export function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-400/10'
  if (score >= 60) return 'bg-blue-400/10'
  if (score >= 40) return 'bg-yellow-400/10'
  if (score >= 20) return 'bg-orange-400/10'
  return 'bg-red-400/10'
}

export function averagePillarScore(pillarScores: PillarScores): number {
  const vals = Object.values(pillarScores)
  if (vals.length === 0) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

// ─── String helpers ───────────────────────────────────────────────────────────

export function truncate(str: string, max = 80): string {
  return str.length <= max ? str : str.slice(0, max - 1) + '…'
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
