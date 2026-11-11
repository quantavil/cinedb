import { useEffect, useMemo, useRef } from 'preact/hooks';
import { TYPE_LABEL } from './data.ts';
import type { Title } from './data.ts';
import { SORTS, SORT_LABEL, VOTES, domains, ratingSpan, voteLabel } from './filter.ts';
import { Close } from './icons.tsx';
import { Select } from './Select.tsx';
import { RatingSlider } from './Sliders.tsx';
import { FACTORY, type Settings as S } from './settings.ts';

interface Props {
  s: S;
  set: (patch: Partial<S>) => void;
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  titles: Title[];
  generated: string;
}

const THEMES: [S['theme'], string][] = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];
const DENSITY: [S['density'], string][] = [
  ['compact', 'Compact'],
  ['comfortable', 'Comfortable'],
  ['large', 'Large'],
];

export function Settings({ s, set, open, onClose, onExport, onImport, titles, generated }: Props) {
  const dom = useMemo(() => domains(titles), [titles]);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement;
      // The panel only becomes focusable once its transition has started.
      requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    } else if (opener.current instanceof HTMLElement) {
      opener.current.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [open]);
  return (
    <>
      <div class={`scrim${open ? ' on' : ''}`} onClick={onClose} />
      <aside
        class={`panel settings${open ? ' open' : ''}`}
        aria-label="Settings"
        id="settings"
        ref={panel}
        tabIndex={-1}
      >
        <header class="fh">
          <h2>Settings</h2>
          <button class="icon" onClick={onClose} aria-label="Close settings">
            <Close />
          </button>
        </header>

        <fieldset>
          <legend>Theme</legend>
          <div class="seg">
            {THEMES.map(([v, l]) => (
              <button key={v} aria-pressed={s.theme === v} onClick={() => set({ theme: v })}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Poster size</legend>
          <div class="seg">
            {DENSITY.map(([v, l]) => (
              <button key={v} aria-pressed={s.density === v} onClick={() => set({ density: v })}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>

        <p class="note">Starting point for every visit. Filters you change while browsing are not saved.</p>
        <fieldset>
          <legend>Default sort</legend>
          <Select
            label="Default sort"
            value={s.sort}
            onChange={(v) => set({ sort: v })}
            options={SORTS.map((v) => ({ value: v, label: SORT_LABEL[v] }))}
          />
        </fieldset>
        <fieldset>
          <legend>Default type</legend>
          <div class="chips">
            {TYPE_LABEL.map((l, i) => (
              <button
                key={l}
                class="chip"
                aria-pressed={!!(s.types & (1 << i))}
                onClick={() => set({ types: s.types ^ (1 << i) })}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>
            Default rating <span class="val">{ratingSpan(s.rating, s.rmax)}</span>
          </legend>
          <RatingSlider
            titles={titles}
            dom={dom.rating}
            min={s.rating}
            max={s.rmax}
            label="Default rating"
            onChange={(rating, rmax) => set({ rating, rmax })}
          />
        </fieldset>
        <fieldset>
          <legend>Default votes</legend>
          <Select
            label="Default minimum votes"
            value={s.votes}
            onChange={(v) => set({ votes: v })}
            options={VOTES.map((v) => ({ value: v, label: v ? `${voteLabel(v)} votes` : 'Any number of votes' }))}
          />
        </fieldset>

        <fieldset>
          <legend>Watchlist and seen</legend>
          <p class="note">Stored in this browser only. Export to back up or move to another device.</p>
          <div class="fa">
            <button class="btn" onClick={onExport}>
              Export
            </button>
            <label class="btn">
              Import
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) onImport(f);
                  (e.target as HTMLInputElement).value = '';
                }}
              />
            </label>
          </div>
        </fieldset>

        <div class="fa">
          <button class="btn" onClick={() => set({ ...FACTORY })}>
            Restore defaults
          </button>
        </div>
        {generated && <p class="foot">List updated {generated.slice(0, 10)}</p>}
      </aside>
    </>
  );
}
