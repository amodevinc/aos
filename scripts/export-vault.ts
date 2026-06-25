#!/usr/bin/env npx tsx
import { loadEnv } from '../lib/agent-cli/env'
import { createAuthedClient } from '../lib/agent-cli/auth'
import { createStorage } from '../lib/storage/factory'
import { exportVault } from '../lib/agent-cli/vault-export'

loadEnv()

async function main() {
  const { client, userId } = await createAuthedClient()
  const storage = createStorage(client, userId)
  const result = await exportVault(storage)
  console.log(`Exported ${result.filesWritten} files to ${result.vaultPath}/aos/`)
  console.log(`Snapshot: ${result.exportedAt}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
