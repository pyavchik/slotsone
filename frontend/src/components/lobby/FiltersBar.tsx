import { Search, X, SlidersHorizontal } from 'lucide-react';

interface FiltersBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  provider: string;
  onProviderChange: (v: string) => void;
  volatility: string;
  onVolatilityChange: (v: string) => void;
  sortBy: string;
  onSortByChange: (v: string) => void;
  providers: string[];
}

export function FiltersBar({
  search,
  onSearchChange,
  provider,
  onProviderChange,
  volatility,
  onVolatilityChange,
  sortBy,
  onSortByChange,
  providers,
}: FiltersBarProps) {
  const hasActiveFilters = provider !== '' || volatility !== '' || sortBy !== 'default';
  const hasSearch = search.length > 0;

  const handleClearAll = () => {
    onSearchChange('');
    onProviderChange('');
    onVolatilityChange('');
    onSortByChange('default');
  };

  return (
    <div className="filters-bar" role="search" aria-label="Game filters">
      <div className="filters-search">
        <Search className="filters-search-icon" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search games..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="filters-search-input"
          aria-label="Search games by name or provider"
        />
        {hasSearch && (
          <button
            type="button"
            className="filters-search-clear"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="filters-dropdowns">
        <div className={`filters-select-wrap${provider ? ' filters-select-wrap--active' : ''}`}>
          <SlidersHorizontal className="filters-select-icon" aria-hidden="true" />
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="filters-select"
            aria-label="Filter by provider"
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className={`filters-select-wrap${volatility ? ' filters-select-wrap--active' : ''}`}>
          <select
            value={volatility}
            onChange={(e) => onVolatilityChange(e.target.value)}
            className="filters-select"
            aria-label="Filter by volatility"
          >
            <option value="">Volatility</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div
          className={`filters-select-wrap${sortBy !== 'default' ? ' filters-select-wrap--active' : ''}`}
        >
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="filters-select"
            aria-label="Sort games"
          >
            <option value="default">Sort: Default</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="rtp-desc">RTP High-Low</option>
            <option value="rtp-asc">RTP Low-High</option>
          </select>
        </div>
      </div>

      {(hasActiveFilters || hasSearch) && (
        <button
          type="button"
          className="filters-clear-all"
          onClick={handleClearAll}
          aria-label="Clear all filters"
        >
          <X aria-hidden="true" />
          Clear
        </button>
      )}
    </div>
  );
}
