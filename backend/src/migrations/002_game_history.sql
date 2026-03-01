-- 002_game_history.sql
-- Persistent wallets, provably fair seeds, game rounds, and transaction ledger.

CREATE TABLE IF NOT EXISTS wallets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance_cents BIGINT      NOT NULL DEFAULT 100000,
  version       INTEGER     NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seed_pairs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  server_seed   TEXT        NOT NULL,
  server_seed_hash TEXT     NOT NULL,
  client_seed   TEXT        NOT NULL DEFAULT 'default',
  nonce         INTEGER     NOT NULL DEFAULT 0,
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  revealed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seed_pairs_user_active ON seed_pairs(user_id, active);

CREATE TABLE IF NOT EXISTS game_rounds (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id      TEXT        NOT NULL,
  game_id         TEXT        NOT NULL,
  seed_pair_id    UUID        REFERENCES seed_pairs(id),
  nonce           INTEGER,
  bet_cents       BIGINT      NOT NULL,
  win_cents       BIGINT      NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'USD',
  lines           INTEGER     NOT NULL,
  balance_before_cents BIGINT NOT NULL,
  balance_after_cents  BIGINT NOT NULL,
  reel_matrix     JSONB       NOT NULL,
  win_breakdown   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  bonus_triggered JSONB,
  outcome_hash    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_rounds_user_created ON game_rounds(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS transactions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id            UUID        NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT        NOT NULL CHECK (type IN ('bet', 'win')),
  amount_cents        BIGINT      NOT NULL,
  balance_after_cents BIGINT      NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
