import { useCallback, useState } from 'react';
import { useRouletteStore } from '@/stores/rouletteStore';
import type { RouletteBet } from '@/api';
import { WHEEL_ORDER, COLOR_MAP } from './constants';
import { numberColor } from './utils';
import './racetrack.css';

/* ---- Announced bet definitions ---- */
const VOISINS_BETS: RouletteBet[] = [
  { type: 'trio', numbers: [0, 2, 3], amount: 0 },
  { type: 'split', numbers: [4, 7], amount: 0 },
  { type: 'split', numbers: [12, 15], amount: 0 },
  { type: 'split', numbers: [18, 21], amount: 0 },
  { type: 'split', numbers: [19, 22], amount: 0 },
  { type: 'split', numbers: [32, 35], amount: 0 },
  { type: 'corner', numbers: [25, 26, 28, 29], amount: 0 },
];

const TIERS_BETS: RouletteBet[] = [
  { type: 'split', numbers: [5, 8], amount: 0 },
  { type: 'split', numbers: [10, 11], amount: 0 },
  { type: 'split', numbers: [13, 16], amount: 0 },
  { type: 'split', numbers: [23, 24], amount: 0 },
  { type: 'split', numbers: [27, 30], amount: 0 },
  { type: 'split', numbers: [33, 36], amount: 0 },
];

const ORPHELINS_BETS: RouletteBet[] = [
  { type: 'straight', numbers: [1], amount: 0 },
  { type: 'split', numbers: [6, 9], amount: 0 },
  { type: 'split', numbers: [14, 17], amount: 0 },
  { type: 'split', numbers: [17, 20], amount: 0 },
  { type: 'split', numbers: [31, 34], amount: 0 },
];

interface RacetrackProps {
  visible: boolean;
}

export default function Racetrack({ visible }: RacetrackProps) {
  const placeBet = useRouletteStore((s) => s.placeBet);
  const selectedChipValue = useRouletteStore((s) => s.selectedChipValue);
  const [neighborCount, setNeighborCount] = useState(2);

  const handleNumberClick = useCallback(
    (num: number) => {
      const idx = WHEEL_ORDER.indexOf(num as (typeof WHEEL_ORDER)[number]);
      if (idx === -1) return;
      const len = WHEEL_ORDER.length;

      for (let offset = -neighborCount; offset <= neighborCount; offset++) {
        const wrappedIdx = (((idx + offset) % len) + len) % len;
        const neighbor = WHEEL_ORDER[wrappedIdx];
        placeBet({ type: 'straight', numbers: [neighbor], amount: selectedChipValue });
      }
    },
    [placeBet, selectedChipValue, neighborCount]
  );

  const handleAnnouncedBet = useCallback(
    (bets: RouletteBet[]) => {
      for (const bet of bets) {
        placeBet({ ...bet, amount: selectedChipValue });
      }
    },
    [placeBet, selectedChipValue]
  );

  if (!visible) return null;

  const topArc = WHEEL_ORDER.slice(0, 19);
  const bottomArc = [...WHEEL_ORDER.slice(19)].reverse();

  return (
    <div className="rt-container" role="region" aria-label="Racetrack betting">
      <div className="rt-labels">
        <button
          className="rt-label rt-label--voisins"
          onClick={() => handleAnnouncedBet(VOISINS_BETS)}
          aria-label="Voisins du Zero (9 chip bet)"
        >
          Voisins
        </button>
        <button
          className="rt-label rt-label--tiers"
          onClick={() => handleAnnouncedBet(TIERS_BETS)}
          aria-label="Tiers du Cylindre (6 chip bet)"
        >
          Tiers
        </button>
        <button
          className="rt-label rt-label--orphelins"
          onClick={() => handleAnnouncedBet(ORPHELINS_BETS)}
          aria-label="Orphelins a Cheval (5 chip bet)"
        >
          Orphelins
        </button>
      </div>

      <div className="rt-oval">
        <div className="rt-arc rt-arc--top">
          {topArc.map((num) => {
            const color = numberColor(num);
            return (
              <button
                key={`top-${num}`}
                className={`rt-num rt-num--${color}`}
                style={{ background: COLOR_MAP[color] }}
                onClick={() => handleNumberClick(num)}
                aria-label={`${num} and neighbors`}
              >
                {num}
              </button>
            );
          })}
        </div>

        <div className="rt-arc rt-arc--bottom">
          {bottomArc.map((num) => {
            const color = numberColor(num);
            return (
              <button
                key={`bot-${num}`}
                className={`rt-num rt-num--${color}`}
                style={{ background: COLOR_MAP[color] }}
                onClick={() => handleNumberClick(num)}
                aria-label={`${num} and neighbors`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rt-neighbors">
        <button
          className="rt-neighbors__btn"
          disabled={neighborCount <= 1}
          onClick={() => setNeighborCount((c) => Math.max(1, c - 1))}
          aria-label="Decrease neighbors"
        >
          -
        </button>
        <span className="rt-neighbors__label">Neighbors: &plusmn;{neighborCount}</span>
        <button
          className="rt-neighbors__btn"
          disabled={neighborCount >= 8}
          onClick={() => setNeighborCount((c) => Math.min(8, c + 1))}
          aria-label="Increase neighbors"
        >
          +
        </button>
      </div>
    </div>
  );
}
