/**
 * Design 2026 — default copy and time formatting.
 *
 * Five site locales (de default, en, fr, es, pl). Times are always formatted in
 * the visitor's own time zone and language.
 */

export type Lang = "de" | "en" | "fr" | "es" | "pl";
const LANGS: Lang[] = ["de", "en", "fr", "es", "pl"];

export interface Copy {
  book: string;
  todayFrom: string;
  tomorrowFrom: string;
  dayFrom: string;
  today: string;
  tomorrow: string;
  nextTimes: string;
  allTimes: string;
  close: string;
  minutes: string;
  video: string;
  phone: string;
  inPerson: string;
  mute: string;
  unmute: string;
  playVideo: string;
  hideVideo: string;
  pause: string;
  play: string;
  loading: string;
  dialog: string;
  slot: string;
}

const COPY: Record<Lang, Copy> = {
  de: {
    book: "Termin buchen", todayFrom: "Heute frei ab {t}", tomorrowFrom: "Morgen frei ab {t}", dayFrom: "{d} frei ab {t}",
    today: "Heute", tomorrow: "Morgen", nextTimes: "Nächste freie Zeiten", allTimes: "Alle Zeiten ansehen", close: "Schließen",
    minutes: "{n} Min.", video: "Video", phone: "Telefon", inPerson: "Vor Ort", mute: "Ton aus", unmute: "Ton an",
    playVideo: "Video ansehen", hideVideo: "Video ausblenden", pause: "Pause", play: "Abspielen",
    loading: "Buchungskalender wird geladen", dialog: "Termin buchen", slot: "{d}, {t} buchen",
  },
  en: {
    book: "Book a meeting", todayFrom: "Free today from {t}", tomorrowFrom: "Free tomorrow from {t}", dayFrom: "Free {d} from {t}",
    today: "Today", tomorrow: "Tomorrow", nextTimes: "Next available times", allTimes: "See all times", close: "Close",
    minutes: "{n} min", video: "Video", phone: "Phone", inPerson: "In person", mute: "Mute", unmute: "Unmute",
    playVideo: "Watch video", hideVideo: "Hide video", pause: "Pause", play: "Play",
    loading: "Loading booking calendar", dialog: "Book a meeting", slot: "Book {d}, {t}",
  },
  fr: {
    book: "Prendre rendez-vous", todayFrom: "Libre aujourd’hui dès {t}", tomorrowFrom: "Libre demain dès {t}", dayFrom: "Libre {d} dès {t}",
    today: "Aujourd’hui", tomorrow: "Demain", nextTimes: "Prochains créneaux", allTimes: "Voir tous les créneaux", close: "Fermer",
    minutes: "{n} min", video: "Vidéo", phone: "Téléphone", inPerson: "Sur place", mute: "Couper le son", unmute: "Activer le son",
    playVideo: "Voir la vidéo", hideVideo: "Masquer la vidéo", pause: "Pause", play: "Lecture",
    loading: "Chargement du calendrier", dialog: "Prendre rendez-vous", slot: "Réserver {d}, {t}",
  },
  es: {
    book: "Reservar cita", todayFrom: "Libre hoy desde las {t}", tomorrowFrom: "Libre mañana desde las {t}", dayFrom: "Libre el {d} desde las {t}",
    today: "Hoy", tomorrow: "Mañana", nextTimes: "Próximos horarios libres", allTimes: "Ver todos los horarios", close: "Cerrar",
    minutes: "{n} min", video: "Vídeo", phone: "Teléfono", inPerson: "En persona", mute: "Silenciar", unmute: "Activar sonido",
    playVideo: "Ver vídeo", hideVideo: "Ocultar vídeo", pause: "Pausa", play: "Reproducir",
    loading: "Cargando el calendario", dialog: "Reservar cita", slot: "Reservar {d}, {t}",
  },
  pl: {
    book: "Umów spotkanie", todayFrom: "Wolne dziś od {t}", tomorrowFrom: "Wolne jutro od {t}", dayFrom: "Wolny termin: {d}, {t}",
    today: "Dziś", tomorrow: "Jutro", nextTimes: "Najbliższe wolne terminy", allTimes: "Zobacz wszystkie terminy", close: "Zamknij",
    minutes: "{n} min", video: "Wideo", phone: "Telefon", inPerson: "Na miejscu", mute: "Wycisz", unmute: "Włącz dźwięk",
    playVideo: "Obejrzyj wideo", hideVideo: "Ukryj wideo", pause: "Pauza", play: "Odtwórz",
    loading: "Ładowanie kalendarza", dialog: "Umów spotkanie", slot: "Zarezerwuj {d}, {t}",
  },
};

