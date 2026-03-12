/**
 * Meetergo v4 — CSS Injector
 *
 * Upgraded from v3 with:
 *   - applyTheme(tokens, ns) — inject scoped CSS variable overrides per namespace
 *   - updateTheme(tokens, ns) — live-update theme without re-injecting base styles
 *   - All v3 CSS templates preserved and extended
 */

import type { ThemeTokens, PerThemeTokens } from "../types/index.js";

export interface CSSOptions {
  id: string;
  priority?: "normal" | "high";
  media?: string;
}

export class CSSInjector {
  private styles: Map<string, HTMLStyleElement> = new Map();

  injectCSS(css: string, options: CSSOptions): HTMLStyleElement {
    this.removeCSS(options.id);

    const style = document.createElement("style");
    style.id = options.id;
    style.textContent = css;
    if (options.media) style.media = options.media;

    if (options.priority === "high") {
      document.head.appendChild(style);
    } else {
      const first = document.head.firstChild;
      first ? document.head.insertBefore(style, first) : document.head.appendChild(style);
    }

    this.styles.set(options.id, style);
    return style;
  }

  updateCSS(css: string, options: CSSOptions): HTMLStyleElement {
    const existing = this.styles.get(options.id);
    if (existing) {
      existing.textContent = css;
      if (options.media !== undefined) existing.media = options.media;
      return existing;
    }
    return this.injectCSS(css, options);
  }

  removeCSS(id: string): boolean {
    const style = this.styles.get(id);
    if (style?.parentNode) {
      style.parentNode.removeChild(style);
      this.styles.delete(id);
      return true;
    }
    return false;
  }

  hasCSS(id: string): boolean {
    return !!this.styles.get(id)?.parentNode;
  }

  removeAll(): void {
    for (const id of this.styles.keys()) this.removeCSS(id);
  }

  cleanup(): void {
    this.removeAll();
  }

  // ── Theme injection ───────────────────────────────────────────────────────

  /**
   * Inject or update scoped CSS variable overrides for a namespace.
   * Scoped to `#mg-{ns}-modal` to prevent cross-namespace leakage.
   */
  applyTheme(tokens: ThemeTokens, ns: string): void {
    const vars = this.tokensToCSSVars(tokens);
    if (!vars) return;

    const css = `#mg-${ns}-modal, #mg-${ns}-sidebar, .mg-${ns}-inline {\n${vars}\n}`;
    this.updateCSS(css, { id: `mg-theme-${ns}`, priority: "high" });
  }

  /**
   * Inject per-theme (light/dark) CSS variable overrides for a namespace.
   * Uses `@media (prefers-color-scheme: dark)` blocks.
   */
  applyPerTheme(tokens: PerThemeTokens, ns: string): void {
    const parts: string[] = [];
    const scope = `#mg-${ns}-modal, #mg-${ns}-sidebar, .mg-${ns}-inline`;

    if (tokens.light) {
      const vars = this.tokensToCSSVars(tokens.light);
      if (vars) {
        parts.push(`@media (prefers-color-scheme: light) {\n  ${scope} {\n${vars}\n  }\n}`);
      }
    }

    if (tokens.dark) {
      const vars = this.tokensToCSSVars(tokens.dark);
      if (vars) {
        parts.push(`@media (prefers-color-scheme: dark) {\n  ${scope} {\n${vars}\n  }\n}`);
      }
    }

    if (parts.length) {
      this.updateCSS(parts.join("\n"), { id: `mg-per-theme-${ns}`, priority: "high" });
    }
  }

  private tokensToCSSVars(tokens: ThemeTokens): string {
    return Object.entries(tokens)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n");
  }
}

/** Shared singleton */
export const cssInjector = new CSSInjector();

// ── CSS Templates ─────────────────────────────────────────────────────────────

