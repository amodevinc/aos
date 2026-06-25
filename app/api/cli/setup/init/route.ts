import { createServiceClient } from '@/lib/supabase/service'
import { generateSetupCode, getAppOrigin } from '@/lib/cli-api/token'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const rl = checkRateLimit(`setup-init:${clientIp(req)}`, 10, 60 * 60 * 1000)
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  try {
    const code = generateSetupCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const db = createServiceClient()

    const { error } = await db.from('cli_setup_sessions').insert({
      code,
      expires_at: expiresAt,
    })
    if (error) throw new Error(error.message)

    const origin = getAppOrigin()
    return Response.json({
      code,
      connectUrl: `${origin}/connect?code=${code}`,
      expiresAt,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Setup init failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
