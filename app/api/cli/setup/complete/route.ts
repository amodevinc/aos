import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createCliToken } from '@/lib/cli-api/token'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Sign in to AOS first.' }, { status: 401 })
    }

    const { code, deviceLabel } = await req.json() as { code?: string; deviceLabel?: string }
    if (!code) return Response.json({ error: 'Missing setup code.' }, { status: 400 })

    const db = createServiceClient()
    const { data: session, error: loadError } = await db
      .from('cli_setup_sessions')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (loadError || !session) {
      return Response.json({ error: 'Invalid or expired setup code.' }, { status: 404 })
    }
    if (session.consumed_at) {
      return Response.json({ error: 'This setup code was already used.' }, { status: 409 })
    }
    if (new Date(session.expires_at) < new Date()) {
      return Response.json({ error: 'Setup code expired. Run npm run aos:setup again.' }, { status: 410 })
    }

    const token = await createCliToken(user.id, deviceLabel ?? 'Terminal')

    const { error: updateError } = await db.from('cli_setup_sessions').update({
      user_id: user.id,
      token_plaintext: token,
      consumed_at: new Date().toISOString(),
    }).eq('code', code)

    if (updateError) throw new Error(updateError.message)

    return Response.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Setup complete failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
