import { useGameStore } from './store';

export function BetPanel({ onSpin }: { onSpin: () => void }) {
  const bet = useGameStore((s) => s.bet);
  const setBet = useGameStore((s) => s.setBet);
  const betLevels = useGameStore((s) => s.betLevels);
  const spinning = useGameStore((s) => s.spinning);
  const balance = useGameStore((s) => s.balance);

  const idx = betLevels.indexOf(bet);
  const canDecrease = idx > 0;
  const canIncrease = idx >= 0 && idx < betLevels.length - 1;

  const handleBetDown = () => {
    if (!canDecrease) return;
    setBet(betLevels[idx - 1]!);
  };
  const handleBetUp = () => {
    if (!canIncrease) return;
    setBet(betLevels[idx + 1]!);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '16px 24px',
        background: 'rgba(26, 26, 36, 0.95)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.15)',
        minHeight: 72,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#A1A1AA', fontSize: 14 }}>BET</span>
        <button
          type="button"
          onClick={handleBetDown}
          disabled={!canDecrease || spinning}
          style={btnStyle}
          aria-label="Decrease bet"
        >
          −
        </button>
        <span style={{ color: '#FFF', fontSize: 20, fontWeight: 700, minWidth: 64, textAlign: 'center' }}>
          {bet.toFixed(2)}
        </span>
        <button
          type="button"
          onClick={handleBetUp}
          disabled={!canIncrease || spinning}
          style={btnStyle}
          aria-label="Increase bet"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={onSpin}
        disabled={spinning || balance < bet}
        style={{
          ...btnStyle,
          background: 'linear-gradient(180deg, #F5D06A 0%, #E8B84A 100%)',
          color: '#0D0D12',
          padding: '14px 48px',
          fontSize: 18,
          fontWeight: 700,
          minWidth: 140,
        }}
      >
        {spinning ? 'SPINNING…' : 'SPIN'}
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 18,
  fontWeight: 600,
  color: '#FFF',
  background: '#252532',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  minWidth: 44,
};
