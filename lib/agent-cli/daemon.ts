import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { CONFIG_DIR, loadConfig, requireConfig } from './config'

export const DAEMON_LABEL = 'com.aos.sync'
export const WRAPPER_SCRIPT = path.join(CONFIG_DIR, 'run-sync.sh')
export const PLIST_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', `${DAEMON_LABEL}.plist`)
export const SYNC_LOG = path.join(CONFIG_DIR, 'sync.log')
export const SYNC_ERROR_LOG = path.join(CONFIG_DIR, 'sync.error.log')

const DEFAULT_INTERVAL_MINUTES = 15

export interface DaemonStatus {
  installed: boolean
  loaded: boolean
  intervalMinutes: number
  projectPath: string
  logPath: string
}

function resolveProjectPath(): string {
  const config = loadConfig()
  if (config?.projectPath && fs.existsSync(config.projectPath)) return config.projectPath
  return process.cwd()
}

function resolveTsxPath(projectPath: string): string {
  const local = path.join(projectPath, 'node_modules', '.bin', 'tsx')
  if (fs.existsSync(local)) return local
  return 'tsx'
}

export function writeWrapperScript(projectPath: string): void {
  const tsx = resolveTsxPath(projectPath)
  const nodeBin = path.dirname(process.execPath)
  const script = `#!/bin/bash
set -euo pipefail
export PATH=${JSON.stringify(nodeBin)}:"$PATH"
cd ${JSON.stringify(projectPath)}
exec ${JSON.stringify(tsx)} scripts/aos-sync.ts
`
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  fs.writeFileSync(WRAPPER_SCRIPT, script, { mode: 0o755 })
}

export function writePlist(intervalMinutes: number): void {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${DAEMON_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${WRAPPER_SCRIPT}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>${intervalMinutes * 60}</integer>
  <key>StandardOutPath</key>
  <string>${SYNC_LOG}</string>
  <key>StandardErrorPath</key>
  <string>${SYNC_ERROR_LOG}</string>
</dict>
</plist>
`
  fs.mkdirSync(path.dirname(PLIST_PATH), { recursive: true })
  fs.writeFileSync(PLIST_PATH, plist, 'utf8')
}

export function isLaunchAgentLoaded(): boolean {
  if (process.platform !== 'darwin') return false
  try {
    const out = execSync(`launchctl list | grep ${DAEMON_LABEL}`, { encoding: 'utf8', stdio: 'pipe' })
    return out.includes(DAEMON_LABEL)
  } catch {
    return false
  }
}

export function getDaemonStatus(): DaemonStatus {
  const config = loadConfig()
  return {
    installed: fs.existsSync(PLIST_PATH),
    loaded: isLaunchAgentLoaded(),
    intervalMinutes: config?.syncIntervalMinutes ?? DEFAULT_INTERVAL_MINUTES,
    projectPath: config?.projectPath ?? resolveProjectPath(),
    logPath: SYNC_LOG,
  }
}

export function installDaemon(intervalMinutes = DEFAULT_INTERVAL_MINUTES): void {
  if (process.platform !== 'darwin') {
    throw new Error('Background sync auto-install is macOS only. Use: npm run aos:sync -- --watch')
  }

  requireConfig()
  const projectPath = resolveProjectPath()
  if (!fs.existsSync(path.join(projectPath, 'package.json'))) {
    throw new Error(`Project not found at ${projectPath}. Re-run npm run aos:setup from the life-system repo.`)
  }

  writeWrapperScript(projectPath)
  writePlist(intervalMinutes)

  try {
    execSync(`launchctl bootout gui/$(id -u) ${JSON.stringify(PLIST_PATH)} 2>/dev/null || true`, { stdio: 'ignore', shell: '/bin/bash' })
  } catch { /* not loaded yet */ }

  execSync(`launchctl bootstrap gui/$(id -u) ${JSON.stringify(PLIST_PATH)}`, { stdio: 'inherit' })
  execSync(`launchctl kickstart -k gui/$(id -u)/${DAEMON_LABEL}`, { stdio: 'inherit' })
}

export function uninstallDaemon(): void {
  if (process.platform !== 'darwin') return
  if (!fs.existsSync(PLIST_PATH)) return
  try {
    execSync(`launchctl bootout gui/$(id -u) ${JSON.stringify(PLIST_PATH)}`, { stdio: 'inherit' })
  } catch { /* already stopped */ }
  fs.unlinkSync(PLIST_PATH)
}

export function readLastSyncTime(vaultPath: string): string | null {
  const metaPath = path.join(vaultPath, 'aos', '_meta.json')
  if (!fs.existsSync(metaPath)) return null
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as { exportedAt?: string }
    return meta.exportedAt ?? null
  } catch {
    return null
  }
}
