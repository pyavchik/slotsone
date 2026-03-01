import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from './store';
import { fetchHistory, ApiError } from './api';
import type { HistoryResponse, HistoryFilters, HistoryItem } from './api';
import './gameHistory.css';

interface Props {
  onBack: () => void;
  onViewRound: (roundId: string) => void;
}

const PAGE_SIZE = 20;

export function GameHistory({ onBack, onViewRound }: Props) {
  const token = useGameStore((s) => s.token);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [minBet, setMinBet] = useState('');
  const [maxBet, setMaxBet] = useState('');

  // Applied filters (only sent on "Apply")
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>({});

  const load = useCallback(
    async (pageNum: number, filters: HistoryFilters) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchHistory(token, {
          ...filters,
          limit: PAGE_SIZE,
          offset: pageNum * PAGE_SIZE,
        });
        setData(result);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          onBack();
          return;
        }
        setError(e instanceof Error ? e.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    },
    [token, onBack]
  );

  useEffect(() => {
    load(page, appliedFilters);
  }, [load, page, appliedFilters]);

  const handleApplyFilters = () => {
    const filters: HistoryFilters = {};
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    if (resultFilter !== 'all') filters.result = resultFilter;
    if (minBet) filters.min_bet = parseFloat(minBet);
    if (maxBet) filters.max_bet = parseFloat(maxBet);
    setAppliedFilters(filters);
    setPage(0);
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setResultFilter('all');
    setMinBet('');
    setMaxBet('');
    setAppliedFilters({});
    setPage(0);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="gh-page">
      <div className="gh-header">
        <button className="gh-back-btn" onClick={onBack} type="button">
          Back
        </button>
        <h1 className="gh-title">Game History</h1>
      </div>

      {/* Summary cards */}
      {data?.summary && (
        <div className="gh-summary">
          <div className="gh-summary-card">
            <div className="gh-summary-label">Total Rounds</div>
            <div className="gh-summary-value">{data.summary.total_rounds}</div>
          </div>
          <div className="gh-summary-card">
            <div className="gh-summary-label">Total Wagered</div>
            <div className="gh-summary-value">{formatMoney(data.summary.total_wagered)}</div>
          </div>
          <div className="gh-summary-card">
            <div className="gh-summary-label">Total Won</div>
            <div className="gh-summary-value">{formatMoney(data.summary.total_won)}</div>
          </div>
          <div className="gh-summary-card">
            <div className="gh-summary-label">Net Result</div>
            <div
              className={`gh-summary-value ${data.summary.net_result >= 0 ? 'gh-summary-value--positive' : 'gh-summary-value--negative'}`}
            >
              {data.summary.net_result >= 0 ? '+' : ''}
              {formatMoney(data.summary.net_result)}
            </div>
          </div>
          <div className="gh-summary-card">
            <div className="gh-summary-label">Biggest Win</div>
            <div className="gh-summary-value gh-summary-value--positive">
              {formatMoney(data.summary.biggest_win)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <button className="gh-filters-toggle" onClick={() => setFiltersOpen((v) => !v)} type="button">
        {filtersOpen ? 'Hide Filters' : 'Show Filters'}
      </button>

      {filtersOpen && (
        <div className="gh-filters">
          <div className="gh-filter-group">
            <label className="gh-filter-label">Date From</label>
            <input
              className="gh-filter-input"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="gh-filter-group">
            <label className="gh-filter-label">Date To</label>
            <input
              className="gh-filter-input"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="gh-filter-group">
            <label className="gh-filter-label">Result</label>
            <select
              className="gh-filter-select"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value as 'all' | 'win' | 'loss')}
            >
              <option value="all">All</option>
              <option value="win">Wins</option>
              <option value="loss">Losses</option>
            </select>
          </div>
          <div className="gh-filter-group">
            <label className="gh-filter-label">Min Bet ($)</label>
            <input
              className="gh-filter-input"
              type="number"
              step="0.01"
              min="0"
              value={minBet}
              onChange={(e) => setMinBet(e.target.value)}
            />
          </div>
          <div className="gh-filter-group">
            <label className="gh-filter-label">Max Bet ($)</label>
            <input
              className="gh-filter-input"
              type="number"
              step="0.01"
              min="0"
              value={maxBet}
              onChange={(e) => setMaxBet(e.target.value)}
            />
          </div>
          <div className="gh-filter-actions">
            <button className="gh-filter-apply" onClick={handleApplyFilters} type="button">
              Apply
            </button>
            <button className="gh-filter-clear" onClick={handleClearFilters} type="button">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading && <div className="gh-loading">Loading history...</div>}

      {error && <div className="gh-error">{error}</div>}

      {!loading && !error && data && data.items.length === 0 && (
        <div className="gh-empty">
          <div className="gh-empty-icon">&#127920;</div>
          <div className="gh-empty-text">No spins yet</div>
          <div className="gh-empty-hint">Play some spins to see your history here.</div>
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="gh-table-wrap">
            <table className="gh-table">
              <thead>
                <tr>
                  <th>Date / Time</th>
                  <th>Bet</th>
                  <th>Win</th>
                  <th>Net</th>
                  <th>Lines</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: HistoryItem) => {
                  const net = item.outcome.win.amount - item.bet.amount;
                  const isWin = item.outcome.win.amount > 0;
                  return (
                    <tr key={item.spin_id}>
                      <td>{formatDate(item.timestamp)}</td>
                      <td>{formatMoney(item.bet.amount)}</td>
                      <td className={isWin ? 'gh-win-cell' : 'gh-loss-cell'}>
                        {formatMoney(item.outcome.win.amount)}
                        {item.outcome.bonus_triggered ? (
                          <span className="gh-bonus-badge">BONUS</span>
                        ) : null}
                      </td>
                      <td className={net >= 0 ? 'gh-net-positive' : 'gh-net-negative'}>
                        {net >= 0 ? '+' : ''}
                        {formatMoney(net)}
                      </td>
                      <td>{item.bet.lines}</td>
                      <td>
                        <button
                          className="gh-detail-link"
                          onClick={() => onViewRound(item.spin_id)}
                          type="button"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="gh-pagination">
            <button
              className="gh-page-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              type="button"
            >
              Prev
            </button>
            <span className="gh-page-info">
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="gh-page-btn"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
