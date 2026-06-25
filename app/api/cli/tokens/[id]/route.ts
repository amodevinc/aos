import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

async function getAuthedClient() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, user: null }
  return { supabase, user }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { supabase, user } = await getAuthedClient()
    if (!supabase || !user) {
      return Response.json({ error: 'Sign in to manage devices.' }, { status: 401 })
    }

    const { id } = await context.params
    const { deviceLabel } = await req.json() as { deviceLabel?: string }
    const label = deviceLabel?.trim()
    if (!label) {
      return Response.json({ error: 'Device name is required.' }, { status: 400 })
    }
    if (label.length > 64) {
      return Response.json({ error: 'Device name must be 64 characters or fewer.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('cli_tokens')
      .update({ device_label: label })
      .eq('id', id)
      .select('id, device_label, last_used_at, created_at')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return Response.json({ error: 'Device not found.' }, { status: 404 })

    return Response.json({ device: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { supabase, user } = await getAuthedClient()
    if (!supabase || !user) {
      return Response.json({ error: 'Sign in to manage devices.' }, { status: 401 })
    }

    const { id } = await context.params
    const { data, error } = await supabase
      .from('cli_tokens')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return Response.json({ error: 'Device not found.' }, { status: 404 })

    return Response.json({ ok: true, revokedId: data.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Revoke failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
