/**
 * Design 2026 — sidebar: edge tab + floating sheet.
 *
 * Tab: avatar, calendar icon, vertical label. Panel floats 10 px from the
 * viewport edges with a 20 px radius, host header and the booking iframe;
 * dimmed backdrop; bottom sheet on phones. Same public surface and events
 * (sidebarOpened / sidebarClosed) as the classic SidebarManager.
 */

import { errorHandler } from "../utils/error-handler.js";
import { bookingSrc, decorateIframe } from "../utils/iframe-factory.js";
import type { NamespaceIframeOptions } from "../utils/iframe-factory.js";
import type { EventBus } from "../core/event-bus.js";
import type { SidebarConfig, SidebarPosition } from "../types/index.js";
import { holdFocusInModal, ModalFocusHandle } from "../../utils/modal-focus.js";
import { copyFor, detectLang, visitorTimeZone } from "./i18n.js";
import { fetchLinkCard, whenIdleOrEngaged } from "./link-card.js";
import { Avatar, brandTokens, createShadowHost, el, HostHeader, ICONS, trapTab } from "./ui.js";

const CSS = `
.edge{position:fixed;pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 8px 12px;border:0;background:var(--brand);color:var(--brand-fg);cursor:pointer;transition:padding .16s}
.edge.right{right:0;border-radius:14px 0 0 14px}
.edge.left{left:0;border-radius:0 14px 14px 0}
.edge[aria-expanded="true"]{visibility:hidden}
.edge.right:hover{padding-right:12px}
.edge.left:hover{padding-left:12px}
.edge .av{border:2px solid rgba(255,255,255,.9);background:rgba(255,255,255,.18);color:inherit}
.edge .lbl{writing-mode:vertical-rl;transform:rotate(180deg);font:500 13px/1.2 inherit;letter-spacing:.01em;max-height:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.layer[data-open="false"]{visibility:hidden}
.layer[data-open="false"] *{animation:none!important}
.sheet{position:fixed;pointer-events:auto;top:10px;bottom:10px;max-width:calc(100vw - 20px);background:#fff;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;animation:mgSlideR .3s cubic-bezier(.2,.8,.2,1) both}
.sheet.right{right:10px}
.sheet.left{left:10px;animation-name:mgSlideL}
.sheet .hd{padding:14px 14px 14px 16px;border-bottom:1px solid #EFEAE2;flex:none}
.sheet iframe{flex:1;width:100%;min-height:0;border:0;display:block}
@keyframes mgSlideR{from{transform:translateX(30px);opacity:0}}
@keyframes mgSlideL{from{transform:translateX(-30px);opacity:0}}
@media (max-width:560px){
  .sheet,.sheet.left,.sheet.right{top:auto;left:0;right:0;bottom:0;width:100%!important;max-width:none;height:86%;height:86dvh;border-radius:22px 22px 0 0;animation-name:mgUp}
}
`;

interface Entry {
  host: HTMLElement;
  layer: HTMLElement;
  sheet: HTMLElement;
  tab: HTMLButtonElement;
  close: HTMLButtonElement;
  abort: AbortController;
  stopIdle: () => void;
  focus: ModalFocusHandle | null;
}

export class Sidebar2026Manager {
  private readonly entries: Map<SidebarPosition, Entry> = new Map();

  constructor(
    private readonly ns: string,
    private readonly bus: EventBus,
    private readonly iframeOptions: NamespaceIframeOptions = { forwardQueryParams: false },
    private readonly locale?: string
  ) {}

