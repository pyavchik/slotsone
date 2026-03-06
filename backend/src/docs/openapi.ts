import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import {
  BalanceSchema,
  BetSchema,
  ClientSeedRequestSchema,
  EnhancedHistoryResponseSchema,
  ErrorResponseSchema,
  GameConfigSchema,
  HistorySummarySchema,
  InitRequestSchema,
  InitResponseSchema,
  ProvablyFairSchema,
  RoundDetailResponseSchema,
  RoundDetailSchema,
  SeedPairResponseSchema,
  SeedRotationResponseSchema,
  SpinOutcomeSchema,
  SpinRequestSchema,
  SpinResponseSchema,
  TopUpRequestSchema,
  TopUpResponseSchema,
  TransactionSchema,
  WinBreakdownItemSchema,
} from '../contracts/gameContract.js';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
} from '../contracts/authContract.js';
import { ImageGenerateRequestSchema, ImageJobResponseSchema } from '../contracts/imageContract.js';
import {
  RouletteBetSchema,
  BetResultSchema,
  RouletteOutcomeSchema,
  RouletteSpinRequestSchema,
  RouletteSpinResponseSchema,
  RouletteInitResponseSchema,
  RouletteConfigSchema,
  RouletteBetRowSchema,
} from '../contracts/rouletteContract.js';
import {
  AmericanRouletteBetSchema,
  AmericanBetResultSchema,
  AmericanRouletteOutcomeSchema,
  AmericanRouletteSpinRequestSchema,
  AmericanRouletteSpinResponseSchema,
  AmericanRouletteInitResponseSchema,
  AmericanRouletteConfigSchema,
} from '../contracts/americanRouletteContract.js';
import { z } from '../contracts/zodOpenApi.js';

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

