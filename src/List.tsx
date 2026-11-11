import { fmtRating, fmtVotes, fmtYears, posterUrl, typeLabel, type Title } from './data.ts';
import { Bookmark, Check, Star } from './icons.tsx';
import type { Marks } from './marks.ts';

interface Props {
  titles: Title[];
  marks: Marks;
  onOpen: (t: Title) => void;
  selected: string | null;
}

export function List({ titles, marks, onOpen, selected }: Props) {
  return (
    <ol class="grid">
      {titles.map((t, i) => {
        const m = marks[t.id]?.m;
        const eager = i < 12; // first rows are the LCP: no lazy loading, no delay
        return (
          <li key={t.id} class="cell" data-m={m} data-sel={selected === t.id ? '' : undefined}>
            <button
              class="frame"
              data-id={t.id}
              onClick={() => onOpen(t)}
              aria-label={`${t.title}, ${fmtYears(t)}, rated ${fmtRating(t.rating)} from ${fmtVotes(t.votes)} votes${m === 'w' ? ', on watchlist' : m === 's' ? ', seen' : ''}`}
            >
              {t.poster ? (
                <img
                  src={posterUrl(t.poster, 280)}
                  width="140"
                  height="207"
                  alt=""
                  loading={eager ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchpriority={i < 4 ? 'high' : undefined}
                />
              ) : (
                <span class="nopic">{t.title}</span>
              )}
              {t.rank > 0 && <span class="no">#{t.rank}</span>}
              <span class="rt">
                <Star />
                <span class="val">{fmtRating(t.rating)}</span>
                {t.votes > 0 && <span class="vt">{fmtVotes(t.votes)}</span>}
              </span>
              {m && <span class="mk">{m === 'w' ? <Bookmark fill /> : <Check />}</span>}
            </button>
            <p class="cap">
              <span class="tt">{t.title}</span>
              <span class="yr">{[fmtYears(t), typeLabel(t.type)].filter(Boolean).join(' · ')}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
