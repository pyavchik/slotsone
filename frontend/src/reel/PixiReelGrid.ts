/**
 * PixiJS ReelGrid: 5x3, spin/stop animation per design spec.
 */
import { Application, Container, Graphics, Text } from 'pixi.js';

const REELS = 5;
const ROWS = 3;
const CELL_W = 172;
const CELL_H = 172;
const GAP = 8;

/** Payline definitions: 20 lines, each [row for reel0, reel1, ..., reel4]. Row 0=top, 1=mid, 2=bottom. */
const LINE_DEFS: number[][] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1],
  [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2],
  [1, 0, 1, 0, 1], [1, 2, 1, 2, 1], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 2, 1, 2, 0],
];
const PAYLINE_COLOR = 0xfbbf24;
const PAYLINE_WIDTH = 4;
const PAYLINE_GLOW_WIDTH = 12;
const PAYLINE_ALPHA = 0.95;
const REEL_STOP_DELAY_MS = 120;
const SPIN_SPEED_PX_S = 3200;
const DECEL_DURATION_MS = 380;
const BOUNCE_OFFSET_PX = 8;
const BOUNCE_DURATION_MS = 120;
const INITIAL_SPIN_MS = 600;

/** Ease-out cubic: fast start, smooth stop (natural deceleration) */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

const SYMBOL_COLORS: Record<string, number> = {
  '10': 0x4ade80,
  J: 0x60a5fa,
  Q: 0xa78bfa,
  K: 0xf472b6,
  A: 0xfbbf24,
  Star: 0xf59e0b,
  Scatter: 0x22d3ee,
  Wild: 0xe879f9,
};

function makeSymbolGraphic(symbolId: string, width: number, height: number): Graphics {
  const g = new Graphics();
  const color = SYMBOL_COLORS[symbolId] ?? 0x6b7280;
  g.rect(0, 0, width, height).fill(color);
  g.rect(2, 2, width - 4, height - 4).stroke({ width: 2, color: 0x1f2937 });
  const text = new Text({
    text: symbolId.length > 2 ? symbolId.slice(0, 2) : symbolId,
    style: { fontSize: 32, fill: 0xffffff, fontWeight: 'bold' },
  });
  text.anchor.set(0.5);
  text.x = width / 2;
  text.y = height / 2;
  g.addChild(text);
  return g;
}

export interface ReelGridOptions {
  width: number;
  height: number;
  onReelStopped?: (reelIndex: number) => void;
  onAllStopped?: () => void;
}

interface ReelState {
  container: Container;
  spinning: boolean;
  decelerating?: boolean;
  decelStartY?: number;
  decelStartTime?: number;
  bouncing?: boolean;
  bounceStartY?: number;
  bounceStartTime?: number;
}

export class ReelGrid {
  app: Application;
  container: Container;
  reels: ReelState[] = [];
  options: ReelGridOptions;
  private targetMatrix: string[][] | null = null;
  private stopTimers: number[] = [];
  private safetyTimeoutId: number = 0;
  private spinFinished = false;
  private tickerBound: (ticker: { deltaTime: number }) => void = () => {};
  private stepHeight: number;
  private paylinesContainer: Container | null = null;
  private winningLineIndices: number[] = [];

  /** PixiJS v8 requires async init(). Use ReelGrid.create() instead of new ReelGrid(). */
  static async create(canvas: HTMLCanvasElement, options: ReelGridOptions): Promise<ReelGrid> {
    const grid = new ReelGrid(options);
    await grid.app.init({
      canvas,
      width: options.width,
      height: options.height,
      backgroundColor: 0x0d0d12,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
    });
    grid.setupScene();
    return grid;
  }

  private constructor(options: ReelGridOptions) {
    this.options = options;
    this.stepHeight = CELL_H + GAP;
    this.app = new Application();
    this.container = new Container();
  }

