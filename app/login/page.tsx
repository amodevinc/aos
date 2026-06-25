'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/30">
            <Zap className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AOS</p>
            <p className="text-xs text-[#4a4a60]">Alain Operating System</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1e1e2a] bg-[#111116] p-6">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-medium text-white">Check your email</p>
              <p className="mt-1 text-sm text-[#6b6b88]">
                We sent a login link to <span className="text-[#c0c0d8]">{email}</span>
              </p>
              <p className="mt-3 text-xs text-[#4a4a60]">
                Click the link to sign in. It expires in 1 hour.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-base font-semibold text-white">Sign in</h1>
              <p className="mb-5 text-sm text-[#5a5a75]">
                Enter your email to receive a magic link.
              </p>

              <div className="space-y-3">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="you@example.com"
                    autoFocus
                    className="w-full rounded-lg border border-[#1e1e2a] bg-[#0a0a0c] px-3 py-2.5 text-sm text-[#e8e8f0] placeholder-[#3a3a55] outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                  />
                  {error && (
                    <p className="mt-1.5 text-xs text-red-400">{error}</p>
                  )}
                </div>

                <button
                  onClick={handleSend}
                  disabled={loading || !email.trim()}
                  className={cn(
                    'w-full rounded-lg py-2.5 text-sm font-semibold transition-all',
                    loading || !email.trim()
                      ? 'bg-indigo-500/30 text-indigo-300/50 cursor-not-allowed'
                      : 'bg-indigo-500 text-white hover:bg-indigo-400'
                  )}
                >
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-[#2a2a38]">
          Private system. Unauthorized access prohibited.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c]" />}>
      <LoginForm />
    </Suspense>
  )
}
