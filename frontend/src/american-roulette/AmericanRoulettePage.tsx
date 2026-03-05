import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  initAmericanRoulette,
  spinAmericanRoulette,
  ApiError,
  type AmericanRouletteBet,
  type AmericanRouletteBetType,
} from '../api';
import { useGameStore } from '../store';
import {
  AMERICAN_WHEEL_ORDER,
  BASE_BET_SPOTS,
  CHIP_DENOMINATIONS,
  STRAIGHT_SPOTS,
  TABLE_ROWS,
  getOutcomeColor,
} from './constants';
import { canAffordBet, copyBets, totalBetAmount, type BetState } from './engine';
import RouletteWheelSVG from './RouletteWheelSVG';
import type { RouletteOutcome } from './types';
import './americanRoulette.css';

// ---------------------------------------------------------------------------
// Bet conversion: frontend bet IDs → backend AmericanRouletteBet[]
// ---------------------------------------------------------------------------

const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACKS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
const EVEN = Array.from({ length: 18 }, (_, i) => (i + 1) * 2).filter((n) => n <= 36);
const ODD = Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => n % 2 === 1);
const LOW = Array.from({ length: 18 }, (_, i) => i + 1);
const HIGH = Array.from({ length: 18 }, (_, i) => i + 19);
const COLUMN_1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
const COLUMN_2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
const COLUMN_3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
const DOZEN_1 = Array.from({ length: 12 }, (_, i) => i + 1);
const DOZEN_2 = Array.from({ length: 12 }, (_, i) => i + 13);
const DOZEN_3 = Array.from({ length: 12 }, (_, i) => i + 25);

const BET_ID_MAP: Record<string, { type: AmericanRouletteBetType; numbers: number[] }> = {
  red: { type: 'red', numbers: REDS },
  black: { type: 'black', numbers: BLACKS },
  even: { type: 'even', numbers: EVEN },
  odd: { type: 'odd', numbers: ODD },
  low: { type: 'low', numbers: LOW },
  high: { type: 'high', numbers: HIGH },
  column1: { type: 'column', numbers: COLUMN_1 },
  column2: { type: 'column', numbers: COLUMN_2 },
  column3: { type: 'column', numbers: COLUMN_3 },
  dozen1: { type: 'dozen', numbers: DOZEN_1 },
  dozen2: { type: 'dozen', numbers: DOZEN_2 },
  dozen3: { type: 'dozen', numbers: DOZEN_3 },
};

function convertBetsToApi(bets: BetState): AmericanRouletteBet[] {
  const result: AmericanRouletteBet[] = [];
  for (const [id, amount] of Object.entries(bets)) {
    if (amount <= 0) continue;

    // Check straight bets: straight-0, straight-00, straight-N
    if (id.startsWith('straight-')) {
      const numStr = id.slice('straight-'.length);
      const numbers = numStr === '00' ? [-1] : [parseInt(numStr, 10)];
      result.push({ type: 'straight', numbers, amount });
      continue;
    }

    // Named bets (red, black, column1, dozen2, etc.)
    const mapping = BET_ID_MAP[id];
    if (mapping) {
      result.push({ type: mapping.type, numbers: mapping.numbers, amount });
    }
  }
  return result;
}

/** Convert backend winning_number (-1 for 00) to frontend RouletteOutcome */
function toFrontendOutcome(winningNumber: number): RouletteOutcome {
  return winningNumber === -1 ? '00' : winningNumber;
}

interface Toast {
  id: number;
  text: string;
}

const SEGMENT_ANGLE = (Math.PI * 2) / AMERICAN_WHEEL_ORDER.length;
const SPIN_DURATION_MS = 4200;

