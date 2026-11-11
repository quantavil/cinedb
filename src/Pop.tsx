import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Close } from './icons.tsx';

interface Props {
  /** The control this card hangs from. A bottom sheet on phones, so only desktop uses it. */
  anchor: DOMRect;
  label: string;
  width?: number;
  /** Drop the title row on desktop, where the trigger already names the list. */
  bare?: boolean;
  onClose: () => void;
  children: ComponentChildren;
}

/**
 * Shared popover: scrim, Escape, focus in and back out. It is a card under its anchor on desktop and a
 * bottom sheet on phones (CSS decides). Escape is taken in the capture phase so it only closes the
 * topmost layer, never the settings panel underneath.
 */
export function Pop({ anchor, label, width = 360, bare, onClose, children }: Props) {
  const card = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  // Read during the first render: children focus themselves in their own effects, which run before ours.
  const [opener] = useState(() => document.activeElement);

  useEffect(() => {
    if (!card.current?.contains(document.activeElement)) card.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close.current();
    };
    // The card is placed from the anchor's rect, which a width change invalidates. Height changes, such as a
    // phone's address bar sliding away, do not.
    const width = innerWidth;
    const onResize = () => innerWidth !== width && close.current();
    addEventListener('keydown', onKey, true);
    addEventListener('resize', onResize);
    return () => {
      removeEventListener('keydown', onKey, true);
      removeEventListener('resize', onResize);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [opener]);

  const x = Math.max(8, Math.min(anchor.left, innerWidth - width - 8));
  return (
    <>
      <div class="scrim on soft" onClick={onClose} />
      <div
        class={bare ? 'pop bare' : 'pop'}
        ref={card}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        style={{ '--x': `${x}px`, '--y': `${anchor.bottom + 8}px`, '--w': `${width}px` }}
      >
        <header class="ph">
          <h3>{label}</h3>
          <button class="icon sm" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </header>
        {children}
      </div>
    </>
  );
}
