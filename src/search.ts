import uFuzzy from '@leeoniya/ufuzzy';
import { norm, type Title } from './data.ts';

// Words are matched from their start, in any order. Typos are forgiven only when nothing matches exactly:
// a single-error match on every query would bury "nolan" under unrelated titles.
const exact = new uFuzzy({ interLft: 1 });
const typo = new uFuzzy({ intraMode: 1 });
const ANY_ORDER = 5; // how many words may swap places

interface Hay {
  names: string[]; // title, cast, crew, characters, keywords
  full: string[]; // names + plot
}
const hays = new WeakMap<Title[], Hay>();
const hayOf = (all: Title[]): Hay => {
  let h = hays.get(all);
  if (!h) hays.set(all, (h = { names: all.map((t) => t.hay), full: all.map((t) => `${t.hay} ${norm(t.plot)}`) }));
  return h;
};

/** Positions of the matches in `hay`, best first. */
function run(uf: uFuzzy, hay: string[], needle: string): number[] {
  const [idxs, info, order] = uf.search(hay, needle, ANY_ORDER);
  return info && order ? order.map((o) => info.idx[o]!) : (idxs ?? []);
}

let last: { all: Title[]; text: string; hits: Map<Title, number> } | undefined;

/** Titles matching `text`, mapped to their relevance rank (0 is best). One entry is remembered, because
 * the facet counts run the same search many times per keystroke. */
export function search(all: Title[], text: string): Map<Title, number> {
  if (last?.all === all && last.text === text) return last.hits;
  const needle = norm(text).trim();
  const hay = hayOf(all);
  let found = run(exact, hay.full, needle);
  if (!found.length) found = run(typo, hay.names, needle);
  const hits = new Map(found.map((i, rank) => [all[i]!, rank]));
  last = { all, text, hits };
  return hits;
}
