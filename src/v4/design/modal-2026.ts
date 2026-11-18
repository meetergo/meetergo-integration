/**
 * Design 2026 — booking modal shell.
 *
 * Only the chrome differs from the classic modal: a 22 px card with a host
 * header (avatar, name, meeting type, duration) and the close button inside the
 * header; a bottom sheet on phones. Iframe creation, prerender parking, URL
 * params, load/fail timeouts and every event come from ModalManager unchanged.
 */

import type { ModalManager } from "../modules/modal-manager.js";
import type { ModalFocusHandle } from "../../utils/modal-focus.js";
import { rt, Listeners } from "./runtime.js";
import type { EventBus } from "../core/event-bus.js";
import type { PrerenderManager } from "../core/prerender.js";
import type { NamespaceConfig } from "../types/index.js";
import { copyFor, detectLang, visitorTimeZone } from "./i18n.js";
import { fetchLinkCard, baseLinkFor } from "./link-card.js";
import { brandTokens, createShadowHost, deepActiveElement, el, HostHeader, trapTab, AvatarOption } from "./ui.js";

const CSS = `
.wrap{position:fixed;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;padding:20px;pointer-events:none}
.wrap[data-open="false"]{visibility:hidden}
.wrap[data-open="false"] .scrim,.wrap[data-open="false"] .modal{animation:none}
.modal{position:relative;pointer-events:auto;width:100%;max-width:960px;height:min(88vh,820px);background:#fff;border-radius:22px;overflow:hidden;display:flex;flex-direction:column;animation:mgPop .26s cubic-bezier(.2,.8,.2,1) both}
.modal .hd{padding:14px 14px 14px 18px;border-bottom:1px solid #EFEAE2;min-height:70px;flex:none}
.bd{position:relative;flex:1;min-height:0;background:#fff}
.bd iframe{display:block}
.load{position:absolute;top:0;right:0;bottom:0;left:0;display:grid;place-items:center;pointer-events:none}
@keyframes mgPop{from{opacity:0;transform:translateY(12px) scale(.98)}}
@media (max-width:560px){
  .wrap{align-items:flex-end;padding:0}
  .modal{max-width:none;height:92%;height:92dvh;border-radius:22px 22px 0 0;animation-name:mgUp}
}
`;

export interface Modal2026Manager extends ModalManager {
  readonly shadow: ShadowRoot | null;
}

export type Modal2026Ctor = new (
  ns: string, bus: EventBus, config: NamespaceConfig, prerender: PrerenderManager | null, brandColor?: string, avatar?: AvatarOption
) => Modal2026Manager;

/**
 * The class extends the main bundle's ModalManager, which only exists at
 * runtime (this file ships in the lazily loaded design chunk).
 */
export function defineModal2026(): Modal2026Ctor {
  return class Modal2026 extends rt.ModalManager {
    private host: HTMLElement | null = null;
    private root: ShadowRoot | null = null;
    private wrap: HTMLElement | null = null;
    private content: HTMLElement | null = null;
    private loader: HTMLElement | null = null;
    private header: HostHeader | null = null;
    private chromeListeners: Listeners | null = null;
    private returnTo: HTMLElement | null = null;
    private headerFor: string | null = null;

    constructor(ns: string, bus: EventBus, config: NamespaceConfig, prerender: PrerenderManager | null, private readonly brandColor?: string, private readonly avatar: AvatarOption = "host") {
      super(ns, bus, config, prerender);
    }

    openWithLink(link: string, extraParams: Record<string, string> = {}): void {
      super.openWithLink(link, extraParams);
      if (this.config.disableModal) return;
      this.loadHeader(link);
    }

    protected modalId(): string {
      return `mg-${this.ns}-modal-2026`;
    }

    protected contentId(): string {
      return `mg-${this.ns}-modal-2026-content`;
    }

    isOpen(): boolean {
      return this.wrap?.getAttribute("data-open") === "true";
    }

    // ── Chrome hooks ──────────────────────────────────────────────────────────

    protected chromeRoot(): HTMLElement | null {
      return this.host && this.host.isConnected ? this.host : null;
    }

    protected contentEl(): HTMLElement | null {
      return this.content;
    }

    protected createModalElements(): void {
      const lang = detectLang(this.config.prefill?.locale);
      const copy = copyFor(lang);
      const { host, root } = createShadowHost(this.modalId(), CSS, 1000000, brandTokens(this.brandColor));
      const ls = new Listeners();

      const wrap = el("div", "wrap", { "data-open": "false" });
      const scrim = el("div", "scrim");
      ls.on(scrim, "click", () => this.closeModal());

      const titleId = `${this.modalId()}-title`;
      const modal = el("div", "modal sh", { role: "dialog", "aria-modal": "true", "aria-labelledby": titleId });
      const header = new HostHeader(42, this.avatar, copy.dialog, copy, titleId);
      ls.on(header.close, "click", () => this.closeModal());

      const bd = el("div", "bd");
      const content = el("div");
      content.id = this.contentId();
      content.style.cssText = "position:absolute;top:0;right:0;bottom:0;left:0";
      const loader = el("div", "load", { role: "status", "aria-label": copy.loading });
      loader.appendChild(el("div", "spin"));
      loader.hidden = true;
      bd.append(content, loader);
      modal.append(header.node, bd);
      wrap.append(scrim, modal);
      root.appendChild(wrap);
      trapTab(modal, root, ls);

      document.body.appendChild(host);
      this.host = host;
      this.root = root;
      this.wrap = wrap;
      this.content = content;
      this.loader = loader;
      this.header = header;
      this.chromeListeners = ls;
    }

    protected showChrome(): void {
      this.wrap?.setAttribute("data-open", "true");
    }

    protected hideChrome(): void {
      this.wrap?.setAttribute("data-open", "false");
    }

    protected holdFocus(modal: HTMLElement): ModalFocusHandle {
      // The opener may sit inside another shadow root (e.g. the 2026 pill)
      this.returnTo = deepActiveElement();
      const inner = rt.holdFocusInModal(modal, this.header?.close ?? null);
      return {
        release: () => {
          inner.release();
          const target = this.returnTo;
          this.returnTo = null;
          if (target && target.isConnected) target.focus({ preventScroll: true });
        },
      };
    }

    protected removeChrome(): void {
      this.chromeListeners?.clear();
      this.chromeListeners = null;
      this.host?.parentNode?.removeChild(this.host);
      this.host = this.root = this.wrap = this.content = this.loader = null;
      this.header = null;
      this.headerFor = null;
    }

    protected showSkeleton(): void {
      if (this.loader) this.loader.hidden = false;
    }

    protected hideSkeleton(): void {
      if (this.loader) this.loader.hidden = true;
    }

    // ── Header data ───────────────────────────────────────────────────────────

    private loadHeader(link: string): void {
      const base = baseLinkFor(link);
      if (this.headerFor === base) return;
      this.headerFor = base;
      this.header?.update(null);
      const lang = detectLang(this.config.prefill?.locale);
      fetchLinkCard(base, visitorTimeZone(), lang)
        .then((card) => { if (this.headerFor === base) this.header?.update(card); })
        .catch(() => undefined);
    }

    /** Test hook */
    get shadow(): ShadowRoot | null {
      return this.root;
    }
  };
}
