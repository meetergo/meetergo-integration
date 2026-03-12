/**
 * Meetergo v4 — Throttle Utilities
 *
 * createThrottledHandler: gates a callback to fire at most once per `ms`.
 * createThrottledResizeHandler: convenience wrapper for window resize events
 *   with proper AbortController-based cleanup.
 */

export interface ThrottleHandle {
  handler: () => void;
  cleanup: () => void;
}

/**
 * Throttle a callback so it fires at most once every `ms` milliseconds.
 * Uses `requestAnimationFrame` inside the gate for smooth visual updates.
 */
export function createThrottledHandler(callback: () => void, ms: number): ThrottleHandle {
  let lastFired = 0;
  let rafId: number | null = null;

  const handler = () => {
    const now = Date.now();
    if (now - lastFired < ms) return;
    if (rafId !== null) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      lastFired = Date.now();
      callback();
    });
  };

  const cleanup = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return { handler, cleanup };
}

/**
 * Attach a throttled resize listener to `window`.
 * Returns a `cleanup()` that removes the listener and cancels pending frames.
 */
export function createThrottledResizeHandler(
  callback: () => void,
  ms = 100
): { cleanup: () => void } {
  const { handler, cleanup: cancelFrame } = createThrottledHandler(callback, ms);

  const abortController = new AbortController();
  window.addEventListener("resize", handler, { signal: abortController.signal });

  return {
    cleanup() {
      cancelFrame();
      abortController.abort();
    },
  };
}
