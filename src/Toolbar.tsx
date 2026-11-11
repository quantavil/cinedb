import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { TYPE_LABEL, type Dicts, type Title } from './data.ts';
import { ChipFacet, ChoiceFacet, RatingFacet, SortFacet, TypeFacet, VotesFacet, YearFacet } from './Facets.tsx';
import {
  RATING_MAX,
  RATING_MIN,
  SORT_LABEL,
  domains,
  isDefault,
  ratingSpan,
  voteLabel,
  type MarkFilter,
  type Query,
} from './filter.ts';
import { Chevron } from './icons.tsx';
import type { Marks } from './marks.ts';
import { Pop } from './Pop.tsx';

interface Props {
  q: Query;
  def: Query;
  set: (patch: Partial<Query>) => void;
  dict: Dicts;
  count: number;
  counts: { w: number; s: number };
  titles: Title[];
  marks: Marks;
}

type Facet = 'type' | 'genre' | 'rated' | 'language' | 'country' | 'rating' | 'votes' | 'year' | 'sort';

const FACETS: [Facet, string][] = [
  ['rating', 'Rating'],
  ['genre', 'Genre'],
  ['type', 'Type'],
  ['rated', 'Rated'],
  ['language', 'Language'],
  ['country', 'Country'],
  ['votes', 'Votes'],
  ['year', 'Year'],
  ['sort', 'Sort'],
];
/** Facets with a Clear / Show N footer, because they take several steps to set. */
const RESETS: Partial<Record<Facet, Partial<Query>>> = {
  rating: { rating: RATING_MIN, rmax: RATING_MAX },
  genre: { genres: 0 },
  type: { types: 0 },
  rated: { certs: 0 },
  year: { from: 0, to: 0 },
};
const SERIES = (1 << 1) | (1 << 3);

const bits = (n: number) => n.toString(2).replaceAll('0', '').length;

/** Pill text and whether the facet is narrowing the list. */
function summary(f: Facet, q: Query, def: Query, { genres, certs }: Dicts): [string, boolean] {
  switch (f) {
    case 'rating':
      return q.rating > RATING_MIN || q.rmax < RATING_MAX
        ? [`Rating ${ratingSpan(q.rating, q.rmax)}`, true]
        : ['Rating', false];
    case 'genre': {
      const n = bits(q.genres);
      return n === 0 ? ['Genre', false] : [n === 1 ? (genres[Math.log2(q.genres)] ?? 'Genre') : `Genre · ${n}`, true];
    }
    case 'type': {
      const n = bits(q.types);
      return n === 0 ? ['Type', false] : [n === 1 ? TYPE_LABEL[Math.log2(q.types)]! : `Type · ${n}`, true];
    }
    case 'rated': {
      const n = bits(q.certs);
      return n === 0 ? ['Rated', false] : [n === 1 ? (certs[Math.log2(q.certs)] ?? 'Rated') : `Rated · ${n}`, true];
    }
    case 'language':
      return [q.lang || 'Language', !!q.lang];
    case 'country':
      return [q.country || 'Country', !!q.country];
    case 'votes':
      return q.votes ? [`Votes ${voteLabel(q.votes)}`, true] : ['Votes', false];
    case 'year':
      return q.from || q.to
        ? [q.from && q.to ? `${q.from}–${q.to}` : q.from ? `From ${q.from}` : `Until ${q.to}`, true]
        : ['Year', false];
    case 'sort':
      return [`Sort: ${SORT_LABEL[q.sort]}`, q.sort !== def.sort];
  }
}

export function Toolbar({ q, def, set, dict, count, counts, titles, marks }: Props) {
  const [open, setOpen] = useState<Facet | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const dom = useMemo(() => domains(titles), [titles]);

  const toggleFacet = (f: Facet, e: MouseEvent) => {
    if (open === f) return setOpen(null);
    setAnchor((e.currentTarget as HTMLElement).getBoundingClientRect());
    setOpen(f);
  };
  const close = () => setOpen(null);
  /** Single choice: apply and dismiss. */
  const pick = (patch: Partial<Query>) => {
    set(patch);
    close();
  };

  const quick = (patch: Partial<Query>) => set({ types: 0, mark: '', ...patch });
  const tabs: [string, boolean, Partial<Query>][] = [
    ['All', !q.types && !q.mark, {}],
    ['Movies', q.types === 1 && !q.mark, { types: 1 }],
    ['Series', q.types === SERIES && !q.mark, { types: SERIES }],
    [`Watchlist${counts.w ? ` ${counts.w}` : ''}`, q.mark === 'w', { mark: 'w' as MarkFilter }],
    [`Seen${counts.s ? ` ${counts.s}` : ''}`, q.mark === 's', { mark: 's' as MarkFilter }],
  ];

  const shared = { q, set, titles, marks };
  const bodies: Record<Facet, JSX.Element> = {
    rating: <RatingFacet {...shared} dom={dom} />,
    genre: <ChipFacet {...shared} facet="genres" labels={dict.genres} />,
    rated: <ChipFacet {...shared} facet="certs" labels={dict.certs} />,
    language: <ChoiceFacet {...shared} facet="lang" label="Language" values={dict.langs} onPick={pick} />,
    country: <ChoiceFacet {...shared} facet="country" label="Country" values={dict.countries} onPick={pick} />,
    type: <TypeFacet {...shared} />,
    votes: <VotesFacet {...shared} onPick={pick} />,
    year: <YearFacet {...shared} dom={dom} />,
    sort: <SortFacet q={q} onPick={pick} />,
  };
  const reset = open && RESETS[open];

  return (
    <>
      <nav class="toolbar" aria-label="Filters">
        <div class="tabs" role="group" aria-label="Show">
          {tabs.map(([label, on, patch]) => (
            <button key={label} aria-pressed={on} onClick={() => quick(patch)}>
              {label}
            </button>
          ))}
        </div>
        <span class="sep" aria-hidden="true" />
        {FACETS.map(([f]) => {
          const [label, on] = summary(f, q, def, dict);
          return (
            <button
              key={f}
              data-f={f}
              class={`pill${on ? ' on' : ''}`}
              aria-expanded={open === f}
              aria-haspopup="dialog"
              onClick={(e) => toggleFacet(f, e)}
            >
              {label}
              <Chevron />
            </button>
          );
        })}
        {!isDefault(q, def) && (
          <button class="pill clear" onClick={() => set({ ...def })}>
            Clear
          </button>
        )}
        <span class="total">{count} titles</span>
      </nav>

      {open && anchor && (
        <Pop
          anchor={anchor}
          label={FACETS.find(([f]) => f === open)![1]}
          width={open === 'rating' || open === 'year' ? 400 : 360}
          onClose={close}
        >
          {bodies[open]}
          {reset && (
            <div class="fa">
              <button class="btn" onClick={() => set(reset)}>
                Clear
              </button>
              <button class="btn primary" onClick={close}>
                Show {count} titles
              </button>
            </div>
          )}
        </Pop>
      )}
    </>
  );
}
