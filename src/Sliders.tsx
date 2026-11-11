import { useMemo } from 'preact/hooks';
import type { Title } from './data.ts';
import { fmtRating } from './data.ts';
import { RATING_MAX, RATING_MIN, histogram } from './filter.ts';
import { RangeSlider } from './RangeSlider.tsx';

type Dom = readonly [number, number];

const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

interface Props {
  /** Whose values the histogram shows. */
  titles: Title[];
  /** Slider ends, taken from the whole dataset. */
  dom: Dom;
  label: string;
}

/**
 * Rating range in query units (x10). A handle resting on a slider end means "no limit", which the query
 * stores as RATING_MIN or RATING_MAX.
 */
export function RatingSlider({
  titles,
  dom: [lo, hi],
  min,
  max,
  label,
  onChange,
}: Props & { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const bins = useMemo(
    () =>
      histogram(
        titles.map((t) => t.rating),
        lo,
        hi,
        (hi - lo) / 2,
      ),
    [titles, lo, hi],
  );
  return (
    <RangeSlider
      lo={lo}
      hi={hi}
      a={Math.max(min, lo)}
      b={Math.min(max, hi)}
      step={1}
      bins={bins}
      ticks={range(lo, hi, 10)}
      fmt={fmtRating}
      tickFmt={(v) => String(v / 10)}
      label={label}
      onChange={(a, b) => onChange(a <= lo ? RATING_MIN : a, b >= hi ? RATING_MAX : b)}
    />
  );
}

/** Release-year range; 0 on either side means open. */
export function YearSlider({
  titles,
  dom: [lo, hi],
  from,
  to,
  label,
  onChange,
}: Props & { from: number; to: number; onChange: (from: number, to: number) => void }) {
  const bins = useMemo(
    () =>
      histogram(
        titles.map((t) => t.year),
        lo,
        hi,
        Math.ceil((hi - lo + 1) / 2),
      ),
    [titles, lo, hi],
  );
  return (
    <RangeSlider
      lo={lo}
      hi={hi}
      a={Math.max(from || lo, lo)}
      b={Math.min(to || hi, hi)}
      step={1}
      bins={bins}
      ticks={range(Math.ceil(lo / 20) * 20, hi, 20)}
      fmt={String}
      label={label}
      onChange={(a, b) => onChange(a <= lo ? 0 : a, b >= hi ? 0 : b)}
    />
  );
}
