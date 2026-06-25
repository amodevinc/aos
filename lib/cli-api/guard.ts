import type { StorageBundle } from '@/lib/storage/factory'
import { getStorageFromRequest, cliUnauthorized } from '@/lib/cli-api/token'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/security/rate-limit'

/** Authenticate CLI bearer token + per-device rate limit. */
export async function requireCliStorage(req: Request): Promise<StorageBundle | Response> {
  const ip = clientIp(req)
  const auth = req.headers.get('authorization')?.trim()
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null
  const rlKey = bearer ? `cli:${bearer.slice(0, 16)}` : `cli-ip:${ip}`

  const rl = checkRateLimit(rlKey, 120, 60_000)
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  const storage = await getStorageFromRequest(req)
  if (!storage) return cliUnauthorized()
  return storage
}