function formatOutcome(outcome: RouletteOutcome | null): string {
  if (outcome == null) return '\u2014';
  return String(outcome);
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

interface WheelAnimState {
  rotation: number;
  ballAngle: number;
  ballRadius: number;
  ballVisible: boolean;
}

const R_BALL_TRACK = 440; // ball orbits on the chrome track
const R_BALL_POCKET = 365; // ball rests in the pocket (number radius)
const BALL_DROP_START = 0.7; // progress at which ball starts dropping into pocket

function useWheelAnimation(
  winner: RouletteOutcome | null,
  spinning: boolean,
  onDone: () => void
): WheelAnimState {
  const [rotation, setRotation] = useState(0);
  const [ballAngle, setBallAngle] = useState(-Math.PI / 2);
  const [ballRadius, setBallRadius] = useState(R_BALL_TRACK);
  const [ballVisible, setBallVisible] = useState(false);
  const rotationRef = useRef(0);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    if (!spinning || winner == null) {
      return;
    }

    setBallVisible(true);

    const startRotation = rotationRef.current;
    const winnerIndex = AMERICAN_WHEEL_ORDER.findIndex((v) => v === winner);
    const targetCenter = -Math.PI / 2 + winnerIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const normalized = ((-targetCenter % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const extraTurns = Math.PI * 2 * 8;
    const targetRotation = startRotation + extraTurns + normalized;

    // Ball spins opposite direction (CCW), faster, more total turns
    const ballStartAngle = -Math.PI / 2;
    const ballExtraTurns = Math.PI * 2 * 12;

    // Ball final angle = winning pocket's absolute position in SVG space.
    // The rotor SVG transform is rotate(rotation - π/2), so a pocket at
    // local angle (i+0.5)*SEG sits at absolute angle:
    //   (rotation - π/2) + (i+0.5)*SEG
    const pocketLocalAngle = (winnerIndex + 0.5) * SEGMENT_ANGLE;
    const ballFinalAngle = targetRotation - Math.PI / 2 + pocketLocalAngle;

    // Normalize to [0, 2π), then subtract extra CCW turns so ball
    // travels many revolutions before landing
    const TWO_PI = Math.PI * 2;
    const normalizedFinal = ((ballFinalAngle % TWO_PI) + TWO_PI) % TWO_PI;
    const ballTargetAngle = normalizedFinal - ballExtraTurns;

    let raf = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / SPIN_DURATION_MS);
      const eased = easeOutCubic(progress);

      // Rotor
      const current = startRotation + (targetRotation - startRotation) * eased;
      setRotation(current);

      // Ball angle — use a different easing: faster start, sharp stop
      const ballEased = easeOutCubic(progress);
      const currentBallAngle = ballStartAngle + (ballTargetAngle - ballStartAngle) * ballEased;
      setBallAngle(currentBallAngle);

      // Ball radius — stays on track until BALL_DROP_START, then drops into pocket
      if (progress < BALL_DROP_START) {
        setBallRadius(R_BALL_TRACK);
      } else {
        const dropProgress = (progress - BALL_DROP_START) / (1 - BALL_DROP_START);
        const dropEased = easeOutCubic(dropProgress);
        setBallRadius(R_BALL_TRACK - (R_BALL_TRACK - R_BALL_POCKET) * dropEased);
      }

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        onDone();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [winner, spinning, onDone]);

  return { rotation, ballAngle, ballRadius, ballVisible };
}

const CHIP_LABELS: Record<number, string> = {
  1: '1',
  5: '5',
  10: '10',
  25: '25',
  100: '100',
  500: '500',
};

function Chip({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`ar-chip ar-chip--${value}${selected ? ' is-selected' : ''}`}
      type="button"
      onClick={onClick}
      aria-label={`${value} chip`}
    >
      <span>{CHIP_LABELS[value]}</span>
    </button>
  );
}

function BetBadge({ amount }: { amount?: number }) {
  if (!amount || amount <= 0) return null;
  return <span className="ar-bet-badge">{amount}</span>;
}

