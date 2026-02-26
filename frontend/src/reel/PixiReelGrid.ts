/**
 * PixiJS ReelGrid: 5x3, spin/stop animation per design spec.
 */
import { Application, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import {
  Spine,
  SpineTexture,
  TextureAtlas,
  AtlasAttachmentLoader,
  SkeletonJson,
  type SkeletonData,
} from '@esotericsoftware/spine-pixi-v8';
import { SYMBOL_IDS, normalizeSymbolId, symbolColorNumber, symbolShortLabel } from '../symbols';

const REELS = 5;
const ROWS = 3;
const CELL_W = 172;
const CELL_H = 172;
const GAP = 8;

const FALLBACK_LINE_DEFS: number[][] = [];
const PAYLINE_COLORS = [
  0xfbbf24, // gold
  0x22d3ee, // cyan
  0xe879f9, // magenta
  0x84cc16, // lime
  0xfb7185, // rose
  0x60a5fa, // blue
  0xf97316, // orange
  0x34d399, // emerald
];
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

// ---------------------------------------------------------------------------
// Symbol rendering — card-style visuals with icons for special symbols
// ---------------------------------------------------------------------------

const CARD_RADIUS = 16;
const BOLD_FONT = 'Arial Black, Arial, Helvetica, sans-serif';
const LABEL_FONT = 'Arial, Helvetica, sans-serif';

function drawCardBase(
  root: Container,
  w: number,
  h: number,
  baseColor: number,
  accentColor: number,
  borderAlpha = 0.35
): void {
  const r = CARD_RADIUS;
  const bg = new Graphics();
  bg.roundRect(0, 0, w, h, r).fill(0x08080e);
  bg.roundRect(2, 2, w - 4, h - 4, r - 1).fill(baseColor);
  bg.roundRect(6, 6, w - 12, (h - 12) * 0.4, r - 3).fill({ color: 0xffffff, alpha: 0.04 });
  bg.roundRect(2, 2, w - 4, h - 4, r - 1).stroke({
    width: 1.5,
    color: accentColor,
    alpha: borderAlpha,
  });
  root.addChild(bg);
}

function addGlow(root: Container, cx: number, cy: number, radius: number, color: number): void {
  const g = new Graphics();
  g.circle(cx, cy, radius).fill({ color, alpha: 0.12 });
  g.circle(cx, cy, radius * 0.65).fill({ color, alpha: 0.1 });
  g.circle(cx, cy, radius * 0.35).fill({ color, alpha: 0.08 });
  root.addChild(g);
}

function buildCardSymbol(symbolId: string, w: number, h: number): Container {
  const root = new Container();
  const color = symbolColorNumber(symbolId);
  drawCardBase(root, w, h, 0x14141f, color);
  addGlow(root, w / 2, h / 2, 50, color);

  const label = new Text({
    text: symbolId,
    style: {
      fontFamily: BOLD_FONT,
      fontSize: symbolId.length > 1 ? 56 : 64,
      fontWeight: '900',
      fill: color,
      dropShadow: { color: 0x000000, alpha: 0.6, blur: 6, distance: 2, angle: Math.PI / 3 },
    },
  });
  label.anchor.set(0.5);
  label.x = w / 2;
  label.y = h / 2;
  root.addChild(label);
  return root;
}

function buildStarSymbol(w: number, h: number): Container {
  const root = new Container();
  const color = 0xf59e0b;
  const highlight = 0xfbbf24;
  drawCardBase(root, w, h, 0x1a1610, color, 0.45);

  const cx = w / 2;
  const cy = h / 2 - 8;
  addGlow(root, cx, cy, 55, highlight);

  const star = new Graphics();
  const outerR = 36;
  const innerR = 16;
  const pts = 5;
  const step = Math.PI / pts;
  const start = -Math.PI / 2;
  star.moveTo(cx + outerR * Math.cos(start), cy + outerR * Math.sin(start));
  for (let i = 1; i <= 2 * pts; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = start + i * step;
    star.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  star.closePath();
  star.fill(highlight);
  star.stroke({ width: 2, color: 0xfef3c7, alpha: 0.7 });
  root.addChild(star);

  const label = new Text({
    text: 'STAR',
    style: {
      fontFamily: LABEL_FONT,
      fontSize: 14,
      fontWeight: 'bold',
      fill: 0xfef3c7,
      letterSpacing: 3,
    },
  });
  label.anchor.set(0.5);
  label.x = w / 2;
  label.y = h - 24;
  root.addChild(label);
  return root;
}

function buildScatterSymbol(w: number, h: number): Container {
  const root = new Container();
  const color = 0x22d3ee;
  const highlight = 0x67e8f9;
  drawCardBase(root, w, h, 0x0f1a1e, color, 0.5);

  const cx = w / 2;
  const cy = h / 2 - 10;
  addGlow(root, cx, cy, 55, color);

  const gw = 52;
  const gh = 58;
  const gem = new Graphics();
  gem.moveTo(cx, cy - gh / 2);
  gem.lineTo(cx + gw / 2, cy);
  gem.lineTo(cx, cy + gh / 2);
  gem.lineTo(cx - gw / 2, cy);
  gem.closePath();
  gem.fill(color);
  gem.stroke({ width: 2, color: highlight, alpha: 0.8 });
  gem.moveTo(cx - gw / 4, cy - gh / 5);
  gem.lineTo(cx + gw / 4, cy - gh / 5);
  gem.lineTo(cx + gw / 2 - 4, cy);
  gem.stroke({ width: 1, color: 0xffffff, alpha: 0.25 });
  root.addChild(gem);

  const sparkles = new Graphics();
  const dots: [number, number][] = [
    [cx - 28, cy - 22],
    [cx + 30, cy - 18],
    [cx - 24, cy + 20],
    [cx + 26, cy + 24],
  ];
  for (const [sx, sy] of dots) {
    sparkles.circle(sx, sy, 2).fill({ color: highlight, alpha: 0.6 });
  }
  root.addChild(sparkles);

  const label = new Text({
    text: 'SCATTER',
    style: {
      fontFamily: LABEL_FONT,
      fontSize: 13,
      fontWeight: 'bold',
      fill: highlight,
      letterSpacing: 2,
    },
  });
  label.anchor.set(0.5);
  label.x = w / 2;
  label.y = h - 22;
  root.addChild(label);
  return root;
}

function buildWildSymbol(w: number, h: number): Container {
  const root = new Container();
  const color = 0xe879f9;
  const r = CARD_RADIUS;

  const bg = new Graphics();
  bg.roundRect(0, 0, w, h, r).fill(0x08080e);
  bg.roundRect(2, 2, w - 4, h - 4, r - 1).fill(0x2d1b4e);
  bg.roundRect(6, 6, w - 12, (h - 12) * 0.5, r - 3).fill({ color: 0x7c3aed, alpha: 0.25 });
  bg.roundRect(2, 2, w - 4, h - 4, r - 1).stroke({ width: 2, color, alpha: 0.6 });
  root.addChild(bg);

  addGlow(root, w / 2, h / 2, 60, color);

  const label = new Text({
    text: 'WILD',
    style: {
      fontFamily: BOLD_FONT,
      fontSize: 44,
      fontWeight: '900',
      fill: 0xffffff,
      dropShadow: { color: 0x7c3aed, alpha: 0.8, blur: 8, distance: 0, angle: 0 },
      stroke: { color, width: 3 },
    },
  });
  label.anchor.set(0.5);
  label.x = w / 2;
  label.y = h / 2;
  root.addChild(label);
  return root;
}

function buildSymbolContainer(symbolId: string, width: number, height: number): Container {
  const id = normalizeSymbolId(symbolId);
  switch (id) {
    case 'Wild':
      return buildWildSymbol(width, height);
    case 'Scatter':
      return buildScatterSymbol(width, height);
    case 'Star':
      return buildStarSymbol(width, height);
    default:
      return buildCardSymbol(id, width, height);
  }
}

/**
 * Pre-renders every symbol into a GPU texture once. During spins the grid
 * stamps out lightweight Sprite clones instead of rebuilding Graphics+Text
 * objects each frame — eliminates GC pressure and reduces draw calls.
 *
 * To swap in real artwork, replace `buildSymbolContainer` above with atlas
 * lookups; the rest of the pipeline stays unchanged.
 */
class SymbolTextureCache {
  private textures = new Map<string, Texture>();

  constructor(
    private renderer: Application['renderer'],
    private cellWidth: number,
    private cellHeight: number
  ) {}

  warm(): void {
    for (const id of SYMBOL_IDS) {
      this.resolve(id);
    }
  }

  private resolve(symbolId: string): Texture {
    const key = normalizeSymbolId(symbolId);
    const existing = this.textures.get(key);
    if (existing) return existing;

    const gfx = buildSymbolContainer(key, this.cellWidth, this.cellHeight);
    const texture = this.renderer.generateTexture({
      target: gfx,
      resolution: Math.min(2, window.devicePixelRatio || 1),
    });
    gfx.destroy(true);
    this.textures.set(key, texture);
    return texture;
  }

  sprite(symbolId: string): Sprite {
    return new Sprite(this.resolve(symbolId));
  }

  getTexture(symbolId: string): Texture {
    return this.resolve(symbolId);
  }

  destroy(): void {
    this.textures.forEach((t) => t.destroy(true));
    this.textures.clear();
  }
}

// ---------------------------------------------------------------------------
// Spine-driven symbol animations (idle pulse, win bounce)
// ---------------------------------------------------------------------------

const SPINE_ATLAS_TEXT = [
  'symbol.png',
  `size: ${CELL_W}, ${CELL_H}`,
  'filter: Linear, Linear',
  'symbol',
  `  bounds: 0, 0, ${CELL_W}, ${CELL_H}`,
].join('\n');

const SPINE_SKELETON_JSON = {
  skeleton: { spine: '4.2.0', width: CELL_W, height: CELL_H },
  bones: [{ name: 'root' }],
  slots: [{ name: 'symbol', bone: 'root', attachment: 'symbol' }],
  skins: [
    {
      name: 'default',
      attachments: {
        symbol: { symbol: { width: CELL_W, height: CELL_H } },
      },
    },
  ],
  animations: {
    idle: {
      bones: {
        root: {
          scale: [
            { time: 0, x: 1, y: 1 },
            { time: 0.8, x: 1.025, y: 1.025 },
            { time: 1.6, x: 1, y: 1 },
          ],
        },
      },
    },
    win: {
      bones: {
        root: {
          scale: [
            { time: 0, x: 1, y: 1 },
            { time: 0.08, x: 1.22, y: 1.22 },
            { time: 0.2, x: 0.92, y: 0.92 },
            { time: 0.32, x: 1.1, y: 1.1 },
            { time: 0.45, x: 0.97, y: 0.97 },
            { time: 0.55, x: 1, y: 1 },
          ],
        },
      },
    },
  },
};

/**
 * Creates Spine instances that use our programmatic symbol textures as
 * region attachments. No external Spine/atlas files required — skeleton
 * data and atlas are generated at runtime from the texture cache.
 *
 * When an artist provides real `.skel` + `.atlas` assets, swap this
 * factory to load from files via `Spine.from()` instead.
 */
class SpineSymbolFactory {
  private cache = new Map<string, SkeletonData>();

  constructor(private textures: SymbolTextureCache) {}

  create(symbolId: string): Spine {
    const key = normalizeSymbolId(symbolId);
    let data = this.cache.get(key);
    if (!data) {
      const pixiTex = this.textures.getTexture(key);
      const atlas = new TextureAtlas(SPINE_ATLAS_TEXT);
      atlas.pages[0]!.setTexture(SpineTexture.from(pixiTex.source));
      const json = new SkeletonJson(new AtlasAttachmentLoader(atlas));
      data = json.readSkeletonData(SPINE_SKELETON_JSON);
      this.cache.set(key, data);
    }
    return new Spine({ skeletonData: data, autoUpdate: true });
  }

  destroy(): void {
    this.cache.clear();
  }
}

export interface ReelGridOptions {
  width: number;
  height: number;
  lineDefs?: number[][];
  safeTop?: number;
  safeBottom?: number;
  safeLeft?: number;
  safeRight?: number;
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

interface WinningLineInfo {
  lineIndex: number;
  symbol: string;
  count: number;
  payout: number;
}

export class ReelGrid {
  app: Application;
  container: Container;
  reels: ReelState[] = [];
  options: ReelGridOptions;
  private symbolTextures!: SymbolTextureCache;
  private spineFactory!: SpineSymbolFactory;
  private activeSpines: Spine[] = [];
  private targetMatrix: string[][] | null = null;
  private stopTimers: number[] = [];
  private safetyTimeoutId: number = 0;
  private spinFinished = false;
  private tickerBound: (ticker: { deltaTime: number }) => void = () => {};
  private stepHeight: number;
  private paylinesContainer: Container | null = null;
  private winningLines: WinningLineInfo[] = [];
  private lineDefs: number[][] = [];

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
    grid.symbolTextures = new SymbolTextureCache(grid.app.renderer, CELL_W, CELL_H);
    grid.symbolTextures.warm();
    grid.spineFactory = new SpineSymbolFactory(grid.symbolTextures);
    grid.setupScene();
    return grid;
  }

  private constructor(options: ReelGridOptions) {
    this.options = options;
    this.stepHeight = CELL_H + GAP;
    this.app = new Application();
    this.container = new Container();
    this.lineDefs = this.normalizeLineDefs(options.lineDefs ?? FALLBACK_LINE_DEFS);
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

  setLineDefs(lineDefs: number[][]) {
    this.lineDefs = this.normalizeLineDefs(lineDefs);
    this.winningLines = this.winningLines.filter(
      (line) => line.lineIndex >= 0 && line.lineIndex < this.lineDefs.length
    );
  }

  private layoutContainer(width: number, height: number) {
    const cellTotalW = REELS * CELL_W + (REELS - 1) * GAP;
    const cellTotalH = ROWS * this.stepHeight - GAP;
    const safeTop = Math.max(0, this.options.safeTop ?? 0);
    const safeBottom = Math.max(0, this.options.safeBottom ?? 0);
    const safeLeft = Math.max(0, this.options.safeLeft ?? 0);
    const safeRight = Math.max(0, this.options.safeRight ?? 0);
    const availableWidth = Math.max(1, width - safeLeft - safeRight);
    const availableHeight = Math.max(1, height - safeTop - safeBottom);
    const scale = Math.min(availableWidth / cellTotalW, availableHeight / cellTotalH, 1.5);
    this.container.scale.set(scale);
    this.container.x = safeLeft + (availableWidth - cellTotalW * scale) / 2;
    this.container.y = safeTop + (availableHeight - cellTotalH * scale) / 2;
  }

  private setupScene() {
    const options = this.options;
    const cellTotalW = REELS * CELL_W + (REELS - 1) * GAP;
    const cellTotalH = ROWS * this.stepHeight - GAP;
    this.layoutContainer(options.width, options.height);
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

  /** Set winning line data for line drawing, symbol highlight and payout labels. */
  setWinningLines(lines: WinningLineInfo[]) {
    this.winningLines = lines
      .filter((line) => line.lineIndex >= 0 && line.lineIndex < this.lineDefs.length)
      .sort((a, b) => b.payout - a.payout);
  }

  private getLineColor(lineIndex: number): number {
    return PAYLINE_COLORS[lineIndex % PAYLINE_COLORS.length]!;
  }

  private drawWinningCells() {
    if (!this.paylinesContainer || this.winningLines.length === 0) return;
    const byCell = new Map<
      string,
      { reel: number; row: number; color: number; overlaps: number }
    >();

    for (const line of this.winningLines) {
      const path = this.lineDefs[line.lineIndex];
      if (!path) continue;
      for (let reel = 0; reel < Math.min(line.count, REELS); reel++) {
        const row = path[reel];
        if (row == null) continue;
        const key = `${reel}-${row}`;
        const existing = byCell.get(key);
        if (existing) {
          existing.overlaps += 1;
          continue;
        }
        byCell.set(key, { reel, row, color: this.getLineColor(line.lineIndex), overlaps: 1 });
      }
    }

    byCell.forEach((cell) => {
      const x = cell.reel * (CELL_W + GAP);
      const y = cell.row * this.stepHeight;
      const glow = new Graphics();
      const glowColor = cell.overlaps > 1 ? 0xffffff : cell.color;
      glow
        .roundRect(x + 6, y + 6, CELL_W - 12, CELL_H - 12, 14)
        .fill({ color: glowColor, alpha: 0.17 });
      glow.roundRect(x + 6, y + 6, CELL_W - 12, CELL_H - 12, 14).stroke({
        width: cell.overlaps > 1 ? 4 : 3,
        color: glowColor,
        alpha: cell.overlaps > 1 ? 0.95 : 0.8,
      });
      this.paylinesContainer?.addChild(glow);
    });
  }

  private drawWinningLines() {
    if (!this.paylinesContainer || this.winningLines.length === 0) return;
    this.paylinesContainer.removeChildren();
    this.drawWinningCells();
    for (const winningLine of this.winningLines) {
      const path = this.lineDefs[winningLine.lineIndex];
      if (!path || path.length !== REELS) continue;
      const points: number[] = [];
      for (let r = 0; r < REELS; r++) {
        const row = path[r] ?? 1;
        const x = r * (CELL_W + GAP) + CELL_W / 2;
        const y = row * this.stepHeight + CELL_H / 2;
        points.push(x, y);
      }
      const lineGraphic = new Graphics();
      lineGraphic.moveTo(points[0]!, points[1]!);
      for (let i = 2; i < points.length; i += 2) lineGraphic.lineTo(points[i]!, points[i + 1]!);
      const color = this.getLineColor(winningLine.lineIndex);
      lineGraphic.stroke({ width: PAYLINE_GLOW_WIDTH, color, alpha: PAYLINE_ALPHA * 0.35 });
      lineGraphic.stroke({ width: PAYLINE_WIDTH, color, alpha: PAYLINE_ALPHA });
      this.paylinesContainer.addChild(lineGraphic);

      const lastX = points[points.length - 2]!;
      const lastY = points[points.length - 1]!;
      const labelBg = new Graphics();
      const labelWidth = 176;
      const maxX = REELS * (CELL_W + GAP) - labelWidth - 12;
      const labelX = Math.max(6, Math.min(lastX + 10, maxX));
      const labelY = Math.max(6, lastY - 28);
      labelBg
        .roundRect(labelX - 6, labelY - 6, labelWidth, 28, 8)
        .fill({ color: 0x09090f, alpha: 0.78 });
      labelBg
        .roundRect(labelX - 6, labelY - 6, labelWidth, 28, 8)
        .stroke({ width: 1, color, alpha: 0.9 });
      this.paylinesContainer.addChild(labelBg);

      const payoutLabel = new Text({
        text: `L${winningLine.lineIndex + 1} ${symbolShortLabel(winningLine.symbol)}x${winningLine.count}  +${winningLine.payout.toFixed(2)}`,
        style: {
          fontSize: 12,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
      });
      payoutLabel.x = labelX;
      payoutLabel.y = labelY;
      this.paylinesContainer.addChild(payoutLabel);
    }
    this.animateWinningCells();
  }

  private animateWinningCells() {
    this.clearWinAnimations();
    if (this.winningLines.length === 0 || !this.targetMatrix) return;

    const visited = new Set<string>();
    for (const line of this.winningLines) {
      const path = this.lineDefs[line.lineIndex];
      if (!path) continue;
      for (let reel = 0; reel < Math.min(line.count, REELS); reel++) {
        const row = path[reel];
        if (row == null) continue;
        const cellKey = `${reel}-${row}`;
        if (visited.has(cellKey)) continue;
        visited.add(cellKey);

        const sym = this.targetMatrix[reel]?.[row];
        if (!sym) continue;

        const spine = this.spineFactory.create(sym);
        spine.x = reel * (CELL_W + GAP) + CELL_W / 2;
        spine.y = row * this.stepHeight + CELL_H / 2;

        const reelState = this.reels[reel]!;
        const staticSprite = reelState.container.children[row];
        if (staticSprite) staticSprite.visible = false;

        this.container.addChild(spine);
        spine.state.setAnimation(0, 'win', false);
        spine.state.addAnimation(0, 'idle', true, 0);
        this.activeSpines.push(spine);
      }
    }
  }

  private clearWinAnimations() {
    for (const spine of this.activeSpines) {
      spine.destroy();
    }
    this.activeSpines = [];
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
        const s = this.symbolTextures.sprite(sym);
        s.y = row * this.stepHeight;
        container.addChild(s);
      }
    }
  }

  spinThenStop(outcomeMatrix: string[][], winningLines: WinningLineInfo[] = []) {
    if (this.reels.some((r) => r.spinning || r.decelerating || r.bouncing)) return;
    this.spinFinished = false;
    this.clearWinAnimations();
    this.setWinningLines(winningLines);
    if (this.paylinesContainer) this.paylinesContainer.removeChildren();
    this.targetMatrix = outcomeMatrix.map((col) => [...col]);

    for (let r = 0; r < REELS; r++) {
      const { container } = this.reels[r]!;
      this.reels[r]!.spinning = true;
      container.removeChildren();
      container.y = 0;
      for (let i = 0; i < 5; i++) {
        const sym = SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)]!;
        const s = this.symbolTextures.sprite(sym);
        s.y = i * this.stepHeight;
        container.addChild(s);
      }
    }

    this.tickerBound = (ticker: { deltaTime: number }) => this.updateSpin(ticker.deltaTime);
    this.app.ticker.add(this.tickerBound);

    const baseStopTime = INITIAL_SPIN_MS;
    for (let r = 0; r < REELS; r++) {
      this.stopTimers[r] = window.setTimeout(
        () => {
          this.stopReel(r);
        },
        baseStopTime + r * REEL_STOP_DELAY_MS
      );
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
    const strip = [
      target[0] ?? '10',
      target[1] ?? '10',
      target[2] ?? '10',
      target[0] ?? '10',
      target[1] ?? '10',
    ];
    reel.removeChildren();
    for (let i = 0; i < strip.length; i++) {
      const s = this.symbolTextures.sprite(strip[i]!);
      s.y = i * this.stepHeight;
      reel.addChild(s);
    }
    reel.y = wrapY;
  }

  /** Resize canvas and reposition grid without destroying (e.g. when DevTools opens). */
  resize(
    width: number,
    height: number,
    safeArea?: Pick<ReelGridOptions, 'safeTop' | 'safeBottom' | 'safeLeft' | 'safeRight'>
  ) {
    this.options = { ...this.options, width, height, ...safeArea };
    this.app.renderer.resize(width, height);
    this.layoutContainer(width, height);
  }

  destroy() {
    this.stopTimers.forEach(clearTimeout);
    if (this.safetyTimeoutId) window.clearTimeout(this.safetyTimeoutId);
    this.app.ticker.remove(this.tickerBound);
    this.clearWinAnimations();
    this.spineFactory.destroy();
    this.symbolTextures.destroy();
    this.app.destroy(true, { children: true });
  }
}
