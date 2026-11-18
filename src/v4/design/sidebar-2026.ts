/**
 * Design 2026 — sidebar: edge tab + floating sheet.
 *
 * Tab: avatar, calendar icon, vertical label. Panel floats 10 px from the
 * viewport edges with a 20 px radius, host header and the booking iframe;
 * dimmed backdrop; bottom sheet on phones. Same public surface and events
 * (sidebarOpened / sidebarClosed) as the classic SidebarManager.
 */

import type { NamespaceIframeOptions } from "../utils/iframe-factory.js";
import type { EventBus } from "../core/event-bus.js";
import type { SidebarConfig, SidebarPosition } from "../types/index.js";
import type { ModalFocusHandle } from "../../utils/modal-focus.js";
import { rt, Listeners } from "./runtime.js";
import { copyFor, detectLang, visitorTimeZone } from "./i18n.js";
import { fetchLinkCard, whenIdleOrEngaged } from "./link-card.js";
import { Avatar, brandTokens, createShadowHost, el, HostHeader, ICONS, trapTab } from "./ui.js";

const CSS = `
.edock{position:fixed;pointer-events:auto}
.edock.right{right:0}
.edock.left{left:0}
.edge{display:flex;flex-direction:column;align-items:center;padding:10px 8px 12px;border:0;background:var(--brand);color:var(--brand-fg);cursor:pointer;transition:padding .16s}
.edge.right{border-radius:14px 0 0 14px}
.edge.left{border-radius:0 14px 14px 0}
.edge[aria-expanded="true"]{visibility:hidden}
.edge>*+*{margin-top:8px}
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
  listeners: Listeners;
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

  /** Throws if the sidebar cannot be built; the namespace then renders the classic one. */
  create(config: SidebarConfig): void {
    if (!config.link) {
      rt.errorHandler.handleError({ message: "Sidebar requires a link", level: "warning", ns: this.ns });
      return;
    }
    const position = config.position ?? "right";
    this.remove(position);
    const ls = new Listeners();
    let host: HTMLElement | null = null;
    try {

      const lang = detectLang(this.locale);
      const copy = copyFor(lang);
      const label = config.buttonText || copy.book;
      const avatarOpt = config.avatar ?? "host";
      const shadow = createShadowHost(`mg-${this.ns}-sidebar-2026-${position}`, CSS, 999995, brandTokens(config.backgroundColor, config.textColor));
      host = shadow.host;
      const root = shadow.root;
      let alive = true;
      ls.add(() => { alive = false; });

      // ── Edge tab
      const edock = el("div", `edock ${position}`);
      const tab = el("button", `edge sh enter ${position}`, { type: "button", "aria-label": label, "aria-haspopup": "dialog", "aria-expanded": "false" });
      const btnPos = config.buttonPosition ?? "middle-right";
      if (btnPos.includes("top")) edock.style.top = "120px";
      else if (btnPos.includes("bottom")) edock.style.bottom = "120px";
      else { edock.style.top = "50%"; edock.style.transform = "translateY(-50%)"; }
      edock.appendChild(tab);
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
      iframe.src = rt.bookingSrc(config.link, this.iframeOptions);
      iframe.title = "Meetergo booking sidebar";
      iframe.setAttribute("allow", "payment");
      rt.decorateIframe(iframe, this.iframeOptions);
      sheet.append(header.node, iframe);
      layer.append(scrim, sheet);
      layer.setAttribute("inert", "");
      root.append(edock, layer);

      ls.on(tab, "click", () => this.toggle(position));
      ls.on(header.close, "click", () => this.close(position));
      ls.on(scrim, "click", () => this.close(position));
      ls.on(document, "keydown", ((e: KeyboardEvent) => { if (e.key === "Escape" && this.isOpen(position)) this.close(position); }) as EventListener);
      trapTab(sheet, root, ls);

      ls.add(whenIdleOrEngaged(tab, () => {
        fetchLinkCard(config.link, visitorTimeZone(), lang)
          .then((card) => {
            if (!alive) return;
            tabAvatar.update(card);
            header.update(card);
          })
          .catch(() => undefined);
      }));

      document.body.appendChild(host);
      this.entries.set(position, { host, layer, sheet, tab, close: header.close, listeners: ls, focus: null });
    } catch (err) {
      ls.clear();
      host?.parentNode?.removeChild(host);
      throw err;
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
    e.focus = rt.holdFocusInModal(e.host, e.close);
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
    e.listeners.clear();
    e.host.parentNode?.removeChild(e.host);
    this.entries.delete(position);
  }

  destroy(): void {
    for (const p of [...this.entries.keys()]) this.remove(p);
  }
}
