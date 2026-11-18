import { resolveDesign, normalizeDesign, captureScriptDesign, scriptTagDesign, resetScriptDesign } from "../design/resolve";
import { detectLang, groupSlots, nextSlotLine, formatTime } from "../design/i18n";
import { brandTokens, contrast, parseColor } from "../design/color";
import { linkCardURL, linkWithSlot, parseLinkCard, baseLinkFor } from "../design/link-card";
import { parseVtt } from "../design/video-2026";

afterEach(() => {
  resetScriptDesign();
  document.head.innerHTML = "";
  document.documentElement.removeAttribute("lang");
});

describe("design resolution", () => {
  it("defaults to classic", () => {
    expect(resolveDesign(undefined, undefined)).toBe("classic");
    expect(resolveDesign("nonsense")).toBe("classic");
  });
  it("first set candidate wins (per widget over namespace)", () => {
    expect(resolveDesign("classic", "2026")).toBe("classic");
    expect(resolveDesign(undefined, "2026")).toBe("2026");
    expect(normalizeDesign(2026)).toBe("2026");
  });
  it("reads data-meetergo-design from the script tag", () => {
    expect(scriptTagDesign()).toBeUndefined();
    document.head.innerHTML = `<script data-meetergo-design="2026" src="x.js"></script>`;
    expect(scriptTagDesign()).toBe("2026");
    document.head.innerHTML = "";
    const s = document.createElement("script");
    s.setAttribute("data-meetergo-design", "2026");
    captureScriptDesign(s);
    expect(scriptTagDesign()).toBe("2026");
  });
});

describe("language", () => {
  const nav = Object.getOwnPropertyDescriptor(window.navigator, "language");
  afterEach(() => { if (nav) Object.defineProperty(window.navigator, "language", nav); });
  it("explicit locale, then <html lang>, then browser, then de", () => {
    Object.defineProperty(window.navigator, "language", { configurable: true, value: "fr-FR" });
    expect(detectLang("pl")).toBe("pl");
    document.documentElement.setAttribute("lang", "es-ES");
    expect(detectLang()).toBe("es");
    document.documentElement.setAttribute("lang", "ja");
    expect(detectLang()).toBe("fr");
    Object.defineProperty(window.navigator, "language", { configurable: true, value: "ja-JP" });
    expect(detectLang()).toBe("de");
  });
});

describe("slot formatting in the visitor's time zone", () => {
  // Wednesday 18 Nov 2026, 10:00 in Berlin
  const now = new Date("2026-11-18T09:00:00Z");
  const starts = [
    "2026-11-18T13:30:00Z", "2026-11-18T14:00:00Z", "2026-11-18T15:30:00Z", "2026-11-18T16:00:00Z",
    "2026-11-19T08:00:00Z", "2026-11-20T09:30:00Z", "2026-11-23T10:00:00Z",
  ];
  it("groups into at most 3 days with at most 3 times", () => {
    const days = groupSlots(starts, "de", "Europe/Berlin", now);
    expect(days.map((d) => d.label.replace(".", ""))).toEqual(["Heute", "Morgen", "Fr"]);
    expect(days[0].times.map((t) => t.label)).toEqual(["14:30", "15:00", "16:30"]);
    expect(nextSlotLine(days, "de")).toBe("Heute frei ab 14:30");
  });
  it("uses the visitor's zone (New York sees other local times and days)", () => {
    const days = groupSlots(starts, "en", "America/New_York", now);
    expect(days[0].label).toBe("Today");
    expect(days[0].times[0].label).toBe(formatTime(new Date(starts[0]), "en", "America/New_York"));
    expect(nextSlotLine(days, "en")).toMatch(/^Free today from 08:30/);
  });
  it("tomorrow and weekday sentences, all locales", () => {
    const later = groupSlots(["2026-11-19T08:00:00Z"], "de", "Europe/Berlin", now);
    expect(nextSlotLine(later, "de")).toBe("Morgen frei ab 09:00");
    const fri = groupSlots(["2026-11-20T08:00:00Z"], "de", "Europe/Berlin", now);
    expect(nextSlotLine(fri, "de")).toBe("Freitag frei ab 09:00");
    for (const lang of ["fr", "es", "pl"] as const) {
      expect(nextSlotLine(groupSlots(starts, lang, "Europe/Berlin", now), lang)).toMatch(/14:30/);
    }
    expect(nextSlotLine([], "de")).toBeNull();
  });
  it("drops past and invalid starts", () => {
    expect(groupSlots(["2026-11-18T07:00:00Z", "nope"], "de", "Europe/Berlin", now)).toEqual([]);
  });
});

