/**
 * Keeps keyboard focus inside an open modal (WCAG 2.4.3, 2.4.11).
 *
 * The booking page lives in a cross-origin iframe, so keydown-based focus traps
 * never see Tab presses made inside it. Making everything outside the modal
 * `inert` works regardless: the browser itself skips the host page, exactly as
 * it does for a native `<dialog>` opened with showModal().
 */

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT']);

export interface ModalFocusHandle {
  release(): void;
}

export function holdFocusInModal(modal: HTMLElement, initialFocus: HTMLElement | null): ModalFocusHandle {
  const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // Inert every sibling of the modal and of each of its ancestors, so a modal
  // mounted inside a host wrapper still isolates the rest of the page.
  const inerted: HTMLElement[] = [];
  for (let node: HTMLElement = modal; node.parentElement && node !== document.body; node = node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === node) continue;
      if (SKIPPED_TAGS.has(sibling.tagName) || sibling.hasAttribute('inert')) continue;
      sibling.setAttribute('inert', '');
      inerted.push(sibling);
    }
  }

  initialFocus?.focus({ preventScroll: true });

  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      for (const el of inerted) el.removeAttribute('inert');
      if (returnFocusTo && returnFocusTo.isConnected) {
        returnFocusTo.focus({ preventScroll: true });
      }
    },
  };
}
