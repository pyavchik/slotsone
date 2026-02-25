export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Slots API',
    version: '1.0.0',
    description: 'Slots backend API for session init, spin execution, and history retrieval.',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local development',
    },
  ],
  tags: [{ name: 'Game' }, { name: 'System' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Unauthorized' },
          code: { type: 'string', example: 'missing_token' },
        },
        required: ['error', 'code'],
      },
      Bet: {
        type: 'object',
        properties: {
          amount: { type: 'number', format: 'float', minimum: 0.1, maximum: 100, example: 1.0 },
          currency: { type: 'string', example: 'USD' },
          lines: { type: 'integer', minimum: 1, maximum: 20, example: 20 },
        },
        required: ['amount', 'currency', 'lines'],
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          '200': {
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
      },
    },
    '/api/v1/game/init': {
      post: {
        tags: ['Game'],
        summary: 'Initialize game session',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  game_id: { type: 'string', example: 'slot_mega_fortune_001' },
                  platform: { type: 'string', example: 'web' },
                  locale: { type: 'string', example: 'en' },
                  client_version: { type: 'string', example: '1.0.0' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Session created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    session_id: { type: 'string' },
                    game_id: { type: 'string' },
                    config: { type: 'object' },
                    balance: {
                      type: 'object',
                      properties: {
                        amount: { type: 'number' },
                        currency: { type: 'string' },
                      },
                    },
                    expires_at: { type: 'string', format: 'date-time' },
                  },
                  required: ['session_id', 'game_id', 'config', 'balance', 'expires_at'],
                },
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/v1/spin': {
      post: {
        tags: ['Game'],
        summary: 'Execute one spin',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'header',
            name: 'Idempotency-Key',
            required: false,
            schema: { type: 'string' },
            description: 'Optional idempotency key to safely retry a request.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  session_id: { type: 'string' },
                  game_id: { type: 'string', example: 'slot_mega_fortune_001' },
                  bet: { $ref: '#/components/schemas/Bet' },
                  client_timestamp: { type: 'integer', format: 'int64' },
                },
                required: ['session_id', 'game_id', 'bet', 'client_timestamp'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Spin result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    spin_id: { type: 'string' },
                    session_id: { type: 'string' },
                    game_id: { type: 'string' },
                    balance: {
                      type: 'object',
                      properties: {
                        amount: { type: 'number' },
                        currency: { type: 'string' },
                      },
                    },
                    bet: { $ref: '#/components/schemas/Bet' },
                    outcome: {
                      type: 'object',
                      properties: {
                        reel_matrix: {
                          type: 'array',
                          items: { type: 'array', items: { type: 'string' } },
                        },
                        win: {
                          type: 'object',
                          properties: {
                            amount: { type: 'number' },
                            currency: { type: 'string' },
                            breakdown: { type: 'array', items: { type: 'object' } },
                          },
                        },
                        bonus_triggered: {
                          oneOf: [{ type: 'null' }, { type: 'object' }],
                        },
                      },
                    },
                    next_state: { type: 'string' },
                    timestamp: { type: 'integer', format: 'int64' },
                  },
                  required: ['spin_id', 'session_id', 'game_id', 'balance', 'bet', 'outcome', 'next_state', 'timestamp'],
                },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '403': {
            description: 'Forbidden or expired session',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '409': {
            description: 'Idempotency key reused with different payload',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '422': {
            description: 'Validation or business rule error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '429': {
            description: 'Rate limited (may include Retry-After header)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/v1/history': {
      get: {
        tags: ['Game'],
        summary: 'Get spin history for current user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'limit',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
          {
            in: 'query',
            name: 'offset',
            required: false,
            schema: { type: 'integer', minimum: 0, default: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'History response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: { type: 'object' } },
                    total: { type: 'integer' },
                    limit: { type: 'integer' },
                    offset: { type: 'integer' },
                  },
                  required: ['items', 'total', 'limit', 'offset'],
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
  },
} as const;
