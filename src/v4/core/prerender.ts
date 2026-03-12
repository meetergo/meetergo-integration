/**
 * Meetergo v4 — Prerender Manager
 *
 * Warms up iframes in the background before users click, so modals appear instant.
 *
 * Flow:
 *   1. warmUp(link)  → creates a hidden parking iframe immediately
 *   2. acquire(link) → detaches it from parking, returns it for the modal
 *   3. release(link) → returns it to parking; reloads src if stale
 *
 * Stale thresholds (configurable):
 *   - slotStaleTTL  (default 60s)  — slot data is fresh for 60s
 *   - fullReloadTTL (default 15m)  — force-reload the entire iframe
 */

import type { PrerenderConfig } from "../types/index.js";
import { buildIframeURL } from "../utils/url-params.js";

const DEFAULT_SLOT_STALE_TTL = 60_000;       // 1 minute
const DEFAULT_FULL_RELOAD_TTL = 900_000;     // 15 minutes

interface PrerenderEntry {
  iframe: HTMLIFrameElement;
  link: string;
  builtURL: string;
  createdAt: number;
  lastUsedAt: number;
  isAcquired: boolean;
}

export class PrerenderManager {
  private entries: Map<string, PrerenderEntry> = new Map();
  private parkingContainer: HTMLDivElement;
  private slotStaleTTL: number;
  private fullReloadTTL: number;
  private readonly ns: string;

  constructor(ns: string, config: PrerenderConfig = {}) {
    this.ns = ns;
    this.slotStaleTTL = config.slotStaleTTL ?? DEFAULT_SLOT_STALE_TTL;
    this.fullReloadTTL = config.fullReloadTTL ?? DEFAULT_FULL_RELOAD_TTL;

    // Create an off-screen parking area that stays in the connected DOM.
    // Moving a connected iframe within the DOM doesn't reload it in modern browsers.
    this.parkingContainer = document.createElement("div");
    this.parkingContainer.id = `mg-prerender-parking-${ns}`;
    Object.assign(this.parkingContainer.style, {
      position: "fixed",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      opacity: "0",
      pointerEvents: "none",
      top: "-9999px",
      left: "-9999px",
      zIndex: "-1",
    });
    const attachParking = () => document.body.appendChild(this.parkingContainer);
    document.body ? attachParking() : document.addEventListener("DOMContentLoaded", attachParking);
  }

  /**
   * Warm up an iframe for the given booking link.
   * No-op if already warmed up and not stale.
   */
  warmUp(
    link: string,
    extraParams: Record<string, string> = {},
    origin = "*"
  ): void {
    const key = this.cacheKey(link, extraParams);
    const existing = this.entries.get(key);

    if (existing && !existing.isAcquired && !this.isFullStale(existing)) {
      return; // still fresh
    }

    // Remove stale entry
    if (existing) this.evict(key);

    const builtURL = buildIframeURL(link, { ...extraParams, embed: "true" });
    const iframe = this.createHiddenIframe(builtURL, origin);
    this.parkingContainer.appendChild(iframe);

    this.entries.set(key, {
      iframe,
      link,
      builtURL,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      isAcquired: false,
    });
  }

  /**
   * Detach the prerendered iframe from parking and return it for use in a modal.
   * Returns null if no fresh prerender exists.
   */
  acquire(link: string, extraParams: Record<string, string> = {}): HTMLIFrameElement | null {
    const key = this.cacheKey(link, extraParams);
    const entry = this.entries.get(key);

    if (!entry || entry.isAcquired) return null;

    // If full stale, evict and return null (caller will create fresh)
    if (this.isFullStale(entry)) {
      this.evict(key);
      return null;
    }

    // If only slot-stale, reload src in the background then return the iframe
    if (this.isSlotStale(entry)) {
      entry.iframe.src = entry.builtURL; // triggers background reload
      entry.createdAt = Date.now();
    }

    entry.isAcquired = true;
    entry.lastUsedAt = Date.now();

    // Detach from parking (doesn't reload iframe in Chrome/Firefox/Safari)
    if (entry.iframe.parentNode === this.parkingContainer) {
      this.parkingContainer.removeChild(entry.iframe);
    }

    return entry.iframe;
  }

  /**
   * Return the iframe to parking after the modal closes.
   * If the prerender is stale it gets refreshed in the background.
   */
  release(link: string, extraParams: Record<string, string> = {}): void {
    const key = this.cacheKey(link, extraParams);
    const entry = this.entries.get(key);
    if (!entry) return;

    entry.isAcquired = false;
    entry.lastUsedAt = Date.now();

    if (this.isFullStale(entry)) {
      this.evict(key);
      return;
    }

    if (this.isSlotStale(entry)) {
      entry.iframe.src = entry.builtURL;
      entry.createdAt = Date.now();
    }

    // Re-park
    entry.iframe.style.visibility = "hidden";
    this.parkingContainer.appendChild(entry.iframe);
  }

  /** Whether a prerendered iframe exists and is ready to be acquired. */
  has(link: string, extraParams: Record<string, string> = {}): boolean {
    const key = this.cacheKey(link, extraParams);
    const entry = this.entries.get(key);
    return !!entry && !entry.isAcquired && !this.isFullStale(entry);
  }

  /** Destroy all prerendered iframes and the parking container. */
  destroy(): void {
    for (const key of this.entries.keys()) this.evict(key);
    if (this.parkingContainer.parentNode) {
      this.parkingContainer.parentNode.removeChild(this.parkingContainer);
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private createHiddenIframe(src: string, _origin: string): HTMLIFrameElement {
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.name = `mg-prerender-${this.ns}-${Math.random().toString(36).slice(2, 8)}`;
    iframe.setAttribute("allow", "payment");
    Object.assign(iframe.style, {
      width: "900px",
      height: "700px",
      border: "none",
      visibility: "hidden",
    });
    return iframe;
  }

  private evict(key: string): void {
    const entry = this.entries.get(key);
    if (entry?.iframe.parentNode) {
      entry.iframe.parentNode.removeChild(entry.iframe);
    }
    this.entries.delete(key);
  }

  private isSlotStale(entry: PrerenderEntry): boolean {
    return Date.now() - entry.createdAt > this.slotStaleTTL;
  }

  private isFullStale(entry: PrerenderEntry): boolean {
    return Date.now() - entry.createdAt > this.fullReloadTTL;
  }

  private cacheKey(link: string, extraParams: Record<string, string>): string {
    const sorted = Object.entries(extraParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `${link}?${sorted}`;
  }
}
