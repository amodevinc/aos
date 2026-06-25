'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

type Status = 'working' | 'done' | 'error' | 'missing'

export default function ConnectClient() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const [status, setStatus] = useState<Status>(code ? 'working' : 'missing')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return

    fetch('/api/cli/setup/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceLabel: 'Terminal' }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({})) as { error?: string }
        if (!res.ok) throw new Error(body.error ?? `Authorization failed (${res.status})`)
        setStatus('done')
      })
      .catch((err) => {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Authorization failed')
      })
  }, [code])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] px-4">
      <div className="w-full max-w-md rounded-xl border border-[#1e1e2a] bg-[#111116] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
          {status === 'working' && <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />}
          {status === 'done' && <CheckCircle2 className="h-6 w-6 text-emerald-400" />}
          {(status === 'error' || status === 'missing') && <AlertCircle className="h-6 w-6 text-amber-400" />}
        </div>

        {status === 'working' && (
          <>
            <h1 className="text-lg font-semibold text-white">Authorizing terminal…</h1>
            <p className="mt-2 text-sm text-[#6b6b88]">Return to your terminal — setup will complete automatically.</p>
          </>
        )}

        {status === 'done' && (
          <>
            <h1 className="text-lg font-semibold text-white">Terminal connected</h1>
            <p className="mt-2 text-sm text-[#6b6b88]">
              You can close this tab. Run <code className="text-[#8080a0]">npm run aos:sync -- --watch</code> to keep your vault in sync.
            </p>
            <Link href="/settings" className="mt-6 inline-block text-sm text-indigo-400 hover:text-indigo-300">
              Back to Settings
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-lg font-semibold text-white">Could not connect</h1>
            <p className="mt-2 text-sm text-red-400">{error}</p>
            <p className="mt-3 text-xs text-[#5a5a75]">Run <code>npm run aos:setup</code> in your terminal and try again.</p>
          </>
        )}

        {status === 'missing' && (
          <>
            <h1 className="text-lg font-semibold text-white">No setup code</h1>
            <p className="mt-2 text-sm text-[#6b6b88]">Run <code className="text-[#8080a0]">npm run aos:setup</code> in your terminal first.</p>
          </>
        )}
      </div>
    </div>
  )
}
