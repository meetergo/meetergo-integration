/**
 * Meetergo v4 — Floating Button Module
 *
 * Extracted from v3 main.ts. Supports all 9 positions, animations,
 * and custom icons via the consolidated icon map.
 */

import { errorHandler } from "../utils/error-handler.js";
import { setIcon } from "../utils/icons.js";
import type { FloatingButtonConfig, Position, ButtonAnimation } from "../types/index.js";

export class FloatingButton {
  private element: HTMLElement | null = null;
  private readonly ns: string;
  private readonly onOpen: (link: string) => void;

  constructor(ns: string, onOpen: (link: string) => void) {
    this.ns = ns;
    this.onOpen = onOpen;
  }

  create(config: FloatingButtonConfig): void {
    try {
      this.destroy();

      const btn = document.createElement("button");
      btn.id = config.domId ?? `mg-${this.ns}-float-btn`;
      btn.className = "mg-float-button";
      btn.setAttribute("type", "button");
      btn.setAttribute("aria-label", config.text ?? "Schedule a meeting");

      // Icon
      if (config.icon) {
        const iconEl = document.createElement("span");
        iconEl.setAttribute("aria-hidden", "true");
        setIcon(iconEl, config.icon);
        btn.appendChild(iconEl);
      }

      // Text
      if (config.text) {
        const textEl = document.createElement("span");
        textEl.textContent = config.text;
        btn.appendChild(textEl);
      }

      // Custom colours
      if (config.backgroundColor) btn.style.backgroundColor = config.backgroundColor;
      if (config.textColor)       btn.style.color = config.textColor;

      // Position
      Object.assign(btn.style, { position: "fixed", zIndex: "999", ...this.positionStyles(config.position ?? "bottom-right") });

      // Animation
      if (config.animation && config.animation !== "none") {
        btn.classList.add(`mg-anim-${config.animation}`);
      }

      btn.addEventListener("click", () => this.onOpen(config.link));
      document.body.appendChild(btn);
      this.element = btn;

    } catch (err) {
      errorHandler.handleError({ message: "Failed to create floating button", level: "error", ns: this.ns, error: err as Error });
    }
  }

  destroy(): void {
    this.element?.parentNode?.removeChild(this.element);
    this.element = null;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private positionStyles(position: Position): Partial<CSSStyleDeclaration> {
    const margin = "16px";
    const styles: Partial<CSSStyleDeclaration> = {};

    if (position.includes("top"))    styles.top    = margin;
    if (position.includes("bottom")) styles.bottom = margin;
    if (position.includes("left"))   styles.left   = margin;
    if (position.includes("right"))  styles.right  = margin;

    if (position.includes("center")) {
      if (position.startsWith("top") || position.startsWith("bottom")) {
        // horizontal center
        styles.left = "50%";
        styles.transform = "translateX(-50%)";
      } else {
        // vertical center
        styles.top = "50%";
        styles.transform = "translateY(-50%)";
      }
    }

    if (position === "middle-center") {
      styles.top = "50%";
      styles.left = "50%";
      styles.transform = "translate(-50%, -50%)";
    }

    return styles;
  }
}