function pick(raw: string | null | undefined): Lang | null {
  const two = (raw ?? "").trim().slice(0, 2).toLowerCase();
  return (LANGS as string[]).includes(two) ? (two as Lang) : null;
}

/**
 * Language of the default copy: an explicit locale (prefill.locale), then the
 * host page's `<html lang>`, then the visitor's browser language, then German.
 * The classic widgets carry no copy of their own, so this mirrors how the
 * booking page itself picks its language (page first, browser second).
 */
export function detectLang(explicit?: string | null): Lang {
  return (
    pick(explicit) ??
    pick(typeof document !== "undefined" ? document.documentElement.getAttribute("lang") : null) ??
    pick(typeof navigator !== "undefined" ? navigator.language : null) ??
    "de"
  );
}

export function copyFor(lang: Lang): Copy {
  return COPY[lang];
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

export function visitorTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// ── Slot formatting ─────────────────────────────────────────────────────────

export interface SlotDay {
  /** Y-M-D in the visitor's time zone */
  key: string;
  /** "Heute" / "Morgen" / "Do." */
  label: string;
  /** "Do. 19.11." */
  sub: string;
  /** Long day name for sentences: "Heute"/"Donnerstag" */
  long: string;
  offset: number;
  times: Array<{ iso: string; label: string }>;
}

const ymdFormats = new Map<string, Intl.DateTimeFormat>();

/** YYYY-MM-DD of `date` in `tz`, built from parts (not from a locale's string format). */
export function ymd(date: Date, tz: string): string {
  let f = ymdFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    ymdFormats.set(tz, f);
  }
  const parts: Record<string, string> = {};
  for (const p of f.formatToParts(date)) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
}

export function formatTime(date: Date, lang: Lang, tz: string): string {
  return new Intl.DateTimeFormat(lang, { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(date);
}

/**
 * Group slot starts (UTC ISO strings) into at most `maxDays` visitor-local days
 * with at most `perDay` times each.
 */
export function groupSlots(
  starts: string[],
  lang: Lang,
  tz: string,
  now: Date = new Date(),
  maxDays = 3,
  perDay = 3
): SlotDay[] {
  try {
    return group(starts, lang, tz, now, maxDays, perDay);
  } catch {
    // e.g. an unknown time zone in an old browser: render without times
    return [];
  }
}

function group(starts: string[], lang: Lang, tz: string, now: Date, maxDays: number, perDay: number): SlotDay[] {
  const c = COPY[lang];
  const todayKey = ymd(now, tz);
  const days: SlotDay[] = [];
  const sorted = starts
    .map((s) => ({ iso: s, date: new Date(s) }))
    .filter((s) => !isNaN(s.date.getTime()) && s.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const s of sorted) {
    const key = ymd(s.date, tz);
    let day = days.find((d) => d.key === key);
    if (!day) {
      if (days.length >= maxDays) break;
      const offset = dayDiff(todayKey, key);
      const short = new Intl.DateTimeFormat(lang, { timeZone: tz, weekday: "short" }).format(s.date);
      const long = new Intl.DateTimeFormat(lang, { timeZone: tz, weekday: "long" }).format(s.date);
      const dm = new Intl.DateTimeFormat(lang, { timeZone: tz, day: "numeric", month: "short" }).format(s.date);
      day = {
        key,
        offset,
        label: offset === 0 ? c.today : offset === 1 ? c.tomorrow : short,
        long: offset === 0 ? c.today : offset === 1 ? c.tomorrow : long,
        sub: offset <= 1 ? `${short} ${dm}` : dm,
        times: [],
      };
      days.push(day);
    }
    if (day.times.length < perDay) day.times.push({ iso: s.iso, label: formatTime(s.date, lang, tz) });
  }
  return days;
}

/** "Heute frei ab 14:30" / "Morgen frei ab 09:00" / "Donnerstag frei ab 10:30" */
export function nextSlotLine(days: SlotDay[], lang: Lang): string | null {
  const first = days[0];
  if (!first || !first.times[0]) return null;
  const c = COPY[lang];
  const t = first.times[0].label;
  if (first.offset === 0) return fill(c.todayFrom, { t });
  if (first.offset === 1) return fill(c.tomorrowFrom, { t });
  return fill(c.dayFrom, { d: first.long, t });
}