export const MeetergoCSSv4 = {
  base: `
    .mg-close-button {
      all: unset;
      position: absolute;
      top: 16px;
      right: 16px;
      background: #fff;
      border-radius: 100%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 350ms;
      color: #9ca3af;
      cursor: pointer;
    }
    .mg-close-button:hover { color: #000; }
    .mg-close-button:focus-visible { outline: 2px solid #0A64BC; outline-offset: 2px; }

    .mg-spinner {
      position: absolute;
      top: 50%;
      left: 50%;
      margin-left: -24px;
      margin-top: -24px;
      width: 48px;
      height: 48px;
      border: 6px solid #FFF;
      border-bottom-color: #d1d5db;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: mg-spin 1s linear infinite;
      z-index: 1002;
    }
    @keyframes mg-spin {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .mg-inline {
      overflow: hidden;
      position: relative;
      display: block;
      width: 100%;
      max-width: 100%;
    }
    .mg-inline iframe {
      width: 100%;
      border: none;
      overflow: hidden;
      display: block;
      transition: height 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    .mg-inline[data-align="left"] iframe   { margin-right: auto; }
    .mg-inline[data-align="center"] iframe { margin-left: auto; margin-right: auto; }
    .mg-inline[data-align="right"] iframe  { margin-left: auto; }
    .mg-inline:not([data-align]) iframe    { margin-left: auto; margin-right: auto; }
  `,

  animations: `
    @keyframes mg-pulse   { 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.05); } }
    @keyframes mg-bounce  { 0%,20%,50%,80%,100%{transform:translateY(0);} 40%{transform:translateY(-10px);} 60%{transform:translateY(-5px);} }
    @keyframes mg-slide-r { 0%{transform:translateX(100%);opacity:0;} 100%{transform:translateX(0);opacity:1;} }
    @keyframes mg-slide-l { 0%{transform:translateX(-100%);opacity:0;} 100%{transform:translateX(0);opacity:1;} }
    @keyframes mg-slide-t { 0%{transform:translateY(-100%);opacity:0;} 100%{transform:translateY(0);opacity:1;} }
    @keyframes mg-slide-b { 0%{transform:translateY(100%);opacity:0;} 100%{transform:translateY(0);opacity:1;} }
    .mg-anim-pulse        { animation: mg-pulse  2s infinite ease-in-out; }
    .mg-anim-bounce       { animation: mg-bounce 2s infinite; }
    .mg-anim-slide-in     { animation: mg-slide-r 0.5s forwards; }
  `,

  sidebar: `
    .mg-sidebar {
      position: fixed;
      top: 0;
      height: 100%;
      transition: transform 0.3s ease;
      z-index: 9998;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background-color: #fff;
      box-shadow: -4px 0 20px rgba(0,0,0,0.15);
    }
    .mg-sidebar-left  { left:0;  transform:translateX(-100%); }
    .mg-sidebar-right { right:0; transform:translateX(100%); }
    .mg-sidebar.open  { transform:translateX(0); }

    .mg-sidebar-toggle {
      position: fixed;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      min-width: 50px;
      padding: 12px 8px;
      transition: background-color 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      border: none;
      outline: none;
      background-color: var(--mg-brand, #0A64BC);
      color: white;
    }
    .mg-sidebar-toggle-left  { left:0;  border-radius:0 8px 8px 0; }
    .mg-sidebar-toggle-right { right:0; border-radius:8px 0 0 8px; }
    .mg-sidebar-toggle:hover { background-color: var(--mg-brand-hover, #0852a8); box-shadow: -4px 0 10px rgba(0,0,0,0.2); }
    .mg-sidebar-toggle:focus-visible { outline:2px solid #0A64BC; outline-offset:2px; }
    .mg-sidebar-toggle-hidden { opacity:0; pointer-events:none; }
    .mg-sidebar-toggle-icon  { width:24px; height:24px; display:flex; align-items:center; justify-content:center; }
    .mg-sidebar-toggle-text  { writing-mode:vertical-rl; text-orientation:mixed; margin-top:8px; font-size:14px; font-weight:500; }
    .mg-sidebar-close {
      position: absolute;
      top: 10px; right: 10px;
      background: none; border: none;
      cursor: pointer; color: #666; padding: 5px; font-size: 20px; z-index: 10000;
    }
    .mg-sidebar-close:hover { color:#000; }
    .mg-sidebar-iframe { width:100%; height:100%; border:none; display:block; flex:1; overflow:auto; }
  `,

  button: `
    .mg-float-button {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      margin: 0.5rem;
      padding: 0.8rem 1.2rem;
      color: white;
      background-color: var(--mg-brand, #0A64BC);
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      z-index: 999;
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      gap: 8px;
    }
    .mg-float-button:hover {
      background-color: var(--mg-brand-hover, #0850A0);
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
    }
    .mg-float-button:focus-visible { outline:2px solid var(--mg-brand,#0A64BC); outline-offset:2px; }
    .mg-float-button:active { transform: translateY(1px); }
  `,

  videoEmbed: `
    @keyframes mg-video-spin {
      0%   { transform: translate(-50%,-50%) rotate(0deg); }
      100% { transform: translate(-50%,-50%) rotate(360deg); }
    }
  `,
};

export function injectAllBaseStyles(): void {
  cssInjector.injectCSS(MeetergoCSSv4.base,       { id: "mg-v4-base" });
  cssInjector.injectCSS(MeetergoCSSv4.animations,  { id: "mg-v4-animations" });
  cssInjector.injectCSS(MeetergoCSSv4.sidebar,     { id: "mg-v4-sidebar" });
  cssInjector.injectCSS(MeetergoCSSv4.button,      { id: "mg-v4-button" });
  cssInjector.injectCSS(MeetergoCSSv4.videoEmbed,  { id: "mg-v4-video" });
}
