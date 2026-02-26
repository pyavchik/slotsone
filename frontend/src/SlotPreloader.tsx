import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import './slotPreloader.css';

const LOADING_STEPS = [
  'Syncing RTP tables',
  'Warming reel engines',
  'Loading symbol atlas',
  'Calibrating paylines',
  'Preparing bonus effects',
] as const;

const PRELOADER_SYMBOLS = ['10', 'J', 'Q', 'K', 'A', '★', 'SC', 'WILD'] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function SlotPreloader() {
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setProgress((prev) => clamp(prev + (prev < 70 ? 7 : prev < 90 ? 3 : 1), 10, 96));
    }, 240);

    return () => window.clearInterval(timerId);
  }, []);

  const stepIndex = Math.min(
    LOADING_STEPS.length - 1,
    Math.floor((progress / 100) * LOADING_STEPS.length)
  );
  const currentStep = useMemo(() => LOADING_STEPS[stepIndex]!, [stepIndex]);

  return (
    <div className="slot-preloader" role="status" aria-live="polite" aria-atomic="true">
      <div className="slot-preloader-aura" aria-hidden="true" />

      <div className="slot-preloader-machine">
        <div className="slot-preloader-header">
          <span className="slot-preloader-kicker">Launching Slot Floor</span>
          <strong className="slot-preloader-step">{currentStep}</strong>
        </div>

        <div className="slot-preloader-reels" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, reelIndex) => (
            <div key={reelIndex} className="slot-preloader-reel">
              <div
                className="slot-preloader-strip"
                style={
                  {
                    '--reel-duration': `${1.2 + reelIndex * 0.22}s`,
                    '--reel-delay': `${reelIndex * 0.09}s`,
                  } as CSSProperties
                }
              >
                {[...PRELOADER_SYMBOLS, ...PRELOADER_SYMBOLS].map((symbol, index) => (
                  <span key={`${reelIndex}-${symbol}-${index}`} className="slot-preloader-symbol">
                    {symbol}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="slot-preloader-progress">
          <div className="slot-preloader-progress-rail">
            <div className="slot-preloader-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="slot-preloader-progress-value">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
