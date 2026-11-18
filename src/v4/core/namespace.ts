/**
 * Meetergo v4 — Namespace
 *
 * Each `meetergo("init", { ns: "name" })` call creates one MeetergoNamespace.
 * Namespaces are fully isolated — they own their own modal, sidebar, video,
 * inline embeds, event bus, and prerender manager.
 *
 * Public handle surface:
 *   openModal(link, params?)
 *   closeModal()
 *   isModalOpen()
 *   toggleSidebar(position?)
 *   on(event, handler) → unsubscribe fn
 *   off(event, handler)
 *   once(event, handler)
 *   ui(config)            — live-update theme/styles
 *   setPrefill(data)
 *   prerender(link)       — explicitly warm up a link
 *   inline(config)        — programmatic inline embed
 *   destroy()
 */

import { EventBus } from "./event-bus.js";
import { PrerenderManager } from "./prerender.js";
import { ModalManager } from "../modules/modal-manager.js";
import { SidebarManager } from "../modules/sidebar-manager.js";
import { VideoEmbedManager } from "../modules/video-embed-manager.js";
import { FloatingButton } from "../modules/floating-button.js";
import { FormListenerManager } from "../modules/form-listener.js";
import { InlineEmbedManager } from "../modules/inline-embed.js";
import { cssInjector, injectAllBaseStyles } from "../utils/css-injector.js";
import { domCache } from "../utils/dom-cache.js";
import { errorHandler } from "../utils/error-handler.js";
import { resolveDesign, scriptTagDesign } from "../design/resolve.js";
import { loadDesign, loadedDesign } from "../design/loader.js";
import type { DesignApi } from "../design/entry.js";

import type {
  NamespaceConfig,
  MeetergoPrefill,
  UiConfig,
  InlineEmbedConfig,
  SidebarPosition,
  MeetergoEvent,
  EventHandler,
  WildcardHandler,
  NamespaceHandle,
  MeetergoEventName,
  WidgetDesign,
} from "../types/index.js";

/** What every sidebar implementation offers the namespace. */
interface SidebarLike { toggle(position?: SidebarPosition): void; destroy(): void; }
/** What every floating button / video implementation offers the namespace. */
interface Destroyable { destroy(): void; }

export class MeetergoNamespace {
  readonly id: string;

  private config: NamespaceConfig;
  private bus: EventBus;
  private prerender: PrerenderManager | null;

  private modal: ModalManager;
  private sidebar: SidebarManager;
  private video: VideoEmbedManager;
  private floatingBtn: FloatingButton;

  // ── Design 2026 (opt-in; the code lives in a lazily loaded chunk) ─────────
  /** Namespace-level design: init `design`, else the script tag, else classic */
  private readonly design: WidgetDesign;
  private modalDesign: WidgetDesign;
  private modal2026: ModalManager | null = null;
  private modal2026Failed = false;
  private sidebar2026: SidebarLike | null = null;
  private video2026: Destroyable | null = null;
  private floating2026: Destroyable | null = null;
  private formListener: FormListenerManager;
  private inlineEmbed: InlineEmbedManager;

  private destroyed = false;

  constructor(id: string, config: NamespaceConfig) {
    this.id = id;
    this.config = { ns: id, ...config };
    this.bus = new EventBus(id);

    // Design: per widget > namespace > script tag > "classic"
    this.design = resolveDesign(config.design, scriptTagDesign());
    this.modalDesign = resolveDesign(config.ui?.design, this.design);

    // Prerender manager (disabled if config.prerender === false)
    this.prerender =
      config.prerender !== false
        ? new PrerenderManager(id, typeof config.prerender === "object" ? config.prerender : {}, this.config)
        : null;

    // Modules
    this.modal = new ModalManager(id, this.bus, this.config, this.prerender);
    this.sidebar = new SidebarManager(id, this.bus, this.config);
    this.video = new VideoEmbedManager(id, this.bus, (link) => this.modal.openWithLink(link));
    this.floatingBtn = new FloatingButton(id, (link) => this.modal.openWithLink(link));
    this.formListener = new FormListenerManager(id, (link, prefill) =>
      this.withModal(undefined, (m) => m.openWithLink(link, prefill))
    );
    this.inlineEmbed = new InlineEmbedManager(id, this.bus, this.config);

    this.initialize();
  }

  // ── Private init ──────────────────────────────────────────────────────────

