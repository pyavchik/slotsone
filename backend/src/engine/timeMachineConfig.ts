export const TM_GAME_ID = 'slot_time_rewind_001';

export const TM_REELS = 5;
export const TM_ROWS = 3;
export const TM_PAYLINES = 15;

// Symbol ids: low(Gear,Hourglass,Clock), mid(Compass,Crystal), high(Portal,TimeMachine), special(CronoWild,VortexScatter)
export const TM_SYMBOLS = [
  'Gear',
  'Hourglass',
  'Clock',
  'Compass',
  'Crystal',
  'Portal',
  'TimeMachine',
  'CronoWild',
  'VortexScatter',
] as const;
export type TMSymbolId = (typeof TM_SYMBOLS)[number];

const S = TM_SYMBOLS;
const I = (id: string) => S.indexOf(id as TMSymbolId);
const strip = (ids: string[]) => ids.map((id) => I(id));

// Base reel strips (weighted distribution for ~94-95% base RTP)
export const TM_REEL_STRIPS: number[][] = [
  strip([
    'Gear',
    'Hourglass',
    'Clock',
    'Compass',
    'Gear',
    'Hourglass',
    'Clock',
    'Crystal',
    'Gear',
    'Hourglass',
    'Portal',
    'Clock',
    'Compass',
    'Gear',
    'CronoWild',
    'Hourglass',
    'Clock',
    'Compass',
    'Crystal',
    'VortexScatter',
    'Gear',
    'TimeMachine',
    'Hourglass',
  ]),
  strip([
    'Hourglass',
    'Clock',
    'Gear',
    'Compass',
    'Crystal',
    'Hourglass',
    'Gear',
    'Clock',
    'Gear',
    'Hourglass',
    'Clock',
    'Portal',
    'Compass',
    'CronoWild',
    'Gear',
    'Hourglass',
    'Clock',
    'VortexScatter',
    'Compass',
    'Crystal',
    'Gear',
    'Hourglass',
    'TimeMachine',
  ]),
  strip([
    'Clock',
    'Gear',
    'Hourglass',
    'Compass',
    'Clock',
    'Gear',
    'Crystal',
    'Hourglass',
    'Clock',
    'Gear',
    'CronoWild',
    'Compass',
    'Hourglass',
    'Portal',
    'Clock',
    'Gear',
    'Hourglass',
    'VortexScatter',
    'Compass',
    'Clock',
    'TimeMachine',
    'Gear',
    'Crystal',
  ]),
  strip([
    'Compass',
    'Gear',
    'Clock',
    'Hourglass',
    'Crystal',
    'Gear',
    'Clock',
    'Hourglass',
    'Compass',
    'Gear',
    'Portal',
    'Clock',
    'CronoWild',
    'Hourglass',
    'Gear',
    'Compass',
    'Crystal',
    'Clock',
    'VortexScatter',
    'Hourglass',
    'Gear',
    'TimeMachine',
    'Clock',
  ]),
  strip([
    'Crystal',
    'Gear',
    'Hourglass',
    'Clock',
    'Compass',
    'Gear',
    'Hourglass',
    'Clock',
    'Gear',
    'Portal',
    'Compass',
    'Hourglass',
    'Clock',
    'Gear',
    'CronoWild',
    'Crystal',
    'Hourglass',
    'VortexScatter',
    'Clock',
    'Gear',
    'TimeMachine',
    'Compass',
    'Hourglass',
  ]),
];

// Boosted reel strips for rewind mode (more CronoWild symbols)
// Standard: +15% wild, Safe: +10% wild, Super: +25% wild
// We create a boosted strip by inserting extra CronoWild at regular intervals
function createBoostedStrip(baseStrip: number[], extraWilds: number): number[] {
  const wildIdx = I('CronoWild');
  const boosted = [...baseStrip];
  const interval = Math.max(2, Math.floor(boosted.length / (extraWilds + 1)));
  for (let i = 0; i < extraWilds; i++) {
    const pos = Math.min(boosted.length, interval * (i + 1) + i);
    boosted.splice(pos, 0, wildIdx);
  }
  return boosted;
}

