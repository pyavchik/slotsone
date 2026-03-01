import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from './store';
import { fetchRoundDetail, ApiError } from './api';
import type { RoundDetailResponse } from './api';
import { symbolLabel, symbolColorCss } from './symbols';
import './roundDetail.css';

interface Props {
  roundId: string;
  onBack: () => void;
}

interface WinBreakdownItem {
  type: string;
  line_index: number;
  symbol: string;
  count: number;
  payout: number;
}

export function RoundDetail({ roundId, onBack }: Props) {
  const token = useGameStore((s) => s.token);
  const [data, setData] = useState<RoundDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pfOpen, setPfOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<'pass' | 'fail' | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchRoundDetail(token, roundId)
      .then((result) => setData(result))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          onBack();
          return;
        }
        setError(e instanceof Error ? e.message : 'Failed to load round');
      })
      .finally(() => setLoading(false));
  }, [token, roundId, onBack]);

  const handleVerify = useCallback(async () => {
    if (!data?.provably_fair?.server_seed) return;
    try {
      const encoder = new TextEncoder();
      const seedData = encoder.encode(data.provably_fair.server_seed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', seedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      setVerifyResult(hashHex === data.provably_fair.server_seed_hash ? 'pass' : 'fail');
    } catch {
      setVerifyResult('fail');
    }
  }, [data]);

  const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;

  if (loading)
    return (
      <div className="rd-page">
        <div className="rd-loading">Loading round details...</div>
      </div>
    );
  if (error)
    return (
      <div className="rd-page">
        <div className="rd-error">{error}</div>
      </div>
    );
  if (!data) return null;

  const { round, provably_fair, transactions } = data;
  const net = round.win - round.bet;
  const breakdown = (round.win_breakdown ?? []) as WinBreakdownItem[];

  // Build a set of winning cell positions for highlighting
  const winningCells = new Set<string>();
  // Not all line definitions are available here, so just highlight entire rows that had wins
  // We mark cells based on breakdown line info if we can
  // For simplicity, highlight winning symbol positions from breakdown

  // Transpose reel_matrix: API gives [reel][row], display needs [row][reel]
  const reelMatrix = round.reel_matrix;
  const rows = reelMatrix[0]?.length ?? 3;
  const cols = reelMatrix.length;

  return (
    <div className="rd-page">
      <div className="rd-header">
        <button className="rd-back-btn" onClick={onBack} type="button">
          Back
        </button>
        <h1 className="rd-title">Round Detail</h1>
        <span className="rd-timestamp">
          {new Date(round.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Reel Grid */}
      <div className="rd-section">
        <h2 className="rd-section-title">Reel Result</h2>
        <div className="rd-reel-grid">
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: cols }, (_, col) => {
              const sym = reelMatrix[col]?.[row] ?? '?';
              const isWin = winningCells.has(`${col},${row}`);
              return (
                <div
                  key={`${col}-${row}`}
                  className={`rd-reel-cell${isWin ? ' rd-reel-cell--win' : ''}`}
                  style={{ color: symbolColorCss(sym) }}
                >
                  {symbolLabel(sym)}
                </div>
              );
            })
          )}
        </div>

        {breakdown.length > 0 && (
          <div className="rd-breakdown">
            {breakdown.map((item, i) => (
              <div className="rd-breakdown-item" key={i}>
                <span className="rd-breakdown-line">Line {item.line_index + 1}</span>
                <span
                  className="rd-breakdown-symbol"
                  style={{ color: symbolColorCss(item.symbol) }}
                >
                  {symbolLabel(item.symbol)} x{item.count}
                </span>
                <span className="rd-breakdown-payout">{formatMoney(item.payout)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="rd-section">
        <h2 className="rd-section-title">Financial Summary</h2>
        <div className="rd-finance-grid">
          <div className="rd-finance-item">
            <span className="rd-finance-label">Balance Before</span>
            <span className="rd-finance-value">{formatMoney(round.balance_before)}</span>
          </div>
          <div className="rd-finance-item">
            <span className="rd-finance-label">Bet</span>
            <span className="rd-finance-value">{formatMoney(round.bet)}</span>
          </div>
          <div className="rd-finance-item">
            <span className="rd-finance-label">Win</span>
            <span className={`rd-finance-value${round.win > 0 ? ' rd-finance-value--win' : ''}`}>
              {formatMoney(round.win)}
            </span>
          </div>
          <div className="rd-finance-item">
            <span className="rd-finance-label">Net</span>
            <span
              className={`rd-finance-value${net >= 0 ? ' rd-finance-value--win' : ' rd-finance-value--loss'}`}
            >
              {net >= 0 ? '+' : ''}
              {formatMoney(net)}
            </span>
          </div>
          <div className="rd-finance-item">
            <span className="rd-finance-label">Balance After</span>
            <span className="rd-finance-value">{formatMoney(round.balance_after)}</span>
          </div>
          <div className="rd-finance-item">
            <span className="rd-finance-label">Lines</span>
            <span className="rd-finance-value">{round.lines}</span>
          </div>
        </div>

        {transactions.length > 0 && (
          <div className="rd-txn-list">
            <h3 className="rd-section-title" style={{ marginTop: '1rem' }}>
              Transaction Log
            </h3>
            {transactions.map((txn) => (
              <div className="rd-txn-item" key={txn.id}>
                <span className={`rd-txn-type rd-txn-type--${txn.type}`}>{txn.type}</span>
                <span className="rd-txn-amount">{formatMoney(txn.amount)}</span>
                <span className="rd-txn-balance">Balance: {formatMoney(txn.balance_after)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Provably Fair */}
      {provably_fair && (
        <div className="rd-section">
          <button className="rd-pf-toggle" onClick={() => setPfOpen((v) => !v)} type="button">
            {pfOpen ? 'Hide' : 'Show'} Provably Fair Data
          </button>

          {pfOpen && (
            <>
              <div className="rd-pf-row">
                <span className="rd-pf-label">Server Seed Hash</span>
                <span className="rd-pf-value">{provably_fair.server_seed_hash}</span>
              </div>
              {provably_fair.server_seed && (
                <div className="rd-pf-row">
                  <span className="rd-pf-label">Server Seed (Revealed)</span>
                  <span className="rd-pf-value">{provably_fair.server_seed}</span>
                </div>
              )}
              <div className="rd-pf-row">
                <span className="rd-pf-label">Client Seed</span>
                <span className="rd-pf-value">{provably_fair.client_seed}</span>
              </div>
              <div className="rd-pf-row">
                <span className="rd-pf-label">Nonce</span>
                <span className="rd-pf-value">{provably_fair.nonce ?? 'N/A'}</span>
              </div>

              {provably_fair.server_seed && (
                <div className="rd-pf-actions">
                  <button className="rd-pf-verify-btn" onClick={handleVerify} type="button">
                    Verify SHA-256
                  </button>
                </div>
              )}

              {verifyResult && (
                <div className={`rd-pf-result rd-pf-result--${verifyResult}`}>
                  {verifyResult === 'pass'
                    ? 'Verification passed — SHA-256 of server seed matches the hash.'
                    : 'Verification failed — hash mismatch.'}
                </div>
              )}

              {!provably_fair.revealed && (
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Server seed will be revealed after you rotate your seed pair.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
