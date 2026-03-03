import { z } from './zodOpenApi.js';

export const ImageGenerateRequestSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .max(100)
      .openapi({ description: 'Game title', example: 'Mega Fortune' }),
    category: z.string().min(1).max(50).openapi({ description: 'Game category', example: 'slots' }),
    provider: z
      .string()
      .min(1)
      .max(100)
      .openapi({ description: 'Game provider', example: 'SlotsOne' }),
  })
  .strict()
  .openapi('ImageGenerateRequest');

export type ImageGenerateRequest = z.infer<typeof ImageGenerateRequestSchema>;

export const ImageJobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export type ImageJobStatus = z.infer<typeof ImageJobStatusSchema>;

export const ImageJobResponseSchema = z
  .object({
    jobId: z
      .string()
      .uuid()
      .nullable()
      .openapi({ description: 'Job identifier, null for cache hits' }),
    status: ImageJobStatusSchema,
    imageUrl: z.string().nullable().openapi({ description: 'URL when completed, null otherwise' }),
    error: z
      .string()
      .nullable()
      .openapi({ description: 'Error detail when failed, null otherwise' }),
  })
  .strict()
  .openapi('ImageJobResponse');

export type ImageJobResponse = z.infer<typeof ImageJobResponseSchema>;
