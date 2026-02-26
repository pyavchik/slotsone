import { useEffect, useState, useCallback, useRef } from 'react';
import { initGame, spin } from './api';
import { useGameStore } from './store';
import { SlotCanvas } from './SlotCanvas';
import { BetPanel } from './BetPanel';
import { HUD } from './HUD';
import { WinOverlay } from './WinOverlay';
import { PayTable } from './PayTable';
import { CVLanding } from './CVLanding';
import { playSpinSound, playWinSound } from './audio';
import './app.css';

function App() {
  const token = useGameStore((s) => s.token);
  const sessionId = useGameStore((s) => s.sessionId);
  const gameId = useGameStore((s) => s.gameId);
  const bet = useGameStore((s) => s.bet);
  const lines = useGameStore((s) => s.lines);
  const currency = useGameStore((s) => s.currency);
  const setInit = useGameStore((s) => s.setInit);
  const setSpinResult = useGameStore((s) => s.setSpinResult);
  const setSpinning = useGameStore((s) => s.setSpinning);
  const setError = useGameStore((s) => s.setError);
  const error = useGameStore((s) => s.error);
  const spinning = useGameStore((s) => s.spinning);
  const lastWinAmount = useGameStore((s) => s.lastWinAmount);

  const [size, setSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 800,
    h: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));
  const [screen, setScreen] = useState<'cv' | 'slots'>('cv');
  const [ready, setReady] = useState(false);
  const [spinCooldown, setSpinCooldown] = useState(false);
  const spinCooldownRef = useRef<number | null>(null);

  useEffect(() => {
    const root = document.getElementById('root');
    const previousRootOverflow = root?.style.overflow ?? '';
    const previousBodyOverflow = document.body.style.overflow;
    const overflowMode = screen === 'slots' ? 'hidden' : 'auto';
    if (root) root.style.overflow = overflowMode;
    document.body.style.overflow = overflowMode;
    return () => {
      if (root) root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [screen]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({ w: window.innerWidth, h: window.innerHeight });
      }, 250);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (screen !== 'slots') return;
    if (!token) {
      setError('Missing VITE_DEMO_JWT. Configure an RS256 token for frontend.');
      setReady(true);
      return;
    }
    initGame(token, gameId)
      .then((data) => {
        setInit(data);
        setReady(true);
        setError(null);
      })
      .catch((e) => {
        setError(e?.message ?? 'Connection failed');
        setReady(true); // show UI so user sees error and can retry
      });
  }, [screen, token, gameId, setInit, setError]);

  const handleRetryInit = useCallback(() => {
    setError(null);
    setReady(false);
    initGame(token, gameId)
      .then((data) => {
        setInit(data);
        setReady(true);
      })
      .catch((e) => setError(e?.message ?? 'Connection failed'));
  }, [token, gameId, setInit, setError]);

  const handleSpin = useCallback(() => {
    if (!sessionId || spinning || spinCooldown) return;
    playSpinSound();
    setSpinning(true);
    setSpinCooldown(true);
    if (spinCooldownRef.current) {
      window.clearTimeout(spinCooldownRef.current);
    }
    spinCooldownRef.current = window.setTimeout(() => setSpinCooldown(false), 250);
    const idempotencyKey = `spin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    spin(token, sessionId, gameId, { amount: bet, currency, lines }, idempotencyKey)
      .then((data) => {
        setSpinResult(data);
      })
      .catch((e) => {
        setError(e.message);
      });
  }, [
    token,
    sessionId,
    gameId,
    bet,
    lines,
    currency,
    spinning,
    setSpinning,
    setSpinResult,
    setError,
    spinCooldown,
  ]);

  useEffect(() => {
    if (screen !== 'slots') return;
    if (lastWinAmount <= 0) return;
    const multiplier = bet > 0 ? lastWinAmount / bet : 1;
    playWinSound(multiplier);
  }, [screen, lastWinAmount, bet]);

  const handleAllReelsStopped = useCallback(() => {
    setSpinning(false);
  }, [setSpinning]);

  const handleOpenSlots = useCallback(() => {
    window.open('https://pyavchik.space/slots', '_blank', 'noopener,noreferrer');
  }, []);

  useEffect(() => {
    return () => {
      if (spinCooldownRef.current) {
        window.clearTimeout(spinCooldownRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (screen !== 'slots') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.tagName === 'BUTTON'
      ) {
        return;
      }
      if (document.getElementById('paytable-dialog')) return;
      event.preventDefault();
      handleSpin();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, handleSpin]);

  useEffect(() => {
    if (screen !== 'slots') return;
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [screen, error, setError]);

  if (screen === 'cv') {
    return <CVLanding onOpenSlots={handleOpenSlots} />;
  }

  if (!ready) {
    return (
      <div className="loading-shell">
        <div className="loading-spinner" aria-hidden="true" />
        <div>Loading game…</div>
        <div className="loading-hint">Ensure backend is running: cd backend && npm run dev</div>
      </div>
    );
  }

  return (
    <div className="slots-shell">
      <SlotCanvas width={size.w} height={size.h} onAllReelsStopped={handleAllReelsStopped} />
      <HUD />
      <PayTable />
      <div className="slots-controls-dock">
        <BetPanel onSpin={handleSpin} spinDisabled={spinCooldown} />
      </div>
      <WinOverlay />
      {error && (
        <div className="slots-error-toast" role="alert" aria-live="assertive">
          <span className="slots-error-message">{error}</span>
          <div className="slots-error-actions">
            <button
              type="button"
              onClick={handleRetryInit}
              className="slots-error-btn slots-error-btn-retry"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="slots-error-btn slots-error-btn-dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
