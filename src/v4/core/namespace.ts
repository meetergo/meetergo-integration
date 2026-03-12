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
} from "../types/index.js";

export class MeetergoNamespace {
  readonly id: string;

  private config: NamespaceConfig;
  private bus: EventBus;
  private prerender: PrerenderManager | null;

  private modal: ModalManager;
  private sidebar: SidebarManager;
  private video: VideoEmbedManager;
  private floatingBtn: FloatingButton;
  private formListener: FormListenerManager;
  private inlineEmbed: InlineEmbedManager;

  private destroyed = false;

  constructor(id: string, config: NamespaceConfig) {
    this.id = id;
    this.config = { ns: id, ...config };
    this.bus = new EventBus(id);

    // Prerender manager (disabled if config.prerender === false)
    this.prerender =
      config.prerender !== false
        ? new PrerenderManager(id, typeof config.prerender === "object" ? config.prerender : {})
        : null;

    // Modules
    this.modal = new ModalManager(id, this.bus, this.config, this.prerender);
    this.sidebar = new SidebarManager(id, this.bus);
    this.video = new VideoEmbedManager(id, this.bus, (link) => this.modal.openWithLink(link));
    this.floatingBtn = new FloatingButton(id, (link) => this.modal.openWithLink(link));
    this.formListener = new FormListenerManager(id, (link, prefill) =>
      this.modal.openWithLink(link, prefill)
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

    // Floating button
    if (this.config.floatingButton) {
      this.floatingBtn.create(this.config.floatingButton);
    }

    // Sidebar
    if (this.config.sidebar) {
      this.sidebar.create(this.config.sidebar);
    }

    // Video embed
    if (this.config.videoEmbed) {
      this.video.create(this.config.videoEmbed).catch(console.error);
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

  openModal(link: string, params: Record<string, string> = {}): void {
    this.assertAlive();
    this.modal.openWithLink(link, params);
  }

  closeModal(): void {
    this.assertAlive();
    this.modal.closeModal();
  }

  isModalOpen(): boolean {
    return this.modal.isOpen();
  }

  toggleSidebar(position: SidebarPosition = "right"): void {
    this.assertAlive();
    this.sidebar.toggle(position);
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

  /** Live-update UI / theme for all iframes in this namespace. */
  ui(config: UiConfig): void {
    this.assertAlive();
    this.applyUiConfig(config);
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

  private applyUiConfig(config?: UiConfig): void {
    if (!config) return;

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
