/**
 * Meetergo v4 — Inline Embed Module
 *
 * Handles `.meetergo-iframe` class containers and programmatic inline embeds.
 *
 * Upgrades from v3:
 *   - Two-phase iframe sizing:
 *       Phase 1 — first height message → set instantly (no transition)
 *       Phase 2 — subsequent messages → smooth cubic-bezier transition
 *   - Throttled window resize handler (AbortController cleanup)
 *   - bookerViewed event via IntersectionObserver
 *   - data-meetergo-link attribute support (zero-JS inline embed)
 *   - Color scheme flash prevention via IframeFactory
 */

import { createIframe } from "../utils/iframe-factory.js";
import { createThrottledResizeHandler } from "../utils/throttle.js";
import { errorHandler } from "../utils/error-handler.js";
import type { EventBus } from "../core/event-bus.js";
import type { InlineEmbedConfig, MeetergoPrefill, NamespaceConfig } from "../types/index.js";

const MIN_HEIGHT_CHANGE_PX = 10;

/** Walk up the DOM to find the nearest scrollable ancestor, or null if none (falls back to window). */
function getScrollableAncestor(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflow = style.overflow + style.overflowY;
    if (/auto|scroll/.test(overflow) && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}
const MEETERGO_ORIGINS = [
  "https://cal.meetergo.com",
  "https://meetergo.com",
  "http://localhost",
  "http://localhost:3000",
];

interface ManagedInline {
  container: HTMLElement;
  iframe: HTMLIFrameElement;
  abortController: AbortController;
  resizeCleanup: () => void;
  intersectionObserver: IntersectionObserver | null;
  colorSchemeHandle: { stop(): void } | null;
}

export class InlineEmbedManager {
  private readonly ns: string;
  private readonly bus: EventBus;
  private readonly config: NamespaceConfig;
  private managed: Map<HTMLElement, ManagedInline> = new Map();

  constructor(ns: string, bus: EventBus, config: NamespaceConfig) {
    this.ns = ns;
    this.bus = bus;
    this.config = config;
  }

  /**
   * Scan the DOM for `.meetergo-iframe` elements and initialize them.
   * Safe to call multiple times — already-initialized containers are skipped.
   */
  parseDOM(): void {
    const containers = document.querySelectorAll<HTMLElement>(".meetergo-iframe:not([data-mg-bound])");
    for (const container of containers) {
      const link = container.getAttribute("data-src") ?? container.getAttribute("data-link") ?? "";
      if (!link) continue;
      this.embed({ link, elementOrSelector: container });
    }
  }

  /**
   * Programmatically embed a booking iframe inside a given container.
   */
  embed(config: InlineEmbedConfig): void {
    const container = this.resolveContainer(config.elementOrSelector);
    if (!container) {
      errorHandler.handleError({ message: "Inline embed: container not found", level: "warning", ns: this.ns });
      return;
    }

    if (this.managed.has(container)) return; // already bound

    container.setAttribute("data-mg-bound", "true");
    container.classList.add("mg-inline");
    if (config.alignment) container.setAttribute("data-align", config.alignment);

    const extraParams: Record<string, string> = {};
    const prefill: MeetergoPrefill = { ...this.config.prefill, ...config.prefill };

    const { iframe, colorSchemeHandle } = createIframe({
      link: config.link,
      ns: this.ns,
      label: "Meetergo booking calendar",
      extraParams,
      prefill,
      forwardQueryParams: this.config.forwardQueryParams,
      origin: this.config.origin ?? "*",
      height: `${this.config.iframeHeight ?? 700}px`,
    });

    // Show spinner while loading
    const spinner = this.createSpinner();
    container.appendChild(spinner);
    container.appendChild(iframe);

    iframe.addEventListener("load", () => {
      spinner.remove();
      this.bus.emit("linkReady", {});
    }, { once: true });

    iframe.addEventListener("error", () => {
      spinner.remove();
      this.bus.emit("linkFailed", { code: 0, msg: "Iframe load error", url: iframe.src });
    }, { once: true });

    const abort = new AbortController();

    // Two-phase height resize handler
    let phase: 1 | 2 = 1;
    let lastHeight = 0;

    const messageHandler = (e: MessageEvent) => {
      if (!this.isAllowedOrigin(e.origin)) return;
      if (e.source !== iframe.contentWindow) return;

      const data = e.data as Record<string, unknown>;
      let newHeight: number | null = null;

      if (data?.event === "meetergo:page_height" && typeof (data.payload as Record<string, unknown>)?.height === "number") {
        newHeight = (data.payload as { height: number }).height;
      } else if (data?.type === "meetergo:height-update" && typeof data.height === "number") {
        newHeight = data.height as number;
      } else if (data?.type === "meetergo:scroll-height" && typeof data.scrollHeight === "number") {
        newHeight = data.scrollHeight as number;
      }

      // scrollByDistance — booking page asks parent to scroll by N pixels
      if (
        (data?.event === "meetergo:scroll_by_distance" || data?.type === "meetergo:scroll-by-distance") &&
        typeof (data?.data as Record<string, unknown>)?.distance === "number"
      ) {
        const distance = (data.data as { distance: number }).distance;
        const scrollable = getScrollableAncestor(container);
        if (scrollable) {
          scrollable.scrollTo({ top: scrollable.scrollTop + distance, behavior: "smooth" });
        } else {
          window.scrollBy({ top: distance, behavior: "smooth" });
        }
        return;
      }

      // linkFailed postMessage from booking page
      if (data?.event === "meetergo:link_failed" || data?.type === "meetergo:linkFailed") {
        this.bus.emit("linkFailed", { code: 0, msg: "Booking page reported failure", url: iframe.src });
        return;
      }

      if (newHeight === null || Math.abs(newHeight - lastHeight) < MIN_HEIGHT_CHANGE_PX) return;
      lastHeight = newHeight;

      if (phase === 1) {
        // Instant set — no transition
        iframe.style.transition = "none";
        iframe.style.height = `${newHeight}px`;
        phase = 2;
      } else {
        // Smooth transition
        iframe.style.transition = "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        iframe.style.height = `${newHeight}px`;
      }
    };

    window.addEventListener("message", messageHandler, { signal: abort.signal });

    // Throttled resize — recalculate on window resize
    const { cleanup: resizeCleanup } = createThrottledResizeHandler(() => {
      if (lastHeight > 0) {
        iframe.style.transition = "none";
        iframe.style.height = `${lastHeight}px`;
      }
    }, 150);

    // IntersectionObserver → bookerViewed event
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      let viewed = false;
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (!viewed && entries[0]?.isIntersecting) {
            viewed = true;
            this.bus.emit("bookerViewed", { link: config.link, slotsLoaded: phase > 1 });
            intersectionObserver?.disconnect();
          }
        },
        { threshold: 0.25 }
      );
      intersectionObserver.observe(container);
    }

    this.managed.set(container, {
      container,
      iframe,
      abortController: abort,
      resizeCleanup,
      intersectionObserver,
      colorSchemeHandle,
    });
  }

  removeEmbed(containerOrSelector: string | HTMLElement): void {
    const container = this.resolveContainer(containerOrSelector);
    if (!container) return;
    const entry = this.managed.get(container);
    if (!entry) return;

    entry.abortController.abort();
    entry.resizeCleanup();
    entry.intersectionObserver?.disconnect();
    entry.colorSchemeHandle?.stop();
    container.removeAttribute("data-mg-bound");
    container.innerHTML = "";
    this.managed.delete(container);
  }

  destroy(): void {
    for (const container of [...this.managed.keys()]) {
      this.removeEmbed(container);
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private resolveContainer(el: string | HTMLElement): HTMLElement | null {
    if (typeof el === "string") {
      return document.querySelector<HTMLElement>(el);
    }
    return el;
  }

  private isAllowedOrigin(origin: string): boolean {
    return MEETERGO_ORIGINS.some((o) => origin.startsWith(o));
  }

  private createSpinner(): HTMLElement {
    const spinner = document.createElement("div");
    spinner.className = "mg-spinner";
    spinner.setAttribute("role", "status");
    spinner.setAttribute("aria-label", "Loading");
    return spinner;
  }
}