describe("brand colours", () => {
  it("picks a readable foreground", () => {
    expect(brandTokens("#1A6EF4").fg).toBe("#FFFFFF");
    expect(brandTokens("#F2B33D").fg).toBe("#101623");
    expect(brandTokens("#101623").fg).toBe("#FFFFFF");
  });
  it("keeps a configured text colour only when readable", () => {
    expect(brandTokens("#F2B33D", "#ffffff").fg).toBe("#101623");
    expect(brandTokens("#0F7B5F", "#fff").fg).toBe("#FFFFFF");
  });
  it("text shade is AA on white, soft tint is light", () => {
    for (const c of ["#1A6EF4", "#F2B33D", "#25D366", "#ff0000"]) {
      const t = brandTokens(c);
      expect(contrast(parseColor(t.text)!, [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(parseColor(t.soft)!, [255, 255, 255])).toBeLessThan(1.3);
    }
  });
  it("falls back to the default brand for invalid input", () => {
    expect(brandTokens("var(--x)").brand).toBe("#1A6EF4");
  });
});

describe("link card contract helpers", () => {
  it("calls the endpoint on the booking link's own origin", () => {
    const u = new URL(linkCardURL("https://termine.kanzlei.de/lena/erst?x=1", "Europe/Berlin", "de")!);
    expect(u.origin).toBe("https://termine.kanzlei.de");
    expect(u.pathname).toBe("/api/embed/link-card");
    expect(u.searchParams.get("link")).toBe("https://termine.kanzlei.de/lena/erst?x=1");
    expect(u.searchParams.get("tz")).toBe("Europe/Berlin");
    expect(u.searchParams.get("lang")).toBe("de");
    expect(linkCardURL("cal.meetergo.com/a/b", "UTC", "en")).toContain("https://cal.meetergo.com/api/embed/link-card");
  });
  it("merges the slot param into existing params and remembers the base link", () => {
    const l = linkWithSlot("https://cal.meetergo.com/a/b?lang=de", "slot", "2026-11-18T13:30:00Z");
    const u = new URL(l);
    expect(u.searchParams.get("lang")).toBe("de");
    expect(u.searchParams.get("slot")).toBe("2026-11-18T13:30:00Z");
    expect(baseLinkFor(l)).toBe("https://cal.meetergo.com/a/b?lang=de");
  });
  it("validates the response shape", () => {
    expect(parseLinkCard(null)).toBeNull();
    const c = parseLinkCard({
      host: { name: "Lena", avatarUrl: "javascript:alert(1)" },
      meetingType: { title: "Erst", durationMinutes: "30", location: "video" },
      nextSlots: [{ start: "2026-11-18T13:30:00Z" }, { start: "bad" }, null],
      slotParam: "slot&x=1",
    })!;
    expect(c.host).toEqual({ name: "Lena", avatarUrl: null });
    expect(c.meetingType?.durationMinutes).toBeNull();
    expect(c.nextSlots).toEqual([{ start: "2026-11-18T13:30:00Z" }]);
    expect(c.slotParam).toBeNull();
  });
});

describe("captions", () => {
  it("parses WebVTT cues", () => {
    const cues = parseVtt("WEBVTT\n\n00:00.000 --> 00:03.500\nHallo, <b>ich</b> bin Lena.\n\n1\n00:00:03.500 --> 00:00:09.000 align:start\nZweite Zeile\n");
    expect(cues).toEqual([
      { start: 0, end: 3.5, text: "Hallo, ich bin Lena." },
      { start: 3.5, end: 9, text: "Zweite Zeile" },
    ]);
  });
});
