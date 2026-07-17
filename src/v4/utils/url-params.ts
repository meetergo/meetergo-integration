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
 * Marketing / attribution params forwarded by default when the embedder
 * has not configured `forwardQueryParams` explicitly.
 *
 * Before v4 the embed script forwarded *every* parent-page query param to the
 * booking iframe automatically, so ad-campaign attribution (UTMs, click IDs)
 * flowed through to the booking and any post-booking redirect without setup.
 * v4 made forwarding fully opt-in, which silently broke that attribution for
 * existing embeds. Restoring a conservative default — the well-known marketing
 * param family — keeps tracking working out of the box while still not leaking
 * arbitrary parent-page params (use `forwardQueryParams: true` for that).
 */
const DEFAULT_FORWARD_PARAMS = new Set([
  // UTM (Google/analytics standard)
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "utm_id",
  // Ad-platform click identifiers
  "fbclid",    // Meta / Facebook
  "gclid", "gbraid", "wbraid", "gad_source", // Google Ads
  "msclkid",   // Microsoft Ads
  "ttclid",    // TikTok
  "twclid",    // X / Twitter
  "li_fat_id", // LinkedIn
  "igshid",    // Instagram
  "epik",      // Pinterest
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
  //   - unset       → forward the marketing/attribution family (default, so
  //                    ad tracking keeps working out of the box)
  //   - `true`      → forward every param (except reserved)
  //   - `string[]`  → forward only the listed params
  //   - `false`     → forward nothing
  const forward = options.forwardQueryParams;
  if (forward !== false && typeof window !== "undefined") {
    const pageParams = new URLSearchParams(window.location.search);
    pageParams.forEach((value, key) => {
      if (RESERVED_PARAMS.has(key)) return;

      const shouldForward =
        forward === true
          ? true
          : Array.isArray(forward)
            ? forward.includes(key)
            : DEFAULT_FORWARD_PARAMS.has(key); // unset → marketing default
      if (shouldForward) {
        result[key] = value;
      }
    });
  }

  return result;
}
