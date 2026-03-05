import { z } from './zodOpenApi.js';
import {
  BET_TYPES,
  AMERICAN_ROULETTE_CONFIG,
  AMERICAN_ROULETTE_GAME_ID,
  DOUBLE_ZERO,
} from '../engine/americanRouletteConfig.js';

const AmericanRouletteBetTypeEnum = z.enum(Object.keys(BET_TYPES) as [keyof typeof BET_TYPES]);

export const AmericanRouletteBetSchema = z
  .object({
    type: AmericanRouletteBetTypeEnum,
    numbers: z.array(z.number().int().min(DOUBLE_ZERO).max(36)),
    amount: z.number().positive(),
  })
  .strict();

export const AmericanRouletteSpinRequestSchema = z
  .object({
    session_id: z.string(),
    game_id: z.string().default(AMERICAN_ROULETTE_GAME_ID),
    bets: z.array(AmericanRouletteBetSchema).min(1).max(200),
    client_timestamp: z.number().optional(),
  })
  .strict();

export const AmericanBetResultSchema = z
  .object({
    bet_type: AmericanRouletteBetTypeEnum,
    numbers: z.array(z.number().int().min(DOUBLE_ZERO).max(36)),
    bet_amount: z.number(),
    payout: z.number(),
    profit: z.number(),
    won: z.boolean(),
  })
  .strict();

export const AmericanRouletteOutcomeSchema = z
  .object({
    winning_number: z.number().int().min(DOUBLE_ZERO).max(36),
    winning_number_display: z.string(),
    winning_color: z.enum(['red', 'black', 'green']),
    wheel_position: z.number().int(),
    win: z.object({
      amount: z.number(),
      currency: z.string(),
      breakdown: z.array(AmericanBetResultSchema),
    }),
    total_bet: z.number(),
    total_return: z.number(),
  })
  .strict();

export const AmericanRouletteSpinResponseSchema = z
  .object({
    spin_id: z.string(),
    session_id: z.string(),
    game_id: z.string(),
    balance: z.object({ amount: z.number(), currency: z.string() }),
    total_bet: z.number(),
    outcome: AmericanRouletteOutcomeSchema,
    timestamp: z.number(),
  })
  .strict();

export const AmericanRouletteConfigSchema = z
  .object({
    game_id: z.string().default(AMERICAN_ROULETTE_GAME_ID),
    type: z.literal('roulette'),
    variant: z.literal('american'),
    numbers: z.number().int().default(38),
    double_zero: z.number().int(),
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

export const AmericanRouletteInitResponseSchema = z
  .object({
    session_id: z.string(),
    game_id: z.string().default(AMERICAN_ROULETTE_GAME_ID),
    config: AmericanRouletteConfigSchema,
    balance: z.object({ amount: z.number(), currency: z.string() }),
    recent_numbers: z.array(z.number().int()),
    expires_at: z.string(),
  })
  .strict();

export type AmericanRouletteBet = z.infer<typeof AmericanRouletteBetSchema>;
export type AmericanRouletteSpinRequest = z.infer<typeof AmericanRouletteSpinRequestSchema>;
export type AmericanRouletteSpinResponse = z.infer<typeof AmericanRouletteSpinResponseSchema>;
export type AmericanRouletteInitResponse = z.infer<typeof AmericanRouletteInitResponseSchema>;

export const DefaultAmericanRouletteConfig = AMERICAN_ROULETTE_CONFIG;