  private setupScene() {
    const options = this.options;
    const cellTotalW = REELS * CELL_W + (REELS - 1) * GAP;
    const cellTotalH = ROWS * this.stepHeight - GAP;
    // Scale to fit canvas so reels are always visible
    const scale = Math.min(
      options.width / cellTotalW,
      options.height / cellTotalH,
      1.5
    );
    this.container.scale.set(scale);
    this.container.x = (options.width - cellTotalW * scale) / 2;
    this.container.y = (options.height - cellTotalH * scale) / 2;
    this.app.stage.addChild(this.container);

    // Frame so the reel area is always visible
    const frame = new Graphics();
    frame.rect(0, 0, cellTotalW, cellTotalH).fill(0x1a1a24);
    frame.rect(0, 0, cellTotalW, cellTotalH).stroke({ width: 2, color: 0x3f3f46 });
    this.container.addChild(frame);

    const mask = new Graphics();
    mask.rect(0, 0, cellTotalW, cellTotalH).fill(0x000000);
    this.container.addChild(mask);
    this.container.mask = mask;

    for (let r = 0; r < REELS; r++) {
      const reelContainer = new Container();
      reelContainer.x = r * (CELL_W + GAP);
      this.container.addChild(reelContainer);
      this.reels.push({ container: reelContainer, spinning: false } as ReelState);
    }
    this.paylinesContainer = new Container();
    this.paylinesContainer.eventMode = 'none';
    this.container.addChild(this.paylinesContainer);
    this.setIdleSymbols([]);
  }

  /** Set winning line indices (from outcome.win.breakdown line_index). Drawn when spin finishes. */
  setWinningLines(lineIndices: number[]) {
    this.winningLineIndices = lineIndices.filter((i) => i >= 0 && i < LINE_DEFS.length);
  }

  private drawWinningLines() {
    if (!this.paylinesContainer || this.winningLineIndices.length === 0) return;
    this.paylinesContainer.removeChildren();
    for (const lineIdx of this.winningLineIndices) {
      const path = LINE_DEFS[lineIdx];
      if (!path || path.length !== REELS) continue;
      const points: number[] = [];
      for (let r = 0; r < REELS; r++) {
        const row = path[r] ?? 1;
        const x = r * (CELL_W + GAP) + CELL_W / 2;
        const y = row * this.stepHeight + CELL_H / 2;
        points.push(x, y);
      }
      const line = new Graphics();
      line.moveTo(points[0]!, points[1]!);
      for (let i = 2; i < points.length; i += 2) line.lineTo(points[i]!, points[i + 1]!);
      line.stroke({ width: PAYLINE_GLOW_WIDTH, color: PAYLINE_COLOR, alpha: PAYLINE_ALPHA * 0.4 });
      line.stroke({ width: PAYLINE_WIDTH, color: PAYLINE_COLOR, alpha: PAYLINE_ALPHA });
      this.paylinesContainer.addChild(line);
    }
  }

  private getIdleSymbols(): string[][] {
    const matrix: string[][] = [];
    for (let r = 0; r < REELS; r++) matrix.push(['10', 'J', 'Q']);
    return matrix;
  }

  setIdleSymbols(matrix: string[][]) {
    const m = matrix.length ? matrix : this.getIdleSymbols();
    for (let r = 0; r < REELS; r++) {
      const { container } = this.reels[r]!;
      container.removeChildren();
      container.y = 0;
      for (let row = 0; row < ROWS; row++) {
        const sym = m[r]?.[row] ?? '10';
        const g = makeSymbolGraphic(sym, CELL_W, CELL_H);
        g.y = row * this.stepHeight;
        container.addChild(g);
      }
    }
  }

  spinThenStop(outcomeMatrix: string[][], winningLineIndices: number[] = []) {
    if (this.reels.some((r) => r.spinning || r.decelerating || r.bouncing)) return;
    this.spinFinished = false;
    this.winningLineIndices = winningLineIndices.filter((i) => i >= 0 && i < LINE_DEFS.length);
    if (this.paylinesContainer) this.paylinesContainer.removeChildren();
    this.targetMatrix = outcomeMatrix.map((col) => [...col]);

    const symbols = ['10', 'J', 'Q', 'K', 'A', 'Star', 'Scatter', 'Wild'];
    for (let r = 0; r < REELS; r++) {
      const { container } = this.reels[r]!;
      this.reels[r]!.spinning = true;
      container.removeChildren();
      container.y = 0;
      for (let i = 0; i < 5; i++) {
        const sym = symbols[Math.floor(Math.random() * symbols.length)]!;
        const g = makeSymbolGraphic(sym, CELL_W, CELL_H);
        g.y = i * this.stepHeight;
        container.addChild(g);
      }
    }

    this.tickerBound = (ticker: { deltaTime: number }) => this.updateSpin(ticker.deltaTime);
    this.app.ticker.add(this.tickerBound);

    const baseStopTime = INITIAL_SPIN_MS;
    for (let r = 0; r < REELS; r++) {
      this.stopTimers[r] = window.setTimeout(() => {
        this.stopReel(r);
      }, baseStopTime + r * REEL_STOP_DELAY_MS);
    }
    // Ensure we always finish (e.g. when timers are throttled in background/headless)
    this.safetyTimeoutId = window.setTimeout(() => {
      this.safetyTimeoutId = 0;
      if (this.spinFinished) return;
      this.spinFinished = true;
      this.drawWinningLines();
      this.app.ticker.remove(this.tickerBound);
      this.options.onAllStopped?.();
    }, 3500);
  }

