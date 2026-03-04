-- Roulette support
CREATE TABLE IF NOT EXISTS roulette_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES game_rounds(id) ON DELETE CASCADE,
  bet_type TEXT NOT NULL,
  numbers INTEGER[] NOT NULL,
  amount_cents BIGINT NOT NULL,
  payout_cents BIGINT NOT NULL DEFAULT 0,
  la_partage BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roulette_bets_round ON roulette_bets(round_id);
