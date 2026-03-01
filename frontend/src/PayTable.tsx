import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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

const PAGE_COUNT = 4;
const PAGE_TITLES = ['Symbol Payouts', 'Special Symbols', 'Paylines', 'Game Rules'];
const LINES_PER_GROUP = 4;

function fmtMul(v: number): string {
  if (v === 0) return '\u2013';
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

function SymImg({ id, className, size }: { id: string; className?: string; size?: number }) {
  const s = size ?? 64;
  return (
    <img
      src={symbolImagePath(id)}
      alt=""
      className={className ?? 'pt-sym-img'}
      width={s}
      height={s}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

/* ── Page 0: Symbol Payouts ─────────────────────────────────────────── */

function SymbolPayouts({
  paytable,
  winSymbols,
}: {
  paytable: GamePaytable;
  winSymbols: Set<string>;
}) {
  return (
    <div className="pt-page-symbols">
      <h2 className="pt-page-title">Symbol Payouts</h2>
      <p className="pt-page-subtitle">Multipliers applied to line bet</p>
      <div className="pt-sym-grid">
        {paytable.line_wins.map((entry) => {
          const id = normalizeSymbolId(entry.symbol);
          const hit = winSymbols.has(id);
          return (
            <div
              key={id}
              className={`pt-sym-card${hit ? ' pt-sym-card--hit' : ''}`}
              style={{ borderLeftColor: symbolColorCss(id) }}
            >
              <SymImg id={id} size={48} className="pt-sym-card-img" />
              <div className="pt-sym-card-pays">
                <div className="pt-pay-row">
                  <span className="pt-pay-count">&times;3</span>
                  <span className="pt-pay-val">{fmtMul(entry.x3)}</span>
                </div>
                <div className="pt-pay-row">
                  <span className="pt-pay-count">&times;4</span>
                  <span className="pt-pay-val">{fmtMul(entry.x4)}</span>
                </div>
                <div className="pt-pay-row">
                  <span className="pt-pay-count">&times;5</span>
                  <span className="pt-pay-val pt-pay-val--top">{fmtMul(entry.x5)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Page 1: Special Symbols ────────────────────────────────────────── */

function SpecialSymbols({ paytable }: { paytable: GamePaytable }) {
  return (
    <div className="pt-page-specials">
      <h2 className="pt-page-title">Special Symbols</h2>
      <div className="pt-special-cards">
        <div className="pt-special-card">
          <div className="pt-special-head">
            <SymImg id="Wild" size={72} className="pt-special-img" />
            <div className="pt-special-body">
              <span className="pt-special-name" style={{ color: symbolColorCss('Wild') }}>
                WILD
              </span>
              <p className="pt-special-desc">Substitutes for all line-paying symbols</p>
            </div>
          </div>
          <div className="pt-special-chips">
            {paytable.wild.substitutes_for.map((sym) => {
              const id = normalizeSymbolId(sym);
              return (
                <span key={id} className="pt-chip" style={{ borderColor: symbolColorCss(id) }}>
                  {symbolLabel(sym)}
                </span>
              );
            })}
          </div>
        </div>

        <div className="pt-special-card">
          <div className="pt-special-head">
            <SymImg id="Scatter" size={72} className="pt-special-img" />
            <div className="pt-special-body">
              <span className="pt-special-name" style={{ color: symbolColorCss('Scatter') }}>
                SCATTER
              </span>
              <p className="pt-special-desc">Triggers free spins anywhere on reels</p>
            </div>
          </div>
          <table className="pt-scatter-table">
            <thead>
              <tr>
                <th>Count</th>
                <th>Award</th>
              </tr>
            </thead>
            <tbody>
              {paytable.scatter.awards.map((a) => (
                <tr key={a.count}>
                  <td className="pt-scatter-ct">&times;{a.count}</td>
                  <td className="pt-scatter-aw">{a.free_spins} Free Spins</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Page 2: Paylines ───────────────────────────────────────────────── */

const LINE_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#d946ef',
  '#f43f5e',
  '#fb923c',
  '#a3e635',
  '#34d399',
  '#22d3ee',
  '#818cf8',
  '#c084fc',
  '#f472b6',
  '#fbbf24',
  '#4ade80',
  '#60a5fa',
];

function PaylineGrid({ lineDefs, group }: { lineDefs: number[][]; group: number }) {
  const start = group * LINES_PER_GROUP;
  const lines = lineDefs.slice(start, start + LINES_PER_GROUP);

  const cols = 5;
  const rows = 3;
  const dotR = 5;
  const cellW = 56;
  const cellH = 40;
  const padX = 28;
  const padY = 20;
  const svgW = padX * 2 + (cols - 1) * cellW;
  const svgH = padY * 2 + (rows - 1) * cellH;

  const cx = (c: number) => padX + c * cellW;
  const cy = (r: number) => padY + r * cellH;

  return (
    <div className="pt-payline-group">
      {lines.map((def, i) => {
        const lineIdx = start + i;
        const color = LINE_COLORS[lineIdx % LINE_COLORS.length]!;
        const points = def.map((row, col) => `${cx(col)},${cy(row)}`).join(' ');
        return (
          <div key={lineIdx} className="pt-payline-item">
            <span className="pt-payline-label" style={{ color }}>
              L{lineIdx + 1}
            </span>
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="pt-payline-svg"
              aria-label={`Payline ${lineIdx + 1}`}
            >
              {/* Dot grid */}
              {Array.from({ length: rows }, (_, r) =>
                Array.from({ length: cols }, (_, c) => (
                  <circle
                    key={`${r}-${c}`}
                    cx={cx(c)}
                    cy={cy(r)}
                    r={dotR}
                    className="pt-payline-dot"
                  />
                ))
              )}
              {/* Line path */}
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
              {/* Highlighted dots on the line */}
              {def.map((row, col) => (
                <circle
                  key={col}
                  cx={cx(col)}
                  cy={cy(row)}
                  r={dotR + 1}
                  fill={color}
                  opacity={0.9}
                />
              ))}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function Paylines({ lineDefs }: { lineDefs: number[][] }) {
  const groupCount = Math.ceil(lineDefs.length / LINES_PER_GROUP);
  const [group, setGroup] = useState(0);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (reducedMotion.current || groupCount <= 1) return;
    const timer = window.setInterval(() => {
      setGroup((g) => (g + 1) % groupCount);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [groupCount]);

  return (
    <div className="pt-page-paylines">
      <h2 className="pt-page-title">Paylines</h2>
      <p className="pt-page-subtitle">{lineDefs.length} paylines, left-to-right</p>
      <PaylineGrid lineDefs={lineDefs} group={group} />
      {groupCount > 1 && (
        <div className="pt-payline-nav">
          {Array.from({ length: groupCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`pt-payline-dot-btn${i === group ? ' pt-payline-dot-btn--active' : ''}`}
              onClick={() => setGroup(i)}
              aria-label={`Show paylines ${i * LINES_PER_GROUP + 1}–${Math.min((i + 1) * LINES_PER_GROUP, lineDefs.length)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page 3: Game Rules ─────────────────────────────────────────────── */

function GameRules() {
  const config = useGameStore((s) => s.config);
  const minBet = useGameStore((s) => s.minBet);
  const maxBet = useGameStore((s) => s.maxBet);
  const currency = useGameStore((s) => s.currency);

  return (
    <div className="pt-page-rules">
      <h2 className="pt-page-title">Game Rules</h2>
      <div className="pt-rules-stats">
        <div className="pt-rules-stat">
          <span className="pt-rules-stat-label">RTP</span>
          <span className="pt-rules-stat-value">{config ? config.rtp.toFixed(1) : '96.5'}%</span>
        </div>
        <div className="pt-rules-stat">
          <span className="pt-rules-stat-label">Volatility</span>
          <span className="pt-rules-stat-value pt-rules-stat-value--vol">
            {config
              ? config.volatility.charAt(0).toUpperCase() + config.volatility.slice(1)
              : 'Medium'}
          </span>
        </div>
        <div className="pt-rules-stat">
          <span className="pt-rules-stat-label">Bet Range</span>
          <span className="pt-rules-stat-value">
            {minBet.toFixed(2)}–{maxBet.toFixed(2)} {currency}
          </span>
        </div>
        <div className="pt-rules-stat">
          <span className="pt-rules-stat-label">Paylines</span>
          <span className="pt-rules-stat-value">{config?.max_lines ?? 20}</span>
        </div>
      </div>
      <ul className="pt-rules-list">
        <li>Wins evaluated left-to-right starting from reel 1.</li>
        <li>Only highest win per line is paid.</li>
        <li>Scatter wins are multiplied by total bet.</li>
        <li>Wild substitutes for all symbols except Scatter.</li>
        <li>Malfunction voids all pays and plays.</li>
      </ul>
    </div>
  );
}

/* ── Main Overlay ───────────────────────────────────────────────────── */

export function PayTable({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = useGameStore((s) => s.config);
  const lastOutcome = useGameStore((s) => s.lastOutcome);
  const paytable = config?.paytable ?? FALLBACK_PAYTABLE;
  const lineDefs = useMemo(() => config?.line_defs ?? [], [config?.line_defs]);

  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const winSymbols = useMemo(
    () =>
      new Set(
        (lastOutcome?.win.breakdown ?? [])
          .filter((i) => i.type === 'line')
          .map((i) => normalizeSymbolId(i.symbol))
      ),
    [lastOutcome]
  );

  const goTo = useCallback(
    (target: number) => {
      if (target < 0 || target >= PAGE_COUNT || target === page) return;
      setDirection(target > page ? 'right' : 'left');
      setPage(target);
    },
    [page]
  );

  const goPrev = useCallback(() => goTo(page - 1), [goTo, page]);
  const goNext = useCallback(() => goTo(page + 1), [goTo, page]);

  // Focus close button on open
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
      setPage(0);
      setDirection(null);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(page - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(page + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, page, goTo, onClose]);

  if (!open) return null;

  return (
    <div
      className="pt-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Paytable"
    >
      <div className="pt-container" onClick={(e) => e.stopPropagation()}>
        <header className="pt-topbar">
          <span className="pt-topbar-title">{PAGE_TITLES[page]}</span>
          <button
            ref={closeRef}
            type="button"
            className="pt-close"
            onClick={onClose}
            aria-label="Close paytable"
          >
            &times;
          </button>
        </header>

        <div className="pt-page-wrap">
          <div
            className={`pt-page${direction === 'right' ? ' pt-page--enter-right' : ''}${direction === 'left' ? ' pt-page--enter-left' : ''}`}
            key={page}
          >
            {page === 0 && <SymbolPayouts paytable={paytable} winSymbols={winSymbols} />}
            {page === 1 && <SpecialSymbols paytable={paytable} />}
            {page === 2 && <Paylines lineDefs={lineDefs} />}
            {page === 3 && <GameRules />}
          </div>
        </div>

        <nav className="pt-nav" aria-label="Paytable pages">
          <button
            type="button"
            className="pt-nav-arrow"
            onClick={goPrev}
            disabled={page === 0}
            aria-label="Previous page"
          >
            &lsaquo;
          </button>
          <div className="pt-nav-dots">
            {Array.from({ length: PAGE_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`pt-nav-dot${i === page ? ' pt-nav-dot--active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={PAGE_TITLES[i]}
                aria-current={i === page ? 'page' : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            className="pt-nav-arrow"
            onClick={goNext}
            disabled={page === PAGE_COUNT - 1}
            aria-label="Next page"
          >
            &rsaquo;
          </button>
        </nav>
      </div>
    </div>
  );
}
