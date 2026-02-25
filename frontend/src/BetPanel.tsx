import { useGameStore } from './store';
import './betPanel.css';

export function BetPanel({ onSpin }: { onSpin: () => void }) {
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
  const lineBet = lines > 0 ? bet / lines : 0;

  const handleBetDown = () => {
    if (!canDecrease) return;
    setBet(betLevels[idx - 1]!);
  };
  const handleBetUp = () => {
    if (!canIncrease) return;
    setBet(betLevels[idx + 1]!);
  };
  const handleLineDown = () => {
    if (!canLineDecrease) return;
    setLines(lines - 1);
  };
  const handleLineUp = () => {
    if (!canLineIncrease) return;
    setLines(lines + 1);
  };

  return (
    <div className="bet-panel">
      <div className="bet-panel-group">
        <span className="bet-panel-label">BET</span>
        <button
          type="button"
          onClick={handleBetDown}
          disabled={!canDecrease || spinning}
          className="bet-panel-adjust"
          aria-label="Decrease bet"
        >
          −
        </button>
        <span className="bet-panel-value">
          {bet.toFixed(2)}
        </span>
        <button
          type="button"
          onClick={handleBetUp}
          disabled={!canIncrease || spinning}
          className="bet-panel-adjust"
          aria-label="Increase bet"
        >
          +
        </button>
      </div>
      <div className="bet-panel-group bet-panel-lines">
        <span className="bet-panel-label">LINES</span>
        <button
          type="button"
          onClick={handleLineDown}
          disabled={!canLineDecrease || spinning}
          className="bet-panel-adjust"
          aria-label="Decrease lines"
        >
          −
        </button>
        <span className="bet-panel-value bet-panel-lines-value">
          {lines}
        </span>
        <button
          type="button"
          onClick={handleLineUp}
          disabled={!canLineIncrease || spinning}
          className="bet-panel-adjust"
          aria-label="Increase lines"
        >
          +
        </button>
        <span className="bet-panel-subvalue">
          Line bet: {lineBet.toFixed(2)} {currency}
        </span>
      </div>
      <button
        type="button"
        onClick={onSpin}
        disabled={spinning || balance < bet}
        className="spin-button"
        aria-label="Spin reels"
      >
        {spinning ? 'SPINNING…' : 'SPIN'}
      </button>
    </div>
  );
}
