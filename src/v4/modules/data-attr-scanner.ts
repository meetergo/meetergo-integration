/**
 * Meetergo v4 — Data Attribute Scanner (NEW)
 *
 * Provides a zero-JS embed API via HTML attributes:
 *
 *   <button data-meetergo-link="https://cal.meetergo.com/user/event">Book</button>
 *   <button data-meetergo-link="..." data-meetergo-layout="sidebar">Book via sidebar</button>
 *   <div    data-meetergo-link="..." data-meetergo-layout="inline">  (inline embed)  </div>
 *
 * Supported attributes:
 *   data-meetergo-link        — booking URL (required)
 *   data-meetergo-ns          — namespace to route to (default: "default")
 *   data-meetergo-layout      — "modal" (default) | "sidebar" | "inline"
 *   data-meetergo-prefill-*   — prefill fields (e.g. data-meetergo-prefill-email)
 *   data-meetergo-config      — JSON config object, e.g. '{"theme":"dark","layout":"month_view"}'
 *
 * Uses MutationObserver for SPA compatibility.
 */

const BOUND_ATTR      = "data-mg-bound";
const LINK_ATTR       = "data-meetergo-link";
/** v3 backwards-compat: class="meetergo-modal-button" link="https://..." */
const V3_BTN_CLASS    = "meetergo-modal-button";
/** v3 inline embed: class="meetergo-iframe" data-src="..." */
const V3_IFRAME_CLASS = "meetergo-iframe";

export interface DataAttrScannerCallbacks {
  openModal: (link: string, ns: string, prefill: Record<string, string>) => void;
  openSidebar: (ns: string) => void;
  embedInline: (link: string, container: HTMLElement, ns: string, prefill: Record<string, string>) => void;
}

export class DataAttrScanner {
  private observer: MutationObserver | null = null;
  private callbacks: DataAttrScannerCallbacks;

  constructor(callbacks: DataAttrScannerCallbacks) {
    this.callbacks = callbacks;
  }

  /** Start scanning and watching for dynamic elements. */
  start(): void {
    this.scan();

    if (typeof MutationObserver !== "undefined") {
      this.observer = new MutationObserver(() => this.scan());
      this.observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private scan(): void {
    // v4 data-attribute API
    const elements = document.querySelectorAll<HTMLElement>(
      `[${LINK_ATTR}]:not([${BOUND_ATTR}])`
    );
    for (const el of elements) {
      this.bind(el);
    }

    // v3 backwards-compat: meetergo-modal-button class + link attribute
    const v3Elements = document.querySelectorAll<HTMLElement>(
      `.${V3_BTN_CLASS}:not([${BOUND_ATTR}])`
    );
    for (const el of v3Elements) {
      const link = el.getAttribute("link") ?? "";
      if (link) {
        el.setAttribute(LINK_ATTR, link);
        this.bind(el);
      }
    }

    // v3 inline iframe: class="meetergo-iframe" data-src="..."
    const iframeElements = document.querySelectorAll<HTMLElement>(
      `.${V3_IFRAME_CLASS}:not([${BOUND_ATTR}])`
    );
    for (const el of iframeElements) {
      const link = el.getAttribute("data-src") ?? el.getAttribute("data-link") ?? "";
      if (link) {
        const ns = el.getAttribute("data-meetergo-ns") ?? "default";
        el.setAttribute(BOUND_ATTR, "true");
        this.callbacks.embedInline(link, el, ns, {});
      }
    }
  }

  private bind(el: HTMLElement): void {
    el.setAttribute(BOUND_ATTR, "true");

    const link   = el.getAttribute(LINK_ATTR) ?? "";
    const ns     = el.getAttribute("data-meetergo-ns") ?? "default";
    const layout = el.getAttribute("data-meetergo-layout") ?? "modal";

    if (!link) return;

    const prefill = this.extractPrefill(el);

    // data-meetergo-config='{"theme":"dark","layout":"month_view"}' — merge into prefill as URL params
    const configAttr = el.getAttribute("data-meetergo-config");
    if (configAttr) {
      try {
        const parsed = JSON.parse(configAttr) as Record<string, string>;
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string" && !(k in prefill)) prefill[k] = v;
        }
      } catch {
        // invalid JSON — ignore
      }
    }

    if (layout === "inline") {
      // Embed immediately in the element
      this.callbacks.embedInline(link, el, ns, prefill);
      return;
    }

    if (layout === "sidebar") {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        this.callbacks.openSidebar(ns);
      });
      return;
    }

    // Default: modal
    el.addEventListener("click", (e) => {
      e.preventDefault();
      this.callbacks.openModal(link, ns, prefill);
    });

    // Keyboard accessibility
    if (!el.hasAttribute("tabindex") && el.tagName !== "BUTTON" && el.tagName !== "A") {
      el.setAttribute("tabindex", "0");
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.callbacks.openModal(link, ns, prefill);
        }
      });
    }
  }

  private extractPrefill(el: HTMLElement): Record<string, string> {
    const prefill: Record<string, string> = {};
    const prefix = "data-meetergo-prefill-";

    for (const attr of el.attributes) {
      if (attr.name.startsWith(prefix)) {
        const key = attr.name.slice(prefix.length);
        prefill[key] = attr.value;
      }
    }

    return prefill;
  }
}