  private updateSpin(deltaTime: number) {
    const now = performance.now();
    const speed = (SPIN_SPEED_PX_S * deltaTime) / 60;

    for (let r = 0; r < REELS; r++) {
      const state = this.reels[r]!;
      const reel = state.container;

      if (state.spinning) {
        reel.y += speed;
        if (reel.y >= this.stepHeight) reel.y -= this.stepHeight;
        continue;
      }

      if (state.decelerating && state.decelStartTime != null) {
        const elapsed = now - state.decelStartTime;
        const t = Math.min(1, elapsed / DECEL_DURATION_MS);
        const ease = easeOutCubic(t);
        reel.y = (state.decelStartY ?? 0) * (1 - ease);
        if (t >= 1) {
          reel.y = 0;
          state.decelerating = false;
          state.decelStartTime = undefined;
          state.decelStartY = undefined;
          state.bouncing = true;
          state.bounceStartY = BOUNCE_OFFSET_PX;
          state.bounceStartTime = now;
          reel.y = BOUNCE_OFFSET_PX;
        }
        continue;
      }

      if (state.bouncing && state.bounceStartTime != null) {
        const elapsed = now - state.bounceStartTime;
        const t = Math.min(1, elapsed / BOUNCE_DURATION_MS);
        const ease = easeOutCubic(t);
        reel.y = (state.bounceStartY ?? 0) * (1 - ease);
        if (t >= 1) {
          reel.y = 0;
          state.bouncing = false;
          state.bounceStartTime = undefined;
          state.bounceStartY = undefined;
          this.options.onReelStopped?.(r);
          if (r === REELS - 1) {
            if (this.safetyTimeoutId) {
              window.clearTimeout(this.safetyTimeoutId);
              this.safetyTimeoutId = 0;
            }
            if (!this.spinFinished) {
              this.spinFinished = true;
              this.drawWinningLines();
              this.app.ticker.remove(this.tickerBound);
              this.options.onAllStopped?.();
            }
          }
        }
      }
    }
  }

  private stopReel(reelIndex: number) {
    const state = this.reels[reelIndex]!;
    const reel = state.container;
    const target = this.targetMatrix?.[reelIndex];
    if (!target) return;

    state.spinning = false;
    // Start ease-out deceleration (handled in updateSpin); keep current Y for smooth decel
    const wrapY = ((reel.y % this.stepHeight) + this.stepHeight) % this.stepHeight;
    state.decelStartY = wrapY;
    state.decelStartTime = performance.now();
    state.decelerating = true;

    // Build strip so when reel.y is in [0, stepHeight] the visible symbols match outcome
    const strip = [target[0] ?? '10', target[1] ?? '10', target[2] ?? '10', target[0] ?? '10', target[1] ?? '10'];
    reel.removeChildren();
    for (let i = 0; i < strip.length; i++) {
      const g = makeSymbolGraphic(strip[i]!, CELL_W, CELL_H);
      g.y = i * this.stepHeight;
      reel.addChild(g);
    }
    reel.y = wrapY;
  }

  /** Resize canvas and reposition grid without destroying (e.g. when DevTools opens). */
  resize(width: number, height: number) {
    this.options = { ...this.options, width, height };
    this.app.renderer.resize(width, height);
    const cellTotalW = REELS * CELL_W + (REELS - 1) * GAP;
    const cellTotalH = ROWS * this.stepHeight - GAP;
    const scale = Math.min(width / cellTotalW, height / cellTotalH, 1.5);
    this.container.scale.set(scale);
    this.container.x = (width - cellTotalW * scale) / 2;
    this.container.y = (height - cellTotalH * scale) / 2;
  }

  destroy() {
    this.stopTimers.forEach(clearTimeout);
    if (this.safetyTimeoutId) window.clearTimeout(this.safetyTimeoutId);
    this.app.ticker.remove(this.tickerBound);
    this.app.destroy(true, { children: true });
  }
}
