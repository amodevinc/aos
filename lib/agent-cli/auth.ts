import fs from 'fs'
import http from 'http'
import path from 'path'
import os from 'os'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireEnv } from './env'
import {
  CLI_CALLBACK_PORT,
  CLI_CALLBACK_URL,
  SESSION_BRIDGE_PORT,
  SESSION_BRIDGE_URL,
} from '@/lib/cli/constants'

export const CONFIG_DIR = path.join(os.homedir(), '.config', 'aos')
export const SESSION_FILE = path.join(CONFIG_DIR, 'session.json')

export interface PersistedSession {
  access_token: string
  refresh_token: string
  user_id: string
}

export function persistSession(session: {
  access_token: string
  refresh_token: string
  user?: { id: string } | null
  user_id?: string
}): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  let userId = session.user?.id ?? session.user_id
  if (!userId && fs.existsSync(SESSION_FILE)) {
    const existing = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as PersistedSession
    userId = existing.user_id
  }
  if (!userId) throw new Error('Cannot persist session without user id')

  const payload: PersistedSession = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user_id: userId,
  }
  fs.writeFileSync(SESSION_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 })
}

export function readPersistedSession(): PersistedSession | null {
  if (!fs.existsSync(SESSION_FILE)) return null
  return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as PersistedSession
}

export function hasPersistedSession(): boolean {
  return fs.existsSync(SESSION_FILE)
}

export function installSessionFromFile(filePath: string): void {
  const resolved = filePath.replace(/^~/, os.homedir())
  if (!fs.existsSync(resolved)) {
    throw new Error(`Session file not found: ${resolved}`)
  }
  const data = JSON.parse(fs.readFileSync(resolved, 'utf8')) as PersistedSession
  if (!data.access_token || !data.refresh_token || !data.user_id) {
    throw new Error('Invalid session file — expected access_token, refresh_token, user_id')
  }
  persistSession(data)
}

export function createSupabaseClient(): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, anon)
}

function createPkceClient(): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, anon, {
    auth: { flowType: 'pkce', detectSessionInUrl: false },
  })
}

/** Create a Supabase client authenticated as the persisted user (RLS-scoped). */
export async function createAuthedClient(): Promise<{ client: SupabaseClient; userId: string }> {
  const persisted = readPersistedSession()
  if (!persisted) {
    throw new Error(
      'No CLI session. In Settings → CLI & MCP click Connect (after npm run aos:session-install), or run: npm run aos:login'
    )
  }

  const client = createSupabaseClient()
  const { error } = await client.auth.setSession({
    access_token: persisted.access_token,
    refresh_token: persisted.refresh_token,
  })
  if (error) {
    throw new Error(`Session invalid: ${error.message}. Reconnect from Settings or run: npm run aos:login`)
  }

  const { data: { session } } = await client.auth.getSession()
  if (!session) throw new Error('Session expired. Reconnect from Settings or run: npm run aos:login')

  if (
    session.access_token !== persisted.access_token ||
    session.refresh_token !== persisted.refresh_token
  ) {
    persistSession(session)
  }

  return { client, userId: session.user.id }
}

/**
 * Wait for the web app to POST the current browser session (Settings → Connect).
 * Run this while logged in at localhost — no second email needed.
 */
export function startSessionBridgeServer(timeoutMs = 5 * 60 * 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        })
        res.end()
        return
      }

      if (req.method !== 'POST' || req.url !== '/session') {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        try {
          const data = JSON.parse(body) as PersistedSession
          persistSession(data)
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify({ ok: true }))
          clearTimeout(timer)
          server.close()
          resolve()
        } catch (err) {
          res.writeHead(400, { 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Invalid session' }))
        }
      })
    })

    server.on('error', reject)

    const timer = setTimeout(() => {
      server.close()
      reject(new Error('Timed out waiting for browser. Open Settings → CLI & MCP → Connect terminal.'))
    }, timeoutMs)

    server.listen(SESSION_BRIDGE_PORT, '127.0.0.1', () => {
      console.log(`Waiting for browser session at ${SESSION_BRIDGE_URL}`)
      console.log('→ Open AOS Settings → CLI & MCP → Connect terminal')
    })
  })
}

/** Magic-link login — same method as the web app. Use when not logged in on web. */
export async function loginWithMagicLink(email: string): Promise<void> {
  const client = createPkceClient()

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${CLI_CALLBACK_PORT}`)
    if (url.pathname !== '/callback') {
      res.writeHead(404)
      res.end('Not found')
      return
    }

    const code = url.searchParams.get('code')
    if (!code) {
      res.writeHead(400)
      res.end('Missing auth code. Try again.')
      return
    }

    const { data, error } = await client.auth.exchangeCodeForSession(code)
    if (error || !data.session) {
      res.writeHead(400)
      res.end(`Auth failed: ${error?.message ?? 'no session'}`)
      return
    }

    persistSession(data.session)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<html><body style="font-family:sans-serif;padding:2rem"><h2>AOS CLI connected</h2><p>You can close this tab and return to the terminal.</p></body></html>')
    server.close()
  })

  await new Promise<void>((resolve, reject) => {
    server.on('error', reject)
    server.listen(CLI_CALLBACK_PORT, '127.0.0.1', resolve)
  })

  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: CLI_CALLBACK_URL },
  })
  if (error) throw new Error(`Failed to send magic link: ${error.message}`)

  console.log(`Magic link sent to ${email}`)
  console.log(`Click the link in your email (redirects to ${CLI_CALLBACK_URL})`)
  console.log('Waiting for you to click the link…')

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close()
      reject(new Error('Timed out after 10 minutes. Run aos:login again.'))
    }, 10 * 60 * 1000)

    server.on('close', () => {
      clearTimeout(timer)
      if (hasPersistedSession()) resolve()
      else reject(new Error('Login did not complete'))
    })
  })
}