export default function AmericanRoulettePage() {
  const navigate = useNavigate();
  const token = useGameStore((s) => s.token);

  // Session state from backend
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [balance, setBalance] = useState(0);
  const [selectedChip, setSelectedChip] = useState<number>(CHIP_DENOMINATIONS[2]);
  const [bets, setBets] = useState<BetState>({});
  const [previousRoundBets, setPreviousRoundBets] = useState<BetState>({});
  const [undoStack, setUndoStack] = useState<BetState[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<RouletteOutcome | null>(null);
  const [result, setResult] = useState<RouletteOutcome | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const [history, setHistory] = useState<RouletteOutcome[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [devMode, setDevMode] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);

  const totalBet = useMemo(() => totalBetAmount(bets), [bets]);

  const pushToast = useCallback((text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }, []);

  // ---- Init session on mount ----
  useEffect(() => {
    if (!token) {
      navigate('/login?next=/slots/american-roulette', { replace: true });
      return;
    }
    const controller = new AbortController();
    initAmericanRoulette(token, controller.signal)
      .then((res) => {
        setSessionId(res.session_id);
        setGameId(res.game_id);
        setBalance(res.balance.amount);
        setHistory(res.recent_numbers.map(toFrontendOutcome));
        setLoading(false);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) {
          navigate('/login?next=/slots/american-roulette', { replace: true });
          return;
        }
        pushToast(e instanceof Error ? e.message : 'Failed to init');
        setLoading(false);
      });
    return () => controller.abort();
  }, [token, navigate, pushToast]);

  const pushUndo = useCallback((snapshot: BetState) => {
    setUndoStack((prev) => [...prev, copyBets(snapshot)]);
  }, []);

  const placeBet = useCallback(
    (id: string) => {
      if (spinning) {
        pushToast('Bets are locked during spin');
        return;
      }

      if (!canAffordBet(balance, bets, selectedChip)) {
        pushToast('Not enough balance');
        return;
      }

      pushUndo(bets);
      setBets((prev) => ({
        ...prev,
        [id]: (prev[id] ?? 0) + selectedChip,
      }));
    },
    [spinning, pushToast, balance, bets, selectedChip, pushUndo]
  );

  const clearBets = useCallback(() => {
    if (spinning) {
      pushToast('Bets are locked during spin');
      return;
    }
    if (Object.keys(bets).length === 0) return;
    pushUndo(bets);
    setBets({});
  }, [spinning, pushToast, bets, pushUndo]);

  const undoBet = useCallback(() => {
    if (spinning) {
      pushToast('Bets are locked during spin');
      return;
    }
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const restored = next.pop() ?? {};
      setBets(restored);
      return next;
    });
  }, [spinning, pushToast]);

  const rebet = useCallback(() => {
    if (spinning) {
      pushToast('Bets are locked during spin');
      return;
    }
    const needed = totalBetAmount(previousRoundBets);
    if (needed <= 0) return;
    if (needed > balance) {
      pushToast('Not enough balance');
      return;
    }
    pushUndo(bets);
    setBets(copyBets(previousRoundBets));
    pushToast('Rebet applied');
  }, [spinning, previousRoundBets, balance, pushUndo, bets, pushToast]);

  const doubleBets = useCallback(() => {
    if (spinning) {
      pushToast('Bets are locked during spin');
      return;
    }
    if (totalBet <= 0) return;
    if (totalBet * 2 > balance) {
      pushToast('Not enough balance');
      return;
    }
    pushUndo(bets);
    setBets((prev) => {
      const next: BetState = {};
      for (const [id, amount] of Object.entries(prev)) {
        next[id] = amount * 2;
      }
      return next;
    });
  }, [spinning, totalBet, balance, pushUndo, bets, pushToast]);

  // Store the server response so completeSpin can read it
  const pendingServerResult = useRef<{
    balance: number;
    totalReturn: number;
    outcome: RouletteOutcome;
  } | null>(null);

  const completeSpin = useCallback(() => {
    if (pendingOutcome == null) return;
    const server = pendingServerResult.current;

    if (server) {
      setBalance(server.balance);
      setLastWin(server.totalReturn);
      pendingServerResult.current = null;
    } else {
      setLastWin(0);
    }

    setResult(pendingOutcome);
    setHistory((prev) => [pendingOutcome, ...prev].slice(0, 12));
    setPendingOutcome(null);
    setSpinning(false);

    if (server && server.totalReturn > 0) {
      pushToast(`Win: +${server.totalReturn}`);
    }
  }, [pendingOutcome, pushToast]);

  const {
    rotation: wheelRotation,
    ballAngle,
    ballRadius,
    ballVisible,
  } = useWheelAnimation(pendingOutcome ?? result, spinning, completeSpin);

  const spin = useCallback(async () => {
    if (spinning) return;
    if (totalBet <= 0) return;
    if (totalBet > balance) {
      pushToast('Not enough balance');
      return;
    }
    if (!token || !sessionId) {
      pushToast('Session not ready');
      return;
    }

    const currentBets = copyBets(bets);
    const apiBets = convertBetsToApi(currentBets);
    if (apiBets.length === 0) return;

    setSpinning(true);
    setResult(null);
    setUndoStack([]);
    setPreviousRoundBets(currentBets);
    setBets({});

    try {
      const res = await spinAmericanRoulette(
        token,
        sessionId,
        gameId,
        apiBets,
        `ar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      );

      const outcome = toFrontendOutcome(res.outcome.winning_number);
      pendingServerResult.current = {
        balance: res.balance.amount,
        totalReturn: res.outcome.total_return,
        outcome,
      };
      setPendingOutcome(outcome);
    } catch (e) {
      // Restore bets and balance on error
      setBets(currentBets);
      setSpinning(false);
      if (e instanceof ApiError && e.status === 401) {
        navigate('/login?next=/slots/american-roulette', { replace: true });
        return;
      }
      pushToast(e instanceof Error ? e.message : 'Spin failed');
    }
  }, [spinning, totalBet, balance, pushToast, bets, token, sessionId, gameId, navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT'
      ) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        spin();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        clearBets();
      }

      if (event.key.toLowerCase() === 'd') {
        setDevMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [spin, clearBets]);

  const canSpin = !spinning && totalBet > 0 && !!sessionId;

  if (loading) {
    return (
      <div className="ar-page">
        <div className="ar-backdrop" />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            color: '#d7b46a',
            fontSize: '1.2rem',
          }}
        >
          Loading American Roulette...
        </div>
      </div>
    );
  }

  return (
    <div className="ar-page">
      <div className="ar-backdrop" />

      <header className="ar-hud">
        <div className="ar-hud-item">
          <span>Balance</span>
          <strong>{balance.toLocaleString()}</strong>
        </div>
        <div className="ar-hud-item">
          <span>Total Bet</span>
          <strong>{totalBet.toLocaleString()}</strong>
        </div>
        <div className="ar-hud-item">
          <span>Last Win</span>
          <strong>{lastWin.toLocaleString()}</strong>
        </div>
        <button
          type="button"
          className="ar-settings"
          aria-label="Toggle dev panel"
          onClick={() => setShowDevPanel((prev) => !prev)}
        >
          &#x2699;
        </button>
      </header>

      <main className="ar-main">
        <section className="ar-wheel-panel">
          <RouletteWheelSVG
            rotation={wheelRotation}
            winner={pendingOutcome ?? result}
            showHighlight={!spinning}
            ballAngle={ballAngle}
            ballRadius={ballRadius}
            ballVisible={ballVisible}
            className="ar-wheel"
          />
          <div className="ar-result">
            RESULT <span>{formatOutcome(result ?? pendingOutcome)}</span>
          </div>
          {devMode && pendingOutcome != null && spinning && (
            <div className="ar-dev-outcome">DEV OUTCOME: {String(pendingOutcome)}</div>
          )}
          <button type="button" className="ar-lobby-btn" onClick={() => navigate('/slots')}>
            Back to Lobby
          </button>
        </section>

        <section className="ar-table-panel">
          <div className="ar-table" aria-label="American roulette betting table">
            <button
              type="button"
              className="ar-cell ar-zero"
              onClick={() => placeBet('straight-0')}
              disabled={spinning}
            >
              0
              <BetBadge amount={bets['straight-0']} />
            </button>
            <button
              type="button"
              className="ar-cell ar-zero"
              onClick={() => placeBet('straight-00')}
              disabled={spinning}
            >
              00
              <BetBadge amount={bets['straight-00']} />
            </button>

            {TABLE_ROWS.flatMap((row, rowIndex) =>
              row.map((num, colIndex) => {
                const color = getOutcomeColor(num);
                return (
                  <button
                    type="button"
                    key={num}
                    className={`ar-cell ar-number ar-${color}`}
                    style={{ gridColumn: `${colIndex + 3}`, gridRow: `${rowIndex + 1}` }}
                    onClick={() => placeBet(`straight-${num}`)}
                    disabled={spinning}
                  >
                    {num}
                    <BetBadge amount={bets[`straight-${num}`]} />
                  </button>
                );
              })
            )}

            <button
              type="button"
              className="ar-cell ar-col"
              style={{ gridColumn: '15', gridRow: '1' }}
              onClick={() => placeBet('column3')}
              disabled={spinning}
            >
              3rd Col
              <BetBadge amount={bets.column3} />
            </button>
            <button
              type="button"
              className="ar-cell ar-col"
              style={{ gridColumn: '15', gridRow: '2' }}
              onClick={() => placeBet('column2')}
              disabled={spinning}
            >
              2nd Col
              <BetBadge amount={bets.column2} />
            </button>
            <button
              type="button"
              className="ar-cell ar-col"
              style={{ gridColumn: '15', gridRow: '3' }}
              onClick={() => placeBet('column1')}
              disabled={spinning}
            >
              1st Col
              <BetBadge amount={bets.column1} />
            </button>

            <button
              type="button"
              className="ar-cell ar-outside"
              style={{ gridColumn: '3 / 7', gridRow: '4' }}
              onClick={() => placeBet('dozen1')}
              disabled={spinning}
            >
              1st 12
              <BetBadge amount={bets.dozen1} />
            </button>
            <button
              type="button"
              className="ar-cell ar-outside"
              style={{ gridColumn: '7 / 11', gridRow: '4' }}
              onClick={() => placeBet('dozen2')}
              disabled={spinning}
            >
              2nd 12
              <BetBadge amount={bets.dozen2} />
            </button>
            <button
              type="button"
              className="ar-cell ar-outside"
              style={{ gridColumn: '11 / 15', gridRow: '4' }}
              onClick={() => placeBet('dozen3')}
              disabled={spinning}
            >
              3rd 12
              <BetBadge amount={bets.dozen3} />
            </button>

            <button
              type="button"
              className="ar-cell ar-outside"
              style={{ gridColumn: '3 / 5', gridRow: '5' }}
              onClick={() => placeBet('low')}
              disabled={spinning}
            >
              1-18
              <BetBadge amount={bets.low} />
            </button>
            <button
              type="button"
              className="ar-cell ar-outside"
              style={{ gridColumn: '5 / 7', gridRow: '5' }}
              onClick={() => placeBet('even')}
              disabled={spinning}
            >
              EVEN
              <BetBadge amount={bets.even} />
            </button>
            <button
              type="button"
              className="ar-cell ar-outside ar-red"
              style={{ gridColumn: '7 / 9', gridRow: '5' }}
              onClick={() => placeBet('red')}
              disabled={spinning}
            >
              RED
              <BetBadge amount={bets.red} />
            </button>
            <button
              type="button"
              className="ar-cell ar-outside ar-black"
              style={{ gridColumn: '9 / 11', gridRow: '5' }}
              onClick={() => placeBet('black')}
              disabled={spinning}
            >
              BLACK
              <BetBadge amount={bets.black} />
            </button>
            <button
              type="button"
              className="ar-cell ar-outside"
              style={{ gridColumn: '11 / 13', gridRow: '5' }}
              onClick={() => placeBet('odd')}
              disabled={spinning}
            >
              ODD
              <BetBadge amount={bets.odd} />
            </button>
            <button
              type="button"
              className="ar-cell ar-outside"
              style={{ gridColumn: '13 / 15', gridRow: '5' }}
              onClick={() => placeBet('high')}
              disabled={spinning}
            >
              19-36
              <BetBadge amount={bets.high} />
            </button>
          </div>

          <div className="ar-history" aria-label="last outcomes">
            {history.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className={`ar-history-item ar-${getOutcomeColor(item)}`}
              >
                {String(item)}
              </span>
            ))}
          </div>
        </section>
      </main>

      <footer className="ar-controls">
        <div className="ar-chips">
          {CHIP_DENOMINATIONS.map((value) => (
            <Chip
              key={value}
              value={value}
              selected={selectedChip === value}
              onClick={() => setSelectedChip(value)}
            />
          ))}
        </div>

        <div className="ar-actions">
          <button type="button" onClick={undoBet} disabled={spinning || undoStack.length === 0}>
            UNDO
          </button>
          <button type="button" onClick={clearBets} disabled={spinning || totalBet <= 0}>
            CLEAR
          </button>
          <button
            type="button"
            onClick={rebet}
            disabled={spinning || totalBetAmount(previousRoundBets) <= 0}
          >
            REBET
          </button>
          <button type="button" onClick={doubleBets} disabled={spinning || totalBet <= 0}>
            DOUBLE
          </button>
          <button type="button" className="ar-spin" onClick={spin} disabled={!canSpin}>
            {spinning ? 'SPINNING...' : 'SPIN'}
          </button>
        </div>
      </footer>

      <section className="ar-dev-wrap">
        <button type="button" className="ar-dev-toggle" onClick={() => setShowDevPanel((p) => !p)}>
          {showDevPanel ? 'Hide Dev' : 'Show Dev'}
        </button>
        {showDevPanel && (
          <div className="ar-dev-panel">
            <div className="ar-dev-line">Dev mode (D): {devMode ? 'ON' : 'OFF'}</div>
            <div className="ar-dev-line">Session: {sessionId ?? 'none'}</div>
          </div>
        )}
      </section>

      <aside className="ar-toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="ar-toast">
            {toast.text}
          </div>
        ))}
      </aside>

      <div className="ar-payout-guide">
        {BASE_BET_SPOTS.map((spot) => (
          <span key={spot.id}>
            {spot.label}: {spot.payout}:1
          </span>
        ))}
        <span>Straight: 35:1</span>
        <span>
          Numbers: {STRAIGHT_SPOTS[0].label}, {STRAIGHT_SPOTS[1].label}, 1-36
        </span>
      </div>
    </div>
  );
}
