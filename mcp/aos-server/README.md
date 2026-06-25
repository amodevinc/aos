# AOS MCP Server

MCP tools talk to **live AOS data** via the production API.

## Setup

```bash
npm run aos:install
```

Register MCP in Claude Code (`.mcp.json`):

```json
{
  "mcpServers": {
    "aos": {
      "command": "npm",
      "args": ["run", "mcp:aos"],
      "cwd": "/Users/alainmorris/dev/ai/life-system"
    }
  }
}
```

## Capture workflow (tier-gated, token-efficient)

| Step | Tool | Tokens |
|------|------|--------|
| 1 | `capture(transcript)` | 1× LLM parse — returns `capture_id` |
| 2 | User confirms | — |
| 3 | `capture(capture_id, apply_auto=true)` | **0× LLM** — applies from cache |
| 4 | `apply_actions([...])` | **0× LLM** — for confirm/hold items |

Avoid `capture(apply_auto=true)` without `capture_id` — that re-runs the full parse.

Prefer `apply_actions` when Claude already has structured actions (skips capture entirely).

`get_context` defaults to `focus=today` (light). Avoid `focus=full` unless needed.

## Tools

| Tool | Description |
|------|-------------|
| `get_context` | Live context — `focus`: `today` (default), `crm`, `goals`, `minimal`, `full` |
| `get_daily` | Daily entry |
| `list_goals` | Goals |
| `list_decisions` | Recent decisions |
| `search_contacts` | CRM search |
| `get_weekly` | Weekly reviews |
| `get_compass` | Life compass |
| `sync_vault` | Refresh `~/vault/aos/` |
| `capture` | NL → structured actions (preview default) |
| `apply_actions` | Apply approved actions |
| `undo_session` | Undo a capture |

## Env (local)

```
ANTHROPIC_API_KEY=sk-ant-...     # for capture tool
AOS_API_URL=https://life-system-rho.vercel.app   # optional override
AOS_VAULT_PATH=~/vault
```
