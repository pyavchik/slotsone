import { useRef, useEffect, useState } from 'react';
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
  const lastOutcome = useGameStore((s) => s.lastOutcome);
  const spinning = useGameStore((s) => s.spinning);

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
      gridRef.current.resize(width, height);
      return;
    }
    if (hasCreatedRef.current) return;
    hasCreatedRef.current = true;
    let cancelled = false;
    const t = setTimeout(() => {
      ReelGrid.create(canvas, {
        width,
        height,
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
  }, [width, height]);

  useEffect(() => {
    if (!lastOutcome || !spinning) return;
    const matrix = lastOutcome.reel_matrix;
    const winningLineIndices = Array.from(
      new Set(
        (lastOutcome.win?.breakdown ?? [])
          .map((b) => b.line_index)
          .filter((lineIndex): lineIndex is number => typeof lineIndex === 'number')
      )
    );
    gridRef.current?.spinThenStop(matrix, winningLineIndices);
  }, [lastOutcome, spinning]);

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

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', width: '100%', height: '100%' }} />;
}
