#!/usr/bin/env npx tsx
import { loadEnv } from '../lib/agent-cli/env'
import { isConfigured, loadConfig, resolveVaultPath } from '../lib/agent-cli/config'
import {
  getDaemonStatus,
  installDaemon,
  uninstallDaemon,
  readLastSyncTime,
  SYNC_LOG,
} from '../lib/agent-cli/daemon'

loadEnv()

const cmd = process.argv[2] ?? 'status'

function printStatus() {
  const config = loadConfig()
  const vault = resolveVaultPath(config)
  const daemon = getDaemonStatus()
  const lastSync = readLastSyncTime(vault)

  console.log('AOS status')
  console.log('──────────')
  console.log(`Connected:     ${isConfigured() ? 'yes' : 'no — run npm run aos:install'}`)
  if (config?.apiUrl) console.log(`API:           ${config.apiUrl}`)
  if (config?.projectPath) console.log(`Project:       ${config.projectPath}`)
  console.log(`Vault:         ${vault}/aos/`)
  console.log(`Last sync:     ${lastSync ?? 'never'}`)
  console.log(`Background:    ${daemon.loaded ? `running (every ${daemon.intervalMinutes} min)` : daemon.installed ? 'installed but not loaded' : 'not installed'}`)
  if (daemon.installed) console.log(`Sync log:      ${SYNC_LOG}`)
}

switch (cmd) {
  case 'status':
    printStatus()
    break
  case 'install-daemon':
    installDaemon(Number(process.argv[3]) || 15)
    console.log('Background sync installed.')
    break
  case 'uninstall-daemon':
    uninstallDaemon()
    console.log('Background sync removed.')
    break
  default:
    console.error(`Unknown command: ${cmd}`)
    console.error('Usage: aos:daemon [status|install-daemon|uninstall-daemon]')
    process.exit(1)
}
