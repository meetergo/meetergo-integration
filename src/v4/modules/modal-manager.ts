/**
 * Meetergo v4 — Modal Manager
 *
 * Upgrades from v3:
 *   - Namespace-prefixed DOM IDs (supports multiple embeds per page)
 *   - Prerender integration (acquires pre-warmed iframe if available)
 *   - Color scheme flash prevention via IframeFactory
 *   - ARIA live region for loading state
 *   - EventBus integration (no more single callback)
 *   - role="alertdialog" + aria-live loading region inside modal
 */

import { createIframe } from "../utils/iframe-factory.js";
import { domCache } from "../utils/dom-cache.js";
import { errorHandler } from "../utils/error-handler.js";
import type { EventBus } from "../core/event-bus.js";
import type { PrerenderManager } from "../core/prerender.js";
import type { MeetergoPrefill, NamespaceConfig } from "../types/index.js";

export class ModalManager {
  private readonly ns: string;
  private readonly bus: EventBus;
  private readonly prerender: PrerenderManager | null;
  private readonly config: NamespaceConfig;

  private lastActiveElement: Element | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private currentLink: string | null = null;
  private currentColorSchemeHandle: { stop(): void } | null = null;
  private loadTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private openCount = 0;

  constructor(ns: string, bus: EventBus, config: NamespaceConfig, prerender: PrerenderManager | null) {
    this.ns = ns;
    this.bus = bus;
    this.config = config;
    this.prerender = prerender;
  }

  /** Create the modal DOM once (idempotent). */
  initialize(): void {
    if (domCache.getElementById(this.modalId())) return;
    this.createModalElements();
    this.setupKeyboardHandler();
  }

  /** Open modal with a booking link. */
  openWithLink(link: string, extraParams: Record<string, string> = {}): void {
    if (this.config.disableModal) return;

    this.initialize();

    // Smart reuse: same link already loaded → just show, fire bookerReopened
    if (this.currentLink === link && !this.isOpen()) {
      const modalContent = domCache.getElementById(this.contentId());
      const existingIframe = modalContent?.querySelector("iframe");
      if (existingIframe) {
        this.openCount++;
        this.openModal();
        this.bus.emit("bookerReopened", { link });
        return;
      }
    }

    // Different link while modal has an iframe → fire bookerReloaded
    if (this.currentLink && this.currentLink !== link) {
      this.bus.emit("bookerReloaded", { link });
    }

    this.currentLink = link;
    this.bus.emit("modalOpened", { link });
    errorHandler.announce("Loading booking calendar…");

    this.bus.emit("modal_loading", {});

    const modalContent = domCache.getElementById(this.contentId());
    if (!modalContent) return;

    modalContent.innerHTML = "";
    this.showSkeleton();

    // Try to acquire a prerendered iframe first
    let iframe: HTMLIFrameElement | null = null;
    let colorSchemeHandle: { stop(): void } | null = null;

    if (this.prerender) {
      iframe = this.prerender.acquire(link, extraParams);
    }

    if (iframe) {
      // Use pre-warmed iframe — just reveal it
      iframe.style.visibility = "visible";
    } else {
      // Create fresh iframe
      const result = createIframe({
        link,
        ns: this.ns,
        extraParams,
        prefill: this.config.prefill,
        forwardQueryParams: this.config.forwardQueryParams,
        origin: this.config.origin ?? "*",
        height: "700px",
      });
      iframe = result.iframe;
      colorSchemeHandle = result.colorSchemeHandle;
    }

    // Mark the iframe so routing forms inside it don't re-trigger open-modal
    iframe.name = "meetergo-embedded-modal";

    this.currentColorSchemeHandle = colorSchemeHandle;

    // Fill the content container fully
    Object.assign(iframe.style, {
      width: "100%",
      height: "100%",
      border: "none",
    });

    // linkFailed timeout — fire if iframe doesn't load within 15s
    this.clearLoadTimeout();
    this.loadTimeoutId = setTimeout(() => {
      this.hideSkeleton();
      this.bus.emit("linkFailed", { code: 0, msg: "Booking calendar failed to load", url: link });
    }, 15000);

    iframe.addEventListener("load", () => {
      this.clearLoadTimeout();
      this.hideSkeleton();
      errorHandler.announce("Booking calendar loaded.");
      this.bus.emit("linkReady", {});
      this.openCount++;
    }, { once: true });

    iframe.addEventListener("error", () => {
      this.clearLoadTimeout();
      this.hideSkeleton();
      this.bus.emit("linkFailed", { code: 0, msg: "Booking calendar failed to load", url: link });
    }, { once: true });

    modalContent.appendChild(iframe);
    this.openModal();
  }

  openModal(): void {
    const modal = domCache.getElementById(this.modalId());
    if (!modal) return;

    this.lastActiveElement = document.activeElement;
    modal.style.visibility = "visible";
    modal.style.opacity = "1";
    document.body.style.overflow = "hidden";

    // Focus close button for accessibility
    const closeBtn = modal.querySelector(".mg-close-button") as HTMLElement | null;
    setTimeout(() => closeBtn?.focus(), 100);

    this.bus.emit("modalOpened", { link: this.currentLink ?? "" });
  }

