import { fmtRating, type Title } from './data.ts';
import type { Marks } from './marks.ts';
import { search } from './search.ts';

export const SORTS = ['rank', 'rising', 'rating', 'votes', 'year', 'wins', 'title', 'meta'] as const;
export type Sort = (typeof SORTS)[number];
export const SORT_LABEL: Record<Sort, string> = {
  rank: 'Popularity',
  rising: 'Rising this week',
  rating: 'Rating',
  votes: 'Votes',
  year: 'Newest',
  wins: 'Most awards',
  title: 'Title A–Z',
  meta: 'Metascore',
};

export const VOTES = [0, 10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
export const RATING_MIN = 10;
export const RATING_MAX = 100;
export const voteLabel = (v: number) => (v ? `${v >= 1e6 ? '1M' : `${v / 1000}K`}+` : 'Any');

/** Words for a rating range; the defaults (RATING_MIN, RATING_MAX) mean no limit on that side. */
export function ratingSpan(min: number, max: number): string {
  const lo = min > RATING_MIN;
  const hi = max < RATING_MAX;
  if (lo && hi) return `${fmtRating(min)}–${fmtRating(max)}`;
  if (lo) return `${fmtRating(min)}+`;
  if (hi) return `Up to ${fmtRating(max)}`;
  return 'Any';
}

/** Slider ranges taken from the data: ratings rounded outward to whole stars, years to the decade. */
export type Domains = ReturnType<typeof domains>;
export function domains(titles: Title[]) {
  let r0 = RATING_MAX,
    r1 = 0,
    y0 = 9999,
    y1 = 0;
  for (const t of titles) {
    if (t.rating < r0) r0 = t.rating;
    if (t.rating > r1) r1 = t.rating;
    if (t.year && t.year < y0) y0 = t.year;
    if (t.year > y1) y1 = t.year;
  }
  if (!titles.length) return { rating: [30, RATING_MAX] as const, year: [1950, 2026] as const };
  return {
    rating: [Math.floor(r0 / 10) * 10, Math.ceil(r1 / 10) * 10] as const,
    year: [Math.floor(y0 / 10) * 10, y1] as const,
  };
}

/** How many titles match q once `patch` is applied. Used for live option counts. */
export const countWith = (all: Title[], q: Query, marks: Marks, patch: Partial<Query>) =>
  filterTitles(all, { ...q, ...patch, sort: 'rank' }, marks).length;

/** '' all, w watchlist, s seen, u unmarked */
export type MarkFilter = '' | 'w' | 's' | 'u';

export interface Query {
  q: string;
  types: number; // bitmask over TYPES, 0 = any
  genres: number; // bitmask, title must have all, 0 = any
  certs: number; // bitmask, title must have one of them, 0 = any
  lang: string; // spoken language, '' = any
  country: string; // country of origin, '' = any
  rating: number; // minimum, x10
  rmax: number; // maximum, x10
  votes: number; // minimum
  from: number; // year, 0 = any
  to: number;
  mark: MarkFilter;
  sort: Sort;
}

export const DEFAULT: Query = {
  q: '',
  types: 0,
  genres: 0,
  certs: 0,
  lang: '',
  country: '',
  rating: RATING_MIN,
  rmax: RATING_MAX,
  votes: 0,
  from: 0,
  to: 0,
  mark: '',
  sort: 'rank',
};

export function filterTitles(all: Title[], q: Query, marks: Marks): Title[] {
  const hits = q.q.trim() ? search(all, q.q) : null;
  const out = all.filter((t) => {
    if (q.types && !(q.types & (1 << t.type))) return false;
    if (q.genres && (t.g & q.genres) !== q.genres) return false;
    if (q.certs && !(t.ce & q.certs)) return false;
    if (q.lang && !t.langs.includes(q.lang)) return false;
    if (q.country && !t.countries.includes(q.country)) return false;
    if (t.rating < q.rating || t.rating > q.rmax || t.votes < q.votes) return false;
    if (q.from && t.year < q.from) return false;
    if (q.to && t.year > q.to) return false;
    if (q.mark) {
      const m = marks[t.id]?.m;
      if (q.mark === 'u' ? m : m !== q.mark) return false;
    }
    return !hits || hits.has(t);
  });
  const key: Record<Sort, (a: Title, b: Title) => number> = {
    // A search ranks by relevance; without one, `all` is already in popularity order.
    rank: (a, b) => hits!.get(a)! - hits!.get(b)!,
    rating: (a, b) => b.rating - a.rating || b.votes - a.votes,
    votes: (a, b) => b.votes - a.votes,
    rising: (a, b) => b.rankChange - a.rankChange,
    year: (a, b) => b.date - a.date,
    wins: (a, b) => b.wins - a.wins || b.noms - a.noms,
    title: (a, b) => a.title.localeCompare(b.title),
    meta: (a, b) => b.meta - a.meta,
  };
  // Array.prototype.sort is stable, so ties keep popularity order.
  return q.sort === 'rank' && !hits ? out : out.sort(key[q.sort]);
}

const P: [keyof Query, string][] = [
  ['q', 'q'],
  ['types', 't'],
  ['genres', 'g'],
  ['certs', 'ce'],
  ['lang', 'l'],
  ['country', 'c'],
  ['rating', 'r'],
  ['rmax', 'rx'],
  ['votes', 'v'],
  ['from', 'f'],
  ['to', 'to'],
  ['mark', 'm'],
  ['sort', 's'],
];

/** Query string with defaults omitted, so the bare URL is the default view. */
export function toQuery(q: Query, def: Query = DEFAULT): string {
  const p = new URLSearchParams();
  for (const [k, name] of P) if (q[k] !== def[k]) p.set(name, String(q[k]));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function fromQuery(search: string, def: Query = DEFAULT): Query {
  const p = new URLSearchParams(search);
  const q: Query = { ...def };
  const int = (v: string | null, d: number) => (v !== null && /^\d{1,10}$/.test(v) ? Number(v) : d);
  q.q = p.get('q') ?? '';
  q.types = int(p.get('t'), def.types);
  q.genres = int(p.get('g'), 0);
  q.certs = int(p.get('ce'), 0);
  q.lang = p.get('l') ?? '';
  q.country = p.get('c') ?? '';
  q.rating = int(p.get('r'), def.rating);
  q.rmax = int(p.get('rx'), def.rmax);
  q.votes = int(p.get('v'), def.votes);
  q.from = int(p.get('f'), 0);
  q.to = int(p.get('to'), 0);
  // A hand-edited URL can cross a range; an empty list with no way to see why is worse than ignoring it.
  if (q.rmax < q.rating) q.rmax = RATING_MAX;
  if (q.to && q.to < q.from) q.to = 0;
  const m = p.get('m');
  if (m === 'w' || m === 's' || m === 'u') q.mark = m;
  const s = p.get('s');
  if ((SORTS as readonly string[]).includes(s ?? '')) q.sort = s as Sort;
  return q;
}

export const isDefault = (q: Query, def: Query = DEFAULT) => toQuery(q, def) === '';

/** Counts of values in n equal bins across [min, max]; out-of-range values are ignored. */
export function histogram(values: number[], min: number, max: number, n: number): number[] {
  const bins = Array.from({ length: n }, () => 0);
  const w = (max - min) / n;
  for (const v of values) if (v >= min && v <= max) bins[Math.min(n - 1, Math.floor((v - min) / w))]!++;
  return bins;
}