// Pre-compute boosted strips for each tier
export const TM_BOOSTED_STRIPS: Record<string, number[][]> = {
  safe: TM_REEL_STRIPS.map((s) => createBoostedStrip(s, 2)), // +10% (~2 extra wilds per reel)
  standard: TM_REEL_STRIPS.map((s) => createBoostedStrip(s, 3)), // +15% (~3 extra wilds per reel)
  super: TM_REEL_STRIPS.map((s) => createBoostedStrip(s, 5)), // +25% (~5 extra wilds per reel)
};

// Paytable: symbol index -> [payout for 3, 4, 5 of a kind] (bet-per-line multiplier)
// 0=Gear, 1=Hourglass, 2=Clock, 3=Compass, 4=Crystal, 5=Portal, 6=TimeMachine, 7=CronoWild, 8=VortexScatter
export const TM_PAYTABLE: Record<number, [number, number, number]> = {
  0: [5, 16, 42], // Gear (low)
  1: [8, 26, 78], // Hourglass (low)
  2: [10, 36, 155], // Clock (low)
  3: [16, 52, 181], // Compass (mid)
  4: [21, 78, 207], // Crystal (mid)
  5: [41, 104, 414], // Portal (high)
  6: [78, 207, 518], // TimeMachine (high)
  7: [0, 0, 0], // CronoWild (substitutes)
  8: [0, 0, 0], // VortexScatter (pays by count)
};

// Scatter: 3 = 8 FS, 4 = 12 FS, 5 = 20 FS
export const TM_SCATTER_FREE_SPINS: [number, number][] = [
  [3, 8],
  [4, 12],
  [5, 20],
];

// 15 payline definitions: [reel0_row, reel1_row, reel2_row, reel3_row, reel4_row]
// Rows: 0=top, 1=mid, 2=bottom
export const TM_LINE_DEFS: number[][] = [
  [1, 1, 1, 1, 1], // line 0: middle
  [0, 0, 0, 0, 0], // line 1: top
  [2, 2, 2, 2, 2], // line 2: bottom
  [0, 1, 2, 1, 0], // line 3: V shape
  [2, 1, 0, 1, 2], // line 4: inverted V
  [1, 0, 0, 0, 1], // line 5: shallow V
  [1, 2, 2, 2, 1], // line 6: shallow inverted V
  [0, 0, 1, 0, 0], // line 7: bump up
  [2, 2, 1, 2, 2], // line 8: bump down
  [0, 1, 1, 1, 0], // line 9: flat-top arch
  [2, 1, 1, 1, 2], // line 10: flat-bottom arch
  [1, 0, 1, 0, 1], // line 11: zigzag up
  [1, 2, 1, 2, 1], // line 12: zigzag down
  [0, 1, 0, 1, 0], // line 13: wave up
  [2, 1, 2, 1, 2], // line 14: wave down
];

export const TM_MIN_BET = 0.15;
export const TM_MAX_BET = 150;
export const TM_BET_LEVELS = [0.15, 0.3, 0.75, 1.5, 3, 7.5, 15, 37.5, 75, 150];
export const TM_CURRENCY = 'USD';

// Rewind mechanic constants
export const REWIND_STREAK_THRESHOLD = 5;
export const REWIND_TRIGGER_PROBABILITY = 0.35;
export const REWIND_SPINS_COUNT = 5;
export const REWIND_TIERS = {
  safe: { costMultiplier: 1.5, wildBoostLabel: '+10%' },
  standard: { costMultiplier: 2, wildBoostLabel: '+15%' },
  super: { costMultiplier: 3, wildBoostLabel: '+25%' },
} as const;
export type RewindTier = keyof typeof REWIND_TIERS;
export const MAX_WIN_MULTIPLIER = 5000;
