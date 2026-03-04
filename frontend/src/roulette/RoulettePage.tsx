import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { initRoulette, spinRoulette, ApiError } from '@/api';
import type { RouletteSpinResponse } from '@/api';
import { useGameStore } from '@/store';
import { useRouletteStore } from '@/stores/rouletteStore';
import { GAME_ID } from './constants';
import { getWinTier } from './types';
import type { WinTier, AutoplayConfig } from './types';
import {
  playSpinStart,
  playWinSmall,
  playWinBig,
  playLoss,
  toggleMute,
  isMuted,
} from '@/audio/rouletteAudio';
import AmbientLayer from './AmbientLayer';
import StatusBar from './StatusBar';
import WheelErrorBoundary from './WheelErrorBoundary';
import Wheel from './Wheel';
import RecentNumbers from './RecentNumbers';
import ResultPanel from './ResultPanel';
import Racetrack from './Racetrack';
import BettingTable from './BettingTable';
import Controls from './Controls';
import StatsPanel from './StatsPanel';
import AutoplayModal from './AutoplayModal';
import WinOverlay from './WinOverlay';
import './roulettePage.css';

/* ---- Desktop detection (≥1024px) ---- */
const DESKTOP_MQ = '(min-width: 1024px)';
const desktopMql = typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ) : null;
function subscribeDesktop(cb: () => void) {
  desktopMql?.addEventListener('change', cb);
  return () => desktopMql?.removeEventListener('change', cb);
}
function getDesktopSnapshot() {
  return desktopMql?.matches ?? false;
}
function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => false);
}

/* ---- Extra-wide detection (≥1400px) ---- */
const EXTRAWIDE_MQ = '(min-width: 1400px)';
const extraWideMql = typeof window !== 'undefined' ? window.matchMedia(EXTRAWIDE_MQ) : null;
function subscribeExtraWide(cb: () => void) {
  extraWideMql?.addEventListener('change', cb);
  return () => extraWideMql?.removeEventListener('change', cb);
}
function getExtraWideSnapshot() {
  return extraWideMql?.matches ?? false;
}
function useIsExtraWide() {
  return useSyncExternalStore(subscribeExtraWide, getExtraWideSnapshot, () => false);
}

