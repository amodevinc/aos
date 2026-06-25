#!/usr/bin/env npx tsx
import { loadEnv } from '../lib/agent-cli/env'
import { isConfigured, loadConfig, resolveVaultPath } from '../lib/agent-cli/config'
import { getDaemonStatus, readLastSyncTime, SYNC_LOG } from '../lib/agent-cli/daemon'

loadEnv()

const config = loadConfig()
const vault = resolveVaultPath(config)
const daemon = getDaemonStatus()
const lastSync = readLastSyncTime(vault)

console.log('AOS status')
console.log('──────────')
console.log(`Connected:   ${isConfigured() ? 'yes' : 'no — run npm run aos:install'}`)
if (config?.apiUrl) console.log(`API:         ${config.apiUrl}`)
if (config?.projectPath) console.log(`Project:     ${config.projectPath}`)
console.log(`Vault:       ${vault}/aos/`)
console.log(`Last sync:   ${lastSync ?? 'never'}`)
console.log(`Background:  ${daemon.loaded ? `running (every ${daemon.intervalMinutes} min)` : daemon.installed ? 'installed, not loaded — npm run aos:daemon install-daemon' : 'not installed — npm run aos:install'}`)
if (daemon.installed) console.log(`Sync log:    ${SYNC_LOG}`)
