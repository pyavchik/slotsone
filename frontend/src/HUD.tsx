import { useGameStore } from './store';

export function HUD() {
  const balance = useGameStore((s) => s.balance);
  const bet = useGameStore((s) => s.bet);
  const currency = useGameStore((s) => s.currency);
  const lastWinAmount = useGameStore((s) => s.lastWinAmount);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: 'linear-gradient(180deg, rgba(13,13,18,0.9) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ color: '#A1A1AA', fontSize: 12 }}>BALANCE</span>
        <span style={{ color: '#FFF', fontSize: 24, fontWeight: 700 }}>
          {balance.toFixed(2)} {currency}
        </span>
      </div>
      {lastWinAmount > 0 && (
        <div
          style={{
            padding: '8px 20px',
            background: 'rgba(74, 222, 128, 0.2)',
            borderRadius: 8,
            color: '#4ADE80',
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          +{lastWinAmount.toFixed(2)}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <span style={{ color: '#A1A1AA', fontSize: 12 }}>BET</span>
        <span style={{ color: '#FFF', fontSize: 24, fontWeight: 700 }}>
          {bet.toFixed(2)} {currency}
        </span>
      </div>
    </div>
  );
}
