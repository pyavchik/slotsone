import { Application, Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { SYMBOL_IDS, normalizeSymbolId, symbolColorNumber, symbolImagePath } from '../symbols';

const REELS = 5;
const ROWS = 3;
const CELL_W = 168;
const CELL_H = 168;
const CELL_GAP = 6;
const STEP_H = CELL_H + CELL_GAP;
const ROLLING_SYMBOLS = ROWS + 5;

const SPIN_SPEED_PX_S = 2520;
const INITIAL_SPIN_MS = 640;
const REEL_STOP_STAGGER_MS = 125;
const DECEL_DURATION_MS = 420;
const BOUNCE_PX = 6;
const BOUNCE_DURATION_MS = 120;
const SAFETY_FINISH_MS = 3600;

const WIN_LINE_SHOW_MIN_MS = 360;
const WIN_LINE_SHOW_MAX_MS = 640;
const WIN_LINE_PAYOUT_SCALE = 220;
const MAX_WIN_LINES_TO_PRESENT = 4;
const WIN_CLEAR_EXTRA_MS = 160;

const PAYLINE_COLORS = [
  0xf8b84e, // amber
  0x3de2ff, // cyan
  0xff6f91, // rose
  0x57e389, // mint
  0xf6d743, // warm gold
  0x9a7dff, // violet accent
  0xff914d, // orange
  0x66e6c4, // seafoam
];

const FALLBACK_LINE_DEFS: number[][] = [[1, 1, 1, 1, 1]];

const CARD_RADIUS = 18;
const VALUE_FONT = '"Manrope", "Rajdhani", sans-serif';

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomSymbolId(): string {
  return SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)]!;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface ReelState {
  container: Container;
  symbols: Sprite[];
  spinning: boolean;
  decelerating: boolean;
  bouncing: boolean;
  decelStartMs: number;
  decelStartY: number;
  bounceStartMs: number;
}

interface WinningLineInfo {
  lineIndex: number;
  symbol: string;
  count: number;
  payout: number;
}

interface CloneState {
  sprite: Sprite;
  baseX: number;
  baseY: number;
  phase: number;
  strength: number;
}

interface RingState {
  graphic: Graphics;
  phase: number;
  baseAlpha: number;
}

interface ReelGridSafeArea {
  safeTop?: number;
  safeBottom?: number;
  safeLeft?: number;
  safeRight?: number;
}

export interface ReelGridOptions extends ReelGridSafeArea {
  width: number;
  height: number;
  lineDefs?: number[][];
  onReelStopped?: (reelIndex: number) => void;
  onAllStopped?: () => void;
  onAssetsReady?: () => void;
}

export interface ReelGridDebugState {
  mode: 'idle' | 'spinning' | 'presenting_win';
  reduced_motion: boolean;
  reels: Array<{
    index: number;
    spinning: boolean;
    decelerating: boolean;
    bouncing: boolean;
    y: number;
  }>;
  winning_lines: number[];
  has_target_matrix: boolean;
}

function drawCardBase(
  root: Container,
  w: number,
  h: number,
  baseColor: number,
  accent: number
): void {
  const card = new Graphics();
  card.roundRect(0, 0, w, h, CARD_RADIUS).fill(0x0e1220);
  card.roundRect(2, 2, w - 4, h - 4, CARD_RADIUS - 1).fill(baseColor);
  card.roundRect(5, 5, w - 10, h * 0.42, CARD_RADIUS - 4).fill({
    color: 0xffffff,
    alpha: 0.08,
  });
  card.roundRect(2, 2, w - 4, h - 4, CARD_RADIUS - 1).stroke({
    width: 2,
    color: accent,
    alpha: 0.62,
  });
  root.addChild(card);
}

function drawSymbolFallback(symbolId: string, w: number, h: number): Container {
  const id = normalizeSymbolId(symbolId);
  const color = symbolColorNumber(id);
  const root = new Container();
  drawCardBase(root, w, h, 0x1a2238, color);

  const ring = new Graphics();
  ring.circle(w / 2, h / 2, 44).stroke({ width: 4, color, alpha: 0.5 });
  ring.circle(w / 2, h / 2, 26).stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
  root.addChild(ring);

  const loader = new Text({
    text: '...',
    style: {
      fontFamily: VALUE_FONT,
      fontSize: 30,
      fontWeight: '700',
      fill: 0xe6f0ff,
      letterSpacing: 3,
    },
  });
  loader.anchor.set(0.5);
  loader.x = w / 2;
  loader.y = h / 2 + 2;
  root.addChild(loader);

  return root;
}

