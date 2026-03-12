/**
 * Meetergo v4 — Browser Entry Point
 *
 * Async script safety: this file can execute before document.body exists.
 * All init is deferred to DOM-ready so that every module can safely access
 * document.body (PrerenderManager parking container, floating button, sidebar, etc.)
 */

import { MeetergoSDK } from "./core/sdk.js";

function initSDK() {
  if (typeof window === "undefined") return;

  // Guard: if the SDK is already fully loaded (not just the queue stub),
  // skip re-initialization but re-scan the DOM for any new embed elements.
  // This handles users who accidentally include the <script> tag multiple times.
  const existing = window.meetergo as { q?: unknown[][]; __sdk?: MeetergoSDK } | undefined;
  if (existing && typeof existing === "function" && !existing.q && existing.__sdk) {
    existing.__sdk.scanner.scan();
    return;
  }

  const sdk = new MeetergoSDK();
  const callable = sdk.buildSDKCallable() as typeof callable & { __sdk: MeetergoSDK };
  callable.__sdk = sdk;

  // Replace window.meetergo FIRST so any calls during drain route to the real SDK
  const existingQueue = existing?.q;
  window.meetergo = callable;

  // Boot first (v3 compat settings + starts data-attr scanner)
  sdk.boot();

  // Drain the queue from the loader snippet (processes init, on, modal, etc.)
  if (Array.isArray(existingQueue) && existingQueue.length > 0) {
    sdk.drainQueue(existingQueue);
  }
}

// Defer to DOM-ready — document.body must exist before any module can append to it
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSDK);
} else {
  initSDK();
}
