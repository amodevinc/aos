import fs from 'fs'
import path from 'path'
import os from 'os'

export const CONFIG_DIR = path.join(os.homedir(), '.config', 'aos')
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

export interface AosCliConfig {
  apiUrl: string
  token: string
  vaultPath?: string
  projectPath?: string
  syncIntervalMinutes?: number
}

const DEFAULT_API_URL = process.env.AOS_API_URL
  ?? process.env.NEXT_PUBLIC_APP_URL
  ?? 'https://life-system-rho.vercel.app'

export function loadConfig(): AosCliConfig | null {
  if (!fs.existsSync(CONFIG_FILE)) return null
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as AosCliConfig
  } catch {
    return null
  }
}

export function saveConfig(config: AosCliConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 })
}

export function requireConfig(): AosCliConfig {
  const config = loadConfig()
  if (!config?.token || !config?.apiUrl) {
    throw new Error('AOS not connected. Run: npm run aos:install')
  }
  return config
}

export function defaultApiUrl(): string {
  return DEFAULT_API_URL.replace(/\/$/, '')
}

export function resolveVaultPath(config?: AosCliConfig | null): string {
  const raw = config?.vaultPath ?? process.env.AOS_VAULT_PATH ?? '~/vault'
  return raw.replace(/^~/, os.homedir())
}

export function isConfigured(): boolean {
  const c = loadConfig()
  return Boolean(c?.token && c?.apiUrl)
}
