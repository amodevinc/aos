'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// React Error Boundary — catches uncaught render errors so the whole app
// doesn't go blank. Shows a minimal recovery UI instead.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AOS] Uncaught render error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] p-8">
        <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <p className="mb-1 text-sm font-semibold text-red-400">Something went wrong</p>
          <p className="mb-4 text-xs text-[#6b6b88]">{error.message}</p>
          <button
            onClick={() => {
              this.setState({ error: null })
              window.location.reload()
            }}
            className="rounded-lg bg-red-500/15 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/25 transition-colors ring-1 ring-red-500/20"
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
