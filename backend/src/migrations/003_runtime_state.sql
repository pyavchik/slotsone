-- 003_runtime_state.sql
-- Move in-memory sessions, idempotency keys, and rate limits to shared storage.

CREATE TABLE IF NOT EXISTS game_sessions (
  session_id  TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at  BIGINT      NOT NULL,
  expires_at  BIGINT      NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_expires ON game_sessions(expires_at);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  scoped_key          TEXT    PRIMARY KEY,
  user_id             UUID    NOT NULL,
  request_fingerprint TEXT    NOT NULL,
  response            JSONB   NOT NULL,
  created_at          BIGINT  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created ON idempotency_keys(created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  user_id     UUID    PRIMARY KEY,
  spin_count  INTEGER NOT NULL DEFAULT 1,
  reset_at    BIGINT  NOT NULL
);
