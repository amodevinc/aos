import { requireCliStorage } from '@/lib/cli-api/guard'
import { requireStorage } from '@/lib/cli-api/token'
import { runCapture, type CaptureApplyMode } from '@/lib/agent-cli/capture'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const storage = await requireCliStorage(req)
  if (storage instanceof Response) return storage

  try {
    const { transcript, dryRun, applyMode } = await req.json() as {
      transcript?: string
      dryRun?: boolean
      applyMode?: CaptureApplyMode
    }
    if (!transcript?.trim()) {
      return Response.json({ error: 'transcript is required' }, { status: 400 })
    }

    const result = await runCapture(requireStorage(storage), transcript, { dryRun, applyMode })
    return Response.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Capture failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
