import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store';
import './hud.css';

export function HUD() {
  const balance = useGameStore((s) => s.balance);
  const bet = useGameStore((s) => s.bet);
  const lines = useGameStore((s) => s.lines);
  const currency = useGameStore((s) => s.currency);
  const lastWinAmount = useGameStore((s) => s.lastWinAmount);
  const spinning = useGameStore((s) => s.spinning);

  const [displayBalance, setDisplayBalance] = useState(balance);
  const [displayWin, setDisplayWin] = useState(0);
  const [showNoWin, setShowNoWin] = useState(false);

  const prevBalanceRef = useRef(balance);
  const prevSpinningRef = useRef(spinning);

  const lineBet = lines > 0 ? bet / lines : 0;

  useEffect(() => {
    const from = prevBalanceRef.current;
    const to = balance;
    if (Math.abs(to - from) < 0.0001) return;

    prevBalanceRef.current = to;
    let frameId = 0;
    const start = performance.now();
    const duration = 420;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplayBalance(from + (to - from) * eased);
      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setDisplayBalance(to);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [balance]);

  useEffect(() => {
    if (lastWinAmount <= 0) {
      setDisplayWin(0);
      return;
    }

    let frameId = 0;
    const start = performance.now();
    const duration = 520;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplayWin(lastWinAmount * eased);
      if (t < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setDisplayWin(lastWinAmount);
      }
    };

    setDisplayWin(0);
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [lastWinAmount]);

  useEffect(() => {
    const wasSpinning = prevSpinningRef.current;
    prevSpinningRef.current = spinning;

    if (spinning) {
      setShowNoWin(false);
      return;
    }

    if (wasSpinning && lastWinAmount <= 0) {
      setShowNoWin(true);
      const timerId = window.setTimeout(() => setShowNoWin(false), 1300);
      return () => window.clearTimeout(timerId);
    }
  }, [spinning, lastWinAmount]);

  return (
    <div className="hud-root" aria-label="Slot machine status bar">
      <section className="hud-card hud-card-left" aria-label="Balance panel">
        <span className="hud-micro-label">Balance</span>
        <strong className="hud-value-main">
          {displayBalance.toFixed(2)} {currency}
        </strong>
        <span className="hud-subtext">Available now</span>
      </section>

      <section className="hud-center" aria-live="polite" aria-atomic="true">
        {lastWinAmount > 0 && (
          <div className="hud-win-badge">
            <span className="hud-win-label">WIN</span>
            <strong className="hud-win-value">+{displayWin.toFixed(2)}</strong>
          </div>
        )}
        {showNoWin && <div className="hud-nowin-badge">NO WIN</div>}
        <span className="hud-tip" aria-hidden="true">
          Space = Spin
        </span>
      </section>

      <section className="hud-card hud-card-right" aria-label="Bet panel summary">
        <span className="hud-micro-label">Bet</span>
        <strong className="hud-value-main">
          {bet.toFixed(2)} {currency}
        </strong>
        <span className="hud-subtext">
          {lines} lines • {lineBet.toFixed(2)} / line
        </span>
      </section>
    </div>
  );
}
