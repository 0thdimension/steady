import { daysBetween } from './dates';

interface Quote { text: string; source: string }

// quotes.ts is loaded if it's there, so the app still runs (without a quote card) if it's missing.
const mods = import.meta.glob<{ QUOTES: Quote[] }>('./quotes.ts', { eager: true });
const QUOTES: Quote[] = Object.values(mods)[0]?.QUOTES ?? [];

/** Walks through every quote in order, one a day, then starts over. `shift` steps ahead for "Next". */
export const quoteFor = (date: string, shift = 0) => {
  if (!QUOTES.length) return null;
  const n = daysBetween('2026-01-01', date) + shift;
  return QUOTES[((n % QUOTES.length) + QUOTES.length) % QUOTES.length];
};
