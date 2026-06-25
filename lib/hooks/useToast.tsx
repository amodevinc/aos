'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type ToastType = 'error' | 'success' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toasts: ToastItem[]
  addToast: (type: ToastType, title: string, message?: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DURATIONS: Record<ToastType, number> = {
  error: 7000,
  warning: 5000,
  success: 3000,
  info: 4000,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev.slice(-2), { id, type, title, message }])
      setTimeout(() => dismiss(id), DURATIONS[type])
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')

  return {
    error: (title: string, message?: string) => ctx.addToast('error', title, message),
    success: (title: string, message?: string) => ctx.addToast('success', title, message),
    warning: (title: string, message?: string) => ctx.addToast('warning', title, message),
    info: (title: string, message?: string) => ctx.addToast('info', title, message),
    dismiss: ctx.dismiss,
    toasts: ctx.toasts,
  }
}
