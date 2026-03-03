import { type ReactNode } from 'react';
import { Dices, CircleDot, Spade, Gem } from 'lucide-react';
import type { GameCategory } from '@/data/catalog';

interface Tab {
  value: GameCategory;
  label: string;
  icon: ReactNode;
  count: number;
}

interface LobbyNavProps {
  activeTab: GameCategory;
  onTabChange: (tab: GameCategory) => void;
  counts: Record<GameCategory, number>;
}

const TABS: Omit<Tab, 'count'>[] = [
  { value: 'slots', label: 'Slots', icon: <Dices aria-hidden /> },
  { value: 'roulette', label: 'Roulette', icon: <CircleDot aria-hidden /> },
  { value: 'blackjack', label: 'Blackjack', icon: <Spade aria-hidden /> },
  { value: 'baccarat', label: 'Baccarat', icon: <Gem aria-hidden /> },
];

export function LobbyNav({ activeTab, onTabChange, counts }: LobbyNavProps) {
  return (
    <nav className="lobby-nav" role="tablist" aria-label="Game categories">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`lobby-nav-tab${isActive ? ' lobby-nav-tab--active' : ''}`}
            onClick={() => onTabChange(tab.value)}
          >
            <span className="lobby-nav-icon">{tab.icon}</span>
            <span className="lobby-nav-label">{tab.label}</span>
            <span className="lobby-nav-count">{counts[tab.value]}</span>
          </button>
        );
      })}
    </nav>
  );
}
