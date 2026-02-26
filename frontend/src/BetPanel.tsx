import { useMemo } from 'react';
import { useGameStore } from './store';
import './betPanel.css';

export function BetPanel({
  onSpin,
  spinDisabled = false,
}: {
  onSpin: () => void;
  spinDisabled?: boolean;
}) {
  const bet = useGameStore((s) => s.bet);
  const setBet = useGameStore((s) => s.setBet);
  const lines = useGameStore((s) => s.lines);
  const setLines = useGameStore((s) => s.setLines);
  const betLevels = useGameStore((s) => s.betLevels);
  const minLines = useGameStore((s) => s.minLines);
  const maxLines = useGameStore((s) => s.maxLines);
  const spinning = useGameStore((s) => s.spinning);
  const balance = useGameStore((s) => s.balance);
  const currency = useGameStore((s) => s.currency);

  const idx = betLevels.indexOf(bet);
  const canDecrease = idx > 0;
  const canIncrease = idx >= 0 && idx < betLevels.length - 1;
  const canLineDecrease = lines > minLines;
  const canLineIncrease = lines < maxLines;
  const canSpin = !spinning && balance >= bet && !spinDisabled;

  const lineBet = lines > 0 ? bet / lines : 0;
  const balanceAfter = Math.max(0, balance - bet);

  const quickBetLevels = useMemo(() => {
    if (betLevels.length <= 4) return [...betLevels];
    const first = betLevels[0]!;
    const quarter = betLevels[Math.floor(betLevels.length * 0.33)]!;
    const half = betLevels[Math.floor(betLevels.length * 0.66)]!;
    const last = betLevels[betLevels.length - 1]!;
    return Array.from(new Set([first, quarter, half, last]));
  }, [betLevels]);

  return (
    <section className="bet-panel" aria-label="Bet controls">
      <div className="bet-main-grid">
        <div className="bet-segment">
          <span className="bet-segment-label">Total Bet</span>
          <div className="bet-adjust-row">
            <button
              type="button"
              onClick={() => canDecrease && setBet(betLevels[idx - 1]!)}
              disabled={!canDecrease || spinning}
              className="bet-adjust"
              aria-label="Decrease bet"
            >
              −
            </button>
            <strong className="bet-value">{bet.toFixed(2)}</strong>
            <button
              type="button"
              onClick={() => canIncrease && setBet(betLevels[idx + 1]!)}
              disabled={!canIncrease || spinning}
              className="bet-adjust"
              aria-label="Increase bet"
            >
              +
            </button>
          </div>
          <span className="bet-meta">Line bet: {lineBet.toFixed(2)}</span>
        </div>

        <div className="bet-segment">
          <span className="bet-segment-label">Lines</span>
          <div className="bet-adjust-row">
            <button
              type="button"
              onClick={() => canLineDecrease && setLines(lines - 1)}
              disabled={!canLineDecrease || spinning}
              className="bet-adjust"
              aria-label="Decrease lines"
            >
              −
            </button>
            <strong className="bet-value">{lines}</strong>
            <button
              type="button"
              onClick={() => canLineIncrease && setLines(lines + 1)}
              disabled={!canLineIncrease || spinning}
              className="bet-adjust"
              aria-label="Increase lines"
            >
              +
            </button>
          </div>
          <span className="bet-meta">
            Range: {minLines}–{maxLines}
          </span>
        </div>

        <div className="bet-spin-wrap">
          <button
            type="button"
            onClick={onSpin}
            disabled={!canSpin}
            className={`spin-button ${canSpin ? 'spin-button-ready' : ''}`}
            aria-label="Spin reels"
          >
            {spinning ? 'SPINNING…' : 'SPIN'}
          </button>
          <span className="bet-after">
            After spin: {balanceAfter.toFixed(2)} {currency}
          </span>
        </div>
      </div>

      <div className="bet-quick-row" aria-label="Quick bet presets">
        {quickBetLevels.map((value) => {
          const isActive = Math.abs(value - bet) < 0.0001;
          return (
            <button
              key={value}
              type="button"
              disabled={spinning}
              className={`bet-quick ${isActive ? 'bet-quick-active' : ''}`}
              onClick={() => setBet(value)}
              aria-pressed={isActive}
            >
              {value.toFixed(2)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