  private initialize(): void {
    injectAllBaseStyles();
    this.applyUiConfig(this.config.ui);

    // Wire convenience callbacks to event bus
    if (this.config.onEvent) {
      this.bus.on("*", this.config.onEvent as WildcardHandler);
    }
    if (this.config.onBookingSuccessful) {
      this.bus.on("bookingSuccessful", (env) =>
        this.config.onBookingSuccessful!(env.data as Parameters<NonNullable<NamespaceConfig["onBookingSuccessful"]>>[0])
      );
    }
    // Legacy v3 onSuccess
    if (this.config.onSuccess) {
      this.bus.on("bookingSuccessful", (env) =>
        this.config.onSuccess!(env.data as Parameters<NonNullable<NamespaceConfig["onSuccess"]>>[0])
      );
    }

    const fb = this.config.floatingButton;
    const sb = this.config.sidebar;
    const ve = this.config.videoEmbed;
    const locale = this.config.prefill?.locale;
    const open2026 = (link: string) => this.withModal(undefined, (m) => m.openWithLink(link));

    // Start fetching the design chunk early if anything here uses it
    if (this.modalDesign === "2026") loadDesign().catch(() => undefined);

    // Floating button
    if (fb) {
      if (resolveDesign(fb.design, this.design) === "2026") {
        this.with2026("floating button", (api) => {
          const w = new api.FloatingButton2026(this.id, open2026, locale);
          this.floating2026 = w;
          w.create(fb);
        }, () => this.floatingBtn.create(fb));
      } else {
        this.floatingBtn.create(fb);
      }
    }

    // Sidebar
    if (sb) {
      if (resolveDesign(sb.design, this.design) === "2026") {
        this.with2026("sidebar", (api) => {
          const w = new api.Sidebar2026Manager(this.id, this.bus, this.config, locale);
          this.sidebar2026 = w;
          w.create(sb);
        }, () => this.sidebar.create(sb));
      } else {
        this.sidebar.create(sb);
      }
    }

    // Video embed
    if (ve) {
      if (resolveDesign(ve.design, this.design) === "2026") {
        this.with2026("video", (api) => {
          const w = new api.Video2026Manager(this.id, this.bus, open2026, locale);
          this.video2026 = w;
          return w.create(ve);
        }, () => { this.video.create(ve).catch(console.error); });
      } else {
        this.video.create(ve).catch(console.error);
      }
    }

    // Form listeners
    if (this.config.formListeners?.length) {
      this.formListener.listen(this.config.formListeners);
    }

    // Inline iframe auto-parse
    if (this.config.enableAutoResize !== false) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.inlineEmbed.parseDOM());
      } else {
        this.inlineEmbed.parseDOM();
      }
    }

    // Warm up modal link if floating button present
    if (this.config.floatingButton?.link && this.prerender) {
      this.prerender.warmUp(this.config.floatingButton.link);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * @param design per-call design (e.g. data-meetergo-design on the clicked
   *               element); falls back to the namespace's modal design.
   */
  openModal(link: string, params: Record<string, string> = {}, design?: WidgetDesign): void {
    this.assertAlive();
    this.withModal(design, (m) => m.openWithLink(link, params));
  }

  closeModal(): void {
    this.assertAlive();
    this.modal.closeModal();
    if (this.modal2026?.isOpen()) this.modal2026.closeModal();
  }

  isModalOpen(): boolean {
    return this.modal.isOpen() || !!this.modal2026?.isOpen();
  }

  toggleSidebar(position: SidebarPosition = "right"): void {
    this.assertAlive();
    (this.sidebar2026 ?? this.sidebar).toggle(position);
  }

  on<E extends MeetergoEvent>(
    event: E["event"] | "*",
    handler: EventHandler<E> | WildcardHandler
  ): () => void {
    return this.bus.on(event, handler as Parameters<EventBus["on"]>[1]);
  }

  off<E extends MeetergoEvent>(
    event: E["event"] | "*",
    handler: EventHandler<E> | WildcardHandler
  ): void {
    this.bus.off(event, handler as Parameters<EventBus["off"]>[1]);
  }

  once<E extends MeetergoEvent>(event: E["event"], handler: EventHandler<E>): void {
    this.bus.once(event, handler as Parameters<EventBus["once"]>[1]);
  }

  /**
   * Bridge a raw booking lifecycle postMessage (sent by the booking iframe)
   * onto the typed bus, so `on(event)` subscribers fire, and `onSuccess` /
   * `onBookingSuccessful` for a new booking. Invoked by the SDK's global message
   * listener; the iframe message carries no namespace, so the SDK broadcasts
   * to every live namespace.
   */
  emitBookingPageEvent(event: MeetergoEventName, data: unknown): void {
    if (this.destroyed) return;
    this.bus.emit(event, data);
  }

  /** Live-update UI / theme for all iframes in this namespace. */
  ui(config: UiConfig): void {
    this.assertAlive();
    this.applyUiConfig(config);
  }

  get debug(): boolean {
    return this.config.debug === true;
  }

  setPrefill(data: MeetergoPrefill): void {
    this.assertAlive();
    this.config.prefill = { ...this.config.prefill, ...data };
  }

  /** Explicitly warm up a link in the prerender cache. */
  warmUp(link: string): void {
    this.prerender?.warmUp(link);
  }

  /** Programmatic inline embed. */
  inline(config: InlineEmbedConfig): void {
    this.assertAlive();
    this.inlineEmbed.embed(config);
  }

  /** Return a plain public handle (for SDK ns map). */
  toHandle(): NamespaceHandle {
    return {
      openModal: (link, params) => this.openModal(link, params),
      closeModal: () => this.closeModal(),
      isModalOpen: () => this.isModalOpen(),
      toggleSidebar: (pos) => this.toggleSidebar(pos),
      on: (event, handler) => this.on(event as MeetergoEvent["event"], handler as EventHandler<MeetergoEvent>),
      off: (event, handler) => this.off(event as MeetergoEvent["event"], handler as EventHandler<MeetergoEvent>),
      once: (event, handler) => this.once(event as MeetergoEvent["event"], handler as EventHandler<MeetergoEvent>),
      ui: (cfg) => this.ui(cfg),
      setPrefill: (data) => this.setPrefill(data),
      destroy: () => this.destroy(),
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.modal.destroy();
    this.sidebar.destroy();
    this.video.destroy();
    this.floatingBtn.destroy();
    this.modal2026?.destroy();
    this.sidebar2026?.destroy();
    this.video2026?.destroy();
    this.floating2026?.destroy();
    this.formListener.destroy();
    this.inlineEmbed.destroy();
    this.prerender?.destroy();

    cssInjector.removeCSS(`mg-theme-${this.id}`);
    cssInjector.removeCSS(`mg-per-theme-${this.id}`);
    domCache.clearNamespace(this.id);
    this.bus.removeAll();

    errorHandler.announce("Meetergo embed removed.");
  }

  // ── Private ───────────────────────────────────────────────────────────────

  // ── Design 2026 plumbing ──────────────────────────────────────────────────

  /**
   * Build a 2026 widget once the design chunk is available. If the chunk
   * cannot be loaded, or building throws (or its promise rejects), the
   * classic widget is rendered instead, so the embed never breaks.
   */
  private with2026(name: string, build: (api: DesignApi) => void | Promise<void>, classic: () => void): void {
    const fallback = (err?: unknown) => {
      if (this.destroyed) return;
      errorHandler.handleError({ message: `Design 2026 ${name} failed; showing the classic design`, level: "warning", ns: this.id, error: err as Error });
      classic();
    };
    const run = (api: DesignApi) => {
      if (this.destroyed) return;
      try {
        const result = build(api);
        if (result && typeof result.then === "function") result.catch(fallback);
      } catch (err) {
        fallback(err);
      }
    };
    const api = loadedDesign();
    if (api) run(api);
    else loadDesign().then(run, fallback);
  }

  /**
   * Run `fn` with the modal for a design. The 2026 modal comes from the design
   * chunk; while it loads the call waits, and if it cannot be loaded or built
   * the classic modal opens instead. The other modal is closed first.
   */
  private withModal(design: WidgetDesign | undefined, fn: (modal: ModalManager) => void): void {
    if (resolveDesign(design, this.modalDesign) !== "2026" || this.modal2026Failed) {
      if (this.modal2026?.isOpen()) this.modal2026.closeModal();
      fn(this.modal);
      return;
    }
    const use = () => {
      if (this.destroyed) return;
      const m = this.getModal2026() ?? this.modal;
      if (m !== this.modal && this.modal.isOpen()) this.modal.closeModal();
      if (m === this.modal && this.modal2026?.isOpen()) this.modal2026.closeModal();
      fn(m);
    };
    if (this.modal2026 || loadedDesign()) use();
    else loadDesign().then(use, () => { this.modal2026Failed = true; use(); });
  }

  private getModal2026(): ModalManager | null {
    if (this.modal2026) return this.modal2026;
    const api = loadedDesign();
    if (!api || this.modal2026Failed) return null;
    let m: ModalManager | null = null;
    try {
      const c = this.config;
      const brand = c.ui?.cssVars?.["--mg-brand"] ?? c.floatingButton?.backgroundColor ?? c.sidebar?.backgroundColor ?? c.videoEmbed?.buttonColor;
      const avatar = c.floatingButton?.avatar ?? c.sidebar?.avatar ?? "host";
      m = new api.Modal2026(this.id, this.bus, c, this.prerender, brand, avatar);
      m.initialize(); // builds the shadow DOM; throws where that is unsupported
      this.modal2026 = m;
      return m;
    } catch (err) {
      try { m?.destroy(); } catch { /* nothing to clean */ }
      this.modal2026Failed = true;
      errorHandler.handleError({ message: "Design 2026 modal failed; using the classic modal", level: "warning", ns: this.id, error: err as Error });
      return null;
    }
  }

  private applyUiConfig(config?: UiConfig): void {
    if (!config) return;

    if (config.design) {
      this.modalDesign = resolveDesign(config.design, this.design);
    }

    if (config.cssVars) {
      cssInjector.applyTheme(config.cssVars, this.id);
    }
    if (config.cssVarsPerTheme) {
      cssInjector.applyPerTheme(config.cssVarsPerTheme, this.id);
    }
    if (config.bodyBackground) {
      cssInjector.applyTheme({ "--mg-bg": config.bodyBackground }, this.id);
    }
  }

  private assertAlive(): void {
    if (this.destroyed) {
      errorHandler.handleError({
        message: `Namespace "${this.id}" has been destroyed`,
        level: "warning",
        ns: this.id,
      });
    }
  }
}
