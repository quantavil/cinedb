import { useMemo } from 'preact/hooks';
import { TYPE_LABEL, type Title } from './data.ts';
import {
  RATING_MAX,
  RATING_MIN,
  SORTS,
  SORT_LABEL,
  VOTES,
  countWith,
  filterTitles,
  voteLabel,
  type Domains,
  type Query,
} from './filter.ts';
import type { Marks } from './marks.ts';
import { Listbox } from './Select.tsx';
import { RatingSlider, YearSlider } from './Sliders.tsx';

/** What every facet body needs: the query, the data it runs over, and a way to change the query. */
interface Props {
  q: Query;
  set: (patch: Partial<Query>) => void;
  titles: Title[];
  marks: Marks;
}

const RATING_PRESETS: [string, number][] = [
  ['Any', RATING_MIN],
  ['7+', 70],
  ['7.5+', 75],
  ['8+', 80],
  ['8.5+', 85],
];
const DECADES: [string, number, number][] = [
  ['2020s', 2020, 0],
  ['2010s', 2010, 2019],
  ['2000s', 2000, 2009],
  ['1990s', 1990, 1999],
  ['Before 1990', 0, 1989],
];

const toggle = (mask: number, bit: number) => mask ^ (1 << bit);

/** What the other filters leave once `free` is lifted. This is the data a slider's histogram shows. */
const useWithout = ({ q, titles, marks }: Props, free: Partial<Query>) =>
  useMemo(() => filterTitles(titles, { ...q, ...free, sort: 'rank' }, marks), [titles, marks, q, free]);

const OPEN_RATING = { rating: RATING_MIN, rmax: RATING_MAX };
const OPEN_YEAR = { from: 0, to: 0 };

export function RatingFacet(p: Props & { dom: Domains }) {
  const { q, set } = p;
  const base = useWithout(p, OPEN_RATING);
  return (
    <>
      <RatingSlider
        titles={base}
        dom={p.dom.rating}
        min={q.rating}
        max={q.rmax}
        label="Rating"
        onChange={(rating, rmax) => set({ rating, rmax })}
      />
      <div class="chips">
        {RATING_PRESETS.map(([label, v]) => (
          <button
            key={label}
            class="chip"
            aria-pressed={q.rating === v && q.rmax === RATING_MAX}
            onClick={() => set({ rating: v, rmax: RATING_MAX })}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

export function YearFacet(p: Props & { dom: Domains }) {
  const { q, set } = p;
  const base = useWithout(p, OPEN_YEAR);
  return (
    <>
      <YearSlider
        titles={base}
        dom={p.dom.year}
        from={q.from}
        to={q.to}
        label="Year"
        onChange={(from, to) => set({ from, to })}
      />
      <div class="chips">
        {DECADES.map(([label, from, to]) => {
          const on = q.from === from && q.to === to;
          return (
            <button key={label} class="chip" aria-pressed={on} onClick={() => set(on ? OPEN_YEAR : { from, to })}>
              {label}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Multi-choice chips. Each unchosen one shows how many titles choosing it would leave, and greys out at zero. */
export function ChipFacet({
  facet,
  labels,
  ...p
}: Props & { facet: 'genres' | 'types' | 'certs'; labels: readonly string[] }) {
  const { q, set, titles, marks } = p;
  return (
    <div class="chips">
      {labels.map((label, i) => {
        const on = !!(q[facet] & (1 << i));
        const n = on ? 0 : countWith(titles, q, marks, { [facet]: q[facet] | (1 << i) });
        return (
          <button
            key={label}
            class="chip"
            aria-pressed={on}
            disabled={!on && !n}
            onClick={() => set({ [facet]: toggle(q[facet], i) })}
          >
            {label}
            {!on && <small>{n}</small>}
          </button>
        );
      })}
    </div>
  );
}

export const TypeFacet = (p: Props) => <ChipFacet {...p} facet="types" labels={TYPE_LABEL} />;

/** Single choice from a dictionary, with how many titles each choice leaves. Choices that leave none are disabled. */
export function ChoiceFacet({
  facet,
  label,
  values,
  onPick,
  ...p
}: Props & { facet: 'lang' | 'country'; label: string; values: string[]; onPick: (patch: Partial<Query>) => void }) {
  const { q, titles, marks } = p;
  return (
    <Listbox
      label={label}
      value={q[facet]}
      onPick={(v) => onPick({ [facet]: v })}
      options={['', ...values].map((v) => {
        const n = countWith(titles, q, marks, { [facet]: v });
        return { value: v, label: v || `Any ${label.toLowerCase()}`, hint: n, disabled: !n && v !== q[facet] };
      })}
    />
  );
}

export function VotesFacet({ q, titles, marks, onPick }: Props & { onPick: (patch: Partial<Query>) => void }) {
  return (
    <Listbox
      label="Minimum votes"
      value={q.votes}
      onPick={(votes) => onPick({ votes })}
      options={VOTES.map((v) => ({
        value: v,
        label: v ? `${voteLabel(v)} votes` : 'Any number of votes',
        hint: countWith(titles, q, marks, { votes: v }),
      }))}
    />
  );
}

export function SortFacet({ q, onPick }: Pick<Props, 'q'> & { onPick: (patch: Partial<Query>) => void }) {
  return (
    <Listbox
      label="Sort by"
      value={q.sort}
      onPick={(sort) => onPick({ sort })}
      options={SORTS.map((v) => ({ value: v, label: SORT_LABEL[v] }))}
    />
  );
}
