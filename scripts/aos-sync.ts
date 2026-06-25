#!/usr/bin/env npx tsx
import { loadEnv } from '../lib/agent-cli/env'
import { isConfigured, requireConfig, resolveVaultPath } from '../lib/agent-cli/config'
import { fetchExport } from '../lib/agent-cli/api-client'
import { writeVaultFromData } from '../lib/agent-cli/vault-export'

loadEnv()

async function syncOnce(quiet = false) {
  const config = requireConfig()
  const vaultPath = resolveVaultPath(config)
  const { data, exportedAt } = await fetchExport()
  const result = writeVaultFromData(data, vaultPath)
  if (!quiet) {
    console.log(`[${exportedAt}] Synced ${result.filesWritten} files → ${result.vaultPath}/aos/`)
  }
}

async function main() {
  const watch = process.argv.includes('--watch')
  const quiet = process.argv.includes('--quiet')
  const intervalMs = Number(process.env.AOS_SYNC_INTERVAL_MS ?? 15 * 60 * 1000)

  if (!isConfigured()) {
    console.error('Not connected. Run: npm run aos:install')
    process.exit(1)
  }

  await syncOnce(quiet)

  if (watch) {
    if (!quiet) {
      console.log(`Watching — sync every ${Math.round(intervalMs / 60000)} min (Ctrl+C to stop)`)
      console.log('Tip: on macOS, npm run aos:install sets up background sync automatically.')
    }
    setInterval(() => {
      syncOnce(true).catch((err) => console.error(err instanceof Error ? err.message : err))
    }, intervalMs)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
