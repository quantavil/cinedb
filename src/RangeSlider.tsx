import { useRef } from 'preact/hooks';

interface Props {
  /** Domain, in the same integer units as a and b. */
  lo: number;
  hi: number;
  /** Current selection, lo <= a <= b <= hi. */
  a: number;
  b: number;
  step: number;
  /** Bar heights behind the track: how many titles sit in each slice of the domain. */
  bins: number[];
  ticks: number[];
  fmt: (v: number) => string;
  /** Axis labels; shorter than fmt when the axis only marks whole numbers. */
  tickFmt?: (v: number) => string;
  label: string;
  onChange: (a: number, b: number) => void;
}

type Which = 'a' | 'b';

/**
 * Two-handle range over a histogram. The bars are the data, so you can see what a handle position
 * keeps. Pointer events cover mouse, touch and pen; each handle is also a keyboard slider.
 */
export function RangeSlider({ lo, hi, a, b, step, bins, ticks, fmt, tickFmt = fmt, label, onChange }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<Which | null>(null);
  const span = hi - lo;
  const pct = (v: number) => `${((v - lo) / span) * 100}%`;
  const peak = Math.max(1, ...bins);
  const snap = (v: number) => Math.min(hi, Math.max(lo, lo + Math.round((v - lo) / step) * step));

  const move = (which: Which, v: number) => {
    v = snap(v);
    if (which === 'a') onChange(Math.min(v, b), b);
    else onChange(a, Math.max(v, a));
  };
  const at = (e: PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    return lo + ((e.clientX - r.left) / r.width) * span;
  };

  const down = (e: PointerEvent) => {
    const v = at(e);
    // The nearer handle takes the grab. On a tie the side of the click decides, so a stacked pair can separate.
    const which: Which =
      Math.abs(v - a) === Math.abs(v - b) ? (v < a ? 'a' : 'b') : Math.abs(v - a) < Math.abs(v - b) ? 'a' : 'b';
    drag.current = which;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    move(which, v);
    track.current?.querySelector<HTMLElement>(`[data-h=${which}]`)?.focus({ preventScroll: true });
    e.preventDefault();
  };
  const dragTo = (e: PointerEvent) => drag.current && move(drag.current, at(e));
  const up = () => (drag.current = null);

  const key = (which: Which) => (e: KeyboardEvent) => {
    const cur = which === 'a' ? a : b;
    const big = step * 10;
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowUp'
        ? cur + (e.shiftKey ? big : step)
        : e.key === 'ArrowLeft' || e.key === 'ArrowDown'
          ? cur - (e.shiftKey ? big : step)
          : e.key === 'PageUp'
            ? cur + big
            : e.key === 'PageDown'
              ? cur - big
              : e.key === 'Home'
                ? lo
                : e.key === 'End'
                  ? hi
                  : null;
    if (to === null) return;
    e.preventDefault();
    move(which, to);
  };

  const n = bins.length;
  return (
    <div class="rs">
      <div class="rs-read">
        <div>
          <small>From</small>
          <output>{a <= lo ? 'No min' : fmt(a)}</output>
        </div>
        <span aria-hidden="true" />
        <div>
          <small>To</small>
          <output>{b >= hi ? 'No max' : fmt(b)}</output>
        </div>
      </div>
      <div class="rs-in">
        <div class="rs-bars" aria-hidden="true">
          {bins.map((c, i) => {
            const mid = lo + ((i + 0.5) / n) * span;
            return (
              <i
                key={i}
                class={mid >= a && mid <= b ? 'in' : ''}
                style={{ height: `${Math.max(3, (c / peak) * 100)}%` }}
              />
            );
          })}
        </div>
        <div
          class="rs-track"
          ref={track}
          onPointerDown={down}
          onPointerMove={dragTo}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <span class="rs-band" style={{ left: pct(a), right: `calc(100% - ${pct(b)})` }} />
          {(['a', 'b'] as const).map((w) => {
            const v = w === 'a' ? a : b;
            return (
              <span
                key={w}
                data-h={w}
                class="rs-thumb"
                role="slider"
                tabIndex={0}
                aria-label={`${label}, ${w === 'a' ? 'minimum' : 'maximum'}`}
                aria-valuemin={w === 'a' ? lo : a}
                aria-valuemax={w === 'a' ? b : hi}
                aria-valuenow={v}
                aria-valuetext={fmt(v)}
                style={{ left: pct(v) }}
                onKeyDown={key(w)}
              />
            );
          })}
        </div>
        <div class="rs-ticks" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ left: pct(t) }}>
              {tickFmt(t)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
