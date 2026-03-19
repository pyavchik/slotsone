import { useEffect, useState, useCallback } from 'react';
import type { RewindOffer, RewindOfferTier } from './store';

interface RewindModalProps {
  offer: RewindOffer;
  onAccept: (tier: RewindOfferTier['name']) => void;
  onSkip: () => void;
}

const TIER_INFO: Record<RewindOfferTier['name'], { label: string; desc: string; color: string }> = {
  safe: {
    label: 'Safe Rewind',
    desc: '1.5× bet · +10% wilds',
    color: '#3ee0a9',
  },
  standard: {
    label: 'Standard Rewind',
    desc: '2× bet · +15% wilds',
    color: '#f5d06a',
  },
  super: {
    label: 'Super Rewind',
    desc: '3× bet · +25% wilds',
    color: '#f472b6',
  },
};

export function RewindModal({ offer, onAccept, onSkip }: RewindModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const diff = new Date(offer.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 1000));
  });

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) {
      onSkip();
      return;
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timer);
          onSkip();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onSkip, secondsLeft <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTierClick = useCallback(
    (name: RewindOfferTier['name']) => {
      onAccept(name);
    },
    [onAccept]
  );

  return (
    <div className="rewind-overlay" role="dialog" aria-label="Time Rewind Offer">
      <div className="rewind-modal">
        <div className="rewind-header">
          <h2 className="rewind-title">Time Rewind Available</h2>
          <p className="rewind-desc">
            Your losing streak triggered a Time Rewind! Choose a tier to replay 5 spins with boosted
            wild frequencies, or skip to continue normally.
          </p>
          <div className="rewind-timer">
            <span className="rewind-timer-value">{secondsLeft}s</span>
            <span className="rewind-timer-label">auto-skip</span>
          </div>
        </div>

        <div className="rewind-tiers">
          {offer.tiers.map((tier) => {
            const info = TIER_INFO[tier.name];
            return (
              <button
                key={tier.name}
                type="button"
                className={`rewind-tier-btn${tier.available ? '' : ' rewind-tier-disabled'}`}
                style={{ '--tier-color': info.color } as React.CSSProperties}
                disabled={!tier.available}
                onClick={() => handleTierClick(tier.name)}
                title={tier.available ? undefined : 'Insufficient balance'}
              >
                <span className="rewind-tier-label" style={{ color: info.color }}>
                  {info.label}
                </span>
                <span className="rewind-tier-desc">{info.desc}</span>
                <span className="rewind-tier-cost">Cost: ${tier.total_cost.toFixed(2)}</span>
                {!tier.available && (
                  <span className="rewind-tier-unavail">Insufficient balance</span>
                )}
              </button>
            );
          })}
        </div>

        <button type="button" className="rewind-skip-btn" onClick={onSkip}>
          Skip — Continue Playing
        </button>
      </div>
    </div>
  );
}

export function RewindProgressOverlay({
  spinIndex,
  totalSpins,
}: {
  spinIndex: number;
  totalSpins: number;
}) {
  return (
    <div className="rewind-progress-overlay">
      <div className="rewind-progress-badge">
        <span className="rewind-progress-label">REWIND MODE ACTIVE</span>
        <span className="rewind-progress-counter">
          Spin {spinIndex}/{totalSpins}
        </span>
      </div>
    </div>
  );
}
