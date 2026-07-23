/**
 * Meetergo v4 — URL Parameter Utilities
 *
 * Centralises all iframe URL-building logic in one place:
 *   - Prefill fields
 *   - forwardQueryParams (opt-in forwarding of parent-page params)
 *   - Encoding
 *   - embed=true flag
 */

import type { MeetergoPrefill } from "../types/index.js";

/** Reserved params that must never be forwarded from the parent page */
const RESERVED_PARAMS = new Set([
  "embed", "month", "date", "slot", "rescheduleUid",
  "bookingUid", "redirect_url", "ns",
]);

/**
 * Build a full iframe src URL from a base link + params.
 */
export function buildIframeURL(
  link: string,
  params: Record<string, string | undefined>
): string {
  // Ensure link has a scheme
  const base = link.startsWith("http") ? link : `https://${link}`;

  // Merge params into existing URL search params
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    url = new URL(`https://${base}`);
  }

  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  // Always mark as embedded
  url.searchParams.set("embed", "true");

  return url.toString();
}

/**
 * Collect all parameters to inject into an iframe URL.
 *
 * Merging order (later entries win):
 *   global prefill → per-call extraParams → forwarded page params (if opt-in)
 */
export function collectIframeParams(options: {
  prefill?: MeetergoPrefill;
  extraParams?: Record<string, string>;
  forwardQueryParams?: boolean | string[];
}): Record<string, string> {
  const result: Record<string, string> = {};

  // 1. Prefill
  if (options.prefill) {
    for (const [k, v] of Object.entries(options.prefill)) {
      if (v != null) result[k] = v;
    }
  }

  // 2. Call-site params
  if (options.extraParams) {
    Object.assign(result, options.extraParams);
  }

  // 3. Forward parent-page query params.
  //
  // Pre-v4 the embed script forwarded EVERY parent-page query param into the
  // booking iframe automatically. v4 made that opt-in, which silently broke
  // attribution for existing embeds: campaign parameters stopped reaching the
  // booking and the post-booking redirect. Restricting the default to a
  // well-known marketing allow-list was not enough either — vendor- and
  // agency-specific parameters (e.g. `lm_*`) are exactly what many setups
  // attribute on, and they were still dropped. So the default forwards
  // everything again, matching the pre-v4 behaviour.
  //
  //   - unset      → forward every param (except reserved) — legacy default
  //   - `true`     → forward every param (except reserved)
  //   - `string[]` → forward only the listed params
  //   - `false`    → forward nothing
  const forward = options.forwardQueryParams;
  if (forward !== false && typeof window !== "undefined") {
    const pageParams = new URLSearchParams(window.location.search);
    pageParams.forEach((value, key) => {
      if (RESERVED_PARAMS.has(key)) return;

      // An array is an explicit allow-list; unset and `true` forward all.
      const shouldForward = Array.isArray(forward)
        ? forward.includes(key)
        : true;
      if (shouldForward) {
        result[key] = value;
      }
    });
  }

  return result;
}
