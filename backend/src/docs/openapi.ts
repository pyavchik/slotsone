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
import { z } from '../contracts/zodOpenApi.js';

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

const ErrorResponseRef = registry.register('ErrorResponse', ErrorResponseSchema);
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
    description: 'Slots backend API for session init, spin execution, and history retrieval.',
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
  tags: [{ name: 'Game' }, { name: 'System' }],
});