const ErrorResponseRef = registry.register('ErrorResponse', ErrorResponseSchema);
const RegisterRequestRef = registry.register('RegisterRequest', RegisterRequestSchema);
const LoginRequestRef = registry.register('LoginRequest', LoginRequestSchema);
const AuthResponseRef = registry.register('AuthResponse', AuthResponseSchema);
registry.register('Bet', BetSchema);
registry.register('Balance', BalanceSchema);
registry.register('WinBreakdownItem', WinBreakdownItemSchema);
registry.register('SpinOutcome', SpinOutcomeSchema);
registry.register('GameConfig', GameConfigSchema);
const InitRequestRef = registry.register('InitRequest', InitRequestSchema);
const InitResponseRef = registry.register('InitResponse', InitResponseSchema);
const SpinRequestRef = registry.register('SpinRequest', SpinRequestSchema);
const SpinResponseRef = registry.register('SpinResponse', SpinResponseSchema);
const EnhancedHistoryResponseRef = registry.register(
  'EnhancedHistoryResponse',
  EnhancedHistoryResponseSchema
);
registry.register('HistorySummary', HistorySummarySchema);
registry.register('Transaction', TransactionSchema);
registry.register('ProvablyFair', ProvablyFairSchema);
registry.register('RoundDetail', RoundDetailSchema);
const RoundDetailResponseRef = registry.register('RoundDetailResponse', RoundDetailResponseSchema);
const SeedPairResponseRef = registry.register('SeedPairResponse', SeedPairResponseSchema);
const SeedRotationResponseRef = registry.register(
  'SeedRotationResponse',
  SeedRotationResponseSchema
);
const ClientSeedRequestRef = registry.register('ClientSeedRequest', ClientSeedRequestSchema);
const TopUpRequestRef = registry.register('TopUpRequest', TopUpRequestSchema);
const TopUpResponseRef = registry.register('TopUpResponse', TopUpResponseSchema);
const ImageGenerateRequestRef = registry.register(
  'ImageGenerateRequest',
  ImageGenerateRequestSchema
);
const ImageJobResponseRef = registry.register('ImageJobResponse', ImageJobResponseSchema);
registry.register('RouletteBet', RouletteBetSchema);
registry.register('BetResult', BetResultSchema);
registry.register('RouletteOutcome', RouletteOutcomeSchema);
const RouletteSpinRequestRef = registry.register('RouletteSpinRequest', RouletteSpinRequestSchema);
const RouletteSpinResponseRef = registry.register(
  'RouletteSpinResponse',
  RouletteSpinResponseSchema
);
const RouletteInitResponseRef = registry.register(
  'RouletteInitResponse',
  RouletteInitResponseSchema
);
registry.register('RouletteConfig', RouletteConfigSchema);
registry.register('RouletteBetRow', RouletteBetRowSchema);
registry.register('AmericanRouletteBet', AmericanRouletteBetSchema);
registry.register('AmericanBetResult', AmericanBetResultSchema);
registry.register('AmericanRouletteOutcome', AmericanRouletteOutcomeSchema);
const AmericanRouletteSpinRequestRef = registry.register(
  'AmericanRouletteSpinRequest',
  AmericanRouletteSpinRequestSchema
);
const AmericanRouletteSpinResponseRef = registry.register(
  'AmericanRouletteSpinResponse',
  AmericanRouletteSpinResponseSchema
);
const AmericanRouletteInitResponseRef = registry.register(
  'AmericanRouletteInitResponse',
  AmericanRouletteInitResponseSchema
);
registry.register('AmericanRouletteConfig', AmericanRouletteConfigSchema);

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/register',
  tags: ['Auth'],
  summary: 'Register a new player account',
  description:
    'Creates an account and issues a token pair:\n' +
    '- **Body**: 15-min RS256 access token — copy and paste into **Authorize**\n' +
    '- **Cookie** (`httpOnly`): 7-day refresh token — stored by the browser, never readable by JS',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: RegisterRequestRef,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Account created, JWT issued',
      content: {
        'application/json': {
          schema: AuthResponseRef,
        },
      },
    },
    400: {
      description: 'Invalid request body',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    409: {
      description: 'Email already registered',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  tags: ['Auth'],
  summary: 'Login and receive a JWT',
  description:
    'Verifies credentials and issues a fresh token pair. Same response shape as register.',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: LoginRequestRef,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'JWT issued',
      content: {
        'application/json': {
          schema: AuthResponseRef,
        },
      },
    },
    400: {
      description: 'Invalid request body',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/refresh',
  tags: ['Auth'],
  summary: 'Silently refresh the access token',
  description:
    'Reads the `refresh_token` httpOnly cookie, validates it, and issues a new token pair ' +
    '(**token rotation** — the old refresh token is invalidated on use). ' +
    'Returns 401 if the cookie is missing or expired. ' +
    'In the browser this happens automatically; the cookie is never visible to JS.',
  request: {
    headers: z.object({
      Cookie: z
        .string()
        .openapi({
          example: 'refresh_token=<opaque-hex>',
          description: 'Set automatically by the browser',
        })
        .optional(),
    }),
  },
  responses: {
    200: {
      description: 'New access token issued, new refresh cookie set',
      content: { 'application/json': { schema: AuthResponseRef } },
    },
    401: {
      description: 'Missing, invalid, or expired refresh token',
      content: { 'application/json': { schema: ErrorResponseRef } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/logout',
  tags: ['Auth'],
  summary: 'Logout and revoke all refresh tokens',
  description:
    'Revokes the current refresh token **and all other active sessions** for the user, ' +
    'then clears the cookie. Safe to call even if the cookie is already gone.',
  responses: {
    204: { description: 'Logged out — cookie cleared' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Liveness probe',
  description: 'Lightweight check that the process is alive. Does not verify dependencies.',
  responses: {
    200: {
      description: 'Process is alive',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
            },
            required: ['status'],
          },
        },
      },
    },
  },
});

const readinessCheckSchema = {
  type: 'object' as const,
  properties: {
    status: { type: 'string' as const, enum: ['ok', 'fail'] },
    latency_ms: { type: 'number' as const, example: 1.2 },
    error: { type: 'string' as const },
  },
  required: ['status'] as string[],
};

registry.registerPath({
  method: 'get',
  path: '/ready',
  tags: ['System'],
  summary: 'Readiness probe',
  description:
    'Verifies that the service and its dependencies (database) are ready to accept traffic. ' +
    'Returns 503 when any check fails.',
  responses: {
    200: {
      description: 'All dependencies ready',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ready' },
              checks: {
                type: 'object',
                properties: {
                  database: readinessCheckSchema,
                },
              },
            },
            required: ['status', 'checks'],
          },
        },
      },
    },
    503: {
      description: 'One or more dependencies unavailable',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'degraded' },
              checks: {
                type: 'object',
                properties: {
                  database: readinessCheckSchema,
                },
              },
            },
            required: ['status', 'checks'],
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/game/init',
  tags: ['Game'],
  summary: 'Initialize game session',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: false,
      content: {
        'application/json': {
          schema: InitRequestRef,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Session created',
      content: {
        'application/json': {
          schema: InitResponseRef,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/spin',
  tags: ['Game'],
  summary: 'Execute one spin',
  security: [{ bearerAuth: [] }],
  request: {
    headers: z.object({
      'Idempotency-Key': z.string().optional(),
    }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: SpinRequestRef,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Spin result',
      content: {
        'application/json': {
          schema: SpinResponseRef,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    403: {
      description: 'Forbidden or expired session',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    409: {
      description: 'Idempotency key reused with different payload',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    422: {
      description: 'Validation or business rule error',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    429: {
      description: 'Rate limited (may include Retry-After header)',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/history',
  tags: ['Game'],
  summary: 'Get spin history with filters and summary',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      result: z.enum(['win', 'loss', 'all']).optional(),
      min_bet: z.number().optional(),
      max_bet: z.number().optional(),
    }),
  },
  responses: {
    200: {
      description: 'History response with summary',
      content: {
        'application/json': {
          schema: EnhancedHistoryResponseRef,
        },
      },
    },
    400: {
      description: 'Invalid query params',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/history/summary',
  tags: ['Game'],
  summary: 'Get aggregated stats for the current user',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      result: z.enum(['win', 'loss', 'all']).optional(),
      min_bet: z.number().optional(),
      max_bet: z.number().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Summary stats',
      content: {
        'application/json': {
          schema: registry.register(
            'HistorySummaryResponse',
            z
              .object({
                total_rounds: z.number().int(),
                total_wagered: z.number(),
                total_won: z.number(),
                net_result: z.number(),
                biggest_win: z.number(),
              })
              .strict()
          ),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/history/{roundId}',
  tags: ['Game'],
  summary: 'Get round detail with provably fair data and transactions',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      roundId: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Round detail',
      content: {
        'application/json': {
          schema: RoundDetailResponseRef,
        },
      },
    },
    404: {
      description: 'Round not found',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/provably-fair/rotate',
  tags: ['Provably Fair'],
  summary: 'Rotate seed pair — reveals old server seed, creates new pair',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Seed rotation result',
      content: {
        'application/json': {
          schema: SeedRotationResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/provably-fair/client-seed',
  tags: ['Provably Fair'],
  summary: 'Set the client seed for the active seed pair',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: ClientSeedRequestRef,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated seed pair',
      content: {
        'application/json': {
          schema: SeedPairResponseRef,
        },
      },
    },
    400: {
      description: 'Invalid client seed',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/provably-fair/current',
  tags: ['Provably Fair'],
  summary: 'Get the current active seed pair info',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Current seed pair',
      content: {
        'application/json': {
          schema: SeedPairResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

// ── Wallet ──

registry.registerPath({
  method: 'post',
  path: '/api/v1/wallet/topup',
  tags: ['Wallet'],
  summary: 'Top up wallet balance (demo)',
  description: 'Add funds to the authenticated user wallet. For demo/testing purposes.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: TopUpRequestRef,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Balance topped up',
      content: {
        'application/json': {
          schema: TopUpResponseRef,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

// ── Images ──

registry.registerPath({
  method: 'post',
  path: '/api/v1/images/generate',
  tags: ['Images'],
  summary: 'Request game thumbnail generation',
  description:
    'Returns immediately with a job reference.\n\n' +
    '- **200** — image already cached (filesystem or completed job)\n' +
    '- **202** — job accepted; poll `GET /images/jobs/{jobId}` for the result\n' +
    '- **429** — daily per-user quota exceeded',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: ImageGenerateRequestRef,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Cache hit — image already available',
      content: {
        'application/json': {
          schema: ImageJobResponseRef,
        },
      },
    },
    202: {
      description: 'Job accepted — generation in progress',
      content: {
        'application/json': {
          schema: ImageJobResponseRef,
        },
      },
    },
    400: {
      description: 'Invalid request body',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    429: {
      description: 'Daily image quota exceeded',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    503: {
      description: 'Image generation service unavailable',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

// ── Roulette ──

registry.registerPath({
  method: 'post',
  path: '/api/v1/roulette/init',
  tags: ['Roulette'],
  summary: 'Initialize a roulette session',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Session created',
      content: {
        'application/json': {
          schema: RouletteInitResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/roulette/spin',
  tags: ['Roulette'],
  summary: 'Place roulette bets and spin the wheel',
  security: [{ bearerAuth: [] }],
  request: {
    headers: z
      .object({
        'Idempotency-Key': z.string().optional(),
      })
      .openapi({ description: 'Optional idempotency key to make the call safe to retry' }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: RouletteSpinRequestRef,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Spin resolved',
      content: {
        'application/json': {
          schema: RouletteSpinResponseRef,
        },
      },
    },
    400: {
      description: 'Invalid payload',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    409: {
      description: 'Idempotency conflict',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    422: {
      description: 'Validation or balance error',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

// ── American Roulette ──

registry.registerPath({
  method: 'post',
  path: '/api/v1/american-roulette/init',
  tags: ['American Roulette'],
  summary: 'Initialize an American roulette session',
  description:
    'Creates a new American roulette session (38-number wheel with 0 and 00). ' +
    'Returns the session ID, game config, balance, and recent winning numbers.',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Session created',
      content: {
        'application/json': {
          schema: AmericanRouletteInitResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/american-roulette/spin',
  tags: ['American Roulette'],
  summary: 'Place American roulette bets and spin the wheel',
  description:
    'Accepts an array of bets and resolves them against a provably fair spin. ' +
    'The American wheel has 38 pockets (0, 00, 1-36) with a 5.26% house edge.',
  security: [{ bearerAuth: [] }],
  request: {
    headers: z
      .object({
        'Idempotency-Key': z.string().optional(),
      })
      .openapi({ description: 'Optional idempotency key to make the call safe to retry' }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: AmericanRouletteSpinRequestRef,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Spin resolved',
      content: {
        'application/json': {
          schema: AmericanRouletteSpinResponseRef,
        },
      },
    },
    400: {
      description: 'Invalid payload',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    409: {
      description: 'Idempotency conflict',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    422: {
      description: 'Validation or balance error',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/images/jobs/{jobId}',
  tags: ['Images'],
  summary: 'Poll image generation job status',
  description:
    'Returns the current state of a previously submitted image generation job. ' +
    'When `status` is `completed`, `imageUrl` contains the path to the generated thumbnail.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      jobId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: 'Job status',
      content: {
        'application/json': {
          schema: ImageJobResponseRef,
        },
      },
    },
    400: {
      description: 'Invalid job ID format',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
    404: {
      description: 'Job not found',
      content: {
        'application/json': {
          schema: ErrorResponseRef,
        },
      },
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiSpec = generator.generateDocument({
  openapi: '3.0.3',
  info: {
    title: 'Slots API',
    version: '1.0.0',
    description:
      'Slots RGS (Remote Game Server) API.\n\n' +
      '**Auth flow (two-token pattern):**\n' +
      '1. `POST /api/v1/auth/register` or `/login` — returns a 15-min **access token** in the body; sets a 7-day **refresh token** in an `httpOnly` cookie\n' +
      '2. Copy `access_token` → click **Authorize** → paste → game endpoints unlock\n' +
      '3. When the access token expires, `POST /api/v1/auth/refresh` silently issues a new pair (token rotation)\n' +
      '4. `POST /api/v1/auth/logout` revokes all refresh tokens and clears the cookie',
  },
  servers: [
    {
      url: 'https://pyavchik.space',
      description: 'Production',
    },
    {
      url: 'http://localhost:3001',
      description: 'Local development',
    },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Game' },
    { name: 'Roulette' },
    { name: 'American Roulette' },
    { name: 'Wallet' },
    { name: 'Images' },
    { name: 'Provably Fair' },
    { name: 'System' },
  ],
});
