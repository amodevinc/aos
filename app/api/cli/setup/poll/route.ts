import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get('code')
  const rl = checkRateLimit(
    code ? `setup-poll:${clientIp(req)}:${code.slice(0, 8)}` : `setup-poll:${clientIp(req)}`,
    60,
    60_000
  )
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  try {
    if (!code) return Response.json({ status: 'pending' })

    const db = createServiceClient()
    const { data: session, error } = await db
      .from('cli_setup_sessions')
      .select('token_plaintext, expires_at, consumed_at')
      .eq('code', code)
      .maybeSingle()

    if (error || !session) return Response.json({ status: 'expired' })
    if (new Date(session.expires_at) < new Date()) return Response.json({ status: 'expired' })
    if (!session.consumed_at || !session.token_plaintext) return Response.json({ status: 'pending' })

    // One-time handoff — clear plaintext after delivery
    await db.from('cli_setup_sessions').update({ token_plaintext: null }).eq('code', code)

    return Response.json({ status: 'ready', token: session.token_plaintext })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Poll failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
