import fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import { SORTS, fromQuery, histogram, toQuery, type Query } from '../src/filter.ts';

const int = (max: number) => fc.integer({ min: 0, max });
const query: fc.Arbitrary<Query> = fc
  .record({
    q: fc.string(),
    types: int(15),
    genres: int(2 ** 20),
    certs: int(2 ** 20),
    lang: fc.constantFrom('', 'English', 'Hindi'),
    country: fc.constantFrom('', 'India', 'France'),
    rating: fc.integer({ min: 10, max: 100 }),
    rmax: fc.integer({ min: 10, max: 100 }),
    votes: int(1_000_000),
    from: int(2100),
    to: int(2100),
    mark: fc.constantFrom('', 'w', 's', 'u'),
    sort: fc.constantFrom(...SORTS),
  })
  .filter((q) => q.rmax >= q.rating && (!q.to || q.to >= q.from));

describe('query string', () => {
  it('round-trips any valid query', () =>
    fc.assert(
      fc.property(query, (q) => {
        expect(fromQuery(toQuery(q))).toEqual(q);
      }),
    ));
  it('never throws on any input', () => fc.assert(fc.property(fc.string(), (s) => void fromQuery(`?${s}`))));
  it('always yields a query that can match something', () =>
    fc.assert(
      fc.property(fc.string(), (s) => {
        const q = fromQuery(`?${s}`);
        expect(q.rmax).toBeGreaterThanOrEqual(q.rating);
        expect(!q.to || q.to >= q.from).toBe(true);
      }),
    ));
});

describe('histogram', () => {
  it('counts every in-range value exactly once', () =>
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 120 })), fc.integer({ min: 1, max: 20 }), (values, n) => {
        const bins = histogram(values, 10, 100, n);
        expect(bins).toHaveLength(n);
        expect(bins.reduce((a, b) => a + b, 0)).toBe(values.filter((x) => x >= 10 && x <= 100).length);
      }),
    ));
});
