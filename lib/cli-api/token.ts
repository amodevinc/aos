import { createHash, randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { createStorage, type StorageBundle } from '@/lib/storage/factory'

const TOKEN_PREFIX = 'aos_'

export function generateCliToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString('hex')}`
}

export function hashCliToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateSetupCode(): string {
  return randomBytes(16).toString('hex')
}

export async function createCliToken(userId: string, deviceLabel = 'Terminal'): Promise<string> {
  const token = generateCliToken()
  const hash = hashCliToken(token)
  const db = createServiceClient()
  const { error } = await db.from('cli_tokens').insert({
    user_id: userId,
    token_hash: hash,
    device_label: deviceLabel,
  })
  if (error) throw new Error(`create cli token: ${error.message}`)
  return token
}

export async function resolveCliToken(token: string): Promise<string | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null
  const hash = hashCliToken(token)
  const db = createServiceClient()
  const { data, error } = await db
    .from('cli_tokens')
    .select('id, user_id')
    .eq('token_hash', hash)
    .maybeSingle()
  if (error || !data) return null

  await db.from('cli_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return data.user_id
}

export async function getStorageFromRequest(req: Request): Promise<StorageBundle | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const userId = await resolveCliToken(auth.slice(7).trim())
  if (!userId) return null
  return createStorage(createServiceClient(), userId)
}

export function requireStorage(storage: StorageBundle | null): StorageBundle {
  if (!storage) throw new Error('Unauthorized — run npm run aos:setup to connect this device.')
  return storage
}

export function cliUnauthorized() {
  return Response.json(
    { error: 'Unauthorized. Run npm run aos:setup while logged in to AOS.' },
    { status: 401 }
  )
}

export function getAppOrigin(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
