-- 004_image_jobs.sql
-- Async image generation jobs with per-user quota tracking.

CREATE TABLE IF NOT EXISTS image_jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cache_key    TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  category     TEXT        NOT NULL,
  provider     TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  image_url    TEXT,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_image_jobs_user_created
  ON image_jobs(user_id, created_at);

-- Only one in-flight job per cache_key at a time (deduplication).
CREATE UNIQUE INDEX IF NOT EXISTS idx_image_jobs_inflight
  ON image_jobs(cache_key) WHERE status = 'pending' OR status = 'processing';
