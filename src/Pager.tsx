import { PAGE_SIZE } from './hooks.ts';
import { Left, Right } from './icons.tsx';

interface Props {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}

/** Previous and next over the filtered list; nothing to show when it fits one page. */
export function Pager({ page, pages, total, onPage }: Props) {
  if (pages < 2) return null;
  const go = (p: number) => {
    onPage(p);
    scrollTo({ top: 0 });
  };
  const first = (page - 1) * PAGE_SIZE + 1;
  return (
    <nav class="pager" aria-label="Pages">
      <button class="btn" disabled={page === 1} onClick={() => go(page - 1)}>
        <Left /> Previous
      </button>
      <span class="count">
        {first}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <button class="btn" disabled={page === pages} onClick={() => go(page + 1)}>
        Next <Right />
      </button>
    </nav>
  );
}
