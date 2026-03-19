import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { initGame, spin, acceptRewind, refreshAccessToken, logout, ApiError } from '@/api';
import { useGameStore } from '@/store';
import { getGameBySlug } from '@/data/catalog';
import { setActiveGameSymbols } from '@/symbols';
import { SlotCanvas } from '@/SlotCanvas';
import { BetPanel } from '@/BetPanel';
import { HUD } from '@/HUD';
import { WinOverlay } from '@/WinOverlay';
import { PayTable } from '@/PayTable';
import { RewindModal, RewindProgressOverlay } from '@/RewindModal';
import '@/rewind.css';
import { playSpinSound, playWinSound } from '@/audio';

const DEMO_TOKEN = import.meta.env.VITE_DEMO_JWT;

export default function GamePage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const token = useGameStore((s) => s.token);
  const sessionId = useGameStore((s) => s.sessionId);
  const setGameId = useGameStore((s) => s.setGameId);

  // Derive gameId from URL slug (synchronous, no effect needed)
  const catalogEntry = slug ? getGameBySlug(slug) : undefined;
  const gameId = catalogEntry?.gameId ?? 'slot_mega_fortune_001';

  // Keep store in sync and activate game-specific symbols
  useEffect(() => {
    setGameId(gameId);
    setActiveGameSymbols(gameId);
    return () => setActiveGameSymbols(null);
  }, [gameId, setGameId]);
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
  const rewindOffer = useGameStore((s) => s.rewindOffer);
  const rewindInProgress = useGameStore((s) => s.rewindInProgress);
  const rewindSpinIndex = useGameStore((s) => s.rewindSpinIndex);
  const rewindTotalSpins = useGameStore((s) => s.rewindTotalSpins);
  const setRewindOffer = useGameStore((s) => s.setRewindOffer);
  const setLosingStreak = useGameStore((s) => s.setLosingStreak);
  const setRewindInProgress = useGameStore((s) => s.setRewindInProgress);
  const clearRewindState = useGameStore((s) => s.clearRewindState);

  const [size, setSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 800,
    h: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));
  const [ready, setReady] = useState(false);
  const [spinCooldown, setSpinCooldown] = useState(false);
  const [payTableOpen, setPayTableOpen] = useState(false);
  const spinCooldownRef = useRef<number | null>(null);
  const initDoneRef = useRef(false);

  // -------------------------------------------------------------------------
  // Overflow lock for game screen
  // -------------------------------------------------------------------------

  useEffect(() => {
    const root = document.getElementById('root');
    const previousRootOverflow = root?.style.overflow ?? '';
    const previousBodyOverflow = document.body.style.overflow;
    if (root) root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      if (root) root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

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
  // Game init
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (initDoneRef.current) return;

    if (DEMO_TOKEN === 'e2e.mock.token') {
      initDoneRef.current = true;
      setToken(DEMO_TOKEN);
      initGame(DEMO_TOKEN, gameId)
        .then((data) => {
          setInit(data);
          setReady(true);
          setError(null);
        })
        .catch((e: unknown) => {
          initDoneRef.current = false;
          if (e instanceof ApiError && e.status === 401) {
            setToken('');
            return;
          }
          setError(e instanceof Error ? e.message : 'Connection failed');
          setReady(true);
        });
      return;
    }

    if (!token) {
      navigate(`/login?next=/slots/${slug ?? 'mega-fortune'}`, { replace: true });
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
          setToken('');
          navigate('/login', { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : 'Connection failed');
        setReady(true);
      });
  }, [token, gameId, setInit, setError, setToken, navigate]);

  // -------------------------------------------------------------------------
  // Retry
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
          navigate('/login', { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : 'Connection failed');
        setReady(true);
      });
  }, [token, gameId, setInit, setError, setToken, navigate]);

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

    const spinToken = DEMO_TOKEN === 'e2e.mock.token' ? DEMO_TOKEN : token;
    const idempotencyKey = `spin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    spin(spinToken, sessionId, gameId, { amount: bet, currency, lines }, idempotencyKey)
      .then((data) => {
        setSpinResult(data);
        // Handle Time Machine rewind data in spin response
        const extended = data as typeof data & { losing_streak?: number; rewind_offer?: unknown };
        if (typeof extended.losing_streak === 'number') {
          setLosingStreak(extended.losing_streak);
        }
        if (extended.rewind_offer && typeof extended.rewind_offer === 'object') {
          setRewindOffer(extended.rewind_offer as typeof rewindOffer);
        }
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          setSpinning(false);
          if (DEMO_TOKEN === 'e2e.mock.token') {
            setError('Session expired');
            return;
          }
          refreshAccessToken()
            .then((data) => setToken(data.access_token))
            .catch(() => {
              setToken('');
              navigate('/login', { replace: true });
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
    navigate,
  ]);

  // -------------------------------------------------------------------------
  // Rewind accept / skip
  // -------------------------------------------------------------------------

  const handleRewindAccept = useCallback(
    (tier: 'safe' | 'standard' | 'super') => {
      if (!sessionId || !rewindOffer) return;
      const spinToken = DEMO_TOKEN === 'e2e.mock.token' ? DEMO_TOKEN : token;
      const idempKey = `rewind-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setRewindOffer(null);
      setRewindInProgress(true, 0, 5);

      acceptRewind(spinToken, sessionId, rewindOffer.offer_id, tier, idempKey)
        .then((data) => {
          // Animate through each spin result
          let i = 0;
          const playNext = () => {
            if (i >= data.spins.length) {
              setRewindInProgress(false);
              clearRewindState();
              useGameStore.setState({ balance: data.balance.amount });
              return;
            }
            const spinData = data.spins[i]!;
            setRewindInProgress(true, spinData.spin_number, data.spins.length);
            setSpinning(true);
            useGameStore.setState({
              lastOutcome: spinData.outcome,
              pendingWinAmount: spinData.outcome.win.amount,
            });
            i++;
            // Small delay for each rewind spin animation
            window.setTimeout(playNext, 1800);
          };
          playNext();
        })
        .catch((e: unknown) => {
          setRewindInProgress(false);
          clearRewindState();
          setError(e instanceof Error ? e.message : 'Rewind failed');
        });
    },
    [
      token,
      sessionId,
      rewindOffer,
      setRewindOffer,
      setRewindInProgress,
      clearRewindState,
      setSpinning,
      setError,
    ]
  );

  const handleRewindSkip = useCallback(() => {
    setRewindOffer(null);
    setLosingStreak(0);
  }, [setRewindOffer, setLosingStreak]);

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  const handleLogout = useCallback(() => {
    logout().catch(() => undefined);
    setToken('');
    initDoneRef.current = false;
    setReady(false);
    navigate('/login', { replace: true });
  }, [setToken, navigate]);

  // -------------------------------------------------------------------------
  // Win sound
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (lastWinAmount <= 0) return;
    playWinSound(bet > 0 ? lastWinAmount / bet : 1);
  }, [lastWinAmount, bet]);

  const handleAllReelsStopped = useCallback(() => setSpinning(false), [setSpinning]);

  // -------------------------------------------------------------------------
  // Navigation helpers
  // -------------------------------------------------------------------------

  const handleOpenHistory = useCallback(() => navigate('/history'), [navigate]);
  const handleBackToLobby = useCallback(() => navigate('/slots'), [navigate]);

  // -------------------------------------------------------------------------
  // Spacebar to spin
  // -------------------------------------------------------------------------

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return;
      if (payTableOpen) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.tagName === 'BUTTON'
      )
        return;
      event.preventDefault();
      handleSpin();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSpin, payTableOpen]);

  // -------------------------------------------------------------------------
  // Error auto-dismiss
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [error, setError]);

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

  if (!ready) {
    return (
      <div className="loader-shell" aria-label="Loading game, please wait">
        <div className="loader-card">
          <div className="loader-brand" aria-hidden="true">
            SLOTS<span>ONE</span>
          </div>
          <div className="loader-reels-wrap" aria-hidden="true">
            <div className="loader-reels">
              <div className="loader-reel">
                <div className="loader-reel-strip loader-reel-strip-1">
                  <span>7</span>
                  <span>A</span>
                  <span>K</span>
                  <span>Q</span>
                  <span>J</span>
                  <span>&#9733;</span>
                  <span>&#9670;</span>
                  <span>7</span>
                  <span>A</span>
                  <span>K</span>
                  <span>Q</span>
                  <span>J</span>
                  <span>&#9733;</span>
                  <span>&#9670;</span>
                </div>
              </div>
              <div className="loader-reel">
                <div className="loader-reel-strip loader-reel-strip-2">
                  <span>&#9733;</span>
                  <span>&#9670;</span>
                  <span>7</span>
                  <span>A</span>
                  <span>K</span>
                  <span>Q</span>
                  <span>J</span>
                  <span>&#9733;</span>
                  <span>&#9670;</span>
                  <span>7</span>
                  <span>A</span>
                  <span>K</span>
                  <span>Q</span>
                  <span>J</span>
                </div>
              </div>
              <div className="loader-reel">
                <div className="loader-reel-strip loader-reel-strip-3">
                  <span>K</span>
                  <span>Q</span>
                  <span>J</span>
                  <span>&#9733;</span>
                  <span>&#9670;</span>
                  <span>7</span>
                  <span>A</span>
                  <span>K</span>
                  <span>Q</span>
                  <span>J</span>
                  <span>&#9733;</span>
                  <span>&#9670;</span>
                  <span>7</span>
                  <span>A</span>
                </div>
              </div>
            </div>
            <div className="loader-payline" aria-hidden="true" />
          </div>
          <div className="loader-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="loader-text">Loading game…</p>
        </div>
        <p className="loading-hint">Ensure backend is running: cd backend &amp;&amp; npm run dev</p>
      </div>
    );
  }

  return (
    <div className="slots-shell">
      <SlotCanvas width={size.w} height={size.h} onAllReelsStopped={handleAllReelsStopped} />
      <HUD onLogout={handleLogout} onHistory={handleOpenHistory} onLobby={handleBackToLobby} />
      <PayTable open={payTableOpen} onClose={() => setPayTableOpen(false)} />
      <div className="slots-controls-dock">
        <BetPanel
          onSpin={handleSpin}
          spinDisabled={spinCooldown}
          onInfoClick={() => setPayTableOpen(true)}
        />
      </div>
      <WinOverlay />
      {rewindOffer && !spinning && (
        <RewindModal offer={rewindOffer} onAccept={handleRewindAccept} onSkip={handleRewindSkip} />
      )}
      {rewindInProgress && (
        <RewindProgressOverlay spinIndex={rewindSpinIndex} totalSpins={rewindTotalSpins} />
      )}
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
