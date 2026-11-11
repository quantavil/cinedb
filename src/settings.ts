import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { DEFAULT, RATING_MAX, RATING_MIN, type Query, type Sort } from './filter.ts';

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  density: 'compact' | 'comfortable' | 'large';
  sort: Sort;
  rating: number; // minimum x10
  rmax: number; // maximum x10
  votes: number;
  types: number; // bitmask, 0 = any
}

export const FACTORY: Settings = {
  theme: 'system',
  density: 'comfortable',
  sort: 'rank',
  rating: RATING_MIN,
  rmax: RATING_MAX,
  votes: 0,
  types: 0,
};

const KEY = 'settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...FACTORY, ...JSON.parse(raw) } : FACTORY;
  } catch {
    return FACTORY;
  }
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* in-memory only */
  }
}

/** The query a fresh visit starts from. */
const defaultsOf = (s: Settings): Query => ({
  ...DEFAULT,
  sort: s.sort,
  rating: s.rating,
  rmax: s.rmax,
  votes: s.votes,
  types: s.types,
});

export function applySettings(s: Settings): void {
  const el = document.documentElement;
  el.dataset.theme = s.theme;
  el.dataset.density = s.density;
}

/** Settings state: persisted and applied to the page on change, plus the query a fresh visit starts from. */
export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);
  const def = useMemo(() => defaultsOf(settings), [settings]);
  useEffect(() => {
    saveSettings(settings);
    applySettings(settings);
  }, [settings]);
  const change = useCallback((patch: Partial<Settings>) => setSettings((p) => ({ ...p, ...patch })), []);
  return { settings, def, change };
}
