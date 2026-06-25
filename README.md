# AOS — Alain Operating System

Personal life operating system backed by Supabase. Web for daily capture; terminal + Claude Code for deep work with live context.

**Production:** [https://life-system-rho.vercel.app](https://life-system-rho.vercel.app)

## One command setup

From the project directory:

```bash
npm install
npm run aos:install
```

This will:

1. Open the browser to authorize your Mac (while logged into AOS)
2. Sync `~/vault/aos/` from live data
3. Install background sync (macOS, every 15 min)

Then add MCP to Claude Code — see [mcp/aos-server/README.md](mcp/aos-server/README.md).

```bash
npm run aos:status    # connected? last sync? background running?
npm run mcp:aos         # MCP server for Claude Code
```

## Daily use

| What | How |
|------|-----|
| Quick capture, coach, CRM | Web app (phone or browser) |
| Deep thinking, synthesis | Claude Code + MCP (`get_context`, `capture`, …) |
| Obsidian / files | `~/vault/aos/` — auto-updated by background sync |
| Manual sync | `npm run aos:sync` |

## Architecture

```
Web app ──► Supabase ◄── /api/cli (device token)
                ▲
Background sync ─┘ (every 15 min)
                │
           ~/vault/aos/
```

## Local web dev

```bash
cp .env.local.example .env.local
npm run dev
```

## Production / Vercel

Required env vars: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, optional `NEXT_PUBLIC_APP_URL`.

Run `supabase/migrations/20250625_cli_tokens.sql` in Supabase if not already applied.

See [SECURITY.md](SECURITY.md) for the full hardening checklist.

```bash
npm run env:pull
npm run deploy:prod
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run aos:install` | **Start here** — authorize + sync + background daemon |
| `npm run aos:status` | Connection, last sync, daemon status |
| `npm run aos:sync` | Manual vault sync |
| `npm run aos:daemon uninstall-daemon` | Remove background sync |
| `npm run mcp:aos` | MCP server for Claude Code |
