import { useEffect, useRef, useState } from 'preact/hooks';
import { Pop } from './Pop.tsx';
import { Chevron } from './icons.tsx';

interface Option<T> {
  value: T;
  label: string;
  /** Right-aligned note, such as how many titles the option would leave. */
  hint?: string | number;
  disabled?: boolean;
}

interface ListProps<T> {
  options: Option<T>[];
  value: T;
  onPick: (v: T) => void;
  label: string;
}

/** Single-choice list with arrow-key navigation. Roving focus: one tab stop, arrows move within. */
export function Listbox<T>({ options, value, onPick, label }: ListProps<T>) {
  const box = useRef<HTMLDivElement>(null);
  const items = () => [
    ...(box.current?.querySelectorAll<HTMLElement>('[role=option]:not([aria-disabled=true])') ?? []),
  ];
  const onKey = (e: KeyboardEvent) => {
    const all = items();
    const i = all.indexOf(document.activeElement as HTMLElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    all[(to + all.length) % all.length]?.focus();
  };
  // Land on the current choice so Enter or the arrows work straight away.
  useEffect(() => {
    const all = items();
    (all.find((el) => el.getAttribute('aria-selected') === 'true') ?? all[0])?.focus({ preventScroll: true });
  }, []);
  return (
    <div class="list" role="listbox" aria-label={label} ref={box} onKeyDown={onKey}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="option"
            aria-selected={on}
            aria-disabled={o.disabled || undefined}
            tabIndex={on ? 0 : -1}
            onClick={() => !o.disabled && onPick(o.value)}
          >
            <span>{o.label}</span>
            {o.hint !== undefined && <small>{o.hint}</small>}
          </button>
        );
      })}
    </div>
  );
}

interface SelectProps<T> extends Omit<ListProps<T>, 'onPick'> {
  onChange: (v: T) => void;
}

/** The field-shaped trigger for a Listbox, replacing the native select. */
export function Select<T>({ options, value, onChange, label }: SelectProps<T>) {
  const [at, setAt] = useState<DOMRect | null>(null);
  const cur = options.find((o) => o.value === value);
  return (
    <>
      <button
        type="button"
        class="select"
        aria-haspopup="listbox"
        aria-expanded={!!at}
        aria-label={`${label}: ${cur?.label ?? ''}`}
        onClick={(e) => setAt(at ? null : e.currentTarget.getBoundingClientRect())}
      >
        <span>{cur?.label}</span>
        <Chevron />
      </button>
      {at && (
        <Pop bare anchor={at} label={label} width={Math.max(240, at.width)} onClose={() => setAt(null)}>
          <Listbox
            options={options}
            value={value}
            label={label}
            onPick={(v) => {
              onChange(v);
              setAt(null);
            }}
          />
        </Pop>
      )}
    </>
  );
}
