import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import {
  BalanceSchema,
  BetSchema,
  ErrorResponseSchema,
  GameConfigSchema,
  HistoryResponseSchema,
  InitRequestSchema,
  InitResponseSchema,
  SpinOutcomeSchema,
  SpinRequestSchema,
  SpinResponseSchema,
  WinBreakdownItemSchema,
} from '../contracts/gameContract.js';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
} from '../contracts/authContract.js';
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
const HistoryResponseRef = registry.register('HistoryResponse', HistoryResponseSchema);

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
  summary: 'Health check',
  responses: {
    200: {
      description: 'Service is healthy',
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
  summary: 'Get spin history for current user',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    }),
  },
  responses: {
    200: {
      description: 'History response',
      content: {
        'application/json': {
          schema: HistoryResponseRef,
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
  tags: [{ name: 'Auth' }, { name: 'Game' }, { name: 'System' }],
});
