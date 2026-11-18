/**
 * Design 2026 — shared building blocks: shadow host, base CSS, icons, avatar,
 * host header, focus helpers.
 *
 * Every 2026 widget renders inside its own shadow root so customer CSS cannot
 * reach it and it cannot reach the customer page. Always light: explicit
 * colours and `color-scheme: light`, whatever the visitor's OS theme.
 */

import { brandTokens, BrandTokens } from "./color.js";
import type { Copy } from "./i18n.js";
import type { LinkCard } from "./link-card.js";
import type { Listeners } from "./runtime.js";

export type DesignName = "2026" | "classic";

const SANS = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
const MONO = `ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Consolas, monospace`;

export const BASE_CSS = `
:host{all:initial;position:fixed;top:0;left:0;pointer-events:none;color-scheme:light;font:15px/1.5 ${SANS};color:#101623;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-align:left;direction:ltr}
*,*::before,*::after{box-sizing:border-box}
[hidden]{display:none!important}
button{font:inherit;color:inherit;margin:0;letter-spacing:normal;text-transform:none}
svg{display:block;flex:none}
.sh{box-shadow:0 1px 2px rgba(16,22,35,.10),0 12px 32px -8px rgba(16,22,35,.28)}
.av{position:relative;flex:none;border-radius:999px;overflow:hidden;background:#E9EEFB;color:#1A2C55;display:grid;place-items:center;font:600 14px/1 ${SANS}}
.av img{width:100%;height:100%;object-fit:cover;display:block}
.av svg{width:50%;height:50%}
.x{width:32px;height:32px;border-radius:9px;border:0;background:#F3EFE8;color:#4A5162;display:grid;place-items:center;cursor:pointer;flex:none;padding:0;transition:background .15s,color .15s}
.x:hover{background:#E8E3DA;color:#101623}
.meta{font:500 12px/1.3 ${MONO};color:#5D6370;font-variant-numeric:tabular-nums}
.hd{display:flex;gap:12px;align-items:center;min-height:68px}
.who{min-width:0;flex:1}
.nm{font-weight:500;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.who .meta{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:16px}
.cta{height:44px;border-radius:11px;border:0;background:var(--brand);color:var(--brand-fg);font:500 15px/1 ${SANS};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 16px;transition:filter .15s,transform .1s}
.cta:hover{filter:brightness(.94)}
.cta:active{transform:scale(.98)}
.chip{height:36px;padding:0 12px;border-radius:9px;border:1px solid #E3DED6;background:#fff;font:500 14px/1 ${MONO};color:#101623;cursor:pointer;font-variant-numeric:tabular-nums;transition:border-color .15s,color .15s}
.chip:hover{border-color:var(--brand);color:var(--brand-text)}
.days{display:flex;gap:6px}
.day{flex:1;min-width:0;border:1px solid #E3DED6;background:#fff;color:#101623;border-radius:10px;padding:7px 6px;text-align:center;cursor:pointer}
.day b{display:block;font:500 14px/1.3 ${SANS}}
.day span{font:500 11px/1.3 ${MONO};color:#5D6370}
.day[aria-pressed="true"]{border-color:var(--brand);background:var(--brand-soft)}
.day[aria-pressed="true"] span{color:#4A5162}
.powered{font:500 11px/1.3 ${MONO};color:#8C93A1;text-align:center;text-decoration:none}
.sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;padding:0;margin:-1px}
button:focus-visible,a:focus-visible{outline:2px solid var(--brand-text);outline-offset:2px}
.scrim{position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(16,22,35,.28);pointer-events:auto;animation:mgFade .2s both}
.enter{animation:mgIn .26s cubic-bezier(.2,.8,.2,1) both}
.spin{width:28px;height:28px;border-radius:50%;border:3px solid var(--brand-soft);border-top-color:var(--brand);animation:mgSpin .8s linear infinite}
@keyframes mgIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
@keyframes mgFade{from{opacity:0}}
@keyframes mgUp{from{transform:translateY(40px);opacity:0}}
@keyframes mgSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
`;

