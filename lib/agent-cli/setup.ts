import { execSync } from 'child_process'
import { loadEnv } from './env'
import { defaultApiUrl, saveConfig, loadConfig, resolveVaultPath } from './config'
import { initSetup, pollSetup } from './api-client'

loadEnv()

export async function runSetup(): Promise<void> {
  const apiUrl = (process.env.AOS_API_URL ?? defaultApiUrl()).replace(/\/$/, '')

  console.log('Step 1/3 — Authorize this device')
  console.log('Connecting to', apiUrl)
  console.log('')

  const { code, connectUrl } = await initSetup(apiUrl)
  console.log('Opening browser…')
  console.log(connectUrl)
  console.log('')

  try {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
    execSync(`${cmd} ${JSON.stringify(connectUrl)}`, { stdio: 'ignore' })
  } catch { /* manual open */ }

  const deadline = Date.now() + 10 * 60 * 1000
  while (Date.now() < deadline) {
    const token = await pollSetup(apiUrl, code)
    if (token) {
      const existing = loadConfig()
      saveConfig({
        apiUrl,
        token,
        vaultPath: resolveVaultPath(existing),
        projectPath: process.cwd(),
        syncIntervalMinutes: existing?.syncIntervalMinutes ?? 15,
      })
      console.log('✓ Device authorized')
      return
    }
    await new Promise((r) => setTimeout(r, 2000))
  }

  throw new Error('Timed out — make sure you are logged into AOS in the browser, then try again.')
}
