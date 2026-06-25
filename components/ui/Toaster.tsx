'use client'

import { useToast, type ToastItem, type ToastType } from '@/lib/hooks/useToast'
import { cn } from '@/lib/utils'

const STYLES: Record<ToastType, { bar: string; icon: string; title: string }> = {
  error: {
    bar: 'border-red-500/40 bg-red-500/10',
    icon: 'text-red-400',
    title: 'text-red-300',
  },
  success: {
    bar: 'border-emerald-500/40 bg-emerald-500/10',
    icon: 'text-emerald-400',
    title: 'text-emerald-300',
  },
  warning: {
    bar: 'border-amber-500/40 bg-amber-500/10',
    icon: 'text-amber-400',
    title: 'text-amber-300',
  },
  info: {
    bar: 'border-indigo-500/40 bg-indigo-500/10',
    icon: 'text-indigo-400',
    title: 'text-indigo-300',
  },
}

const ICONS: Record<ToastType, string> = {
  error: '✕',
  success: '✓',
  warning: '⚠',
  info: 'i',
}

function Toast({ toast }: { toast: ToastItem }) {
  const { dismiss } = useToast()
  const s = STYLES[toast.type]

  return (
    <div
      className={cn(
        'flex w-80 items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm',
        s.bar
      )}
      role="alert"
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/10 text-[11px] font-bold',
          s.icon
        )}
      >
        {ICONS[toast.type]}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-semibold leading-tight', s.title)}>{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs leading-relaxed text-[#8080a0]">{toast.message}</p>
        )}
      </div>

      <button
        onClick={() => dismiss(toast.id)}
        className="mt-0.5 shrink-0 text-[#4a4a60] hover:text-[#a0a0c0] transition-colors text-xs"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  )
}
