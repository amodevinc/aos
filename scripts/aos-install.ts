#!/usr/bin/env npx tsx
import { loadEnv } from '../lib/agent-cli/env'
import { isConfigured, loadConfig, saveConfig } from '../lib/agent-cli/config'
import { runSetup } from '../lib/agent-cli/setup'
import { installDaemon } from '../lib/agent-cli/daemon'
import { execSync } from 'child_process'

loadEnv()

async function main() {
  const skipDaemon = process.argv.includes('--no-daemon')

  console.log('AOS install — one command to connect terminal tools + background sync')
  console.log('')

  if (!isConfigured()) {
    await runSetup()
  } else {
    console.log('Step 1/3 — Already connected (skipping authorization)')
    const existing = loadConfig()
    if (existing && !existing.projectPath) {
      saveConfig({ ...existing, projectPath: process.cwd() })
    }
  }

  console.log('')
  console.log('Step 2/3 — Syncing vault mirror…')
  execSync('npx tsx scripts/aos-sync.ts', { stdio: 'inherit', cwd: process.cwd() })

  if (!skipDaemon && process.platform === 'darwin') {
    console.log('')
    console.log('Step 3/3 — Installing background sync (every 15 min)…')
    installDaemon(15)
    console.log('✓ Background sync installed — vault stays updated automatically')
  } else if (!skipDaemon) {
    console.log('')
    console.log('Step 3/3 — Skipped (background daemon is macOS only)')
    console.log('  Use: npm run aos:sync -- --watch')
  } else {
    console.log('')
    console.log('Step 3/3 — Skipped (--no-daemon)')
  }

  console.log('')
  console.log('Done. You are ready:')
  console.log('  • Web app: https://life-system-rho.vercel.app')
  console.log('  • Vault:   ~/vault/aos/  (auto-syncing)')
  console.log('  • MCP:     npm run mcp:aos  (add to Claude Code)')
  console.log('  • Status:  npm run aos:status')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
