import { useState } from 'react';
import type { AutoplayConfig } from './types';
import './autoplayModal.css';

interface Props {
  visible: boolean;
  onClose: () => void;
  onStart: (config: AutoplayConfig) => void;
  balance: number;
}

const ROUND_OPTIONS = [5, 10, 25, 50, 100];

export default function AutoplayModal({ visible, onClose, onStart, balance }: Props) {
  const [rounds, setRounds] = useState(10);
  const [stopOnWin, setStopOnWin] = useState('');
  const [stopOnLoss, setStopOnLoss] = useState('');
  const [stopOnBalance, setStopOnBalance] = useState('');

  if (!visible) return null;

  const handleStart = () => {
    onStart({
      rounds,
      stopOnWin: stopOnWin ? parseFloat(stopOnWin) : null,
      stopOnLoss: stopOnLoss ? parseFloat(stopOnLoss) : null,
      stopOnBalance: stopOnBalance ? parseFloat(stopOnBalance) : null,
    });
  };

  return (
    <div className="am-overlay" onClick={onClose}>
      <div className="am-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="am-title">Autoplay</h2>

        <div className="am-section">
          <span className="am-label">Number of rounds</span>
          <div className="am-rounds">
            {ROUND_OPTIONS.map((n) => (
              <button
                key={n}
                className={`am-round-btn ${rounds === n ? 'am-round-btn--active' : ''}`}
                onClick={() => setRounds(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="am-section">
          <label className="am-label">
            Stop if single win exceeds ($)
            <input
              className="am-input"
              type="number"
              step="1"
              min="0"
              placeholder="No limit"
              value={stopOnWin}
              onChange={(e) => setStopOnWin(e.target.value)}
            />
          </label>
        </div>

        <div className="am-section">
          <label className="am-label">
            Stop if cumulative loss exceeds ($)
            <input
              className="am-input"
              type="number"
              step="1"
              min="0"
              placeholder="No limit"
              value={stopOnLoss}
              onChange={(e) => setStopOnLoss(e.target.value)}
            />
          </label>
        </div>

        <div className="am-section">
          <label className="am-label">
            Stop if balance drops below ($)
            <input
              className="am-input"
              type="number"
              step="1"
              min="0"
              placeholder={`Current: $${balance.toFixed(2)}`}
              value={stopOnBalance}
              onChange={(e) => setStopOnBalance(e.target.value)}
            />
          </label>
        </div>

        <p className="am-note">
          Autoplay uses abbreviated 2s animations with 1.5s pause between rounds. You can stop
          autoplay at any time.
        </p>

        <div className="am-footer">
          <button className="am-btn am-btn--cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="am-btn am-btn--start" onClick={handleStart}>
            Start {rounds} rounds
          </button>
        </div>
      </div>
    </div>
  );
}
