import { describe, it, expect } from 'vitest';
import {
  normalizeSymbolId,
  symbolLabel,
  symbolShortLabel,
  symbolColorNumber,
  symbolColorCss,
  symbolImageFileName,
} from './symbols';

describe('normalizeSymbolId', () => {
  it('returns canonical IDs unchanged', () => {
    expect(normalizeSymbolId('A')).toBe('A');
    expect(normalizeSymbolId('Wild')).toBe('Wild');
    expect(normalizeSymbolId('Scatter')).toBe('Scatter');
    expect(normalizeSymbolId('10')).toBe('10');
  });

  it('maps themed aliases to canonical IDs', () => {
    expect(normalizeSymbolId('pharaoh')).toBe('A');
    expect(normalizeSymbolId('scarab')).toBe('K');
    expect(normalizeSymbolId('ankh')).toBe('Q');
    expect(normalizeSymbolId('eye_of_ra')).toBe('J');
    expect(normalizeSymbolId('sun_disk')).toBe('Star');
    expect(normalizeSymbolId('coin')).toBe('10');
  });

  it('is case-insensitive for aliases', () => {
    expect(normalizeSymbolId('PHARAOH')).toBe('A');
    expect(normalizeSymbolId('Scarab')).toBe('K');
  });

  it('trims whitespace', () => {
    expect(normalizeSymbolId('  A  ')).toBe('A');
    expect(normalizeSymbolId(' pharaoh ')).toBe('A');
  });

  it('passes through unknown symbols', () => {
    expect(normalizeSymbolId('mystery')).toBe('mystery');
  });

  it('returns empty string unchanged', () => {
    expect(normalizeSymbolId('')).toBe('');
  });
});

describe('symbolLabel', () => {
  it('returns canonical IDs as-is', () => {
    expect(symbolLabel('A')).toBe('A');
    expect(symbolLabel('Wild')).toBe('Wild');
  });

  it('returns title-cased themed name for aliases', () => {
    expect(symbolLabel('pharaoh')).toBe('Pharaoh');
    expect(symbolLabel('eye_of_ra')).toBe('Eye Of Ra');
    expect(symbolLabel('sun_disk')).toBe('Sun Disk');
  });
});

describe('symbolShortLabel', () => {
  it('returns short canonical IDs unchanged', () => {
    expect(symbolShortLabel('A')).toBe('A');
    expect(symbolShortLabel('10')).toBe('10');
    expect(symbolShortLabel('K')).toBe('K');
  });

  it('shortens Wild and Star', () => {
    expect(symbolShortLabel('Wild')).toBe('Wi');
    expect(symbolShortLabel('Star')).toBe('St');
  });

  it('produces short label for themed aliases that map to single-char IDs', () => {
    // eye_of_ra maps to J (single char), so shortLabel is just 'J'
    expect(symbolShortLabel('eye_of_ra')).toBe('J');
    // sun_disk maps to Star, which is shortened to 'St'
    expect(symbolShortLabel('sun_disk')).toBe('St');
  });
});

describe('symbolColorNumber', () => {
  it('returns canonical colors for known symbols', () => {
    expect(symbolColorNumber('A')).toBe(0xfbbf24);
    expect(symbolColorNumber('Wild')).toBe(0xe879f9);
  });

  it('returns themed colors for aliases', () => {
    expect(symbolColorNumber('pharaoh')).toBe(0xfbbf24);
    expect(symbolColorNumber('scarab')).toBe(0x22d3ee);
  });

  it('produces a deterministic fallback for unknown symbols', () => {
    const c1 = symbolColorNumber('mystery');
    const c2 = symbolColorNumber('mystery');
    expect(c1).toBe(c2);
    expect(c1).toBeGreaterThan(0);
  });

  it('produces different colors for different unknown symbols', () => {
    expect(symbolColorNumber('alpha')).not.toBe(symbolColorNumber('beta'));
  });
});

describe('symbolColorCss', () => {
  it('formats as a 6-digit hex string', () => {
    const css = symbolColorCss('A');
    expect(css).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('symbolImageFileName', () => {
  it('returns known filenames for canonical symbols', () => {
    expect(symbolImageFileName('A')).toBe('a.png');
    expect(symbolImageFileName('Wild')).toBe('wild.png');
    expect(symbolImageFileName('Scatter')).toBe('scatter.png');
    expect(symbolImageFileName('10')).toBe('10.png');
  });

  it('maps themed aliases to canonical filenames', () => {
    expect(symbolImageFileName('pharaoh')).toBe('a.png');
  });

  it('generates a filename for unknown symbols', () => {
    expect(symbolImageFileName('mystery')).toBe('mystery.png');
  });

  it('resolves themed alias to canonical filename', () => {
    // 'Eye of Ra' is a themed alias for J
    expect(symbolImageFileName('Eye of Ra')).toBe('j.png');
  });
});
