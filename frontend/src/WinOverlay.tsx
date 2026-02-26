import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useGameStore } from './store';
import './winOverlay.css';

interface Tier {
  key: 'nice' | 'big' | 'mega' | 'ultra';
  label: string;
  minMultiplier: number;
  accent: string;
}

const TIERS: Tier[] = [
  { key: 'ultra', label: 'ULTRA WIN', minMultiplier: 40, accent: '#ff6b6b' },
  { key: 'mega', label: 'MEGA WIN', minMultiplier: 18, accent: '#4ecdc4' },
  { key: 'big', label: 'BIG WIN', minMultiplier: 8, accent: '#f7d154' },
  { key: 'nice', label: 'NICE WIN', minMultiplier: 3, accent: '#57e389' },
];
const WIN_LOOP_VIDEO = '/effects/win-overlay-loop.mp4';
const WIN_LOOP_POSTER = '/effects/win-overlay-loop-thumb.webp';

export function WinOverlay() {
  const lastWinAmount = useGameStore((s) => s.lastWinAmount);
  const bet = useGameStore((s) => s.bet);
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<'entry' | 'hold' | 'exit'>('entry');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const multiplier = bet > 0 ? lastWinAmount / bet : 0;
  const tier = useMemo(
    () => TIERS.find((candidate) => multiplier >= candidate.minMultiplier) ?? null,
    [multiplier]
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!tier || lastWinAmount <= 0) {
      setShow(false);
      return;
    }

    setShow(true);
    setPhase('entry');

    const entryTimer = window.setTimeout(() => setPhase('hold'), 360);
    const exitTimer = window.setTimeout(() => setPhase('exit'), 2350);
    const hideTimer = window.setTimeout(() => setShow(false), 2900);

    return () => {
      window.clearTimeout(entryTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [tier, lastWinAmount]);

  if (!show || !tier) return null;

  return (
    <div
      className={`win-overlay win-overlay-${phase}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{ '--tier-accent': tier.accent } as CSSProperties}
    >
      {!prefersReducedMotion && (
        <div className="win-overlay-media" aria-hidden="true">
          <video
            className="win-overlay-video"
            src={WIN_LOOP_VIDEO}
            poster={WIN_LOOP_POSTER}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        </div>
      )}
      <div className="win-overlay-vignette" aria-hidden="true" />
      <div className={`win-overlay-card win-overlay-${tier.key}`}>
        <div className="win-overlay-beam" aria-hidden="true" />
        <h2 className="win-overlay-title">{tier.label}</h2>
        <p className="win-overlay-amount">{lastWinAmount.toFixed(2)}</p>
        <p className="win-overlay-multiplier">{multiplier.toFixed(1)}x bet</p>
      </div>
    </div>
  );
}
