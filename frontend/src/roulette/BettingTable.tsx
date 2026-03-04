import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouletteStore } from '@/stores/rouletteStore';
import type { RouletteBetType } from '@/api';
import { playChipPlace } from '@/audio/rouletteAudio';
import {
  TABLE_ROWS,
  COLUMN_1,
  COLUMN_2,
  COLUMN_3,
  DOZEN_1,
  DOZEN_2,
  DOZEN_3,
  LOW_NUMBERS,
  HIGH_NUMBERS,
  EVEN_NUMBERS,
  ODD_NUMBERS,
  RED_NUMBERS,
  BLACK_NUMBERS,
  COLOR_MAP,
} from './constants';
import { betKey, numberColor, chipImageForAmount } from './utils';
import BetOverlay from './BetOverlay';
import './bettingTable.css';

const RED_NUMBERS_ARR = [...RED_NUMBERS];
const BLACK_NUMBERS_ARR = [...BLACK_NUMBERS];

export default function BettingTable() {
  const placeBet = useRouletteStore((s) => s.placeBet);
  const selectedChipValue = useRouletteStore((s) => s.selectedChipValue);
  const bets = useRouletteStore((s) => s.bets);
  const lastResult = useRouletteStore((s) => s.lastResult);
  const phase = useRouletteStore((s) => s.phase);

  const gridRef = useRef<HTMLDivElement>(null);
  const [floatingChip, setFloatingChip] = useState<{ x: number; y: number } | null>(null);

  const winningNumber = lastResult?.winning_number ?? null;
  const isCoarsePointer =
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  const betTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bets) {
      const key = betKey(b.type, b.numbers);
      map.set(key, (map.get(key) ?? 0) + b.amount);
    }
    return map;
  }, [bets]);

  const handleBet = useCallback(
    (type: RouletteBetType, numbers: number[]) => {
      if (phase !== 'betting') return;
      placeBet({ type, numbers, amount: selectedChipValue });
      playChipPlace();
    },
    [placeBet, selectedChipValue, phase]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isCoarsePointer || phase !== 'betting') return;
      setFloatingChip({ x: e.clientX, y: e.clientY });
    },
    [isCoarsePointer, phase]
  );

  const handleMouseLeave = useCallback(() => {
    setFloatingChip(null);
  }, []);

  function renderChip(type: string, numbers: number[]) {
    const total = betTotals.get(betKey(type, numbers));
    if (!total) return null;
    return (
      <span className="bt-chip-stack">
        <img src={chipImageForAmount(total)} alt="" className="bt-chip-stack-img" />
        <span className="bt-chip-stack-label">{total}</span>
      </span>
    );
  }

  function isWinner(numbers: number[]): boolean {
    return winningNumber != null && numbers.includes(winningNumber);
  }

  function cellClasses(baseClass: string, numbers: number[], type?: string): string {
    const classes = ['bt-cell', baseClass];
    if (isWinner(numbers)) classes.push('bt-cell--win');
    if (type && betTotals.has(betKey(type, numbers))) classes.push('bt-cell--has-bet');
    return classes.join(' ');
  }

  return (
    <div className="bt-outer-wrapper" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {/* Floating cursor chip */}
      {floatingChip && phase === 'betting' && !isCoarsePointer && (
        <div className="bt-floating-chip" style={{ left: floatingChip.x, top: floatingChip.y }}>
          <img
            src={`/assets/roulette/pro/chip-${selectedChipValue}.png`}
            alt=""
            className="bt-floating-chip-img"
          />
        </div>
      )}

      <div className="bt-grid-container">
        <div className="bt-wrapper" ref={gridRef} role="grid" aria-label="Roulette betting table">
          {/* Zero cell */}
          <button
            className={`${cellClasses('bt-zero', [0], 'straight')} bt-green`}
            style={{ gridColumn: '1 / 2', gridRow: '1 / 4', background: COLOR_MAP.green }}
            onClick={() => handleBet('straight', [0])}
            aria-label="Bet on 0"
          >
            0{renderChip('straight', [0])}
          </button>

          {/* Number grid */}
          {TABLE_ROWS.map((row, rowIdx) =>
            row.map((num, colIdx) => {
              const color = numberColor(num);
              return (
                <button
                  key={num}
                  className={`${cellClasses(`bt-${color}`, [num], 'straight')} bt-number`}
                  style={{
                    gridColumn: `${colIdx + 2} / ${colIdx + 3}`,
                    gridRow: `${rowIdx + 1} / ${rowIdx + 2}`,
                    background: COLOR_MAP[color],
                  }}
                  onClick={() => handleBet('straight', [num])}
                  aria-label={`Bet on ${num} ${color}`}
                >
                  {num}
                  {renderChip('straight', [num])}
                </button>
              );
            })
          )}

          {/* Column bets */}
          {[
            { row: 1, nums: COLUMN_3, label: '2:1 (top row)' },
            { row: 2, nums: COLUMN_2, label: '2:1 (middle row)' },
            { row: 3, nums: COLUMN_1, label: '2:1 (bottom row)' },
          ].map(({ row, nums, label }) => (
            <button
              key={`col-${row}`}
              className={cellClasses('bt-column', nums, 'column')}
              style={{ gridColumn: '14 / 15', gridRow: `${row} / ${row + 1}` }}
              onClick={() => handleBet('column', nums)}
              aria-label={label}
            >
              2:1
              {renderChip('column', nums)}
            </button>
          ))}

          {/* Dozen bets */}
          {[
            { col: '1 / 6', nums: DOZEN_1, label: '1st 12' },
            { col: '6 / 10', nums: DOZEN_2, label: '2nd 12' },
            { col: '10 / 15', nums: DOZEN_3, label: '3rd 12' },
          ].map(({ col, nums, label }) => (
            <button
              key={label}
              className={cellClasses('bt-dozen', nums, 'dozen')}
              style={{ gridColumn: col, gridRow: '4 / 5' }}
              onClick={() => handleBet('dozen', nums)}
              aria-label={`Bet on ${label}`}
            >
              {label}
              {renderChip('dozen', nums)}
            </button>
          ))}

          {/* Outside bets */}
          {(
            [
              { col: '1 / 4', type: 'low' as RouletteBetType, nums: LOW_NUMBERS, label: '1-18' },
              {
                col: '4 / 6',
                type: 'even' as RouletteBetType,
                nums: EVEN_NUMBERS,
                label: 'EVEN',
              },
              {
                col: '6 / 8',
                type: 'red' as RouletteBetType,
                nums: RED_NUMBERS_ARR,
                label: 'RED',
              },
              {
                col: '8 / 10',
                type: 'black' as RouletteBetType,
                nums: BLACK_NUMBERS_ARR,
                label: 'BLACK',
              },
              {
                col: '10 / 12',
                type: 'odd' as RouletteBetType,
                nums: ODD_NUMBERS,
                label: 'ODD',
              },
              {
                col: '12 / 15',
                type: 'high' as RouletteBetType,
                nums: HIGH_NUMBERS,
                label: '19-36',
              },
            ] as const
          ).map(({ col, type, nums, label }) => {
            let bg = 'rgba(200, 160, 78, 0.06)';
            if (type === 'red') bg = COLOR_MAP.red;
            if (type === 'black') bg = COLOR_MAP.black;

            return (
              <button
                key={type}
                className={`${cellClasses(`bt-outside bt-${type}`, [...nums], type)}`}
                style={{ gridColumn: col, gridRow: '5 / 6', background: bg }}
                onClick={() => handleBet(type, [...nums])}
                aria-label={`Bet on ${label}`}
              >
                {label}
                {renderChip(type, [...nums])}
              </button>
            );
          })}
          <BetOverlay />
        </div>
      </div>
    </div>
  );
}
