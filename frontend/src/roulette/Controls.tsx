import { useRouletteStore } from '@/stores/rouletteStore';
import ChipRack from './ChipRack';
import './controls.css';

interface ControlsProps {
  onSpin: () => void;
  onAutoplay?: () => void;
}

export default function Controls({ onSpin, onAutoplay }: ControlsProps) {
  const phase = useRouletteStore((s) => s.phase);
  const balance = useRouletteStore((s) => s.balance);
  const bets = useRouletteStore((s) => s.bets);
  const betHistory = useRouletteStore((s) => s.betHistory);
  const previousBets = useRouletteStore((s) => s.previousBets);
  const totalBet = useRouletteStore((s) => s.totalBet);
  const undoLastBet = useRouletteStore((s) => s.undoLastBet);
  const clearBets = useRouletteStore((s) => s.clearBets);
  const doubleBets = useRouletteStore((s) => s.doubleBets);
  const rebet = useRouletteStore((s) => s.rebet);

  const total = totalBet();
  const hasBets = bets.length > 0;
  const isBetting = phase === 'betting';
  const isSpinning = phase === 'spinning' || phase === 'ball_drop';

  const doubleWouldExceed = total * 2 > balance;

  const spinDisabled = !hasBets || !isBetting || balance < total;
  const undoDisabled = betHistory.length === 0 || !isBetting;
  const clearDisabled = !hasBets || !isBetting;
  const doubleDisabled = !hasBets || doubleWouldExceed || !isBetting;
  const rebetDisabled = previousBets.length === 0 || !isBetting;

  const spinGlow = hasBets && isBetting;

  return (
    <div className="ct-container">
      {/* Action buttons flanking chip rack */}
      <div className="ct-row">
        <div className="ct-action-group">
          <button
            className="ct-btn"
            disabled={clearDisabled}
            onClick={clearBets}
            aria-label="Clear all bets"
          >
            RESET
          </button>
          <button
            className="ct-btn"
            disabled={doubleDisabled}
            onClick={doubleBets}
            aria-label="Double all bets"
          >
            2&times; BET
          </button>
          <button
            className="ct-btn"
            disabled={undoDisabled}
            onClick={undoLastBet}
            aria-label="Undo last bet"
          >
            UNDO
          </button>
        </div>

        <ChipRack />

        <div className="ct-action-group">
          <button
            className="ct-btn"
            disabled={undoDisabled}
            onClick={undoLastBet}
            aria-label="Undo last bet"
          >
            UNDO
          </button>
          <button
            className="ct-btn"
            disabled={rebetDisabled}
            onClick={rebet}
            aria-label="Rebet previous bets"
          >
            REBET
          </button>
          <button
            className="ct-btn ct-btn--subtle"
            disabled={!isBetting}
            onClick={() => onAutoplay?.()}
            aria-label="Autoplay"
          >
            AUTO
          </button>
        </div>
      </div>

      {/* Bet total */}
      {total > 0 && <div className="ct-bet-display">BET: ${total.toFixed(2)}</div>}

      {/* SPIN button */}
      <button
        className={`ct-spin${spinGlow ? ' ct-spin--glow' : ''}`}
        disabled={spinDisabled}
        onClick={onSpin}
        aria-label={isSpinning ? 'Spinning' : 'Spin'}
      >
        <span className="ct-spin-diamond ct-spin-diamond--left" />
        <span className="ct-spin-text">{isSpinning ? 'SPINNING...' : 'SPIN'}</span>
        <span className="ct-spin-diamond ct-spin-diamond--right" />
      </button>
    </div>
  );
}
