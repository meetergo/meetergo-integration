/**
 * Meetergo v4 — Error Handler
 *
 * Upgraded from v3:
 *   - Namespace-aware log prefix
 *   - ARIA live region for screen-reader announcements of loading states
 *   - Unchanged visual notification system from v3
 */

export type ErrorLevel = "info" | "warning" | "error" | "critical";

export interface ErrorDetails {
  message: string;
  level: ErrorLevel;
  ns?: string;
  context?: string;
  error?: Error;
  recoverable?: boolean;
  retryAction?: () => Promise<void> | void;
}

export class ErrorHandler {
  private notificationContainer: HTMLElement | null = null;
  private liveRegion: HTMLElement | null = null;
  private activeNotifications: Set<HTMLElement> = new Set();
  private readonly maxNotifications = 5;

  constructor() {
    if (typeof document !== "undefined") {
      this.ensureContainers();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  handleError(details: ErrorDetails, showNotification?: boolean): void {
    this.log(details);

    const shouldNotify =
      showNotification ?? (details.level === "warning" || details.level === "error" || details.level === "critical");

    if (shouldNotify) this.showNotification(details);
    if (details.level === "critical") this.handleCritical(details);
  }

  /** Announce a status message to screen readers via aria-live region */
  announce(message: string): void {
    if (!this.liveRegion) return;
    // Clear then set triggers re-announcement even if the text is the same
    this.liveRegion.textContent = "";
    requestAnimationFrame(() => {
      if (this.liveRegion) this.liveRegion.textContent = message;
    });
  }

  handleNetworkError(
    error: Error,
    context: string,
    retryAction?: () => Promise<void>,
    maxRetries = 3
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const attempt = async () => {
        try {
          if (retryAction) {
            await retryAction();
            resolve();
          } else {
            reject(error);
          }
        } catch (retryErr) {
          attempts++;
          if (attempts >= maxRetries) {
            this.handleError({
              message: `Network error after ${maxRetries} attempts: ${error.message}`,
              level: "error",
              context,
              error: retryErr as Error,
              recoverable: false,
            });
            reject(retryErr);
          } else {
            this.showNotification({
              message: `Connection failed. Retrying… (${attempts}/${maxRetries})`,
              level: "warning",
              context,
              error: retryErr as Error,
              recoverable: true,
              retryAction: attempt,
            });
            setTimeout(attempt, Math.pow(2, attempts) * 1000);
          }
        }
      };
      attempt();
    });
  }

  clearAll(): void {
    for (const n of this.activeNotifications) this.dismiss(n);
  }

  cleanup(): void {
    this.clearAll();
    this.notificationContainer?.parentNode?.removeChild(this.notificationContainer);
    this.liveRegion?.parentNode?.removeChild(this.liveRegion);
    this.notificationContainer = null;
    this.liveRegion = null;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private ensureContainers(): void {
    if (!this.notificationContainer) {
      this.notificationContainer = document.createElement("div");
      this.notificationContainer.id = "mg-v4-notifications";
      Object.assign(this.notificationContainer.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "10000",
        maxWidth: "400px",
        pointerEvents: "none",
      });
      const attach = () => document.body.appendChild(this.notificationContainer!);
      document.body ? attach() : document.addEventListener("DOMContentLoaded", attach);
    }

    if (!this.liveRegion) {
      this.liveRegion = document.createElement("div");
      this.liveRegion.id = "mg-v4-live-region";
      this.liveRegion.setAttribute("role", "status");
      this.liveRegion.setAttribute("aria-live", "polite");
      this.liveRegion.setAttribute("aria-atomic", "true");
      Object.assign(this.liveRegion.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
      });
      const attach = () => document.body.appendChild(this.liveRegion!);
      document.body ? attach() : document.addEventListener("DOMContentLoaded", attach);
    }
  }

  private showNotification(details: ErrorDetails): void {
    if (!this.notificationContainer) return;

    if (this.activeNotifications.size >= this.maxNotifications) {
      const oldest = Array.from(this.activeNotifications)[0];
      this.dismiss(oldest);
    }

    const el = this.buildNotificationEl(details);
    this.notificationContainer.appendChild(el);
    this.activeNotifications.add(el);

    if (details.level !== "critical") {
      setTimeout(() => this.dismiss(el), this.timeout(details.level));
    }
  }

  private buildNotificationEl(details: ErrorDetails): HTMLElement {
    const el = document.createElement("div");
    Object.assign(el.style, {
      background: this.color(details.level),
      color: "white",
      padding: "16px",
      borderRadius: "8px",
      marginBottom: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: "14px",
      lineHeight: "1.5",
      pointerEvents: "auto",
      opacity: "0",
      transform: "translateX(100%)",
      transition: "all 0.3s ease",
      position: "relative",
    });

    const msg = document.createElement("div");
    msg.style.fontWeight = "500";
    msg.style.marginBottom = "4px";
    msg.textContent = details.message;
    el.appendChild(msg);

    if (details.context) {
      const ctx = document.createElement("div");
      ctx.style.cssText = "font-size:12px;opacity:0.85;";
      ctx.textContent = `Context: ${details.context}`;
      el.appendChild(ctx);
    }

    if (details.retryAction) {
      const btn = document.createElement("button");
      btn.textContent = "Retry";
      btn.style.cssText =
        "background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);color:white;padding:4px 12px;border-radius:4px;font-size:12px;cursor:pointer;margin-top:8px;margin-right:8px;";
      btn.onclick = () => { details.retryAction!(); this.dismiss(el); };
      el.appendChild(btn);
    }

    const close = document.createElement("button");
    close.innerHTML = "✕";
    close.setAttribute("aria-label", "Dismiss notification");
    close.style.cssText =
      "position:absolute;top:8px;right:8px;background:none;border:none;color:white;font-size:16px;cursor:pointer;opacity:0.7;padding:4px;line-height:1;";
    close.onclick = () => this.dismiss(el);
    el.appendChild(close);

    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateX(0)";
    });

    return el;
  }

  private dismiss(el: HTMLElement): void {
    if (!this.activeNotifications.has(el)) return;
    el.style.opacity = "0";
    el.style.transform = "translateX(100%)";
    setTimeout(() => {
      el.parentNode?.removeChild(el);
      this.activeNotifications.delete(el);
    }, 300);
  }

  private log(d: ErrorDetails): void {
    const ns = d.ns ? `/${d.ns}` : "";
    const prefix = `[Meetergo${ns} ${d.level.toUpperCase()}] ${d.message}`;
    const ctx = d.context ? ` (${d.context})` : "";
    switch (d.level) {
      case "info": console.info(prefix + ctx, d.error ?? ""); break;
      case "warning": console.warn(prefix + ctx, d.error ?? ""); break;
      default: console.error(prefix + ctx, d.error ?? ""); break;
    }
  }

  private handleCritical(d: ErrorDetails): void {
    console.error("[Meetergo CRITICAL]", d);
  }

  private color(level: ErrorLevel): string {
    switch (level) {
      case "info": return "#2563eb";
      case "warning": return "#d97706";
      case "error": return "#dc2626";
      case "critical": return "#7c2d12";
      default: return "#6b7280";
    }
  }

  private timeout(level: ErrorLevel): number {
    switch (level) {
      case "info": return 3000;
      case "warning": return 5000;
      case "error": return 7000;
      default: return 5000;
    }
  }
}

/** Shared singleton instance */
export const errorHandler = new ErrorHandler();
