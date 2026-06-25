#!/usr/bin/env npx tsx
import { runSetup } from '../lib/agent-cli/setup'

runSetup().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
