// Translate raw Supabase / network errors into user-readable messages.
// Keep this file as the single place where error strings live.

export function parseError(error: unknown): string {
  if (!error) return 'Something went wrong.'

  const msg = error instanceof Error ? error.message : String(error)
  const lower = msg.toLowerCase()

  // Auth / session
  if (
    lower.includes('jwt') ||
    lower.includes('session') ||
    lower.includes('unauthorized') ||
    lower.includes('not authenticated') ||
    lower.includes('auth')
  ) {
    return 'Your session has expired. Refresh the page to continue.'
  }

  // Network
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('econnrefused') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror')
  ) {
    return 'Connection failed. Check your internet and try again.'
  }

  // Supabase RLS / permission
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'Permission denied. Try refreshing the page.'
  }

  // Supabase "not found" (PGRST116)
  if (lower.includes('pgrst116') || lower.includes('no rows')) {
    return 'Record not found.'
  }

  // Supabase env missing (caught by proxy or client creation)
  if (lower.includes('url and key are required') || lower.includes('supabase')) {
    return 'Database not configured. Check environment variables.'
  }

  // Anthropic API errors
  if (lower.includes('invalid api key') || lower.includes('sk-ant')) {
    return 'Invalid Anthropic API key. Check Settings.'
  }
  if (lower.includes('rate limit') || lower.includes('429')) {
    return 'AI rate limit hit. Wait a moment and try again.'
  }

  // Generic — return raw message truncated so it's still legible
  return msg.length > 120 ? msg.slice(0, 120) + '…' : msg
}
