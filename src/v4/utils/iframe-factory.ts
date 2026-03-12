/**
 * Meetergo v4 — Iframe Factory
 *
 * Single place for creating iframes with consistent options:
 *   - URL building (params, prefill, forwardQueryParams)
 *   - Color scheme flash prevention (starts hidden, revealed on meetergo:ready)
 *   - allow="payment" + accessible name
 */

import type { MeetergoPrefill } from "../types/index.js";
import { buildIframeURL, collectIframeParams } from "./url-params.js";
import { ColorSchemeManager } from "../core/color-scheme.js";
import type { ColorSchemeSyncHandle } from "../core/color-scheme.js";

export interface IframeFactoryOptions {
  /** Booking link / URL */
  link: string;
  /** Namespace for logging/naming */
  ns: string;
  /** Accessible name for the iframe (for screen readers) */
  label?: string;
  /** Additional URL params to append */
  extraParams?: Record<string, string>;
  /** Global prefill */
  prefill?: MeetergoPrefill;
  /** Forward parent-page query params */
  forwardQueryParams?: boolean | string[];
  /** Origin for postMessage security (defaults to * — override in production) */
  origin?: string;
  /** Custom width/height styles */
  width?: string;
  height?: string;
  /** Prevent color-scheme sync (e.g. for sidebar iframes already full-visible) */
  skipColorSchemeSync?: boolean;
}

export interface IframeFactoryResult {
  iframe: HTMLIFrameElement;
  /** URL that was used as `src` */
  src: string;
  /** Stop color-scheme syncing and reveal iframe manually if needed */
  colorSchemeHandle: ColorSchemeSyncHandle | null;
}

export function createIframe(options: IframeFactoryOptions): IframeFactoryResult {
  const {
    link,
    ns,
    label = "Meetergo booking",
    extraParams,
    prefill,
    forwardQueryParams,
    origin = "*",
    width = "100%",
    height = "700px",
    skipColorSchemeSync = false,
  } = options;

  const params = collectIframeParams({ prefill, extraParams, forwardQueryParams });
  const src = buildIframeURL(link, params);

  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.name = `mg-embed-${ns}-${Math.random().toString(36).slice(2, 8)}`;
  iframe.title = label;
  iframe.setAttribute("allow", "payment");
  iframe.setAttribute("loading", "lazy");

  Object.assign(iframe.style, {
    width,
    height,
    minHeight: "400px",
    border: "none",
    display: "block",
    overflow: "hidden",
  });

  let colorSchemeHandle: ColorSchemeSyncHandle | null = null;
  if (!skipColorSchemeSync) {
    colorSchemeHandle = ColorSchemeManager.forIframe(iframe, origin);
  }

  return { iframe, src, colorSchemeHandle };
}
