/**
 * Meetergo v4 — Root SDK
 *
 * The `MeetergoSDK` is the top-level orchestrator:
 *   - Manages a map of MeetergoNamespace instances (one per ns key)
 *   - Exposes the callable `meetergo(method, args...)` API surface
 *   - Drains the `window.meetergo.q` queue that the loader snippet populated
 *   - Installs the global data-attribute scanner (one instance for all namespaces)
 *   - Handles v3 backwards-compatibility (window.meetergoSettings)
 */

import { MeetergoNamespace } from "./namespace.js";
import { DataAttrScanner } from "../modules/data-attr-scanner.js";
import { errorHandler } from "../utils/error-handler.js";

import type {
  NamespaceConfig,
  SDKCallable,
  NamespaceHandle,
  MeetergoPrefill,
  UiConfig,
  InlineEmbedConfig,
  BookingSuccessfulData,
} from "../types/index.js";

export const SDK_VERSION = "4.0.0";

const DEFAULT_NS = "default";

export class MeetergoSDK {
  private namespaces: Map<string, MeetergoNamespace> = new Map();
  scanner: DataAttrScanner;

  constructor() {
    this.scanner = new DataAttrScanner({
      openModal: (link, ns, prefill) => {
        this.getOrCreate(ns).openModal(link, prefill);
      },
      openSidebar: (ns) => {
        this.getOrCreate(ns).toggleSidebar();
      },
      embedInline: (link, container, ns, prefill) => {
        const align = container.getAttribute("data-align") as "left" | "center" | "right" | null;
        this.getOrCreate(ns).inline({ link, elementOrSelector: container, prefill, ...(align && { alignment: align }) });
      },
    });
  }

  /**
   * Apply v3 backwards-compat settings if present.
   * Called before queue drain so legacy settings don't override queued init calls.
   */
  boot(): void {
    if (typeof window !== "undefined" && window.meetergoSettings) {
      this.initNamespace({ ns: DEFAULT_NS, ...window.meetergoSettings });
    }
  }

