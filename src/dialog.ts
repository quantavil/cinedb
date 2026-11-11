import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

/** `closedby` is not in the DOM typings yet. Spread this onto a `<dialog>` that light-dismisses. */
export const LIGHT_DISMISS = { closedby: 'any' } as object;

const outside = (e: PointerEvent, d: HTMLElement) => {
  const r = d.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
};

/**
 * Opens the dialog as a modal on mount. The browser supplies the top layer, the inert page, focus
 * containment, Esc and the Android back gesture. `onClose` runs when the browser closes it that way; closing
 * through state just unmounts, which fires nothing. Safari has no `closedby`, so a press and release outside
 * the box stands in for light dismiss there.
 */
export function useModal(ref: RefObject<HTMLDialogElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // showModal moves focus to the first control; keep a control the children already focused.
    const had = d.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
    if (!d.open) d.showModal();
    had?.focus({ preventScroll: true });

    const onNativeClose = () => close.current();
    d.addEventListener('close', onNativeClose);
    let pressed = false;
    const down = (e: PointerEvent) => (pressed = outside(e, d));
    const up = (e: PointerEvent) => pressed && outside(e, d) && d.close();
    const polyfill = !('closedBy' in HTMLDialogElement.prototype);
    if (polyfill) {
      d.addEventListener('pointerdown', down);
      d.addEventListener('pointerup', up);
    }
    return () => {
      d.removeEventListener('close', onNativeClose);
      d.removeEventListener('pointerdown', down);
      d.removeEventListener('pointerup', up);
    };
  }, [ref]);
}
