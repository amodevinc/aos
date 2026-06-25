import { requireCliStorage } from '@/lib/cli-api/guard'
import { requireStorage } from '@/lib/cli-api/token'
import { findContactByName } from '@/lib/agent/executor'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const storage = await requireCliStorage(req)
  if (storage instanceof Response) return storage

  const url = new URL(req.url)
  const resource = url.searchParams.get('resource')

  try {
    const s = requireStorage(storage)

    switch (resource) {
      case 'daily': {
        const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
        const entry = await s.dailyStorage.getByDate(date)
        return Response.json({ entry })
      }
      case 'goals': {
        let goals = await s.goalStorage.getAll()
        const status = url.searchParams.get('status')
        if (status) goals = goals.filter((g) => g.status === status)
        return Response.json({ goals })
      }
      case 'decisions': {
        const limit = Number(url.searchParams.get('limit') ?? 10)
        const decisions = (await s.decisionStorage.getAll()).slice(0, limit)
        return Response.json({ decisions })
      }
      case 'weekly': {
        const weekStart = url.searchParams.get('weekStart')
        if (weekStart) {
          const review = await s.weeklyStorage.getByWeekStart(weekStart)
          return Response.json({ review })
        }
        const reviews = (await s.weeklyStorage.getAll()).slice(0, 4)
        return Response.json({ reviews })
      }
      case 'compass': {
        const compass = await s.compassStorage.get()
        return Response.json({ compass })
      }
      case 'contacts': {
        const query = url.searchParams.get('q') ?? ''
        const contacts = await s.contactStorage.getAll()
        if (!query) return Response.json({ contacts })
        const match = findContactByName(contacts, query)
        const needle = query.toLowerCase()
        const partial = contacts.filter((c) => c.name.toLowerCase().includes(needle))
        return Response.json({ bestMatch: match ?? null, partialMatches: partial })
      }
      case 'export': {
        const data = await s.exportAll()
        return Response.json({ data, exportedAt: new Date().toISOString() })
      }
      default:
        return Response.json({ error: 'Unknown resource. Use: daily, goals, decisions, weekly, compass, contacts, export' }, { status: 400 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
