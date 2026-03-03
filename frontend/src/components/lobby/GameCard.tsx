import { useNavigate } from 'react-router-dom';
import type { GameItem } from '@/data/catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useThumbnail } from '@/hooks/useThumbnail';

interface GameCardProps {
  game: GameItem;
  index: number;
  onComingSoon: (game: GameItem) => void;
}

function badgeVariant(badge: GameItem['badge']) {
  switch (badge) {
    case 'TOP':
      return 'default' as const;
    case 'HOT':
      return 'destructive' as const;
    case 'NEW':
      return 'secondary' as const;
    case 'SOON':
      return 'outline' as const;
    default:
      return 'secondary' as const;
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  slots: '\u{1F3B0}',
  roulette: '\u{1F3A1}',
  blackjack: '\u{1F0CF}',
  baccarat: '\u{1F3B4}',
};

export function GameCard({ game, index, onComingSoon }: GameCardProps) {
  const navigate = useNavigate();
  const { url: thumbnailUrl, loading: thumbLoading } = useThumbnail(game);

  const handleClick = () => {
    if (game.status === 'available') {
      navigate(`/slots/${game.slug}`);
    } else {
      onComingSoon(game);
    }
  };

  const displayBadge = game.status === 'soon' && !game.badge ? 'SOON' : game.badge;

  return (
    <div
      className="game-card"
      data-available={game.status === 'available'}
      style={{ '--card-index': index } as React.CSSProperties}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
    >
      <div className="game-card-thumb">
        {thumbLoading ? (
          <div className="game-card-skeleton" />
        ) : thumbnailUrl ? (
          <img src={thumbnailUrl} alt={game.title} className="game-card-img" loading="lazy" />
        ) : (
          <div className="game-card-fallback">
            <span className="game-card-fallback-icon">
              {CATEGORY_ICONS[game.category] ?? '\u{1F3B0}'}
            </span>
          </div>
        )}
        {displayBadge && (
          <Badge variant={badgeVariant(displayBadge)} className="game-card-badge">
            {displayBadge}
          </Badge>
        )}
        <div className="game-card-overlay">
          <Button
            size="sm"
            variant={game.status === 'available' ? 'default' : 'secondary'}
            className="game-card-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            {game.status === 'available' ? 'Play Now' : 'Coming Soon'}
          </Button>
        </div>
      </div>
      <div className="game-card-info">
        <h3 className="game-card-title">{game.title}</h3>
        <div className="game-card-meta">
          <span className="game-card-provider">{game.provider}</span>
          <span className="game-card-rtp">RTP {game.rtp}%</span>
        </div>
      </div>
    </div>
  );
}
