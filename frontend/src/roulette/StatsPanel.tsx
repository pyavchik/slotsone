import { useMemo } from 'react';
import { useRouletteStore } from '@/stores/rouletteStore';
import { ALL_NUMBERS } from './constants';
import { colorHex, numberColor } from './utils';
import './statsPanel.css';

export default function StatsPanel() {
  const recentNumbers = useRouletteStore((s) => s.recentNumbers);
  const sessionTotals = useRouletteStore((s) => s.sessionTotals);

  const freqMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const n of recentNumbers) {
      map.set(n, (map.get(n) ?? 0) + 1);
    }
    return map;
  }, [recentNumbers]);

  const hotNumbers = useMemo(() => {
    const entries = Array.from(freqMap.entries());
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 5);
  }, [freqMap]);

  const coldNumbers = useMemo(() => {
    const absent = ALL_NUMBERS.filter((n) => !freqMap.has(n));
    if (absent.length >= 5) {
      return absent.slice(0, 5).map((n) => [n, 0] as [number, number]);
    }
    const appeared = Array.from(freqMap.entries());
    appeared.sort((a, b) => a[1] - b[1]);
    const cold: [number, number][] = absent.map((n) => [n, 0]);
    for (const entry of appeared) {
      if (cold.length >= 5) break;
      cold.push(entry);
    }
    return cold.slice(0, 5);
  }, [freqMap]);

  const distribution = useMemo(() => {
    const total = recentNumbers.length;
    let red = 0;
    let black = 0;
    let green = 0;
    for (const n of recentNumbers) {
      const c = numberColor(n);
      if (c === 'red') red++;
      else if (c === 'black') black++;
      else green++;
    }
    return {
      red,
      black,
      green,
      total,
      redPct: total > 0 ? (red / total) * 100 : 0,
      blackPct: total > 0 ? (black / total) * 100 : 0,
      greenPct: total > 0 ? (green / total) * 100 : 0,
    };
  }, [recentNumbers]);

  const net = sessionTotals.won - sessionTotals.wagered;
  const hasData = recentNumbers.length > 0;

  return (
    <div className="sp-panel">
      {/* Hot Numbers */}
      <div className="sp-section">
        <h4 className="sp-heading">Hot Numbers</h4>
        {!hasData ? (
          <span className="sp-empty">No data yet</span>
        ) : (
          <div className="sp-number-row">
            {hotNumbers.map(([num, count]) => (
              <div key={num} className="sp-number-badge">
                <div className="sp-circle" style={{ backgroundColor: colorHex(numberColor(num)) }}>
                  {num}
                </div>
                <span className="sp-count">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cold Numbers */}
      <div className="sp-section">
        <h4 className="sp-heading">Cold Numbers</h4>
        {!hasData ? (
          <span className="sp-empty">No data yet</span>
        ) : (
          <div className="sp-number-row">
            {coldNumbers.map(([num, count]) => (
              <div key={num} className="sp-number-badge">
                <div
                  className="sp-circle sp-circle--cold"
                  style={{ backgroundColor: colorHex(numberColor(num)) }}
                >
                  {num}
                </div>
                <span className="sp-count">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribution */}
      <div className="sp-section">
        <h4 className="sp-heading">Distribution</h4>
        {!hasData ? (
          <span className="sp-empty">No data yet</span>
        ) : (
          <div className="sp-distribution">
            <div className="sp-dist-row">
              <span className="sp-dist-label sp-dist-label--red">Red</span>
              <div className="sp-bar-track">
                <div className="sp-bar sp-bar--red" style={{ width: `${distribution.redPct}%` }} />
              </div>
              <span className="sp-dist-value">
                {distribution.red} ({distribution.redPct.toFixed(1)}%)
              </span>
            </div>
            <div className="sp-dist-row">
              <span className="sp-dist-label sp-dist-label--black">Black</span>
              <div className="sp-bar-track">
                <div
                  className="sp-bar sp-bar--black"
                  style={{ width: `${distribution.blackPct}%` }}
                />
              </div>
              <span className="sp-dist-value">
                {distribution.black} ({distribution.blackPct.toFixed(1)}%)
              </span>
            </div>
            <div className="sp-dist-row">
              <span className="sp-dist-label sp-dist-label--green">Green</span>
              <div className="sp-bar-track">
                <div
                  className="sp-bar sp-bar--green"
                  style={{ width: `${distribution.greenPct}%` }}
                />
              </div>
              <span className="sp-dist-value">
                {distribution.green} ({distribution.greenPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Session Stats */}
      <div className="sp-section">
        <h4 className="sp-heading">Session Stats</h4>
        <div className="sp-stats-grid">
          <div className="sp-stat">
            <span className="sp-stat-label">Rounds</span>
            <span className="sp-stat-value">{sessionTotals.rounds}</span>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-label">Wagered</span>
            <span className="sp-stat-value">${sessionTotals.wagered.toFixed(2)}</span>
          </div>
          <div className="sp-stat">
            <span className="sp-stat-label">Won</span>
            <span className="sp-stat-value">${sessionTotals.won.toFixed(2)}</span>
          </div>
          <div className="sp-stat">
            <span
              className={`sp-stat-value ${net > 0 ? 'sp-positive' : net < 0 ? 'sp-negative' : ''}`}
            >
              <span className="sp-stat-label">Net</span>
              {net >= 0 ? '+' : ''}${net.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
