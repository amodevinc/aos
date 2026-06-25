#!/usr/bin/env bash
# Copy production Supabase env vars to Preview + Development on Vercel.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.vercel ]]; then
  echo "Missing .env.vercel — run: npm run env:pull"
  exit 1
fi

sync_var() {
  local name="$1"
  local value
  value=$(grep -E "^${name}=" .env.vercel | cut -d= -f2- | tr -d '"')
  if [[ -z "$value" ]]; then
    echo "Skip $name (not in .env.vercel)"
    return
  fi
  for env in preview development; do
    if npx vercel env ls "$env" 2>/dev/null | grep -q "$name"; then
      echo "✓ $name already set for $env"
    else
      printf '%s' "$value" | npx vercel env add "$name" "$env" --force
      echo "✓ Added $name to $env"
    fi
  done
}

sync_var NEXT_PUBLIC_SUPABASE_URL
sync_var NEXT_PUBLIC_SUPABASE_ANON_KEY

echo "Done. Preview deployments will now have Supabase credentials."
