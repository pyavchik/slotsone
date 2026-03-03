import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { ImageGenerateRequestSchema } from '../contracts/imageContract.js';
import {
  cacheKey,
  getCachedImageUrl,
  checkQuota,
  findOrCreateJob,
  getJob,
  processJob,
} from '../imageService.js';
import { logger } from '../logger.js';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /images/generate
 *
 * Returns immediately:
 *   200 — cache hit  { jobId?, status: 'completed', imageUrl, error: null }
 *   202 — accepted   { jobId,  status: 'pending'|'processing', imageUrl: null, error: null }
 *   400 — bad input
 *   429 — quota exceeded
 *   503 — internal failure
 */
router.post(
  '/images/generate',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { userId: string }).userId;

    // ── Validate input ──
    const parsed = ImageGenerateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request body',
        code: 'invalid_body',
        details: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
      return;
    }

    const { title, category, provider } = parsed.data;

    // ── Fast-path: file already on disk ──
    const key = cacheKey(title, category, provider);
    const cachedUrl = getCachedImageUrl(key);
    if (cachedUrl) {
      res.json({ jobId: null, status: 'completed', imageUrl: cachedUrl, error: null });
      return;
    }

    // ── Quota check ──
    try {
      const quota = await checkQuota(userId);
      if (!quota.allowed) {
        res.status(429).json({
          error: `Daily image quota exceeded (${quota.used}/${quota.limit})`,
          code: 'quota_exceeded',
          retry_after_seconds: 3600,
        });
        return;
      }
    } catch (err) {
      logger.error('image_quota_check_error', { userId, err });
      res.status(503).json({ error: 'Service temporarily unavailable', code: 'internal_error' });
      return;
    }

    // ── Find or create job ──
    try {
      const { job, created } = await findOrCreateJob(userId, title, category, provider);

      if (job.status === 'completed') {
        res.json({ jobId: job.id, status: 'completed', imageUrl: job.image_url, error: null });
        return;
      }

      // Fire-and-forget background processing for newly created jobs.
      if (created) {
        processJob(job.id).catch((err) => {
          logger.error('image_process_unhandled', { jobId: job.id, err });
        });
      }

      res.status(202).json({
        jobId: job.id,
        status: job.status,
        imageUrl: null,
        error: null,
      });
    } catch (err) {
      logger.error('image_generate_error', { title, category, provider, err });
      res.status(503).json({ error: 'Image generation unavailable', code: 'internal_error' });
    }
  }
);

/**
 * GET /images/jobs/:jobId
 *
 * Poll the status of an image generation job.
 */
router.get(
  '/images/jobs/:jobId',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { userId: string }).userId;
    const { jobId } = req.params;

    if (!UUID_RE.test(jobId)) {
      res.status(400).json({ error: 'Invalid job ID', code: 'invalid_job_id' });
      return;
    }

    try {
      const job = await getJob(jobId, userId);
      if (!job) {
        res.status(404).json({ error: 'Job not found', code: 'not_found' });
        return;
      }

      res.json({
        jobId: job.id,
        status: job.status,
        imageUrl: job.image_url ?? null,
        error: job.error ?? null,
      });
    } catch (err) {
      logger.error('image_job_lookup_error', { jobId, err });
      res.status(503).json({ error: 'Service temporarily unavailable', code: 'internal_error' });
    }
  }
);

export default router;
