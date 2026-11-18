/**
 * Design 2026 — link card client.
 *
 * GET <link origin>/api/embed/link-card?link=&tz=&lang=
 * returns host, meeting type and the next free slots for a booking link.
 *
 * Never blocks: fetched lazily (when the page is idle, or on first hover /
 * focus / visibility of a widget), cached per link for the page lifetime,
 * and any failure resolves to null so widgets render without the data.
 */

import type { Lang } from "./i18n.js";

export interface LinkCard {
  host: { name: string; avatarUrl: string | null } | null;
  meetingType: { title: string; durationMinutes: number | null; location: string | null } | null;
  nextSlots: Array<{ start: string }>;
  timezone: string | null;
  slotParam: string | null;
}

const TIMEOUT_MS = 6000;
const cache = new Map<string, Promise<LinkCard | null>>();

/** Absolute https URL for a booking link (links may be given without scheme). */
export function absoluteLink(link: string): URL | null {
  try {
    return new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`);
  } catch {
    return null;
  }
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

/** Validate the JSON so a malformed answer cannot break a widget. */
export function parseLinkCard(json: unknown): LinkCard | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  const h = j.host as Record<string, unknown> | null | undefined;
  const m = j.meetingType as Record<string, unknown> | null | undefined;
  const slots = Array.isArray(j.nextSlots) ? j.nextSlots : [];
  const avatar = h ? str(h.avatarUrl) : null;
  return {
    host: h && str(h.name) ? { name: str(h.name) as string, avatarUrl: avatar && /^(https?:\/\/|data:image\/)/i.test(avatar) ? avatar : null } : null,
    meetingType: m && str(m.title)
      ? {
          title: str(m.title) as string,
          durationMinutes: typeof m.durationMinutes === "number" && m.durationMinutes > 0 ? m.durationMinutes : null,
          location: str(m.location),
        }
      : null,
    nextSlots: slots
      .map((s) => (s && typeof s === "object" ? str((s as Record<string, unknown>).start) : null))
      .filter((s): s is string => !!s && !isNaN(Date.parse(s)))
      .slice(0, 9)
      .map((start) => ({ start })),
    timezone: str(j.timezone),
    slotParam: str(j.slotParam) && /^[\w.-]+$/.test(j.slotParam as string) ? (j.slotParam as string) : null,
  };
}

export function linkCardURL(link: string, tz: string, lang: Lang): string | null {
  const url = absoluteLink(link);
  if (!url) return null;
  const api = new URL("/api/embed/link-card", url.origin);
  api.searchParams.set("link", url.toString());
  api.searchParams.set("tz", tz);
  api.searchParams.set("lang", lang);
  return api.toString();
}

/** Fetch (once per link, tz and lang for the page lifetime). Resolves null on any failure. */
export function fetchLinkCard(link: string, tz: string, lang: Lang): Promise<LinkCard | null> {
  const endpoint = linkCardURL(link, tz, lang);
  if (!endpoint || typeof fetch !== "function") return Promise.resolve(null);
  const cached = cache.get(endpoint);
  if (cached) return cached;

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), TIMEOUT_MS);
  const p = fetch(endpoint, { method: "GET", credentials: "omit", mode: "cors", signal: controller?.signal })
    .then((res) => (res.ok ? res.json() : null))
    .then(parseLinkCard)
    .catch(() => null)
    .then((card) => {
      clearTimeout(timer);
      return card;
    });
  cache.set(endpoint, p);
  return p;
}

/** Test hook */
export function clearLinkCardCache(): void {
  cache.clear();
}

/**
 * Run `load` once: when the browser is idle after page load, or earlier on the
 * first pointer hover, keyboard focus or visibility of `el`. Returns a cleanup.
 */
export function whenIdleOrEngaged(el: Element, load: () => void): () => void {
  let done = false;
  const cleanups: Array<() => void> = [];
  const fire = () => {
    if (done) return;
    done = true;
    cleanups.forEach((c) => c());
    load();
  };

  for (const type of ["pointerenter", "focusin", "touchstart"]) {
    el.addEventListener(type, fire, { once: true, passive: true });
    cleanups.push(() => el.removeEventListener(type, fire));
  }

  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const schedule = () => {
    if (done) return;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(fire, { timeout: 4000 });
      cleanups.push(() => w.cancelIdleCallback?.(id));
    } else {
      const id = setTimeout(fire, 1200);
      cleanups.push(() => clearTimeout(id));
    }
  };
  if (document.readyState === "complete") schedule();
  else {
    window.addEventListener("load", schedule, { once: true });
    cleanups.push(() => window.removeEventListener("load", schedule));
  }

  if (typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        // Visible: fetch soon, but let the host page's own work go first
        const id = setTimeout(fire, 300);
        cleanups.push(() => clearTimeout(id));
      }
    });
    io.observe(el);
    cleanups.push(() => io.disconnect());
  }

  return () => {
    done = true;
    cleanups.forEach((c) => c());
  };
}

/** Booking link with the slot preselected (`<link>?<slotParam>=<ISO>`, merged with existing params). */
export function linkWithSlot(link: string, slotParam: string, iso: string): string {
  const url = absoluteLink(link);
  if (!url) return link;
  url.searchParams.set(slotParam, iso);
  const out = url.toString();
  aliases.set(out, link);
  return out;
}

/** Slot links map back to the booking link they were made from (same link card). */
const aliases = new Map<string, string>();
export function baseLinkFor(link: string): string {
  return aliases.get(link) ?? link;
}
