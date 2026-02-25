import { useEffect, useState, useCallback } from 'react';
import { initGame, spin } from './api';
import { useGameStore } from './store';
import { SlotCanvas } from './SlotCanvas';
import { BetPanel } from './BetPanel';
import { HUD } from './HUD';
import { WinOverlay } from './WinOverlay';

function App() {
  const token = useGameStore((s) => s.token);
  const sessionId = useGameStore((s) => s.sessionId);
  const gameId = useGameStore((s) => s.gameId);
  const bet = useGameStore((s) => s.bet);
  const setInit = useGameStore((s) => s.setInit);
  const setSpinResult = useGameStore((s) => s.setSpinResult);
  const setSpinning = useGameStore((s) => s.setSpinning);
  const setError = useGameStore((s) => s.setError);
  const error = useGameStore((s) => s.error);

  const [size, setSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 800,
    h: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));
  const [ready, setReady] = useState(false);

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
  }, [token, gameId, setInit, setError]);

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
    if (!sessionId) return;
    setSpinning(true);
    const idempotencyKey = `spin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    spin(token, sessionId, gameId, { amount: bet, currency: 'USD', lines: 20 }, idempotencyKey)
      .then((data) => {
        setSpinResult(data);
      })
      .catch((e) => {
        setError(e.message);
      });
  }, [token, sessionId, gameId, bet, setSpinning, setSpinResult, setError]);

  const handleAllReelsStopped = useCallback(() => {
    setSpinning(false);
  }, [setSpinning]);

  if (!ready) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D0D12',
          color: '#FFF',
          gap: 16,
        }}
      >
        <div>Loading game…</div>
        <div style={{ color: '#A1A1AA', fontSize: 14 }}>Ensure backend is running: cd backend && npm run dev</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '100vh', position: 'relative', background: '#0D0D12' }}>
      <SlotCanvas width={size.w} height={size.h} onAllReelsStopped={handleAllReelsStopped} />
      <HUD />
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
        </div>
      )}
    </div>
  );
}

export default App;
