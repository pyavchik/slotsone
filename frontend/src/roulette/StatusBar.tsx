import type { RouletteOutcome } from '@/api';
import './statusBar.css';

interface StatusBarProps {
  balance: number;
  currentTotal: number;
  lastResult: RouletteOutcome | null;
  muted: boolean;
  onMuteToggle: () => void;
  onStatsToggle: () => void;
  onLobby: () => void;
}

export default function StatusBar({
  balance,
  currentTotal,
  lastResult,
  muted,
  onMuteToggle,
  onStatsToggle,
  onLobby,
}: StatusBarProps) {
  return (
    <header className="sb-bar">
      {/* Lobby button */}
      <button
        className="sb-icon-btn sb-icon-btn--lobby"
        onClick={onLobby}
        aria-label="Back to lobby"
        title="Lobby"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      {/* Balance pill */}
      <div className="sb-pill sb-pill--balance">
        <span className="sb-pill-chevron">&lsaquo;</span>${balance.toFixed(2)}
      </div>

      {/* Win badge or placeholder */}
      {lastResult && lastResult.win.amount > 0 ? (
        <div className="sb-pill sb-pill--win">
          <span className="sb-win-badge">win</span>${lastResult.win.amount.toFixed(2)}
        </div>
      ) : (
        <div className="sb-pill--win-placeholder" />
      )}

      {/* Mute button */}
      <button
        className="sb-icon-btn sb-icon-btn--small"
        onClick={onMuteToggle}
        aria-label={muted ? 'Unmute' : 'Mute'}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M19.07 4.93a10 10 0 010 14.14" />
            <path d="M15.54 8.46a5 5 0 010 7.07" />
          </svg>
        )}
      </button>

      {/* Bet pill */}
      <div className="sb-pill sb-pill--bet">
        ${currentTotal > 0 ? currentTotal.toFixed(2) : '0.00'}
        <span className="sb-pill-chevron">&rsaquo;</span>
      </div>

      {/* Stats button */}
      <button
        className="sb-icon-btn sb-icon-btn--small"
        onClick={onStatsToggle}
        aria-label="Toggle stats"
        title="Statistics"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="12" width="4" height="9" rx="1" />
          <rect x="10" y="5" width="4" height="16" rx="1" />
          <rect x="17" y="9" width="4" height="12" rx="1" />
        </svg>
      </button>
    </header>
  );
}
