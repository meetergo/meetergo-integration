/**
 * Loads the design-2026 chunk on demand (main bundle).
 *
 * The chunk is a separate IIFE with a content hash in its file name, served
 * from the same directory as the SDK script (https://cdn.meetergo.com/v4/ for
 * integration.js), so the one-year immutable CDN cache is safe. Classic-only
 * pages never request it. If it cannot be loaded, callers render classic.
 */

import { ModalManager } from "../modules/modal-manager.js";
import { errorHandler } from "../utils/error-handler.js";
import { bookingSrc, decorateIframe } from "../utils/iframe-factory.js";
import { holdFocusInModal } from "../../utils/modal-focus.js";
import type { DesignApi, DesignInstaller } from "./entry.js";

declare const __MG_DESIGN_CHUNK__: string;

export const CDN_BASE = "https://cdn.meetergo.com/v4/";
const LOAD_TIMEOUT_MS = 10_000;

/** File name of the chunk, injected at build time (scripts/build-v4.mjs). */
export const DESIGN_CHUNK = typeof __MG_DESIGN_CHUNK__ !== "undefined" ? __MG_DESIGN_CHUNK__ : "design-2026.js";

let scriptBase: string | null = null;
let api: DesignApi | null = null;
let pending: Promise<DesignApi> | null = null;
let failed = false;

/** Remember the directory the SDK script was loaded from (call while it evaluates). */
export function captureScriptBase(script: Element | null | undefined): void {
  const src = script instanceof HTMLScriptElement ? script.src : "";
  if (/^https?:\/\//i.test(src)) scriptBase = src.slice(0, src.lastIndexOf("/") + 1);
}

function installer(): DesignInstaller | undefined {
  return (window as unknown as { __meetergoDesign2026?: DesignInstaller }).__meetergoDesign2026;
}

/** The design API if the chunk is already present (synchronous), else null. */
export function loadedDesign(): DesignApi | null {
  if (api) return api;
  const install = installer();
  if (install) api = install({ ModalManager, errorHandler, bookingSrc, decorateIframe, holdFocusInModal });
  return api;
}

function inject(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = url;
    s.setAttribute("data-meetergo-design-chunk", "");
    const timer = setTimeout(() => { s.onload = s.onerror = null; reject(new Error("timeout")); }, LOAD_TIMEOUT_MS);
    s.onload = () => { clearTimeout(timer); installer() ? resolve() : reject(new Error("chunk did not register")); };
    s.onerror = () => { clearTimeout(timer); s.parentNode?.removeChild(s); reject(new Error(`failed to load ${url}`)); };
    (document.head || document.documentElement).appendChild(s);
  });
}

/** Load the chunk once per page; rejects (and stays rejected) if it cannot be loaded. */
export function loadDesign(): Promise<DesignApi> {
  const ready = loadedDesign();
  if (ready) return Promise.resolve(ready);
  if (failed) return Promise.reject(new Error("design chunk unavailable"));
  if (!pending) {
    const primary = (scriptBase ?? CDN_BASE) + DESIGN_CHUNK;
    const fallback = CDN_BASE + DESIGN_CHUNK;
    pending = inject(primary)
      .catch((err) => (primary !== fallback ? inject(fallback) : Promise.reject(err)))
      .then(() => loadedDesign() as DesignApi)
      .catch((err) => {
        failed = true;
        pending = null;
        errorHandler.handleError({ message: "Design 2026 could not be loaded; showing the classic design", level: "warning", error: err as Error });
        throw err;
      });
  }
  return pending;
}

/** Test hook */
export function resetDesignLoader(): void {
  api = null;
  pending = null;
  failed = false;
  scriptBase = null;
}