  closeModal(preserveContent = false): void {
    const modal = domCache.getElementById(this.modalId());
    if (!modal) return;

    this.clearLoadTimeout();
    modal.style.visibility = "hidden";
    modal.style.opacity = "0";
    document.body.style.overflow = "";
    this.hideSkeleton();

    // Return prerendered iframe to parking
    if (this.prerender && this.currentLink) {
      const iframe = domCache
        .getElementById(this.contentId())
        ?.querySelector("iframe") as HTMLIFrameElement | null;
      if (iframe) {
        this.prerender.release(this.currentLink);
      }
    }

    // Stop color scheme sync
    this.currentColorSchemeHandle?.stop();
    this.currentColorSchemeHandle = null;

    if (!preserveContent) {
      setTimeout(() => {
        const content = domCache.getElementById(this.contentId());
        if (content) content.innerHTML = "";
      }, 300);
    }

    // Restore focus
    setTimeout(() => {
      if (this.lastActiveElement instanceof HTMLElement) {
        this.lastActiveElement.focus();
      }
    }, 100);

    this.bus.emit("modalClosed", {});
    errorHandler.announce("Booking calendar closed.");
  }

  isOpen(): boolean {
    const modal = domCache.getElementById(this.modalId());
    return modal?.style.visibility === "visible";
  }

  destroy(): void {
    if (this.isOpen()) this.closeModal();
    this.keydownHandler && document.removeEventListener("keydown", this.keydownHandler);

    const modal = domCache.getElementById(this.modalId());
    modal?.parentNode?.removeChild(modal);
    domCache.remove(this.modalId());
    domCache.remove(this.contentId());
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private modalId()   { return `mg-${this.ns}-modal`; }
  private contentId() { return `mg-${this.ns}-modal-content`; }
  private spinnerId() { return `mg-${this.ns}-modal-spinner`; }

  private showSkeleton(): void {
    const spinner = domCache.getElementById(this.spinnerId());
    if (spinner) { spinner.style.display = "inline-block"; spinner.style.visibility = "visible"; spinner.style.opacity = "1"; }
  }

  private hideSkeleton(): void {
    const spinner = domCache.getElementById(this.spinnerId());
    if (spinner) { spinner.style.display = "none"; }
  }

  private showSpinner(): void { this.showSkeleton(); }
  private hideSpinner(): void { this.hideSkeleton(); }

  private clearLoadTimeout(): void {
    if (this.loadTimeoutId !== null) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }
  }

  private createModalElements(): void {
    const modal = document.createElement("div");
    modal.id = this.modalId();
    modal.setAttribute("role", "alertdialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", `${this.modalId()}-title`);
    modal.setAttribute("aria-describedby", `${this.modalId()}-desc`);

    Object.assign(modal.style, {
      zIndex: "999999",
      position: "fixed",
      transition: "visibility 0s linear 0.1s, opacity 0.3s ease",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      visibility: "hidden",
      opacity: "0",
      padding: "20px",
      boxSizing: "border-box",
    });

    // Overlay
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      zIndex: "1001",
      position: "fixed",
      top: "0", left: "0",
      width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.6)",
    });
    overlay.addEventListener("click", () => this.closeModal());

    // Content container
    const content = document.createElement("div");
    content.id = this.contentId();
    Object.assign(content.style, {
      zIndex: "1003",
      position: "relative",
      width: "100%",
      maxWidth: "1100px",
      height: "min(90vh, 800px)",
      backgroundColor: "transparent",
      borderRadius: "0.7rem",
      overflow: "hidden",
    });

    // Spinner
    const spinner = document.createElement("div");
    spinner.id = this.spinnerId();
    spinner.className = "mg-spinner";
    spinner.setAttribute("role", "status");
    spinner.setAttribute("aria-label", "Loading");
    spinner.style.zIndex = "1002";

    // Loading live region (inside modal, polite)
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    Object.assign(liveRegion.style, {
      position: "absolute",
      width: "1px", height: "1px",
      overflow: "hidden",
      clip: "rect(0,0,0,0)",
    });

    // Close button — absolutely positioned in the top-right corner
    const closeBtn = document.createElement("button");
    closeBtn.className = "mg-close-button";
    closeBtn.setAttribute("aria-label", "Close booking modal");
    closeBtn.setAttribute("type", "button");
    Object.assign(closeBtn.style, {
      position: "absolute",
      top: "12px",
      right: "12px",
      zIndex: "1004",
    });
    closeBtn.innerHTML = `<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="24px" width="24px" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M289.94 256l95-95A24 24 0 00351 127l-95 95-95-95a24 24 0 00-34 34l95 95-95 95a24 24 0 1034 34l95-95 95 95a24 24 0 0034-34z"></path></svg>`;
    closeBtn.addEventListener("click", () => this.closeModal());

    // Hidden a11y title/description
    const srOnly = { position:"absolute", width:"1px", height:"1px", overflow:"hidden", clip:"rect(0,0,0,0)", whiteSpace:"nowrap" } as const;
    const title = document.createElement("h2");
    title.id = `${this.modalId()}-title`;
    title.textContent = "Meetergo Booking";
    Object.assign(title.style, srOnly);

    const desc = document.createElement("p");
    desc.id = `${this.modalId()}-desc`;
    desc.textContent = "Calendar booking interface";
    Object.assign(desc.style, srOnly);

    modal.append(overlay, content, spinner, liveRegion, closeBtn, title, desc);
    document.body.appendChild(modal);
  }

  private setupKeyboardHandler(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && this.isOpen()) this.closeModal();
    };
    document.addEventListener("keydown", this.keydownHandler);
  }
}
