import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { LIGHT_DISMISS, useModal } from './dialog.ts';
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
 * Shared popover, a native modal dialog: the browser supplies the backdrop, Esc, focus containment and
 * stacking, so Esc only ever closes the topmost layer. It is a card under its anchor on desktop and a
 * bottom sheet on phones (CSS decides).
 */
export function Pop({ anchor, label, width = 360, bare, onClose, children }: Props) {
  const card = useRef<HTMLDialogElement>(null);
  useModal(card, onClose);
  const close = useRef(onClose);
  close.current = onClose;
  // Read during the first render: children focus themselves in their own effects, which run before ours.
  const [opener] = useState(() => document.activeElement);

  useEffect(() => {
    // The card is placed from the anchor's rect, which a width change invalidates. Height changes, such as a
    // phone's address bar sliding away, do not.
    const width = innerWidth;
    const onResize = () => innerWidth !== width && close.current();
    addEventListener('resize', onResize);
    return () => {
      removeEventListener('resize', onResize);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [opener]);

  const x = Math.max(8, Math.min(anchor.left, innerWidth - width - 8));
  return (
    <dialog
      class={bare ? 'pop bare' : 'pop'}
      ref={card}
      aria-label={label}
      {...LIGHT_DISMISS}
      style={{ '--x': `${x}px`, '--y': `${anchor.bottom + 8}px`, '--w': `${width}px` }}
    >
      <header class="ph">
        <h3>{label}</h3>
        <button class="icon sm" onClick={onClose} aria-label="Close">
          <Close />
        </button>
      </header>
      {children}
    </dialog>
  );
}
