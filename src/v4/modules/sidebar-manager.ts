/**
 * Meetergo v4 — Sidebar Manager
 *
 * Upgrades from v3:
 *   - Namespace-prefixed IDs
 *   - EventBus integration
 *   - Proper ESC key cleanup (AbortController)
 *   - Multiple sidebars per page (via different namespaces)
 */

import { errorHandler } from "../utils/error-handler.js";
import { setIcon } from "../utils/icons.js";
import { buildIframeURL } from "../utils/url-params.js";
import type { EventBus } from "../core/event-bus.js";
import type { SidebarConfig, SidebarPosition, Position } from "../types/index.js";

export class SidebarManager {
  private readonly ns: string;
  private readonly bus: EventBus;
  private activeSidebars: Map<SidebarPosition, { sidebar: HTMLElement; toggle: HTMLElement; abort: AbortController }> = new Map();

  constructor(ns: string, bus: EventBus) {
    this.ns = ns;
    this.bus = bus;
  }

  create(config: SidebarConfig): void {
    try {
      if (!config.link) {
        errorHandler.handleError({ message: "Sidebar requires a link", level: "warning", ns: this.ns });
        return;
      }

      const position = config.position ?? "right";
      this.remove(position); // remove existing before recreating

      const { sidebar, toggle } = this.buildElements(config, position);
      const abort = new AbortController();

      // Toggle button handler
      toggle.addEventListener("click", () => this.toggle(position), { signal: abort.signal });

      // Close button inside sidebar
      const closeBtn = sidebar.querySelector(".mg-sidebar-close");
      closeBtn?.addEventListener("click", () => this.close(position), { signal: abort.signal });

      // ESC key
      document.addEventListener(
        "keydown",
        (e) => { if (e.key === "Escape" && this.isOpen(position)) this.close(position); },
        { signal: abort.signal }
      );

      document.body.appendChild(sidebar);
      document.body.appendChild(toggle);
      this.activeSidebars.set(position, { sidebar, toggle, abort });

    } catch (err) {
      errorHandler.handleError({
        message: "Failed to create sidebar",
        level: "error",
        ns: this.ns,
        error: err as Error,
      });
    }
  }

  toggle(position: SidebarPosition = "right"): void {
    this.isOpen(position) ? this.close(position) : this.open(position);
  }

  open(position: SidebarPosition = "right"): void {
    const entry = this.activeSidebars.get(position);
    if (!entry) return;
    entry.sidebar.classList.add("open");
    entry.toggle.classList.add("mg-sidebar-toggle-hidden");
    this.bus.emit("sidebarOpened", { position });
  }

  close(position: SidebarPosition = "right"): void {
    const entry = this.activeSidebars.get(position);
    if (!entry) return;
    entry.sidebar.classList.remove("open");
    entry.toggle.classList.remove("mg-sidebar-toggle-hidden");
    this.bus.emit("sidebarClosed", { position });
  }

  isOpen(position: SidebarPosition): boolean {
    return this.activeSidebars.get(position)?.sidebar.classList.contains("open") ?? false;
  }

  remove(position: SidebarPosition): void {
    const entry = this.activeSidebars.get(position);
    if (!entry) return;
    entry.abort.abort();
    entry.sidebar.parentNode?.removeChild(entry.sidebar);
    entry.toggle.parentNode?.removeChild(entry.toggle);
    this.activeSidebars.delete(position);
  }

  destroy(): void {
    for (const pos of [...this.activeSidebars.keys()]) this.remove(pos);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private buildElements(
    config: SidebarConfig,
    position: SidebarPosition
  ): { sidebar: HTMLElement; toggle: HTMLElement } {
    const width         = config.width          ?? "400px";
    const buttonText    = config.buttonText      ?? "Open Scheduler";
    const buttonIcon    = config.buttonIcon      ?? "calendar";
    const buttonPos     = config.buttonPosition  ?? "middle-right";

    const sidebar = document.createElement("div");
    sidebar.id = `mg-${this.ns}-sidebar-${position}`;
    sidebar.classList.add("mg-sidebar", `mg-sidebar-${position}`);
    sidebar.style.width = width;
    if (config.backgroundColor) sidebar.style.backgroundColor = config.backgroundColor;

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "mg-sidebar-close";
    closeBtn.setAttribute("aria-label", "Close sidebar");
    closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    // Iframe
    const iframe = document.createElement("iframe");
    iframe.className = "mg-sidebar-iframe";
    iframe.src = buildIframeURL(config.link, {});
    iframe.title = "Meetergo booking sidebar";

    sidebar.append(closeBtn, iframe);

    // Toggle button
    const toggle = document.createElement("button");
    toggle.classList.add("mg-sidebar-toggle", `mg-sidebar-toggle-${position}`);
    toggle.setAttribute("aria-label", buttonText);
    if (config.backgroundColor) toggle.style.backgroundColor = config.backgroundColor;
    if (config.textColor)       toggle.style.color = config.textColor;

    this.applyTogglePosition(toggle, buttonPos);

    if (buttonIcon) {
      const iconSpan = document.createElement("span");
      iconSpan.className = "mg-sidebar-toggle-icon";
      setIcon(iconSpan, buttonIcon);
      toggle.appendChild(iconSpan);
    }

    const textLabel = document.createElement("span");
    textLabel.className = "mg-sidebar-toggle-text";
    textLabel.textContent = buttonText;
    toggle.appendChild(textLabel);

    return { sidebar, toggle };
  }

  private applyTogglePosition(btn: HTMLElement, position: Position): void {
    if (position.includes("top"))    { btn.style.top = "120px"; }
    else if (position.includes("middle")) { btn.style.top = "50%"; btn.style.transform = "translateY(-50%)"; }
    else                             { btn.style.bottom = "120px"; }
  }
}
