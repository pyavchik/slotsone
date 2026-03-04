import { z } from './zodOpenApi.js';
import { BET_TYPES, ROULETTE_CONFIG, ROULETTE_GAME_ID } from '../engine/rouletteConfig.js';

const RouletteBetTypeEnum = z.enum(Object.keys(BET_TYPES) as [keyof typeof BET_TYPES]);

export const RouletteBetSchema = z
  .object({
    type: RouletteBetTypeEnum,
    numbers: z.array(z.number().int().min(0).max(36)),
    amount: z.number().positive(),
  })
  .strict();

export const RouletteSpinRequestSchema = z
  .object({
    session_id: z.string(),
    game_id: z.string().default(ROULETTE_GAME_ID),
    bets: z.array(RouletteBetSchema).min(1).max(200),
    client_timestamp: z.number().optional(),
  })
  .strict();

export const BetResultSchema = z
  .object({
    bet_type: RouletteBetTypeEnum,
    numbers: z.array(z.number().int().min(0).max(36)),
    bet_amount: z.number(),
    payout: z.number(),
    profit: z.number(),
    la_partage: z.boolean(),
    won: z.boolean(),
  })
  .strict();

export const RouletteOutcomeSchema = z
  .object({
    winning_number: z.number().int().min(0).max(36),
    winning_color: z.enum(['red', 'black', 'green']),
    wheel_position: z.number().int(),
    win: z.object({
      amount: z.number(),
      currency: z.string(),
      breakdown: z.array(BetResultSchema),
    }),
    total_bet: z.number(),
    total_return: z.number(),
  })
  .strict();

export const RouletteSpinResponseSchema = z
  .object({
    spin_id: z.string(),
    session_id: z.string(),
    game_id: z.string(),
    balance: z.object({ amount: z.number(), currency: z.string() }),
    outcome: RouletteOutcomeSchema,
    timestamp: z.number(),
  })
  .strict();

export const RouletteConfigSchema = z
  .object({
    game_id: z.string().default(ROULETTE_GAME_ID),
    type: z.literal('roulette'),
    variant: z.literal('european'),
    numbers: z.number().int().default(37),
    min_bet: z.number(),
    max_total_bet: z.number(),
    bet_levels: z.array(z.number()),
    bet_types: z.record(
      z.string(),
      z.object({ payout: z.number(), size: z.number(), maxBet: z.number() })
    ),
    currencies: z.array(z.string()),
    rtp: z.number(),
    features: z.array(z.string()),
    wheel_order: z.array(z.number().int()),
    number_colors: z.record(z.string(), z.enum(['red', 'black', 'green'])),
  })
  .strict();

export const RouletteInitResponseSchema = z
  .object({
    session_id: z.string(),
    game_id: z.string().default(ROULETTE_GAME_ID),
    config: RouletteConfigSchema,
    balance: z.object({ amount: z.number(), currency: z.string() }),
    recent_numbers: z.array(z.number().int()),
    expires_at: z.string(),
  })
  .strict();

export const RouletteBetRowSchema = z
  .object({
    id: z.string(),
    bet_type: RouletteBetTypeEnum,
    numbers: z.array(z.number().int()),
    amount: z.number(),
    payout: z.number(),
    profit: z.number(),
    la_partage: z.boolean(),
    won: z.boolean(),
    created_at: z.string(),
  })
  .strict();

export type RouletteBet = z.infer<typeof RouletteBetSchema>;
export type RouletteSpinRequest = z.infer<typeof RouletteSpinRequestSchema>;
export type RouletteSpinResponse = z.infer<typeof RouletteSpinResponseSchema>;
export type RouletteInitResponse = z.infer<typeof RouletteInitResponseSchema>;
export type RouletteBetRow = z.infer<typeof RouletteBetRowSchema>;

export const DefaultRouletteConfig = ROULETTE_CONFIG;