class SymbolTextureBank {
  private textures = new Map<string, Texture>();
  private loading = new Map<string, Promise<Texture>>();
  private provisional = new Set<string>();

  constructor(
    private readonly renderer: Application['renderer'],
    private readonly symbolWidth: number,
    private readonly symbolHeight: number
  ) {}

  async warm(): Promise<void> {
    await Promise.allSettled(SYMBOL_IDS.map((id) => this.resolveAsync(id)));
  }

  sprite(symbolId: string): Sprite {
    const sprite = new Sprite(this.resolve(symbolId));
    sprite.width = this.symbolWidth;
    sprite.height = this.symbolHeight;
    return sprite;
  }

  texture(symbolId: string): Texture {
    return this.resolve(symbolId);
  }

  destroy(): void {
    this.textures.forEach((texture) => texture.destroy(true));
    this.textures.clear();
    this.loading.clear();
    this.provisional.clear();
  }

  private resolve(symbolId: string): Texture {
    const key = normalizeSymbolId(symbolId);
    const cached = this.textures.get(key);
    if (cached) return cached;

    const fallback = this.buildFallbackTexture(key);
    this.textures.set(key, fallback);
    this.provisional.add(key);
    void this.resolveAsync(key);
    return fallback;
  }

  private async resolveAsync(symbolId: string): Promise<Texture> {
    const key = normalizeSymbolId(symbolId);
    const cached = this.textures.get(key);
    if (cached && !this.provisional.has(key)) return cached;

    const existing = this.loading.get(key);
    if (existing) return existing;

    const request = this.loadFromImage(key)
      .then((texture) => {
        // Existing sprites may still reference the provisional texture, so keep
        // it alive and let regular scene teardown reclaim resources.
        this.textures.set(key, texture);
        this.provisional.delete(key);
        this.loading.delete(key);
        return texture;
      })
      .catch(() => {
        if (!this.textures.has(key)) {
          this.textures.set(key, this.buildFallbackTexture(key));
        }
        this.provisional.delete(key);
        this.loading.delete(key);
        return this.textures.get(key)!;
      });

    this.loading.set(key, request);
    return request;
  }

  private async loadFromImage(symbolId: string): Promise<Texture> {
    const imagePath = symbolImagePath(symbolId);
    const source = (await Assets.load(imagePath)) as Texture;
    if (!source || source.destroyed) {
      throw new Error(`Failed to load symbol image: ${imagePath}`);
    }
    return this.buildComposedTexture(symbolId, source);
  }

