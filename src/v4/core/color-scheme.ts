/**
 * Meetergo v4 — Color Scheme Manager
 *
 * Prevents the iframe "flash of wrong background" by:
 *   1. Starting every iframe with `visibility: hidden`
 *   2. Polling the parent color scheme every 50ms and posting it to the iframe
 *   3. When the iframe responds with `meetergo:ready`, revealing it and stopping the interval
 *
 * Also syncs color scheme changes that happen after load (e.g. user toggling
 * OS dark mode) via a persistent MediaQueryList listener.
 */

import type { ColorScheme } from "../types/index.js";

const POLL_MS = 50;
const READY_TIMEOUT_MS = 3000; // reveal iframe even if it never sends meetergo:ready

export interface ColorSchemeSyncHandle {
  /** Stop syncing and clean up all resources */
  stop(): void;
}

export class ColorSchemeManager {
  /**
   * Start syncing color scheme to a specific iframe.
   * The iframe starts hidden and is revealed when it signals readiness.
   *
   * @param iframe - The iframe element (already has `src` set, attached to DOM)
   * @param origin - The allowed origin for postMessage (e.g. "https://cal.meetergo.com")
   * @returns A handle to stop syncing
   */
  static forIframe(iframe: HTMLIFrameElement, origin: string): ColorSchemeSyncHandle {
    // Start hidden to prevent flash
    iframe.style.visibility = "hidden";

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let revealed = false;

    const reveal = () => {
      if (revealed) return;
      revealed = true;
      iframe.style.visibility = "visible";
      cleanup();
    };

    const cleanup = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener("message", messageHandler);
    };

    const sendScheme = () => {
      if (!iframe.contentWindow) return;
      const scheme = ColorSchemeManager.detect();
      try {
        iframe.contentWindow.postMessage(
          { event: "meetergo:color-scheme", payload: { colorScheme: scheme } },
          origin === "*" ? "*" : origin
        );
      } catch {
        // cross-origin or destroyed window — just skip
      }
    };

    const messageHandler = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data as { event?: string };
      if (data?.event === "meetergo:ready" || data?.event === "meetergo:page_height") {
        reveal();
      }
    };

    window.addEventListener("message", messageHandler);

    // Start polling
    intervalId = setInterval(sendScheme, POLL_MS);
    sendScheme(); // immediate first send

    // Safety fallback: reveal after timeout even without ack
    timeoutId = setTimeout(reveal, READY_TIMEOUT_MS);

    // Persist color scheme changes (e.g. OS toggle) via MediaQueryList
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onSchemeChange = () => {
      if (iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage(
            { event: "meetergo:color-scheme", payload: { colorScheme: ColorSchemeManager.detect() } },
            origin === "*" ? "*" : origin
          );
        } catch {
          // ignore
        }
      }
    };

    mql.addEventListener?.("change", onSchemeChange);

    return {
      stop() {
        cleanup();
        mql.removeEventListener?.("change", onSchemeChange);
      },
    };
  }

  /**
   * Detect the current effective color scheme.
   */
  static detect(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  /**
   * Resolve a `ColorScheme` config value to a concrete "light" | "dark".
   */
  static resolve(scheme: ColorScheme): "light" | "dark" {
    if (scheme === "auto") return ColorSchemeManager.detect();
    return scheme;
  }
}
