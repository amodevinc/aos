-- AOS — Alain Operating System
-- Run this entire file in the Supabase SQL editor once after creating your project.
-- Row Level Security ensures each user can only see their own data.

-- ─── Daily Entries ────────────────────────────────────────────────────────────
CREATE TABLE daily_entries (
  id            TEXT PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date          TEXT NOT NULL,
  morning       JSONB,
  evening       JSONB,
  alignment_score INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_daily" ON daily_entries FOR ALL USING (auth.uid() = user_id);
CREATE INDEX daily_entries_user_date ON daily_entries(user_id, date);

-- ─── Goals ───────────────────────────────────────────────────────────────────
CREATE TABLE goals (
  id              TEXT PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  pillar          TEXT NOT NULL,
  deadline        TEXT DEFAULT '',
  status          TEXT DEFAULT 'active',
  progress        INTEGER DEFAULT 0,
  why_it_matters  TEXT DEFAULT '',
  next_action     TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_goals" ON goals FOR ALL USING (auth.uid() = user_id);

-- ─── Projects ────────────────────────────────────────────────────────────────
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_id     TEXT,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  pillar      TEXT NOT NULL,
  status      TEXT DEFAULT 'active',
  milestones  JSONB DEFAULT '[]',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_projects" ON projects FOR ALL USING (auth.uid() = user_id);

-- ─── Decisions ───────────────────────────────────────────────────────────────
CREATE TABLE decisions (
  id                TEXT PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT DEFAULT '',
  scores            JSONB NOT NULL,
  composite_score   INTEGER NOT NULL,
  recommendation    TEXT NOT NULL,
  opportunity_cost  TEXT DEFAULT '',
  main_upside       TEXT DEFAULT '',
  main_downside     TEXT DEFAULT '',
  suggested_action  TEXT DEFAULT '',
  outcome           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_decisions" ON decisions FOR ALL USING (auth.uid() = user_id);

-- ─── Weekly Reviews ──────────────────────────────────────────────────────────
CREATE TABLE weekly_reviews (
  id                    TEXT PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start            TEXT NOT NULL,
  week_end              TEXT NOT NULL,
  what_improved         TEXT DEFAULT '',
  what_regressed        TEXT DEFAULT '',
  what_created_leverage TEXT DEFAULT '',
  what_wasted_time      TEXT DEFAULT '',
  who_connected_with    TEXT DEFAULT '',
  what_built            TEXT DEFAULT '',
  what_learned          TEXT DEFAULT '',
  what_double_down      TEXT DEFAULT '',
  what_eliminate        TEXT DEFAULT '',
  main_focus_next_week  TEXT DEFAULT '',
  weekly_score          INTEGER DEFAULT 0,
  pillar_scores         JSONB NOT NULL DEFAULT '{}',
  avg_daily_alignment   INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_weekly" ON weekly_reviews FOR ALL USING (auth.uid() = user_id);

-- ─── Life Compass (one row per user) ─────────────────────────────────────────
CREATE TABLE life_compass (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  mission_statement   TEXT DEFAULT '',
  ten_year_vision     TEXT DEFAULT '',
  three_year_mission  TEXT DEFAULT '',
  current_season      TEXT DEFAULT '',
  core_values         JSONB DEFAULT '[]',
  personal_rules      JSONB DEFAULT '[]',
  anti_rules          JSONB DEFAULT '[]',
  non_negotiables     JSONB DEFAULT '[]',
  identity_statement  TEXT DEFAULT '',
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE life_compass ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_compass" ON life_compass FOR ALL USING (auth.uid() = user_id);

-- ─── App Settings (one row per user) ─────────────────────────────────────────
CREATE TABLE app_settings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme       TEXT DEFAULT 'dark',
  user_name   TEXT DEFAULT 'Alain',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_settings" ON app_settings FOR ALL USING (auth.uid() = user_id);

-- ─── Contacts ─────────────────────────────────────────────────────────────────
CREATE TABLE contacts (
  id                    TEXT PRIMARY KEY,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name                  TEXT NOT NULL,
  role                  TEXT DEFAULT '',
  company               TEXT DEFAULT '',
  relationship          TEXT DEFAULT 'other',
  tier                  INTEGER DEFAULT 2,
  pillar_relevance      JSONB DEFAULT '[]',
  email                 TEXT DEFAULT '',
  linkedin              TEXT DEFAULT '',
  phone                 TEXT DEFAULT '',
  met                   TEXT DEFAULT '',
  met_via               TEXT DEFAULT '',
  location              TEXT DEFAULT '',
  bio                   TEXT DEFAULT '',
  notes                 TEXT DEFAULT '',
  tags                  JSONB DEFAULT '[]',
  what_i_can_offer      TEXT DEFAULT '',
  what_they_can_offer   TEXT DEFAULT '',
  last_contact_date     TEXT DEFAULT '',
  next_contact_date     TEXT DEFAULT '',
  touch_frequency_days  INTEGER DEFAULT 30,
  status                TEXT DEFAULT 'active',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_contacts" ON contacts FOR ALL USING (auth.uid() = user_id);
CREATE INDEX contacts_user_tier ON contacts(user_id, tier);

-- ─── Interactions ─────────────────────────────────────────────────────────────
CREATE TABLE interactions (
  id          TEXT PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id  TEXT REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  date        TEXT NOT NULL,
  type        TEXT DEFAULT 'meeting',
  summary     TEXT DEFAULT '',
  key_insight TEXT DEFAULT '',
  next_step   TEXT DEFAULT '',
  sentiment   TEXT DEFAULT 'good',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_interactions" ON interactions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX interactions_contact ON interactions(contact_id);
CREATE INDEX interactions_user_date ON interactions(user_id, date);

-- ─── Capture Sessions (agentic voice capture audit log) ──────────────────────
CREATE TABLE capture_sessions (
  id          TEXT PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transcript  TEXT NOT NULL,
  actions     JSONB NOT NULL DEFAULT '[]',
  status      TEXT DEFAULT 'applied',   -- applied | undone | failed
  summary     TEXT DEFAULT '',
  metadata    JSONB DEFAULT '{}',       -- ObservabilityMetadata: tokens, latency, evaluator corrections, domains
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- If adding to an existing table: ALTER TABLE capture_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE capture_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_capture_sessions" ON capture_sessions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX capture_sessions_user_date ON capture_sessions(user_id, created_at DESC);

-- ─── Coach Conversations ──────────────────────────────────────────────────────
-- One active conversation per user. Messages stored as JSONB.
CREATE TABLE coach_conversations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  messages    JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_conversation" ON coach_conversations FOR ALL USING (auth.uid() = user_id);

-- ─── CLI device tokens (terminal / MCP access) ─────────────────────────────────
CREATE TABLE cli_tokens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token_hash    TEXT NOT NULL UNIQUE,
  device_label  TEXT DEFAULT 'Terminal',
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cli_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_cli_tokens" ON cli_tokens FOR ALL USING (auth.uid() = user_id);

CREATE TABLE cli_setup_sessions (
  code              TEXT PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token_plaintext   TEXT,
  expires_at        TIMESTAMPTZ NOT NULL,
  consumed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
-- Setup sessions are managed by API routes via service role (short-lived pairing codes).
ALTER TABLE cli_setup_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_direct_cli_setup" ON cli_setup_sessions FOR ALL USING (false);
