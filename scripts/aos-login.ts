#!/usr/bin/env npx tsx
import readline from 'readline'
import { loadEnv } from '../lib/agent-cli/env'
import { loginWithMagicLink, CONFIG_DIR } from '../lib/agent-cli/auth'
import { CLI_CALLBACK_URL } from '../lib/cli/constants'

loadEnv()

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function main() {
  console.log('AOS CLI login (magic link — same as the web app)')
  console.log('Session saved to', CONFIG_DIR)
  console.log('')
  console.log('Tip: If you are already logged in on the web, use instead:')
  console.log('  npm run aos:session-install   (then Settings → Connect terminal)')
  console.log('')
  console.log(`Ensure this redirect URL is in Supabase Auth settings: ${CLI_CALLBACK_URL}`)
  console.log('')

  const email = await prompt('Email: ')
  if (!email) throw new Error('Email required')

  await loginWithMagicLink(email)
  console.log('Logged in. You can now run: npm run export:vault')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