  /**
   * Start the data-attribute scanner.
   * Must be called AFTER the queue is drained so that any meetergo('init', {...})
   * calls (e.g. floatingButton) have already created their namespace before the
   * scanner runs — preventing a destroy/recreate cycle.
   */
  startScanner(): void {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.scanner.start());
    } else {
      this.scanner.start();
    }
    this.startGlobalListeners();
  }

  /**
   * Global postMessage listener for messages sent via window.top.postMessage
   * from inside iframes (e.g. routing forms that open a modal for a meeting type).
   */
  private startGlobalListeners(): void {
    window.addEventListener("message", (e: MessageEvent) => {
      const data = e.data as Record<string, unknown>;
      if (!data || typeof data !== "object") return;

      // Routing form / formFirst: open a modal with the given link + params
      if (data.event === "open-modal") {
        const payload = data.data as { link?: string; params?: Record<string, string> } | undefined;
        const link = payload?.link ?? "";
        if (!link) return;
        this.getOrCreate(DEFAULT_NS).openModal(link, payload?.params);
        return;
      }

      // Booking completed inside an embedded iframe. The booking page posts
      // { event: "booking-successful", data } to its parent; bridge it onto the
      // typed bus so onSuccess / onBookingSuccessful subscribers fire. The
      // message carries no namespace, so broadcast to every live namespace
      // (mirrors the single global handler v3 used for meetergoSettings.onSuccess).
      if (data.event === "booking-successful") {
        const payload = (data.data ?? {}) as BookingSuccessfulData;
        for (const ns of this.namespaces.values()) {
          ns.emitBookingSuccessful(payload);
        }
        return;
      }
    });
  }

  /**
   * The main callable function — mirrors Cal("method", args).
   * Usage:
   *   meetergo("init", { ns: "booking", floatingButton: { link: "..." } })
   *   meetergo("modal", { calLink: "...", ns: "booking" })
   *   meetergo("on", { action: "bookingSuccessful", callback: fn, ns: "booking" })
   */
  callable = (method: string, ...args: unknown[]): void => {
    try {
      this.dispatch(method, args);
    } catch (err) {
      errorHandler.handleError({
        message: `SDK callable error in method "${method}"`,
        level: "error",
        error: err as Error,
      });
    }
  };

  /** Build the final `window.meetergo` object. */
  buildSDKCallable(): SDKCallable {
    const fn = this.callable as SDKCallable;
    fn.version = SDK_VERSION;
    fn.ns = this.buildNsProxy();

    // Direct method shorthands so meetergo.init(...) works in addition to meetergo("init", ...)
    fn.init       = (config?: unknown)  => this.callable("init",       config);
    fn.modal      = (opts?: unknown)    => this.callable("modal",      opts);
    fn.openModal  = (opts?: unknown)    => this.callable("openModal",  opts);
    fn.closeModal = (opts?: unknown)    => this.callable("closeModal", opts);
    fn.inline     = (opts?: unknown)    => this.callable("inline",     opts);
    fn.on         = (opts?: unknown)    => this.callable("on",         opts);
    fn.off        = (opts?: unknown)    => this.callable("off",        opts);
    fn.once       = (opts?: unknown)    => this.callable("once",       opts);
    fn.ui         = (opts?: unknown)    => this.callable("ui",         opts);
    fn.prerender  = (opts?: unknown)    => this.callable("prerender",  opts);
    fn.setPrefill = (opts?: unknown)    => this.callable("setPrefill", opts);
    fn.destroy    = (opts?: unknown)    => this.callable("destroy",    opts);

    return fn;
  }

  /** Drain the pre-load queue (`window.meetergo.q`). */
  drainQueue(queue: unknown[][]): void {
    for (const call of queue) {
      const [method, ...args] = call as [string, ...unknown[]];
      try {
        this.dispatch(method, args);
      } catch (err) {
        errorHandler.handleError({
          message: `Error draining queue call "${method}"`,
          level: "warning",
          error: err as Error,
        });
      }
    }
  }

  destroy(): void {
    this.scanner.stop();
    for (const ns of this.namespaces.values()) ns.destroy();
    this.namespaces.clear();
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────

  private dispatch(method: string, args: unknown[]): void {
    switch (method) {
      case "init": {
        const config = (args[0] ?? {}) as NamespaceConfig;
        const nsId = config.ns ?? DEFAULT_NS;
        this.initNamespace({ ...config, ns: nsId });
        break;
      }

      case "modal": {
        const opts = (args[0] ?? {}) as { calLink?: string; link?: string; ns?: string; params?: Record<string, string> };
        const link = opts.calLink ?? opts.link ?? "";
        const ns = this.getOrCreate(opts.ns ?? DEFAULT_NS);
        ns.openModal(link, opts.params);
        break;
      }

      case "closeModal": {
        const opts = (args[0] ?? {}) as { ns?: string };
        this.getOrCreate(opts.ns ?? DEFAULT_NS).closeModal();
        break;
      }

      case "openModal": {
        const opts = (args[0] ?? {}) as { link?: string; ns?: string; params?: Record<string, string> };
        this.getOrCreate(opts.ns ?? DEFAULT_NS).openModal(opts.link ?? "", opts.params);
        break;
      }

      case "inline": {
        const opts = (args[0] ?? {}) as InlineEmbedConfig & { ns?: string };
        const { ns: nsId, ...inlineCfg } = opts;
        this.getOrCreate(nsId ?? DEFAULT_NS).inline(inlineCfg);
        break;
      }

      case "prerender":
      case "preload": {
        const opts = (args[0] ?? {}) as { calLink?: string; link?: string; ns?: string };
        const link = opts.calLink ?? opts.link ?? "";
        this.getOrCreate(opts.ns ?? DEFAULT_NS).warmUp(link);
        break;
      }

      case "on": {
        const opts = (args[0] ?? {}) as { action: string; callback: (...a: unknown[]) => void; ns?: string };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.getOrCreate(opts.ns ?? DEFAULT_NS).on(opts.action as any, opts.callback as any);
        break;
      }

      case "off": {
        const opts = (args[0] ?? {}) as { action: string; callback: (...a: unknown[]) => void; ns?: string };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.getOrCreate(opts.ns ?? DEFAULT_NS).off(opts.action as any, opts.callback as any);
        break;
      }

      case "once": {
        const opts = (args[0] ?? {}) as { action: string; callback: (...a: unknown[]) => void; ns?: string };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.getOrCreate(opts.ns ?? DEFAULT_NS).once(opts.action as any, opts.callback as any);
        break;
      }

      case "ui": {
        const opts = (args[0] ?? {}) as UiConfig & { ns?: string };
        const { ns: nsId, ...uiCfg } = opts;
        this.getOrCreate(nsId ?? DEFAULT_NS).ui(uiCfg);
        break;
      }

      case "setPrefill": {
        const opts = (args[0] ?? {}) as MeetergoPrefill & { ns?: string };
        const { ns: nsId, ...prefill } = opts;
        this.getOrCreate(nsId ?? DEFAULT_NS).setPrefill(prefill as MeetergoPrefill);
        break;
      }

      case "destroy": {
        const opts = (args[0] ?? {}) as { ns?: string };
        if (opts.ns) {
          this.namespaces.get(opts.ns)?.destroy();
          this.namespaces.delete(opts.ns);
        } else {
          this.destroy();
        }
        break;
      }

      default:
        errorHandler.handleError({ message: `Unknown SDK method: "${method}"`, level: "warning" });
    }
  }

  // ── Namespace helpers ─────────────────────────────────────────────────────

  private initNamespace(config: NamespaceConfig): MeetergoNamespace {
    const id = config.ns ?? DEFAULT_NS;
    // Destroy existing namespace with the same id before reinitializing
    if (this.namespaces.has(id)) {
      this.namespaces.get(id)!.destroy();
    }
    const ns = new MeetergoNamespace(id, config);
    this.namespaces.set(id, ns);
    return ns;
  }

  private getOrCreate(id: string): MeetergoNamespace {
    if (!this.namespaces.has(id)) {
      return this.initNamespace({ ns: id });
    }
    return this.namespaces.get(id)!;
  }

  private buildNsProxy(): Record<string, NamespaceHandle> {
    return new Proxy({} as Record<string, NamespaceHandle>, {
      get: (_, key: string) => {
        return this.getOrCreate(key).toHandle();
      },
    });
  }
}
