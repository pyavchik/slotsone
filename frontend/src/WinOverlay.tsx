import { useEffect, useState } from 'react';
import { useGameStore } from './store';

const BIG_WIN_THRESHOLD = 10;   // x bet
const MEGA_WIN_THRESHOLD = 25;
const ULTRA_WIN_THRESHOLD = 100;

export function WinOverlay() {
  const lastWinAmount = useGameStore((s) => s.lastWinAmount);
  const bet = useGameStore((s) => s.bet);
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<'entry' | 'hold' | 'exit'>('entry');

  const mult = bet > 0 ? lastWinAmount / bet : 0;
  const tier =
    mult >= ULTRA_WIN_THRESHOLD ? 'ULTRA WIN' : mult >= MEGA_WIN_THRESHOLD ? 'MEGA WIN' : mult >= BIG_WIN_THRESHOLD ? 'BIG WIN' : null;

  useEffect(() => {
    if (!tier || lastWinAmount <= 0) {
      setShow(false);
      return;
    }
    setShow(true);
    setPhase('entry');
    const t1 = setTimeout(() => setPhase('hold'), 400);
    const t2 = setTimeout(() => setPhase('exit'), 2500);
    const t3 = setTimeout(() => setShow(false), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [tier, lastWinAmount]);

  if (!show || !tier) return null;

  const opacity = phase === 'exit' ? 0 : 1;
  const scale = phase === 'entry' ? 1.2 : phase === 'hold' ? 1 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `rgba(0,0,0,${phase === 'exit' ? 0 : 0.6})`,
        transition: 'opacity 0.3s, background 0.3s',
        opacity,
        zIndex: 100,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.2s ease-out',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#E8B84A',
            textShadow: '0 0 24px rgba(232,184,74,0.8)',
          }}
        >
          {tier}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#FFF', marginTop: 8 }}>
          {lastWinAmount.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
