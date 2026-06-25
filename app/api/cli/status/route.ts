import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ connected: false, devices: [] })

    const { data, error } = await supabase
      .from('cli_tokens')
      .select('id, device_label, last_used_at, created_at')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return Response.json({
      connected: (data ?? []).length > 0,
      devices: data ?? [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Status failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
