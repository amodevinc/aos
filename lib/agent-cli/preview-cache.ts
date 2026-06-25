import { randomUUID } from 'crypto'
import type { CaptureResult } from './capture'

const CACHE_TTL_MS = 30 * 60 * 1000

interface CachedPreview {
  result: CaptureResult
  transcript: string
  expiresAt: number
}

const cache = new Map<string, CachedPreview>()

function pruneExpired(): void {
  const now = Date.now()
  for (const [id, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(id)
  }
}

export function storePreview(result: CaptureResult, transcript: string): string {
  pruneExpired()
  const id = randomUUID().replace(/-/g, '').slice(0, 12)
  cache.set(id, {
    result,
    transcript,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
  return id
}

export function getPreview(captureId: string): CachedPreview | null {
  const entry = cache.get(captureId)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(captureId)
    return null
  }
  return entry
}

export function deletePreview(captureId: string): void {
  cache.delete(captureId)
}
