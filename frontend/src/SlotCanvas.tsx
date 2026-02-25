import { useRef, useEffect, useMemo, useState } from 'react';
import { ReelGrid } from './reel/PixiReelGrid';
import { useGameStore } from './store';

interface SlotCanvasProps {
  width: number;
  height: number;
  onAllReelsStopped?: () => void;
}

export function SlotCanvas({ width, height, onAllReelsStopped }: SlotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<ReelGrid | null>(null);
  const onAllStoppedRef = useRef(onAllReelsStopped);
  onAllStoppedRef.current = onAllReelsStopped;
  const [pixiError, setPixiError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('Slot game loaded.');
  const lastOutcome = useGameStore((s) => s.lastOutcome);
  const spinning = useGameStore((s) => s.spinning);
  const safeArea = useMemo(() => {
    const safeTop = Math.round(Math.min(128, Math.max(74, height * 0.14)));
    const safeBottom = Math.round(Math.min(260, Math.max(152, height * 0.24)));
    const safeSide = Math.round(Math.min(28, Math.max(10, width * 0.02)));
    return {
      safeTop,
      safeBottom,
      safeLeft: safeSide,
      safeRight: safeSide,
    };
  }, [width, height]);

  // Unmount: destroy grid once
  useEffect(() => {
    return () => {
      if (gridRef.current) {
        gridRef.current.destroy();
        gridRef.current = null;
      }
    };
  }, []);

  // Create grid once; on resize only call grid.resize() so DevTools opening doesn't destroy the game
  const hasCreatedRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 1 || height < 1) return;
    if (gridRef.current) {
      gridRef.current.resize(width, height, safeArea);
      return;
    }
    if (hasCreatedRef.current) return;
    hasCreatedRef.current = true;
    let cancelled = false;
    const t = setTimeout(() => {
      ReelGrid.create(canvas, {
        width,
        height,
        ...safeArea,
        onReelStopped: () => {},
        onAllStopped: () => onAllStoppedRef.current?.(),
      })
        .then((grid) => {
          if (cancelled) {
            grid.destroy();
            hasCreatedRef.current = false;
            return;
          }
          gridRef.current = grid;
          setPixiError(null);
        })
        .catch((e) => {
          if (!cancelled) setPixiError(e?.message ?? 'Pixi failed to init');
          hasCreatedRef.current = false;
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
      // Let StrictMode second run create the grid if the first was cancelled
      if (!gridRef.current) hasCreatedRef.current = false;
    };
  }, [width, height, safeArea]);

  useEffect(() => {
    if (!lastOutcome || !spinning) return;
    const matrix = lastOutcome.reel_matrix;
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
    gridRef.current?.spinThenStop(matrix, winningLines);
  }, [lastOutcome, spinning]);

  useEffect(() => {
    if (!lastOutcome) return;
    const winAmount = lastOutcome.win.amount;
    if (winAmount > 0) {
      setAnnouncement(`Spin complete. Win ${winAmount.toFixed(2)} ${lastOutcome.win.currency}.`);
      return;
    }
    setAnnouncement('Spin complete. No win.');
  }, [lastOutcome]);

  const canvasLabel = useMemo(() => {
    if (!lastOutcome) return 'Slot reels.';
    const columns = lastOutcome.reel_matrix
      .map((reel, index) => `Reel ${index + 1}: ${reel.join(', ')}`)
      .join('. ');
    return `${columns}.`;
  }, [lastOutcome]);

  if (pixiError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D0D12',
          color: '#F87171',
          padding: 24,
          textAlign: 'center',
        }}
      >
        {pixiError}
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role="img"
        aria-label={canvasLabel}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </>
  );
}
