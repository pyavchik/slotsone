import { createHash } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { getPool } from './db.js';
import { logger } from './logger.js';
import type { ImageJobStatus } from './contracts/imageContract.js';

const GENERATED_DIR = join(process.cwd(), 'public', 'generated');
const DAILY_QUOTA = Number(process.env.IMAGE_DAILY_QUOTA) || 50;

export interface ImageJob {
  id: string;
  user_id: string;
  cache_key: string;
  title: string;
  category: string;
  provider: string;
  status: ImageJobStatus;
  image_url: string | null;
  error: string | null;
  created_at: Date;
  completed_at: Date | null;
}

function ensureDir() {
  if (!existsSync(GENERATED_DIR)) {
    mkdirSync(GENERATED_DIR, { recursive: true });
  }
}

export function cacheKey(title: string, category: string, provider: string): string {
  return createHash('sha256').update(`${title}|${category}|${provider}`).digest('hex').slice(0, 16);
}

/** Fast-path: check if the image file already exists on disk. */
export function getCachedImageUrl(key: string): string | null {
  const filename = `${key}.png`;
  if (existsSync(join(GENERATED_DIR, filename))) {
    return `/generated/${filename}`;
  }
  return null;
}

/** Count jobs created by this user in the last 24 hours. */
export async function checkQuota(
  userId: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM image_jobs
     WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId]
  );
  const used = Number(rows[0].count);
  return { allowed: used < DAILY_QUOTA, used, limit: DAILY_QUOTA };
}

/** Retrieve a job by id, scoped to the requesting user. */
export async function getJob(jobId: string, userId: string): Promise<ImageJob | null> {
  const { rows } = await getPool().query<ImageJob>(
    `SELECT id, user_id, cache_key, title, category, provider,
            status, image_url, error, created_at, completed_at
     FROM image_jobs WHERE id = $1 AND user_id = $2`,
    [jobId, userId]
  );
  return rows[0] ?? null;
}

/**
 * Find an existing in-flight or completed job for this cache_key,
 * or create a new one. Returns the job and whether it was just created.
 */
export async function findOrCreateJob(
  userId: string,
  title: string,
  category: string,
  provider: string
): Promise<{ job: ImageJob; created: boolean }> {
  const key = cacheKey(title, category, provider);

  // Check for a completed job first.
  const { rows: completed } = await getPool().query<ImageJob>(
    `SELECT id, user_id, cache_key, title, category, provider,
            status, image_url, error, created_at, completed_at
     FROM image_jobs WHERE cache_key = $1 AND status = 'completed' LIMIT 1`,
    [key]
  );
  if (completed.length > 0) {
    return { job: completed[0], created: false };
  }

  // Try to insert a new pending job (the partial unique index deduplicates).
  const { rows: inserted } = await getPool().query<ImageJob>(
    `INSERT INTO image_jobs (user_id, cache_key, title, category, provider, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     ON CONFLICT (cache_key) WHERE status = 'pending' OR status = 'processing'
     DO NOTHING
     RETURNING id, user_id, cache_key, title, category, provider,
               status, image_url, error, created_at, completed_at`,
    [userId, key, title, category, provider]
  );

  if (inserted.length > 0) {
    return { job: inserted[0], created: true };
  }

  // Insert was a no-op — another job is already in-flight.
  const { rows: existing } = await getPool().query<ImageJob>(
    `SELECT id, user_id, cache_key, title, category, provider,
            status, image_url, error, created_at, completed_at
     FROM image_jobs
     WHERE cache_key = $1 AND (status = 'pending' OR status = 'processing')
     LIMIT 1`,
    [key]
  );
  return { job: existing[0], created: false };
}

/** Run the actual image generation in the background. */
export async function processJob(jobId: string): Promise<void> {
  const pool = getPool();

  // Mark processing.
  const { rows } = await pool.query<ImageJob>(
    `UPDATE image_jobs SET status = 'processing'
     WHERE id = $1 AND status = 'pending'
     RETURNING title, category, provider, cache_key`,
    [jobId]
  );
  if (rows.length === 0) return; // Already picked up or cancelled.

  const { title, category, provider, cache_key: key } = rows[0];
  const filename = `${key}.png`;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Image generation unavailable (no OPENAI_API_KEY)');
    }

    const prompt =
      `Casino game thumbnail for "${title}" (${category} game by ${provider}). ` +
      'Dark, luxurious casino aesthetic with gold accents. ' +
      'Professional iGaming art style, vibrant colors, no text.';

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });

    logger.info('image_job_generating', { jobId, title, category, provider });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('No image data returned from OpenAI');
    }

    ensureDir();
    const buffer = Buffer.from(b64, 'base64');
    await writeFile(join(GENERATED_DIR, filename), buffer);

    const imageUrl = `/generated/${filename}`;
    await pool.query(
      `UPDATE image_jobs
       SET status = 'completed', image_url = $1, completed_at = NOW()
       WHERE id = $2`,
      [imageUrl, jobId]
    );

    logger.info('image_job_completed', { jobId, imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await pool.query(
      `UPDATE image_jobs
       SET status = 'failed', error = $1, completed_at = NOW()
       WHERE id = $2`,
      [message.slice(0, 500), jobId]
    );
    logger.error('image_job_failed', { jobId, err });
  }
}
