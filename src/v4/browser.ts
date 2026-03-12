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

  const sdk = new MeetergoSDK();
  const callable = sdk.buildSDKCallable();

  // Replace window.meetergo FIRST so any calls during drain route to the real SDK
  const existingQueue = (window.meetergo as { q?: unknown[][] } | undefined)?.q;
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
