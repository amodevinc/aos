import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export async function requireSessionUser(): Promise<
  { user: User } | { error: Response }
> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      error: Response.json({ error: 'Sign in required.' }, { status: 401 }),
    }
  }
  return { user }
}

/** Resolve Anthropic key: server env first, then authenticated client key. */
export function resolveAnthropicKey(clientKey?: string): string | null {
  const serverKey = process.env.ANTHROPIC_API_KEY
  if (serverKey?.startsWith('sk-ant-')) return serverKey
  if (clientKey?.startsWith('sk-ant-')) return clientKey
  return null
}
