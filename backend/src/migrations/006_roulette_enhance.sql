-- Add profit tracking and won flag to roulette_bets
ALTER TABLE roulette_bets ADD COLUMN IF NOT EXISTS profit_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE roulette_bets ADD COLUMN IF NOT EXISTS won BOOLEAN NOT NULL DEFAULT FALSE;

-- Roulette round results (materialized for fast recent-numbers queries)
CREATE TABLE IF NOT EXISTS roulette_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id        UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  winning_number  INTEGER NOT NULL,
  winning_color   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roulette_results_user ON roulette_results(user_id, created_at DESC);
