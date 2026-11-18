/**
 * Design 2026 — what the lazily loaded design chunk borrows from the main bundle.
 *
 * The 2026 modules ship as a separate file (design-2026.<hash>.js) that the
 * main bundle loads only when a widget resolves to design "2026". Shared code
 * the chunk needs at runtime (the ModalManager base class, the error handler,
 * iframe helpers, the modal focus helper) is handed over here instead of being
 * bundled twice. Only `import type` from the main bundle is allowed in
 * src/v4/design/* (except resolve.ts and loader.ts, which live in the main bundle).
 */

import type { ModalManager } from "../modules/modal-manager.js";
import type { ErrorHandler } from "../utils/error-handler.js";
import type { bookingSrc, decorateIframe } from "../utils/iframe-factory.js";
import type { holdFocusInModal } from "../../utils/modal-focus.js";

export interface DesignRuntime {
  ModalManager: typeof ModalManager;
  errorHandler: ErrorHandler;
  bookingSrc: typeof bookingSrc;
  decorateIframe: typeof decorateIframe;
  holdFocusInModal: typeof holdFocusInModal;
}

export const rt = {} as DesignRuntime;

export function setRuntime(deps: DesignRuntime): void {
  Object.assign(rt, deps);
}

/**
 * Event listeners removed explicitly (Safari < 15 ignores the `signal`
 * option of addEventListener, so AbortController cannot be used for cleanup).
 */
export class Listeners {
  private readonly offs: Array<() => void> = [];

  on(target: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions | boolean): void {
    target.addEventListener(type, fn, opts);
    this.offs.push(() => target.removeEventListener(type, fn, opts));
  }

  add(off: () => void): void {
    this.offs.push(off);
  }

  clear(): void {
    while (this.offs.length) {
      try { (this.offs.pop() as () => void)(); } catch { /* keep going */ }
    }
  }
}