  private buildFallbackTexture(symbolId: string): Texture {
    const fallback = drawSymbolFallback(symbolId, this.symbolWidth, this.symbolHeight);
    const texture = this.renderer.generateTexture({
      target: fallback,
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    fallback.destroy({ children: true });
    return texture;
  }

  private buildComposedTexture(symbolId: string, source: Texture): Texture {
    const root = new Container();
    const accent = symbolColorNumber(symbolId);
    drawCardBase(root, this.symbolWidth, this.symbolHeight, 0x18233d, accent);

    const innerShadow = new Graphics();
    innerShadow
      .roundRect(9, 9, this.symbolWidth - 18, this.symbolHeight - 18, 13)
      .fill({ color: 0x0a1221, alpha: 0.52 });
    root.addChild(innerShadow);

    const icon = new Sprite(source);
    icon.anchor.set(0.5);
    const sourceW = source.orig.width || source.frame.width || source.width || this.symbolWidth;
    const sourceH = source.orig.height || source.frame.height || source.height || this.symbolHeight;
    const maxW = this.symbolWidth * 0.78;
    const maxH = this.symbolHeight * 0.78;
    const iconScale = Math.min(maxW / sourceW, maxH / sourceH);
    icon.scale.set(iconScale);
    icon.x = this.symbolWidth / 2;
    icon.y = this.symbolHeight / 2 + 2;
    root.addChild(icon);

    const gloss = new Graphics();
    gloss
      .roundRect(11, 11, this.symbolWidth - 22, this.symbolHeight * 0.34, 12)
      .fill({ color: 0xffffff, alpha: 0.08 });
    root.addChild(gloss);

    const texture = this.renderer.generateTexture({
      target: root,
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    root.destroy({ children: true });
    return texture;
  }
}

class WinPresenter {
  private readonly root = new Container();
  private clones: CloneState[] = [];
  private rings: RingState[] = [];
  private hiddenOriginals: Sprite[] = [];
  private tickerFn: (() => void) | null = null;
  private startedAt = 0;

  constructor(
    private readonly app: Application,
    parent: Container
  ) {
    parent.addChild(this.root);
  }

  present(
    lines: WinningLineInfo[],
    lineDefs: number[][],
    reels: ReelState[],
    reducedMotion: boolean
  ): void {
    this.clear();
    if (lines.length === 0) return;

    this.drawLines(lines, lineDefs);
    this.drawWinningCells(lines, lineDefs, reels, reducedMotion);
    this.start(reducedMotion);
  }

  clear(): void {
    if (this.tickerFn) {
      this.app.ticker.remove(this.tickerFn);
      this.tickerFn = null;
    }

    for (const original of this.hiddenOriginals) {
      if (!original.destroyed) original.visible = true;
    }

    this.clones.forEach((entry) => {
      if (!entry.sprite.destroyed) entry.sprite.destroy();
    });
    this.rings.forEach((entry) => {
      if (!entry.graphic.destroyed) entry.graphic.destroy();
    });

    this.clones = [];
    this.rings = [];
    this.hiddenOriginals = [];
    this.root.removeChildren();
  }

  private drawLines(lines: WinningLineInfo[], lineDefs: number[][]): void {
    for (const line of lines) {
      const path = lineDefs[line.lineIndex];
      if (!path || path.length !== REELS) continue;

      const color = PAYLINE_COLORS[line.lineIndex % PAYLINE_COLORS.length]!;
      const points: number[] = [];
      for (let reel = 0; reel < REELS; reel++) {
        const row = path[reel] ?? 1;
        const x = reel * (CELL_W + CELL_GAP) + CELL_W / 2;
        const y = row * STEP_H + CELL_H / 2;
        points.push(x, y);
      }

      const lineGlow = new Graphics();
      lineGlow.moveTo(points[0]!, points[1]!);
      for (let i = 2; i < points.length; i += 2) {
        lineGlow.lineTo(points[i]!, points[i + 1]!);
      }
      lineGlow.stroke({ width: 10, color, alpha: 0.2 });
      lineGlow.stroke({ width: 4, color, alpha: 0.95 });
      this.root.addChild(lineGlow);

      const finalX = points[points.length - 2]!;
      const finalY = points[points.length - 1]!;
      const labelBg = new Graphics();
      labelBg.roundRect(finalX + 8, finalY - 24, 162, 26, 8).fill({ color: 0x0b1120, alpha: 0.84 });
      labelBg
        .roundRect(finalX + 8, finalY - 24, 162, 26, 8)
        .stroke({ width: 1, color, alpha: 0.9 });
      this.root.addChild(labelBg);

      const payoutLabel = new Text({
        text: `L${line.lineIndex + 1} +${line.payout.toFixed(2)}`,
        style: {
          fontFamily: VALUE_FONT,
          fontSize: 12,
          fontWeight: '700',
          fill: 0xf8fafc,
          letterSpacing: 0.4,
        },
      });
      payoutLabel.x = finalX + 16;
      payoutLabel.y = finalY - 18;
      this.root.addChild(payoutLabel);
    }
  }

  private drawWinningCells(
    lines: WinningLineInfo[],
    lineDefs: number[][],
    reels: ReelState[],
    reducedMotion: boolean
  ): void {
    const seen = new Set<string>();

    for (const line of lines) {
      const path = lineDefs[line.lineIndex];
      if (!path) continue;
      const color = PAYLINE_COLORS[line.lineIndex % PAYLINE_COLORS.length]!;
      const strength = clamp(0.48 + line.payout * 0.5, 0.5, 1);

      for (let reel = 0; reel < Math.min(line.count, REELS); reel++) {
        const row = path[reel];
        if (row == null) continue;

        const key = `${reel}-${row}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const x = reel * (CELL_W + CELL_GAP);
        const y = row * STEP_H;

        const ring = new Graphics();
        ring.roundRect(x + 4, y + 4, CELL_W - 8, CELL_H - 8, 16).stroke({
          width: 3,
          color,
          alpha: 0.85,
        });
        ring.roundRect(x + 8, y + 8, CELL_W - 16, CELL_H - 16, 13).stroke({
          width: 1.5,
          color: 0xffffff,
          alpha: 0.4,
        });
        this.root.addChild(ring);
        this.rings.push({
          graphic: ring,
          phase: Math.random() * Math.PI * 2,
          baseAlpha: 0.54 + 0.2 * strength,
        });

        const staticSprite = reels[reel]?.symbols[row + 1];
        if (!staticSprite) continue;

        const clone = new Sprite(staticSprite.texture);
        clone.anchor.set(0.5);
        clone.width = CELL_W;
        clone.height = CELL_H;
        clone.x = x + CELL_W / 2;
        clone.y = y + CELL_H / 2;
        this.root.addChild(clone);

        staticSprite.visible = false;
        this.hiddenOriginals.push(staticSprite);
        this.clones.push({
          sprite: clone,
          baseX: clone.x,
          baseY: clone.y,
          phase: Math.random() * Math.PI * 2,
          strength: reducedMotion ? Math.min(0.35, strength) : strength,
        });
      }
    }
  }

  private start(reducedMotion: boolean): void {
    this.startedAt = performance.now();
    this.tickerFn = () => {
      const t = (performance.now() - this.startedAt) / 1000;

      for (const ring of this.rings) {
        const pulse = 0.22 * Math.sin(t * 4 + ring.phase);
        ring.graphic.alpha = clamp(ring.baseAlpha + pulse, 0.2, 1);
      }

      for (const clone of this.clones) {
        const wave = Math.sin(t * 6 + clone.phase);
        const sway = Math.sin(t * 5 + clone.phase * 0.8);
        const scaleWave = reducedMotion ? 0.024 : 0.086;
        const offsetWave = reducedMotion ? 2.2 : 7;
        const amount = clone.strength;

        clone.sprite.x = clone.baseX + sway * offsetWave * amount * 0.45;
        clone.sprite.y = clone.baseY + wave * offsetWave * amount;
        clone.sprite.rotation = wave * amount * (reducedMotion ? 0.04 : 0.12);
        clone.sprite.scale.set(
          1 + scaleWave * wave * amount,
          1 + scaleWave * Math.cos(t * 5.2) * amount
        );
      }
    };
    this.app.ticker.add(this.tickerFn);
  }
}

export class ReelGrid {
  app: Application;
  container: Container;

  private options: ReelGridOptions;
  private readonly reducedMotion: boolean;
  private readonly stepHeight = STEP_H;
  private readonly reels: ReelState[] = [];

  private symbolTextures!: SymbolTextureBank;
  private winPresenter!: WinPresenter;
  private boardContainer!: Container;
  private frameContainer!: Container;
  private lineDefs: number[][] = [];
  private winningLines: WinningLineInfo[] = [];
  private targetMatrix: string[][] | null = null;

  private stopTimers: number[] = [];
  private winTimers: number[] = [];
  private safetyTimer = 0;

  private tickerBound: (ticker: { deltaTime: number }) => void = () => {};
  private tickerAttached = false;
  private spinFinished = false;

  static async create(canvas: HTMLCanvasElement, options: ReelGridOptions): Promise<ReelGrid> {
    const grid = new ReelGrid(options);
    await grid.app.init({
      canvas,
      width: options.width,
      height: options.height,
      background: 0x0a1020,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    grid.symbolTextures = new SymbolTextureBank(grid.app.renderer, CELL_W, CELL_H);
    grid.setupScene();
    // Keep first paint fast with fallback textures, but notify UI when symbol
    // image warm-up finishes so it can reveal only real symbols.
    void grid.symbolTextures.warm().finally(() => {
      grid.setIdleSymbols([]);
      options.onAssetsReady?.();
    });
    return grid;
  }

  private constructor(options: ReelGridOptions) {
    this.options = options;
    this.reducedMotion = prefersReducedMotion();
    this.app = new Application();
    this.container = new Container();
    this.lineDefs = this.normalizeLineDefs(options.lineDefs ?? FALLBACK_LINE_DEFS);
  }

  setLineDefs(lineDefs: number[][]): void {
    this.lineDefs = this.normalizeLineDefs(lineDefs);
    this.winningLines = this.winningLines.filter(
      (line) => line.lineIndex >= 0 && line.lineIndex < this.lineDefs.length
    );
  }

  setIdleSymbols(matrix: string[][]): void {
    const source = matrix.length > 0 ? matrix : this.defaultIdleMatrix();

    for (let reel = 0; reel < REELS; reel++) {
      const state = this.reels[reel];
      if (!state) continue;
      state.container.y = 0;

      for (let i = 0; i < ROLLING_SYMBOLS; i++) {
        const row = (i - 1 + ROWS) % ROWS;
        const symbol = source[reel]?.[row] ?? randomSymbolId();
        const sprite = state.symbols[i];
        if (!sprite) continue;
        sprite.texture = this.symbolTextures.texture(symbol);
        sprite.width = CELL_W;
        sprite.height = CELL_H;
        sprite.y = (i - 1) * this.stepHeight;
        sprite.visible = true;
        sprite.rotation = 0;
      }
    }
  }

  spinThenStop(outcomeMatrix: string[][], winningLines: WinningLineInfo[] = []): void {
    if (this.reels.some((reel) => reel.spinning || reel.decelerating || reel.bouncing)) return;

    this.spinFinished = false;
    this.clearTimers();
    this.winPresenter.clear();

    this.targetMatrix = outcomeMatrix.map((column) => [...column]);
    this.winningLines = winningLines
      .filter((line) => line.lineIndex >= 0 && line.lineIndex < this.lineDefs.length)
      .sort((a, b) => b.payout - a.payout);

    for (const state of this.reels) {
      this.fillReelWithRandomSymbols(state);
      state.container.y = 0;
      state.spinning = true;
      state.decelerating = false;
      state.bouncing = false;
      state.decelStartMs = 0;
      state.bounceStartMs = 0;
      state.decelStartY = 0;
    }

    this.ensureTickerAttached();

    for (let reelIndex = 0; reelIndex < REELS; reelIndex++) {
      const timerId = window.setTimeout(
        () => this.stopReel(reelIndex),
        INITIAL_SPIN_MS + reelIndex * REEL_STOP_STAGGER_MS
      );
      this.stopTimers.push(timerId);
    }

    this.safetyTimer = window.setTimeout(() => {
      if (!this.spinFinished) {
        this.finishSpinCycle();
      }
    }, SAFETY_FINISH_MS);
  }

  resize(width: number, height: number, safeArea?: ReelGridSafeArea): void {
    this.options = { ...this.options, width, height, ...safeArea };
    this.app.renderer.resize(width, height);
    this.layoutContainer(width, height);
  }

  debugState(): ReelGridDebugState {
    const hasActiveWinPresentation = this.winTimers.length > 0;
    const mode = this.reels.some((reel) => reel.spinning || reel.decelerating || reel.bouncing)
      ? 'spinning'
      : hasActiveWinPresentation
        ? 'presenting_win'
        : 'idle';

    return {
      mode,
      reduced_motion: this.reducedMotion,
      reels: this.reels.map((reel, index) => ({
        index,
        spinning: reel.spinning,
        decelerating: reel.decelerating,
        bouncing: reel.bouncing,
        y: Math.round(reel.container.y * 100) / 100,
      })),
      winning_lines: this.winningLines.map((line) => line.lineIndex),
      has_target_matrix: this.targetMatrix !== null,
    };
  }

  destroy(): void {
    this.clearTimers();
    this.winPresenter.clear();
    if (this.tickerAttached) {
      this.app.ticker.remove(this.tickerBound);
      this.tickerAttached = false;
    }
    this.symbolTextures.destroy();
    this.app.destroy(true, { children: true });
  }

  private setupScene(): void {
    this.app.stage.addChild(this.container);

    this.boardContainer = new Container();
    this.frameContainer = new Container();
    this.container.addChild(this.boardContainer);
    this.container.addChild(this.frameContainer);

    this.createReels();
    this.winPresenter = new WinPresenter(this.app, this.frameContainer);

    this.layoutContainer(this.options.width, this.options.height);
    this.ensureTickerAttached();
    this.setIdleSymbols([]);
  }

  private createReels(): void {
    const machineW = this.machineWidth();
    const machineH = this.machineHeight();

    const frameShadow = new Graphics();
    frameShadow.roundRect(-22, -22, machineW + 44, machineH + 44, 32).fill({
      color: 0x0b1020,
      alpha: 0.7,
    });
    this.boardContainer.addChild(frameShadow);

    const frame = new Graphics();
    frame.roundRect(-8, -8, machineW + 16, machineH + 16, 22).fill(0x121a2f);
    frame.roundRect(-8, -8, machineW + 16, machineH + 16, 22).stroke({
      width: 3,
      color: 0x66d7ff,
      alpha: 0.36,
    });
    frame.roundRect(-4, -4, machineW + 8, machineH + 8, 20).stroke({
      width: 1.5,
      color: 0xf8b84e,
      alpha: 0.52,
    });
    this.boardContainer.addChild(frame);

    const reelMask = new Graphics();
    reelMask.roundRect(0, 0, machineW, machineH, 16).fill(0x000000);
    this.boardContainer.addChild(reelMask);
    this.boardContainer.mask = reelMask;

    for (let reelIndex = 0; reelIndex < REELS; reelIndex++) {
      const laneX = reelIndex * (CELL_W + CELL_GAP);

      const laneBg = new Graphics();
      laneBg.roundRect(laneX, 0, CELL_W, machineH, 14).fill({ color: 0x0f172d, alpha: 0.95 });
      laneBg.roundRect(laneX + 1, 1, CELL_W - 2, machineH - 2, 13).stroke({
        width: 1,
        color: 0xffffff,
        alpha: 0.1,
      });
      this.boardContainer.addChild(laneBg);

      const reelContainer = new Container();
      reelContainer.x = laneX;
      this.boardContainer.addChild(reelContainer);

      const symbols: Sprite[] = [];
      for (let i = 0; i < ROLLING_SYMBOLS; i++) {
        const sprite = this.symbolTextures.sprite(randomSymbolId());
        sprite.y = (i - 1) * this.stepHeight;
        reelContainer.addChild(sprite);
        symbols.push(sprite);
      }

      this.reels.push({
        container: reelContainer,
        symbols,
        spinning: false,
        decelerating: false,
        bouncing: false,
        decelStartMs: 0,
        decelStartY: 0,
        bounceStartMs: 0,
      });
    }

    const topShade = new Graphics();
    topShade.roundRect(0, 0, machineW, 62, 16).fill({ color: 0x050913, alpha: 0.46 });
    this.frameContainer.addChild(topShade);

    const bottomShade = new Graphics();
    bottomShade
      .roundRect(0, machineH - 68, machineW, 68, 16)
      .fill({ color: 0x050913, alpha: 0.52 });
    this.frameContainer.addChild(bottomShade);
  }

  private normalizeLineDefs(lineDefs: number[][]): number[][] {
    return lineDefs
      .filter(
        (line): line is number[] =>
          Array.isArray(line) &&
          line.length === REELS &&
          line.every((row) => Number.isInteger(row) && row >= 0 && row < ROWS)
      )
      .map((line) => [...line]);
  }

  private layoutContainer(width: number, height: number): void {
    const safeTop = Math.max(0, this.options.safeTop ?? 0);
    const safeBottom = Math.max(0, this.options.safeBottom ?? 0);
    const safeLeft = Math.max(0, this.options.safeLeft ?? 0);
    const safeRight = Math.max(0, this.options.safeRight ?? 0);

    const availableWidth = Math.max(1, width - safeLeft - safeRight);
    const availableHeight = Math.max(1, height - safeTop - safeBottom);
    const maxScale = this.reducedMotion ? 1.32 : 1.4;

    const scale = Math.min(
      availableWidth / this.machineWidth(),
      availableHeight / this.machineHeight(),
      maxScale
    );

    this.container.scale.set(scale);
    this.container.x = safeLeft + (availableWidth - this.machineWidth() * scale) / 2;
    this.container.y = safeTop + (availableHeight - this.machineHeight() * scale) / 2;
  }

  private machineWidth(): number {
    return REELS * CELL_W + (REELS - 1) * CELL_GAP;
  }

  private machineHeight(): number {
    return ROWS * STEP_H - CELL_GAP;
  }

  private ensureTickerAttached(): void {
    if (this.tickerAttached) return;

    this.tickerBound = (ticker) => {
      const deltaMs = (ticker.deltaTime * 1000) / 60;
      this.tick(deltaMs);
    };

    this.app.ticker.add(this.tickerBound);
    this.tickerAttached = true;
  }

  private tick(deltaMs: number): void {
    const now = performance.now();

    for (let reelIndex = 0; reelIndex < this.reels.length; reelIndex++) {
      const state = this.reels[reelIndex]!;

      if (state.spinning) {
        this.stepSpinningReel(state, deltaMs);
        continue;
      }

      if (state.decelerating) {
        this.stepDeceleratingReel(state, now);
        continue;
      }

      if (state.bouncing) {
        const settled = this.stepBounceReel(state, now);
        if (settled) {
          this.options.onReelStopped?.(reelIndex);
        }
      }
    }

    if (
      !this.spinFinished &&
      this.reels.every((reel) => !reel.spinning && !reel.decelerating && !reel.bouncing)
    ) {
      this.finishSpinCycle();
    }
  }

  private stepSpinningReel(state: ReelState, deltaMs: number): void {
    state.container.y += (SPIN_SPEED_PX_S * deltaMs) / 1000;

    while (state.container.y >= this.stepHeight) {
      state.container.y -= this.stepHeight;

      const shifted = state.symbols.shift();
      if (!shifted) break;

      shifted.texture = this.symbolTextures.texture(randomSymbolId());
      shifted.width = CELL_W;
      shifted.height = CELL_H;
      shifted.visible = true;
      shifted.rotation = 0;
      state.symbols.push(shifted);

      // Keep symbol strip positions bounded to avoid all items drifting outside the mask.
      for (let i = 0; i < state.symbols.length; i++) {
        state.symbols[i]!.y = (i - 1) * this.stepHeight;
      }
    }
  }

  private stepDeceleratingReel(state: ReelState, now: number): void {
    const duration = this.reducedMotion ? DECEL_DURATION_MS * 0.7 : DECEL_DURATION_MS;
    const elapsed = now - state.decelStartMs;
    const t = clamp(elapsed / duration, 0, 1);
    const eased = easeOutCubic(t);

    state.container.y = state.decelStartY * (1 - eased);

    if (t >= 1) {
      state.container.y = BOUNCE_PX;
      state.decelerating = false;
      state.bouncing = true;
      state.bounceStartMs = now;
    }
  }

  private stepBounceReel(state: ReelState, now: number): boolean {
    const duration = this.reducedMotion ? BOUNCE_DURATION_MS * 0.55 : BOUNCE_DURATION_MS;
    const elapsed = now - state.bounceStartMs;
    const t = clamp(elapsed / duration, 0, 1);
    const eased = easeInOutSine(t);

    state.container.y = BOUNCE_PX * (1 - eased);

    if (t < 1) return false;

    state.container.y = 0;
    state.bouncing = false;
    return true;
  }

  private stopReel(reelIndex: number): void {
    const state = this.reels[reelIndex];
    const target = this.targetMatrix?.[reelIndex];
    if (!state || !target) return;

    state.spinning = false;
    state.decelerating = true;
    state.bouncing = false;

    const wrappedY = ((state.container.y % this.stepHeight) + this.stepHeight) % this.stepHeight;
    state.decelStartY = wrappedY;
    state.decelStartMs = performance.now();

    const strip = this.buildStopStrip(target);
    for (let i = 0; i < state.symbols.length; i++) {
      const sprite = state.symbols[i]!;
      sprite.texture = this.symbolTextures.texture(strip[i] ?? randomSymbolId());
      sprite.width = CELL_W;
      sprite.height = CELL_H;
      sprite.y = (i - 1) * this.stepHeight;
      sprite.visible = true;
      sprite.rotation = 0;
    }

    state.container.y = wrappedY;
  }

  private finishSpinCycle(): void {
    this.spinFinished = true;
    this.clearStopTimers();

    if (this.safetyTimer) {
      window.clearTimeout(this.safetyTimer);
      this.safetyTimer = 0;
    }

    this.presentWinningLines();
    this.options.onAllStopped?.();
  }

  private presentWinningLines(): void {
    this.clearWinTimers();
    this.winPresenter.clear();

    if (this.winningLines.length === 0 || this.lineDefs.length === 0) return;

    const lines = this.winningLines.slice(0, MAX_WIN_LINES_TO_PRESENT);

    if (this.reducedMotion) {
      this.winPresenter.present(lines, this.lineDefs, this.reels, true);
      const timerId = window.setTimeout(() => this.winPresenter.clear(), 520);
      this.winTimers.push(timerId);
      return;
    }

    let delay = 0;
    for (const line of lines) {
      const showTimer = window.setTimeout(() => {
        this.winPresenter.present([line], this.lineDefs, this.reels, false);
      }, delay);
      this.winTimers.push(showTimer);

      const weighted = WIN_LINE_SHOW_MIN_MS + line.payout * WIN_LINE_PAYOUT_SCALE;
      delay += clamp(weighted, WIN_LINE_SHOW_MIN_MS, WIN_LINE_SHOW_MAX_MS);
    }

    const clearTimer = window.setTimeout(() => {
      this.winPresenter.clear();
      this.clearWinTimers();
    }, delay + WIN_CLEAR_EXTRA_MS);
    this.winTimers.push(clearTimer);
  }

  private buildStopStrip(target: string[]): string[] {
    const row0 = target[0] ?? randomSymbolId();
    const row1 = target[1] ?? randomSymbolId();
    const row2 = target[2] ?? randomSymbolId();
    const strip = Array.from({ length: ROLLING_SYMBOLS }, () => randomSymbolId());

    // Keep the visible rows deterministic while preserving random symbols above/below.
    strip[1] = row0;
    strip[2] = row1;
    strip[3] = row2;

    return strip;
  }

  private fillReelWithRandomSymbols(state: ReelState): void {
    for (let i = 0; i < state.symbols.length; i++) {
      const sprite = state.symbols[i]!;
      sprite.texture = this.symbolTextures.texture(randomSymbolId());
      sprite.width = CELL_W;
      sprite.height = CELL_H;
      sprite.y = (i - 1) * this.stepHeight;
      sprite.visible = true;
      sprite.rotation = 0;
    }
  }

  private defaultIdleMatrix(): string[][] {
    // Build per-row shuffled pools so no row shows the same symbol twice.
    const rowPools: string[][] = Array.from({ length: ROWS }, () => {
      const pool = [...SYMBOL_IDS] as string[];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
      }
      return pool;
    });

    // matrix[reel][row]
    return Array.from({ length: REELS }, (_, reel) =>
      Array.from({ length: ROWS }, (_, row) => rowPools[row]![reel]!)
    );
  }

  private clearStopTimers(): void {
    if (this.stopTimers.length === 0) return;
    this.stopTimers.forEach((timer) => window.clearTimeout(timer));
    this.stopTimers = [];
  }

  private clearWinTimers(): void {
    if (this.winTimers.length === 0) return;
    this.winTimers.forEach((timer) => window.clearTimeout(timer));
    this.winTimers = [];
  }

  private clearTimers(): void {
    this.clearStopTimers();
    this.clearWinTimers();

    if (this.safetyTimer) {
      window.clearTimeout(this.safetyTimer);
      this.safetyTimer = 0;
    }
  }
}
