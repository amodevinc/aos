-- Run in Supabase SQL editor if upgrading an existing AOS database.

CREATE TABLE IF NOT EXISTS cli_tokens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token_hash    TEXT NOT NULL UNIQUE,
  device_label  TEXT DEFAULT 'Terminal',
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cli_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_cli_tokens" ON cli_tokens;
CREATE POLICY "own_cli_tokens" ON cli_tokens FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS cli_setup_sessions (
  code              TEXT PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token_plaintext   TEXT,
  expires_at        TIMESTAMPTZ NOT NULL,
  consumed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cli_setup_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no_direct_cli_setup" ON cli_setup_sessions;
CREATE POLICY "no_direct_cli_setup" ON cli_setup_sessions FOR ALL USING (false);
