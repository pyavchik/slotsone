import { useEffect, useMemo, useRef, useState } from 'react';
import type { GamePaytable } from './api';
import { useGameStore } from './store';
import { normalizeSymbolId, symbolColorCss, symbolImagePath, symbolLabel } from './symbols';
import './payTable.css';

const FALLBACK_PAYTABLE: GamePaytable = {
  line_wins: [
    { symbol: 'Star', x3: 0.5, x4: 2, x5: 10 },
    { symbol: 'A', x3: 0.5, x4: 1.5, x5: 5 },
    { symbol: 'K', x3: 0.3, x4: 1, x5: 4 },
    { symbol: 'Q', x3: 0.3, x4: 0.8, x5: 3 },
    { symbol: 'J', x3: 0.2, x4: 0.5, x5: 2.5 },
    { symbol: '10', x3: 0.2, x4: 0.5, x5: 2 },
  ],
  scatter: {
    symbol: 'Scatter',
    awards: [
      { count: 3, free_spins: 5 },
      { count: 4, free_spins: 10 },
      { count: 5, free_spins: 20 },
    ],
  },
  wild: {
    symbol: 'Wild',
    substitutes_for: ['10', 'J', 'Q', 'K', 'A', 'Star'],
  },
};

function formatMultiplier(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 2,
  });
}

export function PayTable() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const config = useGameStore((s) => s.config);
  const bet = useGameStore((s) => s.bet);
  const lines = useGameStore((s) => s.lines);
  const currency = useGameStore((s) => s.currency);
  const lastOutcome = useGameStore((s) => s.lastOutcome);

  const paytable = config?.paytable ?? FALLBACK_PAYTABLE;
  const lineBet = lines > 0 ? bet / lines : 0;

  const formatAmount = useMemo(() => {
    try {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return (amount: number) => formatter.format(amount);
    } catch {
      return (amount: number) => `${amount.toFixed(2)} ${currency}`;
    }
  }, [currency]);

  const winningSymbols = useMemo(() => {
    return new Set(
      (lastOutcome?.win.breakdown ?? [])
        .filter((item) => item.type === 'line')
        .map((item) => normalizeSymbolId(item.symbol))
    );
  }, [lastOutcome]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="paytable-toggle"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="paytable-dialog"
      >
        Pay Table
      </button>

      {open && (
        <div className="paytable-backdrop" onClick={() => setOpen(false)}>
          <section
            id="paytable-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="paytable-title"
            className="paytable-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="paytable-header">
              <div>
                <h2 id="paytable-title">Payout Matrix</h2>
                <p>Multipliers are applied to your current line bet.</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="paytable-close"
                onClick={() => setOpen(false)}
                aria-label="Close pay table"
              >
                x
              </button>
            </header>

            <div className="paytable-chip-row">
              <span>
                Total bet <strong>{formatAmount(bet)}</strong>
              </span>
              <span>
                Line bet <strong>{formatAmount(lineBet)}</strong>
              </span>
              <span>
                Active lines <strong>{lines}</strong>
              </span>
            </div>

            <div className="paytable-scroll">
              <table className="paytable-table">
                <thead>
                  <tr>
                    <th scope="col">Symbol</th>
                    <th scope="col">3x</th>
                    <th scope="col">4x</th>
                    <th scope="col">5x</th>
                  </tr>
                </thead>
                <tbody>
                  {paytable.line_wins.map((line) => {
                    const symbol = normalizeSymbolId(line.symbol);
                    const highlighted = winningSymbols.has(symbol);

                    return (
                      <tr
                        key={line.symbol}
                        className={highlighted ? 'paytable-row-hit' : undefined}
                      >
                        <th scope="row">
                          <span className="paytable-symbol">
                            <img
                              src={symbolImagePath(symbol)}
                              alt=""
                              className="paytable-symbol-image"
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                            <span
                              className="paytable-symbol-swatch"
                              style={{ backgroundColor: symbolColorCss(symbol) }}
                              aria-hidden="true"
                            />
                            {symbolLabel(line.symbol)}
                          </span>
                        </th>
                        <td>
                          <strong>{formatMultiplier(line.x3)}x</strong>
                          <span>{formatAmount(line.x3 * lineBet)}</span>
                        </td>
                        <td>
                          <strong>{formatMultiplier(line.x4)}x</strong>
                          <span>{formatAmount(line.x4 * lineBet)}</span>
                        </td>
                        <td>
                          <strong>{formatMultiplier(line.x5)}x</strong>
                          <span>{formatAmount(line.x5 * lineBet)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <section className="paytable-note">
              <h3>Feature Symbols</h3>
              <p>
                <strong>{paytable.scatter.symbol}:</strong>{' '}
                {paytable.scatter.awards
                  .map((award) => `${award.count} gives ${award.free_spins} free spins`)
                  .join(' | ')}
              </p>
              <p>
                <strong>{paytable.wild.symbol}:</strong> substitutes for{' '}
                {paytable.wild.substitutes_for.join(', ')}.
              </p>
            </section>
          </section>
        </div>
      )}
    </>
  );
}
