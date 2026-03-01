import { useRef, useEffect, useMemo, useState } from 'react';
import { ReelGrid } from './reel/PixiReelGrid';
import { useGameStore } from './store';

interface SlotCanvasProps {
  width: number;
  height: number;
  onAllReelsStopped?: () => void;
}

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}

export function SlotCanvas({ width, height, onAllReelsStopped }: SlotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<ReelGrid | null>(null);
  const [pixiError, setPixiError] = useState<string | null>(null);
  const [gridReady, setGridReady] = useState(false);
  const [symbolsReady, setSymbolsReady] = useState(false);
  const [announcement, setAnnouncement] = useState('Slot machine ready.');

  const config = useGameStore((s) => s.config);
  const idleMatrix = useGameStore((s) => s.idleMatrix);
  const lastOutcome = useGameStore((s) => s.lastOutcome);
  const spinning = useGameStore((s) => s.spinning);
  const balance = useGameStore((s) => s.balance);
  const bet = useGameStore((s) => s.bet);
  const lines = useGameStore((s) => s.lines);
  const currency = useGameStore((s) => s.currency);
  const lineDefs = useMemo(() => config?.line_defs ?? [], [config?.line_defs]);

  const safeArea = useMemo(() => {
    const safeTop = Math.round(Math.min(120, Math.max(72, height * 0.13)));
    const safeBottom = Math.round(Math.min(210, Math.max(130, height * 0.22)));
    const side = Math.round(Math.min(36, Math.max(14, width * 0.03)));
    return {
      safeTop,
      safeBottom,
      safeLeft: side,
      safeRight: side,
    };
  }, [width, height]);

  const hasCreatedRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 1 || height < 1) return;

    if (gridRef.current) {
      gridRef.current.setLineDefs(lineDefs);
      gridRef.current.resize(width, height, safeArea);
      setGridReady(true);
      return;
    }

    if (hasCreatedRef.current) return;
    hasCreatedRef.current = true;
    setGridReady(false);
    setSymbolsReady(false);

    let cancelled = false;
    ReelGrid.create(canvas, {
      width,
      height,
      lineDefs,
      idleMatrix: idleMatrix ?? undefined,
      ...safeArea,
      onAllStopped: () => onAllReelsStopped?.(),
      onAssetsReady: () => {
        if (!cancelled) {
          setSymbolsReady(true);
        }
      },
    })
      .then((grid) => {
        if (cancelled) {
          grid.destroy();
          hasCreatedRef.current = false;
          return;
        }

        gridRef.current = grid;
        setGridReady(true);
        setPixiError(null);
      })
      .catch((error) => {
        if (!cancelled) {
          setPixiError(error?.message ?? 'Failed to initialize reel renderer.');
          setGridReady(false);
          setSymbolsReady(false);
          hasCreatedRef.current = false;
        }
      });

    return () => {
      cancelled = true;
      if (!gridRef.current) {
        hasCreatedRef.current = false;
      }
    };
  }, [width, height, lineDefs, safeArea, onAllReelsStopped]);

  useEffect(() => {
    return () => {
      if (gridRef.current) {
        gridRef.current.destroy();
        gridRef.current = null;
      }
      setGridReady(false);
      setSymbolsReady(false);
    };
  }, []);

  useEffect(() => {
    if (!lastOutcome || !spinning) return;

    const winningLines = (lastOutcome.win?.breakdown ?? [])
      .filter(
        (
          item
        ): item is {
          type: 'line';
          line_index: number;
          symbol: string;
          count: number;
          payout: number;
        } => item.type === 'line' && typeof item.line_index === 'number'
      )
      .map((item) => ({
        lineIndex: item.line_index,
        symbol: item.symbol,
        count: item.count,
        payout: item.payout,
      }));

    gridRef.current?.spinThenStop(lastOutcome.reel_matrix, winningLines);
  }, [lastOutcome, spinning]);

  useEffect(() => {
    if (!lastOutcome) return;
    if (lastOutcome.win.amount > 0) {
      setAnnouncement(
        `Spin complete. Payout ${lastOutcome.win.amount.toFixed(2)} ${lastOutcome.win.currency}.`
      );
      return;
    }
    setAnnouncement('Spin complete. No win.');
  }, [lastOutcome]);

  const ariaLabel = useMemo(() => {
    if (!lastOutcome) return 'Slot reels animation area.';
    const cols = lastOutcome.reel_matrix
      .map((reel, idx) => `Reel ${idx + 1}: ${reel.join(', ')}`)
      .join('. ');
    return `${cols}.`;
  }, [lastOutcome]);

  useEffect(() => {
    const previousRenderer = window.render_game_to_text;
    const previousAdvance = window.advanceTime;

    window.render_game_to_text = () => {
      const payload = {
        coordinate_system: 'origin top-left; x right; y down',
        machine: { reels: 5, rows: 3 },
        spin: {
          spinning,
          balance,
          bet,
          lines,
          currency,
          last_win_amount: lastOutcome?.win.amount ?? 0,
        },
        outcome: lastOutcome
          ? {
              reel_matrix: lastOutcome.reel_matrix,
              win: lastOutcome.win,
            }
          : null,
        reel_debug: gridRef.current?.debugState() ?? null,
      };
      return JSON.stringify(payload);
    };

    if (typeof window.advanceTime !== 'function') {
      window.advanceTime = async (ms: number) => {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, Math.max(0, ms));
        });
      };
    }

    return () => {
      if (previousRenderer) {
        window.render_game_to_text = previousRenderer;
      } else {
        delete window.render_game_to_text;
      }

      if (previousAdvance) {
        window.advanceTime = previousAdvance;
      } else {
        delete window.advanceTime;
      }
    };
  }, [spinning, balance, bet, lines, currency, lastOutcome]);

  if (pixiError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 24,
          color: '#fee2e2',
          background: '#130b0f',
          borderRadius: 16,
        }}
      >
        {pixiError}
      </div>
    );
  }

  return (
    <div className="slot-canvas-shell">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          opacity: gridReady && symbolsReady ? 1 : 0,
        }}
      />
      {(!gridReady || !symbolsReady) && !pixiError && (
        <div className="slot-canvas-loading" role="status" aria-live="polite">
          Loading symbols...
        </div>
      )}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}
