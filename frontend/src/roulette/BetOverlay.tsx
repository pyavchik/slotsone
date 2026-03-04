import { useCallback, useState } from 'react';
import { useRouletteStore } from '@/stores/rouletteStore';
import { BET_POSITIONS } from './betPositions';
import type { BetPosition } from './betPositions';
import { betKey, chipImageForAmount } from './utils';
import { playChipPlace } from '@/audio/rouletteAudio';
import './betOverlay.css';

export default function BetOverlay() {
  const placeBet = useRouletteStore((s) => s.placeBet);
  const selectedChipValue = useRouletteStore((s) => s.selectedChipValue);
  const bets = useRouletteStore((s) => s.bets);
  const phase = useRouletteStore((s) => s.phase);

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const handleClick = useCallback(
    (pos: BetPosition) => {
      if (phase !== 'betting') return;
      placeBet({ type: pos.type, numbers: pos.numbers, amount: selectedChipValue });
      playChipPlace();
    },
    [placeBet, selectedChipValue, phase]
  );

  // Build bet totals map
  const betTotals = new Map<string, number>();
  for (const b of bets) {
    const key = betKey(b.type, b.numbers);
    betTotals.set(key, (betTotals.get(key) ?? 0) + b.amount);
  }

  return (
    <div className="bo-overlay" aria-hidden="true">
      {BET_POSITIONS.map((pos) => {
        const key = betKey(pos.type, pos.numbers);
        const total = betTotals.get(key);
        const isHovered = hoveredKey === key;

        return (
          <div
            key={key}
            className={`bo-zone ${isHovered ? 'bo-zone--hover' : ''}`}
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              width: `${pos.width}%`,
              height: `${pos.height}%`,
              zIndex: pos.zIndex,
            }}
            onMouseEnter={() => setHoveredKey(key)}
            onMouseLeave={() => setHoveredKey(null)}
            onClick={() => handleClick(pos)}
            title={`${pos.type}: [${pos.numbers.join(', ')}]`}
          >
            {total != null && total > 0 && (
              <span className="bo-chip-stack">
                <img src={chipImageForAmount(total)} alt="" className="bo-chip-img" />
                <span className="bo-chip-label">{total}</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
