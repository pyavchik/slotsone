import { useEffect, useState, useCallback } from 'react';
import { initGame, spin } from './api';
import { useGameStore } from './store';
import { SlotCanvas } from './SlotCanvas';
import { BetPanel } from './BetPanel';
import { HUD } from './HUD';
import { WinOverlay } from './WinOverlay';
import { PayTable } from './PayTable';
import { CVLanding } from './CVLanding';
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

  const [size, setSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 800,
    h: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));
  const [screen, setScreen] = useState<'cv' | 'slots'>('cv');
  const [ready, setReady] = useState(false);

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
    if (!sessionId || spinning) return;
    setSpinning(true);
    const idempotencyKey = `spin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    spin(token, sessionId, gameId, { amount: bet, currency, lines }, idempotencyKey)
      .then((data) => {
        setSpinResult(data);
      })
      .catch((e) => {
        setError(e.message);
      });
  }, [token, sessionId, gameId, bet, lines, currency, spinning, setSpinning, setSpinResult, setError]);

  const handleAllReelsStopped = useCallback(() => {
    setSpinning(false);
  }, [setSpinning]);

  const handleOpenSlots = useCallback(() => {
    setScreen('slots');
    setReady(false);
    setError(null);
  }, [setError]);

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
    <div style={{ width: '100%', height: '100%', minHeight: '100vh', position: 'relative', background: '#0D0D12' }}>
      <SlotCanvas width={size.w} height={size.h} onAllReelsStopped={handleAllReelsStopped} />
      <HUD />
      <PayTable />
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <BetPanel onSpin={handleSpin} />
      </div>
      <WinOverlay />
      {error && (
        <div
          style={{
            position: 'absolute',
            bottom: 140,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            background: '#252532',
            border: '1px solid #F87171',
            color: '#F87171',
            borderRadius: 8,
            fontSize: 14,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{error}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={handleRetryInit}
              style={{
                padding: '8px 16px',
                background: '#E8B84A',
                color: '#0D0D12',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              style={{
                padding: '8px 12px',
                background: 'transparent',
                color: '#FCA5A5',
                border: '1px solid #FCA5A5',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 700,
              }}
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
