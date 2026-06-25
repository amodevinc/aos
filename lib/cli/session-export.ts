/** Client-safe helpers for exporting a CLI session from the browser. */

export interface CliSessionPayload {
  access_token: string
  refresh_token: string
  user_id: string
}

export const CLI_SESSION_FILENAME = 'aos-session.json'

/** Browsers block HTTPS pages from calling http://127.0.0.1 (mixed content + PNA). */
export function canUseSessionBridge(): boolean {
  if (typeof window === 'undefined') return false
  const { hostname, protocol } = window.location
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
  return isLocalHost && protocol === 'http:'
}

export function downloadCliSession(payload: CliSessionPayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = CLI_SESSION_FILENAME
  a.click()
  URL.revokeObjectURL(url)
}

export function defaultCliSessionInstallCommand(): string {
  return 'npm run aos:session-install ~/Downloads/aos-session.json'
}