  create(config: SidebarConfig): void {
    try {
      if (!config.link) {
        errorHandler.handleError({ message: "Sidebar requires a link", level: "warning", ns: this.ns });
        return;
      }
      const position = config.position ?? "right";
      this.remove(position);

      const lang = detectLang(this.locale);
      const copy = copyFor(lang);
      const label = config.buttonText || copy.book;
      const avatarOpt = config.avatar ?? "host";
      const { host, root } = createShadowHost(`mg-${this.ns}-sidebar-2026-${position}`, CSS, 999995, brandTokens(config.backgroundColor, config.textColor));
      const abort = new AbortController();
      const sig = abort.signal;

      // ── Edge tab
      const tab = el("button", `edge sh enter ${position}`, { type: "button", "aria-label": label, "aria-haspopup": "dialog", "aria-expanded": "false" });
      const btnPos = config.buttonPosition ?? "middle-right";
      if (btnPos.includes("top")) tab.style.top = "120px";
      else if (btnPos.includes("bottom")) tab.style.bottom = "120px";
      else { tab.style.top = "50%"; tab.style.translate = "0 -50%"; }
      const tabAvatar = new Avatar(34, avatarOpt);
      if (avatarOpt !== false) tab.appendChild(tabAvatar.node);
      const icon = el("span", "", { "aria-hidden": "true" });
      icon.innerHTML = ICONS.cal;
      const lbl = el("span", "lbl");
      lbl.textContent = label;
      tab.append(icon, lbl);

      // ── Sheet
      const layer = el("div", "layer", { "data-open": "false" });
      const scrim = el("div", "scrim");
      const titleId = `mg-${this.ns}-sidebar-2026-${position}-title`;
      const sheet = el("div", `sheet sh ${position}`, { role: "dialog", "aria-modal": "true", "aria-labelledby": titleId });
      sheet.style.width = config.width ?? "400px";
      const header = new HostHeader(40, avatarOpt, label, copy, titleId);
      header.close.style.marginLeft = "auto";
      const iframe = document.createElement("iframe");
      iframe.src = bookingSrc(config.link, this.iframeOptions);
      iframe.title = "Meetergo booking sidebar";
      iframe.setAttribute("allow", "payment");
      decorateIframe(iframe, this.iframeOptions);
      sheet.append(header.node, iframe);
      layer.append(scrim, sheet);
      layer.setAttribute("inert", "");
      root.append(tab, layer);

      tab.addEventListener("click", () => this.toggle(position), { signal: sig });
      header.close.addEventListener("click", () => this.close(position), { signal: sig });
      scrim.addEventListener("click", () => this.close(position), { signal: sig });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && this.isOpen(position)) this.close(position); }, { signal: sig });
      trapTab(sheet, root, sig);

      const stopIdle = whenIdleOrEngaged(tab, () => {
        fetchLinkCard(config.link, visitorTimeZone(), lang).then((card) => {
          if (sig.aborted) return;
          tabAvatar.update(card);
          header.update(card);
        });
      });

      document.body.appendChild(host);
      this.entries.set(position, { host, layer, sheet, tab, close: header.close, abort, stopIdle, focus: null });
    } catch (err) {
      errorHandler.handleError({ message: "Failed to create sidebar", level: "error", ns: this.ns, error: err as Error });
    }
  }

  toggle(position: SidebarPosition = "right"): void {
    this.isOpen(position) ? this.close(position) : this.open(position);
  }

  open(position: SidebarPosition = "right"): void {
    const e = this.entries.get(position);
    if (!e || this.isOpen(position)) return;
    e.layer.setAttribute("data-open", "true");
    e.layer.removeAttribute("inert");
    e.tab.setAttribute("aria-expanded", "true");
    e.tab.setAttribute("inert", "");
    e.focus = holdFocusInModal(e.host, e.close);
    this.bus.emit("sidebarOpened", { position });
  }

  close(position: SidebarPosition = "right"): void {
    const e = this.entries.get(position);
    if (!e) return;
    e.layer.setAttribute("data-open", "false");
    e.layer.setAttribute("inert", "");
    e.tab.setAttribute("aria-expanded", "false");
    e.tab.removeAttribute("inert");
    if (e.focus) {
      e.focus.release();
      e.focus = null;
      e.tab.focus({ preventScroll: true });
    }
    this.bus.emit("sidebarClosed", { position });
  }

  isOpen(position: SidebarPosition): boolean {
    return this.entries.get(position)?.layer.getAttribute("data-open") === "true";
  }

  remove(position: SidebarPosition): void {
    const e = this.entries.get(position);
    if (!e) return;
    e.focus?.release();
    e.abort.abort();
    e.stopIdle();
    e.host.parentNode?.removeChild(e.host);
    this.entries.delete(position);
  }

  destroy(): void {
    for (const p of [...this.entries.keys()]) this.remove(p);
  }
}
