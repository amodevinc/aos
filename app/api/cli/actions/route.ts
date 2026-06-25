import { executeActions, undoSession } from '@/lib/agent/executor'
import { requireCliStorage } from '@/lib/cli-api/guard'
import type { CaptureAction } from '@/lib/agent/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const storage = await requireCliStorage(req)
  if (storage instanceof Response) return storage

  try {
    const body = await req.json() as {
      action?: 'apply' | 'undo'
      actions?: CaptureAction[]
      transcript?: string
      summary?: string
      sessionId?: string
    }

    if (body.action === 'undo') {
      if (!body.sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 })
      await undoSession(body.sessionId, storage)
      return Response.json({ ok: true })
    }

    if (!body.actions?.length) {
      return Response.json({ error: 'actions required' }, { status: 400 })
    }

    const result = await executeActions(
      body.actions,
      body.transcript ?? '[CLI apply]',
      body.summary ?? 'Applied via CLI',
      undefined,
      storage
    )
    return Response.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Action failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
