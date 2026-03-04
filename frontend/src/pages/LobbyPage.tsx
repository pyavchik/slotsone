import { useState, useEffect, useMemo } from 'react';
import { LobbyHeader } from '@/components/lobby/LobbyHeader';
import { LobbyNav } from '@/components/lobby/LobbyNav';
import { FiltersBar } from '@/components/lobby/FiltersBar';
import { GameGrid } from '@/components/lobby/GameGrid';
import { LobbyFooter } from '@/components/lobby/LobbyFooter';
import { ComingSoonDialog } from '@/components/lobby/ComingSoonDialog';
import { CATEGORIES, getGamesByCategory, getAllGames, fetchInactiveGames } from '@/data/catalog';
import type { GameItem, GameCategory } from '@/data/catalog';
import './lobbyPage.css';

export default function LobbyPage() {
  const [activeTab, setActiveTab] = useState<GameCategory>('slots');
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [volatilityFilter, setVolatilityFilter] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [comingSoonGame, setComingSoonGame] = useState<GameItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inactiveSlugs, setInactiveSlugs] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetchInactiveGames().then(setInactiveSlugs);
  }, []);

  const isActive = (g: GameItem) => !inactiveSlugs || !inactiveSlugs.has(g.slug);

  const allGames = useMemo(() => getAllGames().filter(isActive), [inactiveSlugs]);

  const providers = useMemo(() => {
    const set = new Set(allGames.map((g) => g.provider));
    return [...set].sort();
  }, [allGames]);

  const categoryCounts = useMemo(() => {
    const counts = {} as Record<GameCategory, number>;
    for (const cat of CATEGORIES) {
      counts[cat.value] = getGamesByCategory(cat.value).filter(isActive).length;
    }
    return counts;
  }, [inactiveSlugs]);

  const getFilteredGames = (category: GameCategory) => {
    let games = getGamesByCategory(category).filter(isActive);

    if (search) {
      const q = search.toLowerCase();
      games = games.filter(
        (g) => g.title.toLowerCase().includes(q) || g.provider.toLowerCase().includes(q)
      );
    }

    if (providerFilter) {
      games = games.filter((g) => g.provider === providerFilter);
    }

    if (volatilityFilter) {
      games = games.filter((g) => g.volatility === volatilityFilter);
    }

    if (sortBy === 'name-asc') {
      games = [...games].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'name-desc') {
      games = [...games].sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortBy === 'rtp-desc') {
      games = [...games].sort((a, b) => b.rtp - a.rtp);
    } else if (sortBy === 'rtp-asc') {
      games = [...games].sort((a, b) => a.rtp - b.rtp);
    }

    return games;
  };

  const handleComingSoon = (game: GameItem) => {
    setComingSoonGame(game);
    setDialogOpen(true);
  };

  return (
    <div className="lobby-page">
      <LobbyHeader />

      <main className="lobby-main">
        <LobbyNav activeTab={activeTab} onTabChange={setActiveTab} counts={categoryCounts} />

        <FiltersBar
          search={search}
          onSearchChange={setSearch}
          provider={providerFilter}
          onProviderChange={setProviderFilter}
          volatility={volatilityFilter}
          onVolatilityChange={setVolatilityFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          providers={providers}
        />

        <div role="tabpanel" aria-label={activeTab}>
          <GameGrid games={getFilteredGames(activeTab)} onComingSoon={handleComingSoon} />
        </div>
      </main>

      <LobbyFooter />

      <ComingSoonDialog game={comingSoonGame} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
