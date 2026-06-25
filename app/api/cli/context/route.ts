import { buildFocusedContext, type ContextFocus } from '@/lib/agent/context-trim'
import { requireCliStorage } from '@/lib/cli-api/guard'
import { requireStorage } from '@/lib/cli-api/token'

export const runtime = 'nodejs'

const VALID_FOCUS = new Set<ContextFocus>(['full', 'today', 'crm', 'goals', 'minimal'])

export async function GET(req: Request) {
  const storage = await requireCliStorage(req)
  if (storage instanceof Response) return storage

  try {
    const { searchParams } = new URL(req.url)
    const rawFocus = searchParams.get('focus') ?? 'full'
    const focus: ContextFocus = VALID_FOCUS.has(rawFocus as ContextFocus)
      ? (rawFocus as ContextFocus)
      : 'full'

    const data = await requireStorage(storage).exportAll()
    const context = buildFocusedContext({
      allEntries: data.dailyEntries,
      goals: data.goals,
      decisions: data.decisions,
      weeklyReviews: data.weeklyReviews,
      contacts: data.contacts,
      compass: data.compass,
    }, focus)

    return Response.json({ context, focus, exportedAt: new Date().toISOString() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load context'
    return Response.json({ error: msg }, { status: 500 })
  }
}
