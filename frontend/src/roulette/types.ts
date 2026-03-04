/**
 * types.ts — Win tier system and shared type definitions.
 */

/* ------------------------------------------------------------------ */
/*  Win tiers                                                          */
/* ------------------------------------------------------------------ */

export type WinTier = 'none' | 'small' | 'medium' | 'big' | 'mega';

/** Multiplier thresholds (win / totalBet) */
export const WIN_TIERS = {
  small: 1,
  medium: 10,
  big: 50,
  mega: 200,
} as const;

export function getWinTier(winAmount: number, totalBet: number): WinTier {
  if (winAmount <= 0 || totalBet <= 0) return 'none';
  const multiplier = winAmount / totalBet;
  if (multiplier >= WIN_TIERS.mega) return 'mega';
  if (multiplier >= WIN_TIERS.big) return 'big';
  if (multiplier >= WIN_TIERS.medium) return 'medium';
  if (multiplier >= WIN_TIERS.small) return 'small';
  return 'none';
}

/* ------------------------------------------------------------------ */
/*  Chip definition                                                    */
/* ------------------------------------------------------------------ */

export interface ChipDef {
  value: number;
  label: string;
  image: string;
}

/* ------------------------------------------------------------------ */
/*  Autoplay config                                                    */
/* ------------------------------------------------------------------ */

export interface AutoplayConfig {
  rounds: number;
  stopOnWin: number | null;
  stopOnLoss: number | null;
  stopOnBalance: number | null;
}
