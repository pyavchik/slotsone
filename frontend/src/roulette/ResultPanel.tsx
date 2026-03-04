import type { RouletteOutcome } from '@/api';
import './resultPanel.css';

interface ResultPanelProps {
  lastResult: RouletteOutcome;
  onNewRound: () => void;
}

export default function ResultPanel({ lastResult, onNewRound }: ResultPanelProps) {
  return (
    <div
      className="rs-panel"
      onClick={onNewRound}
      role="button"
      tabIndex={0}
      aria-label="Skip to next round"
    >
      <div className="rs-summary">
        {lastResult.win.amount > 0 ? (
          <span className="rs-win-text">WIN ${lastResult.win.amount.toFixed(2)}</span>
        ) : (
          <span className="rs-loss-text">No win</span>
        )}
      </div>
      {lastResult.win.breakdown.length > 0 && (
        <div className="rs-breakdown">
          {lastResult.win.breakdown
            .filter((b) => b.won || b.la_partage)
            .map((b, i) => (
              <div key={i} className="rs-breakdown-item">
                <span>
                  {b.bet_type} [{b.numbers.join(',')}]
                </span>
                <span className={b.won ? 'rs-green' : ''}>
                  ${b.payout.toFixed(2)}
                  {b.la_partage ? ' (La Partage)' : ''}
                </span>
              </div>
            ))}
        </div>
      )}
      <div className="rs-countdown-bar">
        <div className="rs-countdown-fill" />
      </div>
      <div className="rs-skip-hint">Tap to skip</div>
    </div>
  );
}
