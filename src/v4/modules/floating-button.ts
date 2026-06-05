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

    // Position is always "<row>-<col>" on the 3x3 grid (see Position type):
    // row  top | middle | bottom  -> vertical anchor
    // col  left | center | right  -> horizontal anchor
    // "middle"/"center" pin the midpoint to 50% and offset it back with translate.
    const [row, col] = position.split("-");

    if (row === "top") styles.top = margin;
    else if (row === "bottom") styles.bottom = margin;
    else styles.top = "50%"; // middle

    if (col === "left") styles.left = margin;
    else if (col === "right") styles.right = margin;
    else styles.left = "50%"; // center

    const tx = col === "center" ? "-50%" : "0";
    const ty = row === "middle" ? "-50%" : "0";
    if (tx !== "0" || ty !== "0") styles.transform = `translate(${tx}, ${ty})`;

    return styles;
  }
}