export const ICONS = {
  x: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  cal: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>`,
  play: `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>`,
  sound: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>`,
  muted: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>`,
};

export interface ShadowWidget {
  host: HTMLElement;
  root: ShadowRoot;
}

/** Fixed, full-viewport, click-through shadow host. Children opt into pointer events. */
export function createShadowHost(id: string, css: string, zIndex: number, brand: BrandTokens): ShadowWidget {
  const host = document.createElement("div");
  host.id = id;
  host.setAttribute("data-meetergo-design", "2026");
  // Inline so the host page cannot override position/stacking
  host.style.cssText = `position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:${zIndex};pointer-events:none;`;
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `${BASE_CSS}${css}:host{--brand:${brand.brand};--brand-fg:${brand.fg};--brand-soft:${brand.soft};--brand-text:${brand.text};z-index:${zIndex}}`;
  root.appendChild(style);
  return { host, root };
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, attrs?: Record<string, string>): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export { brandTokens };

// ── Avatar ──────────────────────────────────────────────────────────────────

export type AvatarOption = "host" | false | string | undefined;

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

/**
 * A fixed-size avatar slot. Starts with a calendar icon so nothing shifts when
 * the link card arrives; then shows the photo (once it has loaded) or initials.
 */
export class Avatar {
  readonly node: HTMLElement;
  private shown: string | null = null;

  constructor(size: number, private readonly option: AvatarOption) {
    this.node = el("span", "av", { "aria-hidden": "true" });
    this.node.style.width = this.node.style.height = `${size}px`;
    this.node.innerHTML = ICONS.cal;
    if (typeof option === "string" && option !== "host") this.photo(option);
  }

  update(card: LinkCard | null): void {
    if (this.option === false || (typeof this.option === "string" && this.option !== "host")) return;
    const host = card?.host;
    if (!host) return;
    if (host.avatarUrl) this.photo(host.avatarUrl, host.name);
    else if (!this.shown) {
      this.node.textContent = initials(host.name);
      this.shown = "initials";
    }
  }

  private photo(url: string, name?: string): void {
    if (this.shown === url) return;
    const img = new Image();
    img.alt = "";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      this.node.textContent = "";
      this.node.appendChild(img);
      this.shown = url;
    };
    img.onerror = () => {
      if (name && !this.shown) {
        this.node.textContent = initials(name);
        this.shown = "initials";
      }
    };
    img.src = url;
  }
}

// ── Host header ─────────────────────────────────────────────────────────────

export function meetingMeta(card: LinkCard | null, copy: Copy): string {
  const m = card?.meetingType;
  if (!m) return "";
  const parts = [m.title];
  if (m.durationMinutes) parts.push(copy.minutes.replace("{n}", String(m.durationMinutes)));
  const loc = m.location === "video" ? copy.video : m.location === "phone" ? copy.phone : m.location === "in_person" ? copy.inPerson : "";
  if (loc) parts.push(loc);
  return parts.join(" · ");
}

/** Header with avatar, host name, meeting line and a close button. */
export class HostHeader {
  readonly node: HTMLElement;
  readonly close: HTMLButtonElement;
  readonly avatar: Avatar;
  private readonly name: HTMLElement;
  private readonly meta: HTMLElement;

  constructor(size: number, avatar: AvatarOption, private readonly fallbackTitle: string, private readonly copy: Copy, titleId?: string) {
    this.node = el("div", "hd");
    this.avatar = new Avatar(size, avatar);
    const who = el("div", "who");
    this.name = el("div", "nm");
    if (titleId) this.name.id = titleId;
    this.name.textContent = fallbackTitle;
    this.meta = el("div", "meta");
    who.append(this.name, this.meta);
    this.close = el("button", "x", { type: "button", "aria-label": copy.close });
    this.close.innerHTML = ICONS.x;
    if (avatar === false) this.avatar.node.hidden = true;
    this.node.append(this.avatar.node, who, this.close);
  }

  update(card: LinkCard | null): void {
    this.avatar.update(card);
    if (card?.host) this.name.textContent = card.host.name;
    else if (card?.meetingType) this.name.textContent = card.meetingType.title;
    else this.name.textContent = this.fallbackTitle;
    const meta = card?.host ? meetingMeta(card, this.copy) : "";
    this.meta.textContent = meta;
  }
}

// ── Focus ───────────────────────────────────────────────────────────────────

const FOCUSABLE = 'button:not([disabled]):not([hidden]), a[href], iframe, [tabindex]:not([tabindex="-1"])';

/** The element that really has focus, looking through open shadow roots. */
export function deepActiveElement(): HTMLElement | null {
  let a: Element | null = document.activeElement;
  while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
  return a instanceof HTMLElement ? a : null;
}

function visible(e: HTMLElement): boolean {
  for (let n: HTMLElement | null = e; n; n = n.parentElement) if (n.hidden) return false;
  return true;
}

/** Keep Tab / Shift+Tab cycling inside `container` (a shadow-root subtree). */
export function trapTab(container: HTMLElement, root: ShadowRoot, listeners: Listeners): void {
  listeners.on(container, "keydown", ((e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const active = root.activeElement;
    if (e.shiftKey && (active === first || !container.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }) as EventListener);
}

/**
 * Call `fn` when the tab becomes visible again and once a minute, so
 * time-relative copy ("Heute frei ab 14:30") never goes stale. Returns cleanup.
 */
export function watchClock(fn: () => void): () => void {
  const safe = () => { try { fn(); } catch { /* keep the widget as is */ } };
  const onVis = () => { if (document.visibilityState === "visible") safe(); };
  document.addEventListener("visibilitychange", onVis);
  const id = setInterval(safe, 60_000);
  return () => {
    document.removeEventListener("visibilitychange", onVis);
    clearInterval(id);
  };
}

export function prefersReducedMotion(): boolean {
  try {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Fixed position CSS for one of the 9 positions, as declarations. */
export function dockStyle(position: string, offset: string): Record<string, string> {
  const [row, col] = (position || "bottom-right").split("-");
  const s: Record<string, string> = {};
  let tx = "0", ty = "0";
  if (row === "top") s.top = offset;
  else if (row === "middle") { s.top = "50%"; ty = "-50%"; }
  else s.bottom = offset;
  if (col === "left") s.left = offset;
  else if (col === "center") { s.left = "50%"; tx = "-50%"; }
  else s.right = offset;
  // `transform`, not the `translate` property (Safari < 14.1)
  if (tx !== "0" || ty !== "0") s.transform = `translate(${tx}, ${ty})`;
  return s;
}
