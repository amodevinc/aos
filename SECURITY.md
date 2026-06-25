# AOS Security Guide

Your Life OS is protected in layers. No system is "unhackable," but this document covers what the app enforces in code and what you must configure outside the codebase.

## Security model (layers)

```
Layer 1 — Email inbox (magic link)     ← master key; protect with 2FA
Layer 2 — Web session (Supabase cookie) ← temporary browser access
Layer 3 — Device tokens (aos_…)         ← per-machine CLI/MCP access
Layer 4 — Server secrets                ← service role, Anthropic key (never in git)
Layer 5 — Row Level Security            ← every table scoped to your user_id
```

## What the app enforces (code)

| Control | Where |
|---------|--------|
| All pages require login | `proxy.ts` |
| RLS on every data table | `supabase/schema.sql` |
| CLI tokens stored as SHA-256 hashes | `lib/cli-api/token.ts` |
| Device token required for `/api/cli/*` | `lib/cli-api/guard.ts` |
| Rate limits on setup, CLI, AI routes | `lib/security/rate-limit.ts` |
| AI proxy requires signed-in session | `/api/ai`, `/api/agent`, `/api/agent/insight` |
| Capture uses server `ANTHROPIC_API_KEY` only | `/api/cli/capture` |
| Seed route disabled in production | `/api/seed` |
| Security headers (HSTS, frame deny, etc.) | `next.config.ts` |
| Revoke devices from Settings | `/api/cli/tokens/[id]` |
| MCP stays local stdio only | `mcp/aos-server/` — no public HTTP MCP |

## Your checklist (do these)

### Email (most important)

- [ ] **Enable 2FA** on the email account used for AOS magic links
- [ ] Use a strong, unique password on that email account
- [ ] Don't forward magic-link emails to shared inboxes

### Supabase dashboard

- [ ] **Enable leaked password protection** (Auth → Providers → Email)
- [ ] Confirm **RLS is enabled** on all public tables (Table Editor → each table)
- [ ] **Never expose** `SUPABASE_SERVICE_ROLE_KEY` in the browser, git, or client env vars
- [ ] Rotate service role key if it was ever leaked (Project Settings → API → Reset)
- [ ] Restrict Supabase dashboard access to your account only
- [ ] Enable **2FA on your Supabase account**

### Vercel / production

- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` only in Vercel **server** env (never `NEXT_PUBLIC_`)
- [ ] Set `ANTHROPIC_API_KEY` in Vercel for MCP capture on production
- [ ] Do **not** set `ALLOW_SEED=true` in production unless you intentionally need it
- [ ] Enable **Vercel Authentication** or deployment protection if you want preview URLs private
- [ ] Consider Vercel Firewall rate rules for `/api/cli/setup/*` as a second layer

### Your Mac / devices

- [ ] Full-disk encryption (FileVault) enabled
- [ ] `~/.config/aos/` stays private (app writes mode `0700` / `0600`)
- [ ] **Revoke lost devices** in Settings → Authorized devices
- [ ] Don't install AOS MCP or share `aos_` tokens on shared machines
- [ ] Keep Claude Desktop MCP **local only** — do not add HTTP/cloud connectors for AOS

### Anthropic API key

- [ ] Browser key (Settings → AI Coach): stored in localStorage only on your machine
- [ ] Server key (`ANTHROPIC_API_KEY` on Vercel): required for CLI/MCP capture in production
- [ ] Rotate at [console.anthropic.com](https://console.anthropic.com) if compromised
- [ ] Set usage limits / alerts in Anthropic console

## Threat summary

| Threat | Mitigation |
|--------|------------|
| Someone reads your email | 2FA on email; magic links expire in ~1 hour |
| Stolen device token | Revoke in Settings; token can't be recovered from hash |
| Open AI proxy abuse | AI routes now require login + rate limits |
| Brute-force setup codes | 128-bit codes + rate limits on init/poll |
| Cross-user data access | RLS on all tables |
| Service role leak | Server-only env var; never in client bundle |
| XSS stealing API key | Key in localStorage is a tradeoff; session required for proxy |

## If you suspect a breach

1. **Revoke all devices** in Settings → Authorized devices
2. **Sign out everywhere** — change Supabase session (sign out on web)
3. **Rotate** Supabase service role key and update Vercel env
4. **Rotate** Anthropic API keys (browser + server)
5. Re-run `npm run aos:install` only on trusted machines
6. Review Supabase Auth logs and `cli_tokens.last_used_at` for unknown activity

## What we deliberately don't do

- **No public HTTP MCP** — avoids exposing write tools on the internet
- **No password auth** — magic link only; security depends on email
- **No token in URLs** — device tokens use Bearer headers only

## Reporting issues

This is a personal system. If you extend it or open-source it, review auth on any new `/api/*` route before shipping.
