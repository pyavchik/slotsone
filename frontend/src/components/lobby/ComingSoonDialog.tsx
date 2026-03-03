import type { GameItem } from '@/data/catalog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Zap, TrendingUp, Layers } from 'lucide-react';

interface ComingSoonDialogProps {
  game: GameItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const volatilityIcon = (v: string) => {
  switch (v) {
    case 'high':
      return <Zap style={{ width: 14, height: 14, color: '#ff6b6b' }} />;
    case 'medium':
      return <TrendingUp style={{ width: 14, height: 14, color: '#f6be57' }} />;
    default:
      return <Layers style={{ width: 14, height: 14, color: '#3ee0a9' }} />;
  }
};

export function ComingSoonDialog({ game, open, onOpenChange }: ComingSoonDialogProps) {
  if (!game) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: 'rgba(11, 26, 50, 0.95)',
          borderColor: 'rgba(98, 215, 255, 0.12)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 40px rgba(98,215,255,0.05)',
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: '0.08em',
              fontSize: '1.4rem',
            }}
          >
            <Clock style={{ width: 20, height: 20, color: 'rgba(98,215,255,0.5)' }} />
            Coming Soon
          </DialogTitle>
          <DialogDescription style={{ color: '#c2d4f0' }}>
            <strong style={{ color: '#f4f8ff' }}>{game.title}</strong> by {game.provider} is not yet
            available.
          </DialogDescription>
        </DialogHeader>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '1rem',
            background: 'rgba(4, 11, 22, 0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(98, 215, 255, 0.06)',
          }}
        >
          <div className="flex justify-between text-sm" style={{ color: '#c2d4f0' }}>
            <span style={{ opacity: 0.6 }}>Category</span>
            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{game.category}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: '#c2d4f0' }}>
            <span style={{ opacity: 0.6 }}>RTP</span>
            <span
              style={{ fontFamily: "'Rajdhani', monospace", fontWeight: 700, color: '#3ee0a9' }}
            >
              {game.rtp}%
            </span>
          </div>
          <div className="flex justify-between items-center text-sm" style={{ color: '#c2d4f0' }}>
            <span style={{ opacity: 0.6 }}>Volatility</span>
            <span
              className="flex items-center gap-1"
              style={{ textTransform: 'capitalize', fontWeight: 600 }}
            >
              {volatilityIcon(game.volatility)}
              {game.volatility}
            </span>
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#c2d4f0', opacity: 0.5, margin: '0.25rem 0' }}>
          We're working on adding more games. Check back soon!
        </p>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="w-full"
          style={{
            borderColor: 'rgba(98, 215, 255, 0.15)',
            color: '#62d7ff',
            fontFamily: "'Rajdhani', monospace",
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
