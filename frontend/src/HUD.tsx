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
  const lineBet = lines > 0 ? bet / lines : 0;
  const [displayWin, setDisplayWin] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(balance);
  const [showNoWin, setShowNoWin] = useState(false);
  const previousSpinningRef = useRef(spinning);
  const previousBalanceRef = useRef(balance);

  useEffect(() => {
    const startValue = previousBalanceRef.current;
    const endValue = balance;
    if (Math.abs(endValue - startValue) < 0.001) return;

    let frameId = 0;
    const duration = 300;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayBalance(startValue + (endValue - startValue) * eased);
      if (progress < 1) frameId = requestAnimationFrame(tick);
      else setDisplayBalance(endValue);
    };
    previousBalanceRef.current = endValue;
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [balance]);

  useEffect(() => {
    if (lastWinAmount <= 0) {
      setDisplayWin(0);
      return;
    }

    let frameId = 0;
    const duration = 420;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayWin(lastWinAmount * eased);
      if (progress < 1) frameId = requestAnimationFrame(tick);
      else setDisplayWin(lastWinAmount);
    };
    setDisplayWin(0);
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [lastWinAmount]);

  useEffect(() => {
    const wasSpinning = previousSpinningRef.current;
    previousSpinningRef.current = spinning;
    if (spinning) {
      setShowNoWin(false);
      return;
    }
    if (wasSpinning && lastWinAmount <= 0) {
      setShowNoWin(true);
      const timer = window.setTimeout(() => setShowNoWin(false), 1200);
      return () => window.clearTimeout(timer);
    }
  }, [spinning, lastWinAmount]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: 'linear-gradient(180deg, rgba(13,13,18,0.9) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ color: '#A1A1AA', fontSize: 12 }}>BALANCE</span>
        <span style={{ color: '#FFF', fontSize: 24, fontWeight: 700 }}>
          {displayBalance.toFixed(2)} {currency}
        </span>
      </div>
      <div className="hud-center-feedback">
        {lastWinAmount > 0 && (
          <div className="hud-win-badge" aria-live="polite" aria-atomic="true">
            <span className="hud-win-label">WIN</span>
            <span className="hud-win-value">+{displayWin.toFixed(2)}</span>
          </div>
        )}
        {showNoWin && (
          <div className="hud-nowin-badge" aria-live="polite" aria-atomic="true">
            NO WIN
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <span style={{ color: '#A1A1AA', fontSize: 12 }}>BET</span>
        <span style={{ color: '#FFF', fontSize: 24, fontWeight: 700 }}>
          {bet.toFixed(2)} {currency}
        </span>
        <span style={{ color: '#A1A1AA', fontSize: 12 }}>
          {lines} lines • {lineBet.toFixed(2)} / line
        </span>
      </div>
    </div>
  );
}
