import { useRouletteStore } from '@/stores/rouletteStore';
import { RED_NUMBERS } from './constants';
import './recentNumbers.css';

function getBadge(n: number): string {
  if (n === 0) return '/assets/roulette/pro/number-badge-green-48.png';
  if (RED_NUMBERS.has(n)) return '/assets/roulette/pro/number-badge-red-48.png';
  return '/assets/roulette/pro/number-badge-black-48.png';
}

export default function RecentNumbers() {
  const recentNumbers = useRouletteStore((s) => s.recentNumbers);

  if (recentNumbers.length === 0) return null;

  return (
    <div className="rn-container">
      <span className="rn-label">Recent:</span>
      <div className="rn-strip">
        {recentNumbers.map((n, i) => (
          <div key={`${n}-${i}`} className="rn-circle">
            <img src={getBadge(n)} alt="" aria-hidden="true" />
            <span>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
