import type { PaletteKey } from './types';

// Each swatch has a dark-mode and a light-mode value. Coral (the one orange) sits fourth
// so it's never the default, and tag dots never pick it on their own.
export const PALETTE: Record<PaletteKey, { dark: string; light: string; label: string }> = {
  blue: { dark: '#7C8CF8', light: '#6A7FEF', label: 'Periwinkle' },
  sky: { dark: '#5BB4FF', light: '#3E9FE0', label: 'Sky' },
  green: { dark: '#46D483', light: '#2FAE68', label: 'Green' },
  coral: { dark: '#FF7A45', light: '#E2734A', label: 'Coral' },
  teal: { dark: '#2ED3C6', light: '#22ABA2', label: 'Teal' },
  gold: { dark: '#FFC24B', light: '#D59B1C', label: 'Gold' },
  lilac: { dark: '#B99CFF', light: '#9B7FE6', label: 'Lilac' },
  pink: { dark: '#FF86B8', light: '#E06C9C', label: 'Pink' },
};

export const PALETTE_KEYS = Object.keys(PALETTE) as PaletteKey[];

export const colorOf = (key: PaletteKey | undefined, theme: 'dark' | 'light') =>
  PALETTE[key ?? 'sky']?.[theme] ?? PALETTE.sky[theme];

export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const TAG_KEYS = PALETTE_KEYS.filter((k) => k !== 'coral');

/** Tag dot colors are picked from the palette by hashing the tag text, so a tag keeps its color. */
export const tagColorKey = (tag: string): PaletteKey => {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_KEYS[h % TAG_KEYS.length];
};