const DECO_CHIPS = [
  {
    src: '/assets/roulette/pro/chip-1.png',
    style: { left: '-20px', bottom: '28%', width: 38, transform: 'rotate(-22deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-5.png',
    style: { right: '-18px', bottom: '22%', width: 42, transform: 'rotate(15deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-25.png',
    style: { left: '5%', bottom: '-14px', width: 36, transform: 'rotate(40deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-10.png',
    style: { right: '8%', bottom: '-16px', width: 40, transform: 'rotate(-30deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-50.png',
    style: { left: '-14px', top: '32%', width: 36, transform: 'rotate(10deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-100.png',
    style: { right: '-20px', top: '36%', width: 44, transform: 'rotate(-18deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-25.png',
    style: { left: '18%', bottom: '-8px', width: 30, transform: 'rotate(-55deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-50.png',
    style: { right: '20%', bottom: '-10px', width: 32, transform: 'rotate(25deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-5.png',
    style: { left: '-8px', top: '55%', width: 28, transform: 'rotate(50deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-10.png',
    style: { right: '-12px', top: '55%', width: 32, transform: 'rotate(-45deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-1.png',
    style: { left: '30%', bottom: '-12px', width: 26, transform: 'rotate(70deg)' },
  },
  {
    src: '/assets/roulette/pro/chip-100.png',
    style: { right: '30%', bottom: '-14px', width: 34, transform: 'rotate(-65deg)' },
  },
];

export function RoulettePage() {
  const token = useGameStore((s) => s.token);
  const navigate = useNavigate();

  const balance = useRouletteStore((s) => s.balance);
  const phase = useRouletteStore((s) => s.phase);
  const lastResult = useRouletteStore((s) => s.lastResult);
  const error = useRouletteStore((s) => s.error);
  const setInit = useRouletteStore((s) => s.setInit);
  const setPhase = useRouletteStore((s) => s.setPhase);
  const setSpinResult = useRouletteStore((s) => s.setSpinResult);
  const setError = useRouletteStore((s) => s.setError);
  const resetForNewRound = useRouletteStore((s) => s.resetForNewRound);
  const totalBet = useRouletteStore((s) => s.totalBet);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'none' | 'racetrack' | 'special'>('none');
  const [showAutoplay, setShowAutoplay] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [muted, setMuted] = useState(isMuted());
  const [winOverlay, setWinOverlay] = useState<{ tier: WinTier; amount: number } | null>(null);
  const [pendingSpin, setPendingSpin] = useState<RouletteSpinResponse | null>(null);
  const autoplayRef = useRef<{
    remaining: number;
    config: { stopOnWin: number | null; stopOnLoss: number | null; stopOnBalance: number | null };
  } | null>(null);
  const pendingSpinRef = useRef<RouletteSpinResponse | null>(null);

  /* ---- Init ---- */
  useEffect(() => {
    if (!token) {
      navigate('/login?next=/slots/european-roulette', { replace: true });
      return;
    }
    const controller = new AbortController();
    initRoulette(token, controller.signal)
      .then((res) => {
        setInit(res);
        setLoading(false);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) {
          navigate('/login?next=/slots/european-roulette', { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : 'Failed to init roulette');
        setLoading(false);
      });
    return () => controller.abort();
  }, [token, navigate, setInit, setError]);

  /* ---- Spin ---- */
  const doSpin = useCallback(async () => {
    const currentBets = useRouletteStore.getState().bets;
    const currentSessionId = useRouletteStore.getState().sessionId;
    if (!token || !currentSessionId || currentBets.length === 0) return;

    pendingSpinRef.current = null;
    setPendingSpin(null);
    setPhase('spinning');
    setError(null);
    playSpinStart();

    try {
      const res = await spinRoulette(
        token,
        currentSessionId,
        GAME_ID,
        currentBets,
        `roulette-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      );
      pendingSpinRef.current = res;
      setPendingSpin(res);
      setPhase('ball_drop');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        navigate('/login?next=/slots/european-roulette', { replace: true });
        return;
      }
      pendingSpinRef.current = null;
      setPendingSpin(null);
      setError(e instanceof Error ? e.message : 'Spin failed');
    }
  }, [token, setPhase, setError, navigate]);

  const handleSpin = useCallback(async () => {
    await doSpin();
  }, [doSpin]);

  /* ---- Spin complete ---- */
  const handleSpinComplete = useCallback(() => {
    const resolvedSpin = pendingSpinRef.current;
    if (!resolvedSpin) return;

    setSpinResult(resolvedSpin);
    pendingSpinRef.current = null;
    setPendingSpin(null);

    const outcome = resolvedSpin.outcome;
    const tier = getWinTier(outcome.win.amount, outcome.total_bet);

    if (outcome.win.amount > 0) {
      if (tier === 'big' || tier === 'mega') {
        playWinBig();
      } else {
        playWinSmall();
      }
      setWinOverlay({ tier, amount: outcome.win.amount });
    } else {
      playLoss();
    }

    setTimeout(() => {
      useRouletteStore.getState().setPhase('payout');
    }, 320);

    /* ---- Autoplay ---- */
    if (autoplayRef.current) {
      const ap = autoplayRef.current;
      const state = useRouletteStore.getState();
      ap.remaining--;

      let shouldStop = ap.remaining <= 0;
      if (ap.config.stopOnBalance != null && state.balance < ap.config.stopOnBalance)
        shouldStop = true;
      if (state.lastResult) {
        if (ap.config.stopOnWin != null && state.lastResult.win.amount >= ap.config.stopOnWin)
          shouldStop = true;
      }
      const netLoss = state.sessionTotals.wagered - state.sessionTotals.won;
      if (ap.config.stopOnLoss != null && netLoss >= ap.config.stopOnLoss) shouldStop = true;

      if (shouldStop) {
        autoplayRef.current = null;
      } else {
        setTimeout(() => {
          if (!autoplayRef.current) return;
          resetForNewRound();
          useRouletteStore.getState().rebet();
          setTimeout(() => doSpin(), 200);
        }, 1500);
        return;
      }
    }
  }, [doSpin, resetForNewRound, setSpinResult]);

  /* ---- New round ---- */
  const handleNewRound = useCallback(() => {
    autoplayRef.current = null;
    pendingSpinRef.current = null;
    setPendingSpin(null);
    setWinOverlay(null);
    resetForNewRound();
  }, [resetForNewRound]);

  /* ---- Auto-transition: go to next round after result display ---- */
  const AUTO_NEXT_DELAY = 4000; // ms to show result before auto-resetting
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only auto-transition in payout phase when NOT in autoplay (autoplay has its own timing)
    if (phase !== 'payout' || autoplayRef.current) {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
      return;
    }

    autoNextTimerRef.current = setTimeout(() => {
      autoNextTimerRef.current = null;
      handleNewRound();
    }, AUTO_NEXT_DELAY);

    return () => {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
    };
  }, [phase, handleNewRound]);

  /* ---- Autoplay ---- */
  const handleAutoplayStart = useCallback(
    (config: AutoplayConfig) => {
      setShowAutoplay(false);
      autoplayRef.current = { remaining: config.rounds, config };
      handleSpin();
    },
    [handleSpin]
  );

  /* ---- Mute ---- */
  const handleMuteToggle = useCallback(() => {
    toggleMute();
    setMuted(isMuted());
  }, []);

  const isDesktop = useIsDesktop();
  const isExtraWide = useIsExtraWide();
  const isSpinning = phase === 'spinning' || phase === 'ball_drop';
  const isResult = phase === 'result' || phase === 'payout';
  const currentTotal = totalBet();

  /* ---- Win tier for wheel particles ---- */
  const currentWinTier: WinTier =
    isResult && lastResult && lastResult.win.amount > 0
      ? getWinTier(
          lastResult.win.amount,
          lastResult.win.amount > 0
            ? lastResult.win.amount /
                (lastResult.win.amount /
                  (lastResult.win.breakdown.reduce((s, b) => s + b.payout, 0) || 1))
            : 1
        )
      : 'none';

  if (loading) {
    return (
      <div className="rp-shell">
        <div className="rp-loading">
          <div className="rp-loading-spinner" />
          Loading table...
        </div>
      </div>
    );
  }

  return (
    <div className="rp-shell">
      <AmbientLayer />

      <StatusBar
        balance={balance}
        currentTotal={currentTotal}
        lastResult={isResult ? lastResult : null}
        muted={muted}
        onMuteToggle={handleMuteToggle}
        onStatsToggle={() => setShowStats(!showStats)}
        onLobby={() => navigate('/slots')}
      />

      {error && <div className="rp-error">{error}</div>}

      {/* Stats drawer */}
      {showStats && (
        <div className="rp-stats-drawer-overlay" onClick={() => setShowStats(false)}>
          <div className="rp-stats-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="rp-stats-drawer-header">
              <span>Statistics</span>
              <button
                className="sb-icon-btn"
                onClick={() => setShowStats(false)}
                aria-label="Close stats"
              >
                &times;
              </button>
            </div>
            <StatsPanel />
          </div>
        </div>
      )}

      {/* Main game layout — single column on mobile, two columns on desktop */}
      <div className="rp-game">
        <div className="rp-left">
          {/* Wheel area */}
          <div className="rp-wheel-area">
            <div className="rp-deco-chips">
              {DECO_CHIPS.map((chip, i) => (
                <img
                  key={i}
                  src={chip.src}
                  alt=""
                  aria-hidden="true"
                  className="rp-deco-chip"
                  style={chip.style as React.CSSProperties}
                />
              ))}
            </div>
            <WheelErrorBoundary>
              <Wheel
                spinning={isSpinning}
                spinOutcome={pendingSpin?.outcome}
                spinToken={pendingSpin?.spin_id}
                resultNumber={lastResult?.winning_number ?? null}
                winTier={currentWinTier}
                onBallDropStart={() => setPhase('ball_drop')}
                onSpinComplete={handleSpinComplete}
                size={isExtraWide ? 520 : isDesktop ? 440 : 300}
              />
            </WheelErrorBoundary>
          </div>

          <RecentNumbers />

          {/* Result panel */}
          {isResult && lastResult && (
            <ResultPanel lastResult={lastResult} onNewRound={handleNewRound} />
          )}
        </div>

        <div className="rp-right">
          {/* Tab bar */}
          <div className="rp-tab-bar">
            <button
              className={`rp-tab ${activeTab === 'racetrack' ? 'rp-tab--active' : ''}`}
              onClick={() => setActiveTab(activeTab === 'racetrack' ? 'none' : 'racetrack')}
            >
              Racetrack
            </button>
            <button
              className={`rp-tab ${activeTab === 'special' ? 'rp-tab--active' : ''}`}
              onClick={() => setActiveTab(activeTab === 'special' ? 'none' : 'special')}
            >
              Special Bets
            </button>
          </div>
          <Racetrack visible={activeTab === 'racetrack' || activeTab === 'special'} />

          <BettingTable />

          <Controls onSpin={handleSpin} onAutoplay={() => setShowAutoplay(true)} />
        </div>
      </div>

      <AutoplayModal
        visible={showAutoplay}
        onClose={() => setShowAutoplay(false)}
        onStart={handleAutoplayStart}
        balance={balance}
      />

      <WinOverlay
        tier={winOverlay?.tier ?? 'none'}
        amount={winOverlay?.amount ?? 0}
        visible={winOverlay != null}
        onDismiss={() => setWinOverlay(null)}
      />
    </div>
  );
}

export default RoulettePage;
