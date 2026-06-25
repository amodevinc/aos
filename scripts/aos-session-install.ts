#!/usr/bin/env npx tsx
import fs from 'fs'
import path from 'path'
import os from 'os'
import { loadEnv } from '../lib/agent-cli/env'
import {
  CONFIG_DIR,
  installSessionFromFile,
  startSessionBridgeServer,
} from '../lib/agent-cli/auth'
import { CLI_SESSION_FILENAME } from '../lib/cli/session-export'

loadEnv()

function defaultDownloadPath(): string {
  return path.join(os.homedir(), 'Downloads', CLI_SESSION_FILENAME)
}

async function main() {
  const arg = process.argv[2]

  if (arg && arg !== '--wait') {
    const filePath = arg.startsWith('~') ? path.join(os.homedir(), arg.slice(1)) : arg
    installSessionFromFile(filePath)
    console.log('CLI session installed at', CONFIG_DIR)
    return
  }

  const downloaded = defaultDownloadPath()
  if (fs.existsSync(downloaded)) {
    installSessionFromFile(downloaded)
    console.log('Installed session from', downloaded)
    console.log('CLI session saved to', CONFIG_DIR)
    console.log('You can now run: npm run export:vault')
    return
  }

  console.log('AOS CLI session bridge (localhost only)')
  console.log('Session will be saved to', CONFIG_DIR)
  console.log('')
  console.log('On production HTTPS, use Settings → Download session file instead.')
  console.log('')
  await startSessionBridgeServer()
  console.log('')
  console.log('Connected. You can now run: npm run export:vault')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
