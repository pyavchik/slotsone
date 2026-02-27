import { useEffect, useState, useCallback, useRef } from 'react';
import { initGame, spin, refreshAccessToken, logout, ApiError } from './api';
import { useGameStore } from './store';
import { SlotCanvas } from './SlotCanvas';
import { BetPanel } from './BetPanel';
import { HUD } from './HUD';
import { WinOverlay } from './WinOverlay';
import { PayTable } from './PayTable';
import { CVLanding } from './CVLanding';
import { AuthScreen } from './AuthScreen';
import { playSpinSound, playWinSound } from './audio';
import './app.css';

type Screen = 'cv' | 'auth' | 'slots';

function getScreenFromPath(pathname: string): Screen {
  return pathname === '/slots' || pathname.startsWith('/slots/') ? 'slots' : 'cv';
}

function App() {
  const token = useGameStore((s) => s.token);
  const sessionId = useGameStore((s) => s.sessionId);
  const gameId = useGameStore((s) => s.gameId);
  const bet = useGameStore((s) => s.bet);
  const lines = useGameStore((s) => s.lines);
  const currency = useGameStore((s) => s.currency);
  const setToken = useGameStore((s) => s.setToken);
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
  const [screen, setScreen] = useState<Screen>(() =>
    typeof window === 'undefined' ? 'cv' : getScreenFromPath(window.location.pathname)
  );
  const [ready, setReady] = useState(false);
  const [spinCooldown, setSpinCooldown] = useState(false);
  const spinCooldownRef = useRef<number | null>(null);

  // Guards that prevent the game-init effect from running twice in the same session.
  // initDoneRef  — set true once initGame succeeds; reset when leaving the slots screen.
  // refreshTriedRef — set true after the first silent-refresh attempt; reset on screen change.
  const initDoneRef = useRef(false);
  const refreshTriedRef = useRef(false);

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  useEffect(() => {
    const onPopState = () => setScreen(getScreenFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // -------------------------------------------------------------------------
  // Overflow lock for slots screen
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Resize
  // -------------------------------------------------------------------------

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setSize({ w: window.innerWidth, h: window.innerHeight }), 250);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Game init — two-token flow
  //
  //  1. screen → slots, no token in memory
  //     └─ try POST /auth/refresh (sends httpOnly cookie automatically)
  //          ├─ ok  → setToken(access) → effect re-runs → initGame
  //          └─ 401 → cookie absent/expired → setScreen('auth')
  //
  //  2. screen → slots, token present (just logged in, or refresh succeeded)
  //     └─ initGame(token)
  //          ├─ ok  → game ready
  //          └─ 401 → access token expired → setToken('') → effect re-runs
  //                    → refreshTriedRef guard sends to auth if refresh already tried
  //
  //  initDoneRef prevents re-running initGame when the token silently rotates
  //  mid-session (e.g. a spin returns 401 and triggers a background refresh).
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (screen !== 'slots') {
      initDoneRef.current = false;
      refreshTriedRef.current = false;
      return;
    }

    // Already in a live game — don't restart the session on token rotation
    if (initDoneRef.current) return;

    if (!token) {
      if (refreshTriedRef.current) {
        // Refresh was already attempted but yielded no token → send to auth
        setScreen('auth');
        return;
      }
      refreshTriedRef.current = true;
      refreshAccessToken()
        .then((data) => setToken(data.access_token))
        .catch(() => setScreen('auth'));
      return;
    }

    initDoneRef.current = true;
    initGame(token, gameId)
      .then((data) => {
        setInit(data);
        setReady(true);
        setError(null);
      })
      .catch((e: unknown) => {
        initDoneRef.current = false;
        if (e instanceof ApiError && e.status === 401) {
          // Access token is expired — clear it and let the effect retry via refresh
          setToken('');
          return;
        }
        setError(e instanceof Error ? e.message : 'Connection failed');
        setReady(true);
      });
  }, [screen, token, gameId, setInit, setError, setToken]);

  // -------------------------------------------------------------------------
  // Retry button (for non-auth errors like network failures)
  // -------------------------------------------------------------------------

  const handleRetryInit = useCallback(() => {
    setError(null);
    setReady(false);
    initDoneRef.current = false;
    initGame(token, gameId)
      .then((data) => {
        setInit(data);
        setReady(true);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setToken('');
          setScreen('auth');
          return;
        }
        setError(e instanceof Error ? e.message : 'Connection failed');
        setReady(true);
      });
  }, [token, gameId, setInit, setError, setToken]);

  // -------------------------------------------------------------------------
  // Spin
  // -------------------------------------------------------------------------

  const handleSpin = useCallback(() => {
    if (!sessionId || spinning || spinCooldown) return;
    playSpinSound();
    setSpinning(true);
    setSpinCooldown(true);
    if (spinCooldownRef.current) window.clearTimeout(spinCooldownRef.current);
    spinCooldownRef.current = window.setTimeout(() => setSpinCooldown(false), 250);

    const idempotencyKey = `spin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    spin(token, sessionId, gameId, { amount: bet, currency, lines }, idempotencyKey)
      .then((data) => setSpinResult(data))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          // Access token expired mid-session — refresh silently.
          // The next spin will use the new token; no error shown.
          setSpinning(false);
          refreshAccessToken()
            .then((data) => setToken(data.access_token))
            .catch(() => {
              setToken('');
              setScreen('auth');
            });
          return;
        }
        setError(e instanceof Error ? e.message : 'Spin failed');
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
    setToken,
    spinCooldown,
  ]);

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  const handleLogout = useCallback(() => {
    logout().catch(() => undefined); // best-effort — revoke server-side, but always clean up locally
    setToken('');
    initDoneRef.current = false;
    refreshTriedRef.current = false;
    setReady(false);
    setScreen('auth');
  }, [setToken]);

  // -------------------------------------------------------------------------
  // Win sound
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (screen !== 'slots') return;
    if (lastWinAmount <= 0) return;
    playWinSound(bet > 0 ? lastWinAmount / bet : 1);
  }, [screen, lastWinAmount, bet]);

  const handleAllReelsStopped = useCallback(() => setSpinning(false), [setSpinning]);

  // -------------------------------------------------------------------------
  // Auth screen callback
  // -------------------------------------------------------------------------

  const handleAuthenticated = useCallback(() => {
    initDoneRef.current = false;
    refreshTriedRef.current = false;
    setReady(false);
    setScreen('slots');
  }, []);

  // -------------------------------------------------------------------------
  // CV → slots navigation
  // -------------------------------------------------------------------------

  const handleOpenSlots = useCallback(() => {
    const slotsUrl = new URL('/slots', window.location.origin).toString();
    const newTab = window.open(slotsUrl, '_blank');
    if (newTab) {
      newTab.opener = null;
      return;
    }
    window.location.assign(slotsUrl);
  }, []);

  // -------------------------------------------------------------------------
  // Spacebar to spin
  // -------------------------------------------------------------------------

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
      )
        return;
      if (document.getElementById('paytable-dialog')) return;
      event.preventDefault();
      handleSpin();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, handleSpin]);

  // -------------------------------------------------------------------------
  // Error auto-dismiss
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (screen !== 'slots' || !error) return;
    const timer = window.setTimeout(() => setError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [screen, error, setError]);

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (spinCooldownRef.current) window.clearTimeout(spinCooldownRef.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (screen === 'cv') {
    return <CVLanding onOpenSlots={handleOpenSlots} />;
  }

  if (screen === 'auth') {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
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
      <HUD onLogout={handleLogout} />
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
