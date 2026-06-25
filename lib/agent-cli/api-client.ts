import type { AppStore } from '@/types'
import type { CaptureAction, ExecutionResult } from '@/lib/agent/types'
import type { CaptureApplyMode, CaptureResult } from './capture'
import type { ContextFocus } from '@/lib/agent/context-trim'
import { requireConfig } from './config'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiUrl, token } = requireConfig()
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const body = await res.json().catch(() => ({})) as T & { error?: string }
  if (!res.ok) throw new Error(body.error ?? `API ${res.status}`)
  return body
}

export async function fetchContext(focus: ContextFocus = 'today'): Promise<{ context: string; focus: string; exportedAt: string }> {
  const q = focus === 'full' ? '' : `?focus=${encodeURIComponent(focus)}`
  return apiFetch(`/api/cli/context${q}`)
}

export async function fetchExport(): Promise<{ data: AppStore; exportedAt: string }> {
  return apiFetch('/api/cli/data?resource=export')
}

export async function fetchDaily(date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return apiFetch<{ entry: unknown }>(`/api/cli/data?resource=daily${date ? `&date=${date}` : ''}`)
}

export async function fetchGoals(status?: string) {
  const suffix = status ? `&status=${status}` : ''
  return apiFetch<{ goals: unknown[] }>(`/api/cli/data?resource=goals${suffix}`)
}

export async function fetchDecisions(limit = 10) {
  return apiFetch<{ decisions: unknown[] }>(`/api/cli/data?resource=decisions&limit=${limit}`)
}

export async function fetchWeekly(weekStart?: string) {
  const suffix = weekStart ? `&weekStart=${weekStart}` : ''
  return apiFetch(`/api/cli/data?resource=weekly${suffix}`)
}

export async function fetchCompass() {
  return apiFetch<{ compass: unknown }>('/api/cli/data?resource=compass')
}

export async function searchContacts(query: string) {
  return apiFetch<{ bestMatch: unknown; partialMatches: unknown[] }>(
    `/api/cli/data?resource=contacts&q=${encodeURIComponent(query)}`
  )
}

export async function captureTranscript(
  transcript: string,
  options?: { dryRun?: boolean; applyMode?: CaptureApplyMode }
) {
  return apiFetch<CaptureResult>('/api/cli/capture', {
    method: 'POST',
    body: JSON.stringify({
      transcript,
      dryRun: options?.dryRun,
      applyMode: options?.applyMode,
    }),
  })
}

export async function applyActions(
  actions: CaptureAction[],
  transcript?: string,
  summary?: string
): Promise<ExecutionResult> {
  return apiFetch('/api/cli/actions', {
    method: 'POST',
    body: JSON.stringify({ action: 'apply', actions, transcript, summary }),
  })
}

export async function undoCaptureSession(sessionId: string): Promise<void> {
  await apiFetch('/api/cli/actions', {
    method: 'POST',
    body: JSON.stringify({ action: 'undo', sessionId }),
  })
}

export async function initSetup(apiUrl: string): Promise<{ code: string; connectUrl: string }> {
  const res = await fetch(`${apiUrl}/api/cli/setup/init`, { method: 'POST' })
  const body = await res.json() as { code?: string; connectUrl?: string; error?: string }
  if (!res.ok || !body.code || !body.connectUrl) {
    throw new Error(body.error ?? 'Setup init failed')
  }
  return { code: body.code, connectUrl: body.connectUrl }
}

export async function pollSetup(apiUrl: string, code: string): Promise<string> {
  const res = await fetch(`${apiUrl}/api/cli/setup/poll?code=${encodeURIComponent(code)}`)
  const body = await res.json() as { status?: string; token?: string; error?: string }
  if (body.status === 'ready' && body.token) return body.token
  if (body.status === 'expired') throw new Error('Setup expired — run aos:setup again')
  if (body.status === 'pending') return ''
  throw new Error(body.error ?? 'Setup poll failed')
}
