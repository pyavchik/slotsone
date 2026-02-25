const CANONICAL_SYMBOL_COLORS: Record<string, number> = {
  '10': 0x4ade80,
  J: 0x60a5fa,
  Q: 0xa78bfa,
  K: 0xf472b6,
  A: 0xfbbf24,
  Star: 0xf59e0b,
  Scatter: 0x22d3ee,
  Wild: 0xe879f9,
};

const THEMED_ALIASES: Record<string, string> = {
  pharaoh: 'A',
  scarab: 'K',
  ankh: 'Q',
  eye_of_ra: 'J',
  eyeofra: 'J',
  sun_disk: 'Star',
  sundisk: 'Star',
  coin: '10',
};

const THEMED_COLORS: Record<string, number> = {
  pharaoh: 0xfbbf24,
  scarab: 0x22d3ee,
  ankh: 0xa78bfa,
  eye_of_ra: 0xfb7185,
  eyeofra: 0xfb7185,
  sun_disk: 0xf59e0b,
  sundisk: 0xf59e0b,
  coin: 0x4ade80,
};

function normalizeKey(symbolId: string): string {
  return symbolId
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function fallbackColor(symbolId: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < symbolId.length; i++) {
    hash ^= symbolId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // Keep colors in a visible range and avoid too-dark tones.
  const r = 96 + ((hash >>> 16) & 0x5f);
  const g = 96 + ((hash >>> 8) & 0x5f);
  const b = 96 + (hash & 0x5f);
  return (r << 16) | (g << 8) | b;
}

export function normalizeSymbolId(symbolId: string): string {
  const trimmed = symbolId.trim();
  if (!trimmed) return symbolId;
  const alias = THEMED_ALIASES[normalizeKey(trimmed)];
  return alias ?? trimmed;
}

export function symbolLabel(symbolId: string): string {
  const trimmed = symbolId.trim();
  if (!trimmed) return symbolId;
  const normalized = normalizeSymbolId(trimmed);
  if (normalized !== trimmed) return toTitleCase(trimmed);
  return trimmed;
}

export function symbolShortLabel(symbolId: string): string {
  const normalized = normalizeSymbolId(symbolId);
  if (normalized.length <= 2) return normalized;
  if (normalized === 'Star' || normalized === 'Wild') return normalized.slice(0, 2);

  const themed = symbolLabel(symbolId);
  if (themed !== normalized && themed !== symbolId) {
    const words = themed.split(' ').filter(Boolean);
    if (words.length >= 2) {
      return `${words[0]![0]}${words[words.length - 1]![0]}`.toUpperCase();
    }
  }

  return normalized.slice(0, 2).toUpperCase();
}

export function symbolColorNumber(symbolId: string): number {
  const key = normalizeKey(symbolId);
  const themedColor = THEMED_COLORS[key];
  if (themedColor != null) return themedColor;

  const normalized = normalizeSymbolId(symbolId);
  const canonical = CANONICAL_SYMBOL_COLORS[normalized];
  if (canonical != null) return canonical;

  return fallbackColor(symbolId);
}

export function symbolColorCss(symbolId: string): string {
  return `#${symbolColorNumber(symbolId).toString(16).padStart(6, '0')}`;
}
