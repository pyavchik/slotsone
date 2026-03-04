import { useEffect, useState } from 'react';
import type { WinTier } from './types';
import './winOverlay.css';

interface WinOverlayProps {
  tier: WinTier;
  amount: number;
  visible: boolean;
  onDismiss: () => void;
}

const TIER_CONFIG = {
  none: { label: '', particles: 0, autoDismissMs: 0, colors: [] as string[] },
  small: {
    label: 'WIN',
    particles: 8,
    autoDismissMs: 1500,
    colors: ['#f6be57', '#ffd700'],
  },
  medium: {
    label: 'GREAT WIN',
    particles: 20,
    autoDismissMs: 2500,
    colors: ['#f6be57', '#ffd700', '#fff', '#22c55e'],
  },
  big: {
    label: 'BIG WIN',
    particles: 35,
    autoDismissMs: 3500,
    colors: ['#f6be57', '#ffd700', '#ff6b35', '#22c55e', '#fff'],
  },
  mega: {
    label: 'MEGA WIN',
    particles: 50,
    autoDismissMs: 0, // click-only
    colors: ['#f6be57', '#ffd700', '#ff6b35', '#22c55e', '#fff', '#e74c3c'],
  },
};

export default function WinOverlay({ tier, amount, visible, onDismiss }: WinOverlayProps) {
  const [particles] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 1.5 + Math.random() * 1.5,
      size: 4 + Math.random() * 8,
    }))
  );

  useEffect(() => {
    if (!visible || tier === 'none') return;
    const config = TIER_CONFIG[tier];
    if (config.autoDismissMs > 0) {
      const timer = setTimeout(onDismiss, config.autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [visible, tier, onDismiss]);

  if (!visible || tier === 'none') return null;

  const config = TIER_CONFIG[tier];
  const activeParticles = particles.slice(0, config.particles);

  return (
    <div className="wo-overlay" onClick={onDismiss}>
      {/* Gold flash for big/mega */}
      {(tier === 'big' || tier === 'mega') && <div className="wo-flash" />}

      {/* Confetti */}
      {activeParticles.map((p) => (
        <div
          key={p.id}
          className="wo-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor:
              config.colors[Math.floor(Math.random() * config.colors.length)] ?? '#ffd700',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <div className="wo-content">
        <div className={`wo-label wo-label--${tier}`}>{config.label}</div>
        <div className={`wo-amount ${tier === 'mega' ? 'wo-amount--mega' : ''}`}>
          ${amount.toFixed(2)}
        </div>
        {tier === 'mega' && <div className="wo-dismiss-hint">Tap to continue</div>}
      </div>
    </div>
  );
}
