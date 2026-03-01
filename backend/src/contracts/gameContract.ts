import { z } from './zodOpenApi.js';

export const ErrorResponseSchema = z
  .object({
    error: z.string(),
    code: z.string(),
  })
  .strict();

export const BalanceSchema = z
  .object({
    amount: z.number(),
    currency: z.string(),
  })
  .strict();

export const BetSchema = z
  .object({
    amount: z.number(),
    currency: z.string().min(1),
    lines: z.number().int(),
  })
  .strict();

export const WinBreakdownItemSchema = z
  .object({
    type: z.literal('line'),
    line_index: z.number().int(),
    symbol: z.string(),
    count: z.number().int(),
    payout: z.number(),
  })
  .strict();

export const BonusTriggeredSchema = z
  .object({
    type: z.literal('free_spins'),
    free_spins_count: z.number().int(),
    bonus_round_id: z.string(),
    multiplier: z.number(),
  })
  .strict();

export const SpinOutcomeSchema = z
  .object({
    reel_matrix: z.array(z.array(z.string())),
    win: z
      .object({
        amount: z.number(),
        currency: z.string(),
        breakdown: z.array(WinBreakdownItemSchema),
      })
      .strict(),
    bonus_triggered: BonusTriggeredSchema.nullable(),
  })
  .strict();

export const PaytableSchema = z
  .object({
    line_wins: z.array(
      z
        .object({
          symbol: z.string(),
          x3: z.number(),
          x4: z.number(),
          x5: z.number(),
        })
        .strict()
    ),
    scatter: z
      .object({
        symbol: z.string(),
        awards: z.array(
          z
            .object({
              count: z.number().int(),
              free_spins: z.number().int(),
            })
            .strict()
        ),
      })
      .strict(),
    wild: z
      .object({
        symbol: z.string(),
        substitutes_for: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export const GameConfigSchema = z
  .object({
    reels: z.number().int(),
    rows: z.number().int(),
    paylines: z.number().int(),
    currencies: z.array(z.string()),
    min_bet: z.number(),
    max_bet: z.number(),
    min_lines: z.number().int(),
    max_lines: z.number().int(),
    default_lines: z.number().int(),
    line_defs: z.array(z.array(z.number().int())),
    bet_levels: z.array(z.number()),
    paytable_url: z.string(),
    paytable: PaytableSchema,
    rules_url: z.string(),
    rtp: z.number(),
    volatility: z.enum(['low', 'medium', 'high']),
    features: z.array(z.string()),
  })
  .strict();

export const InitRequestSchema = z
  .object({
    game_id: z.string().min(1).optional(),
    platform: z.string().min(1).optional(),
    locale: z.string().min(1).optional(),
    client_version: z.string().min(1).optional(),
  })
  .strict();

export const InitResponseSchema = z
  .object({
    session_id: z.string(),
    game_id: z.string(),
    config: GameConfigSchema,
    balance: BalanceSchema,
    idle_matrix: z.array(z.array(z.string())),
    expires_at: z.string(),
  })
  .strict();

export const SpinRequestSchema = z
  .object({
    session_id: z.string().min(1),
    game_id: z.string().min(1),
    bet: BetSchema,
    client_timestamp: z.number().int(),
  })
  .strict();

export const SpinResponseSchema = z
  .object({
    spin_id: z.string(),
    session_id: z.string(),
    game_id: z.string(),
    balance: BalanceSchema,
    bet: BetSchema,
    outcome: SpinOutcomeSchema,
    next_state: z.string(),
    timestamp: z.number().int(),
  })
  .strict();

export const HistoryQuerySchema = z
  .object({
    limit: z.coerce.number().int().optional(),
    offset: z.coerce.number().int().optional(),
  })
  .passthrough();

export const HistoryResponseSchema = z
  .object({
    items: z.array(SpinResponseSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })
  .strict();

export type InitRequest = z.infer<typeof InitRequestSchema>;
export type SpinRequest = z.infer<typeof SpinRequestSchema>;
export type InitResponse = z.infer<typeof InitResponseSchema>;
export type SpinResponse = z.infer<typeof SpinResponseSchema>;
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;
