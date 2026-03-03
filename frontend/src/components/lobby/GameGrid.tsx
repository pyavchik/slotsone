import type { GameItem } from '@/data/catalog';
import { GameCard } from './GameCard';

interface GameGridProps {
  games: GameItem[];
  onComingSoon: (game: GameItem) => void;
}

export function GameGrid({ games, onComingSoon }: GameGridProps) {
  if (games.length === 0) {
    return (
      <div className="game-grid-empty">
        <p>No games match your filters.</p>
      </div>
    );
  }

  return (
    <div className="game-grid">
      {games.map((game, i) => (
        <GameCard key={game.slug} game={game} index={i} onComingSoon={onComingSoon} />
      ))}
    </div>
  );
}
