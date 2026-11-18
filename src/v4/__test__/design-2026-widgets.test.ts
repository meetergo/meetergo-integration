import { MeetergoSDK } from "../core/sdk";
import { clearLinkCardCache } from "../design/link-card";
import { resetScriptDesign } from "../design/resolve";

const LINK = "https://cal.meetergo.com/lena/erstberatung";

/** Slots relative to now so "Heute"/"Morgen" labels are stable. */
function slotsFromNow(): Array<{ start: string }> {
  const base = Date.now() + 5 * 60_000;
  return [0, 30, 60, 24 * 60, 24 * 60 + 30].map((m) => ({ start: new Date(base + m * 60_000).toISOString() }));
}

function card(overrides: Record<string, unknown> = {}) {
  return {
    host: { name: "Lena Hartmann", avatarUrl: null },
    meetingType: { title: "Erstberatung", durationMinutes: 30, location: "video" },
    nextSlots: slotsFromNow(),
    timezone: "Europe/Berlin",
    slotParam: "slot",
    ...overrides,
  };
}

let fetchMock: jest.Mock;
function respondWith(body: unknown, ok = true) {
  fetchMock.mockImplementation(() => Promise.resolve({ ok, json: () => Promise.resolve(body) }));
}

function sdkWith(config: Record<string, unknown>) {
  const sdk = new MeetergoSDK();
  sdk.boot();
  const callable = sdk.buildSDKCallable();
  callable("init", config);
  return { sdk, callable };
}

function events(callable: ReturnType<typeof sdkWith>["callable"], ns = "default") {
  const seen: string[] = [];
  callable("on", { action: "*", ns, callback: (env: { event: string }) => seen.push(env.event) });
  return seen;
}

const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const shadowOf = (id: string) => (document.getElementById(id) as HTMLElement).shadowRoot as ShadowRoot;
const q = <T extends Element = HTMLElement>(root: ShadowRoot, sel: string) => root.querySelector(sel) as unknown as T;
const engage = (el: Element) => el.dispatchEvent(new Event("pointerenter"));
const key = (target: EventTarget, k: string) => target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true }));

let reducedMotion = false;
beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduced-motion") ? reducedMotion : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: jest.fn(() => Promise.resolve()) });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: jest.fn() });
});

beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  document.documentElement.setAttribute("lang", "de");
  clearLinkCardCache();
  resetScriptDesign();
  reducedMotion = false;
  fetchMock = jest.fn();
  (global as unknown as { fetch: unknown }).fetch = fetchMock;
  respondWith(card());
});

afterEach(() => {
  delete (global as unknown as { fetch?: unknown }).fetch;
});

describe("classic default stays untouched", () => {
  it("never fetches the link card and renders no shadow hosts without the flag", async () => {
    sdkWith({ floatingButton: { link: LINK, showNextSlot: true }, sidebar: { link: LINK }, videoEmbed: { videoSrc: "v.mp4", bookingLink: LINK } });
    document.querySelectorAll("button").forEach((b) => engage(b));
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.querySelector("[data-meetergo-design]")).toBeNull();
    expect(document.getElementById("mg-default-float-btn")?.className).toBe("mg-float-button");
  });

  it("design: 'classic' per widget wins over namespace 2026", () => {
    sdkWith({ design: "2026", floatingButton: { link: LINK, design: "classic" } });
    expect(document.getElementById("mg-default-float-btn")?.className).toBe("mg-float-button");
  });
});

describe("floating pill + launcher (2026)", () => {
  it("renders in a shadow root with label, readable brand foreground and no fetch before idle/engagement", () => {
    sdkWith({ floatingButton: { link: LINK, design: "2026", text: "Termin buchen", backgroundColor: "#F2B33D" } });
    const host = document.getElementById("mg-default-float-btn") as HTMLElement;
    expect(host.getAttribute("data-meetergo-design")).toBe("2026");
    const root = host.shadowRoot!;
    expect(q(root, ".pill .t").textContent).toBe("Termin buchen");
    const css = root.querySelector("style")!.textContent!;
    expect(css).toContain("--brand-fg:#101623");
    expect(css).toContain("color-scheme:light");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("namespace design and the script tag attribute turn it on", () => {
    sdkWith({ design: "2026", floatingButton: { link: LINK } });
    expect(shadowOf("mg-default-float-btn")).not.toBeNull();
    document.body.innerHTML = "";
    document.head.innerHTML = `<script data-meetergo-design="2026"></script>`;
    sdkWith({ ns: "tag", floatingButton: { link: LINK } });
    expect(shadowOf("mg-tag-float-btn")).not.toBeNull();
  });

  it("fetches lazily on hover, shows the next slot, and caches per link", async () => {
    sdkWith({ design: "2026", floatingButton: { link: LINK } });
    const root = shadowOf("mg-default-float-btn");
    const pill = q(root, ".pill");
    engage(pill);
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://cal.meetergo.com/api/embed/link-card");
    expect(url.searchParams.get("link")).toBe(LINK);
    expect(url.searchParams.get("lang")).toBe("de");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "omit", method: "GET" });
    expect(q(root, ".pill .s").textContent).toMatch(/^(Heute|Morgen) frei ab \d\d:\d\d$/);
    expect(pill.getAttribute("aria-label")).toMatch(/^Termin buchen, (Heute|Morgen) frei ab/);

    // same link in another widget: served from the page-lifetime cache
    sdkWith({ ns: "two", design: "2026", sidebar: { link: LINK } });
    engage(q(shadowOf("mg-two-sidebar-2026-right"), ".edge"));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("launcher: days, times, Escape closes, focus returns, a time opens the modal with the slot preselected", async () => {
    const { callable } = sdkWith({ design: "2026", floatingButton: { link: LINK + "?lang=de" }, prerender: false });
    const seen = events(callable);
    const root = shadowOf("mg-default-float-btn");
    const pill = q<HTMLButtonElement>(root, ".pill");
    engage(pill);
    await flush();

    pill.click();
    const launch = q(root, ".launch");
    expect(launch.hidden).toBe(false);
    expect(pill.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelectorAll(".day").length).toBe(2);
    expect(root.querySelectorAll(".chip").length).toBeGreaterThan(0);
    expect(root.activeElement?.className).toBe("day");

    key(launch, "Escape");
    expect(launch.hidden).toBe(true);
    expect(root.activeElement).toBe(pill);

    pill.click();
    const chip = q<HTMLButtonElement>(root, ".chip");
    chip.click();
    const modalRoot = shadowOf("mg-default-modal-2026");
    const iframe = q<HTMLIFrameElement>(modalRoot, "iframe");
    const src = new URL(iframe.src);
    expect(src.searchParams.get("slot")).toMatch(/^20\d\d-\d\d-\d\dT/);
    expect(src.searchParams.get("lang")).toBe("de");
    expect(src.searchParams.get("embed")).toBe("true");
    expect(seen.slice(0, 3)).toEqual(["modalOpened", "modal_loading", "modalOpened"]);
  });

  it("without slotParam a time opens the modal normally", async () => {
    respondWith(card({ slotParam: null }));
    sdkWith({ design: "2026", floatingButton: { link: LINK }, prerender: false });
    const root = shadowOf("mg-default-float-btn");
    engage(q(root, ".pill"));
    await flush();
    q<HTMLButtonElement>(root, ".pill").click();
    q<HTMLButtonElement>(root, ".chip").click();
    expect(q<HTMLIFrameElement>(shadowOf("mg-default-modal-2026"), "iframe").src).toBe(LINK + "?embed=true");
  });

  it.each([
    ["the endpoint fails", () => respondWith({}, false)],
    ["fetch rejects", () => fetchMock.mockImplementation(() => Promise.reject(new Error("offline")))],
    ["there are no slots", () => respondWith(card({ nextSlots: [] }))],
  ])("falls back gracefully when %s: no sub-line, pill opens the modal", async (_label, arrange) => {
    arrange();
    sdkWith({ design: "2026", floatingButton: { link: LINK }, prerender: false });
    const root = shadowOf("mg-default-float-btn");
    engage(q(root, ".pill"));
    await flush();
    expect(q(root, ".pill .s").hidden).toBe(true);
    q<HTMLButtonElement>(root, ".pill").click();
    expect(q(root, ".launch").hidden).toBe(true);
    expect(q(shadowOf("mg-default-modal-2026"), "iframe")).not.toBeNull();
  });

  it("showNextSlot: false and avatar: false render without that data", async () => {
    sdkWith({ design: "2026", floatingButton: { link: LINK, showNextSlot: false, avatar: false }, prerender: false });
    const root = shadowOf("mg-default-float-btn");
    engage(q(root, ".pill"));
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(q(root, ".pill > .av")).toBeNull();
    expect(q(root, ".pill").classList.contains("noav")).toBe(true);
    expect(q(root, ".pill .s").hidden).toBe(true);
    q<HTMLButtonElement>(root, ".pill").click();
    expect(q(shadowOf("mg-default-modal-2026"), "iframe")).not.toBeNull();
  });

  it("subline override and avatar URL", () => {
    sdkWith({ design: "2026", floatingButton: { link: LINK, subline: "Antwort am selben Tag", avatar: "https://img.example.com/a.jpg" } });
    const root = shadowOf("mg-default-float-btn");
    expect(q(root, ".pill .s").textContent).toBe("Antwort am selben Tag");
    expect(q(root, ".pill .s").hidden).toBe(false);
  });

  it("localizes default copy (en)", async () => {
    document.documentElement.setAttribute("lang", "en");
    sdkWith({ design: "2026", floatingButton: { link: LINK } });
    const root = shadowOf("mg-default-float-btn");
    expect(q(root, ".pill .t").textContent).toBe("Book a meeting");
    engage(q(root, ".pill"));
    await flush();
    expect(q(root, ".pill .s").textContent).toMatch(/^Free (today|tomorrow) from/);
    expect(q(root, ".all").textContent).toBe("See all times");
  });

  it("destroy removes the host", () => {
    const { callable } = sdkWith({ design: "2026", floatingButton: { link: LINK } });
    callable("destroy");
    expect(document.getElementById("mg-default-float-btn")).toBeNull();
  });
});

describe("modal shell (2026)", () => {
  it("keeps the iframe behaviour and events, header shows the host, Escape closes and focus returns", async () => {
    document.body.innerHTML = `<button id="opener">Book</button>`;
    const opener = document.getElementById("opener") as HTMLButtonElement;
    opener.focus();
    const { callable } = sdkWith({ design: "2026", prerender: false, prefill: { email: "a@b.de" } });
    const seen = events(callable);
    callable("openModal", { link: LINK, params: { firstname: "Jonas" } });
    const host = document.getElementById("mg-default-modal-2026")!;
    const root = host.shadowRoot!;
    const iframe = q<HTMLIFrameElement>(root, "iframe");
    const src = new URL(iframe.src);
    expect(src.searchParams.get("firstname")).toBe("Jonas");
    expect(src.searchParams.get("email")).toBe("a@b.de");
    expect(iframe.name).toBe("meetergo-embedded-modal");
    expect(q(root, ".modal").getAttribute("role")).toBe("dialog");
    expect(q(root, ".modal").getAttribute("aria-modal")).toBe("true");
    expect(root.activeElement?.className).toBe("x");
    expect(opener.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    await flush();
    expect(q(root, ".nm").textContent).toBe("Lena Hartmann");
    expect(q(root, ".who .meta").textContent).toBe("Erstberatung · 30 Min. · Video");

    iframe.dispatchEvent(new Event("load"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(q(root, ".wrap").getAttribute("data-open")).toBe("false");
    expect(document.activeElement).toBe(opener);
    expect(opener.hasAttribute("inert")).toBe(false);
    expect(seen).toEqual(["modalOpened", "modal_loading", "modalOpened", "linkReady", "modalClosed"]);
    expect(document.getElementById("mg-default-modal")).toBeNull();
  });

  it("acquires the prerendered iframe and parks it again on close", () => {
    const { callable } = sdkWith({ design: "2026", floatingButton: { link: LINK } });
    const parking = document.getElementById("mg-prerender-parking-default")!;
    const parked = parking.querySelector("iframe");
    expect(parked).not.toBeNull();
    q<HTMLButtonElement>(shadowOf("mg-default-float-btn"), ".pill").click();
    expect(q(shadowOf("mg-default-modal-2026"), "iframe")).toBe(parked);
    callable("closeModal");
    expect(parking.querySelector("iframe")).toBe(parked);
  });

  it("falls back to a plain header when the link card fails", async () => {
    respondWith({}, false);
    const { callable } = sdkWith({ design: "2026", prerender: false });
    callable("openModal", { link: LINK });
    await flush();
    const root = shadowOf("mg-default-modal-2026");
    expect(q(root, ".nm").textContent).toBe("Termin buchen");
    expect(q(root, ".who .meta").textContent).toBe("");
  });

  it("ui.design and data-meetergo-design pick the modal per namespace / per element", () => {
    document.body.innerHTML = `
      <button id="a" data-meetergo-link="${LINK}" data-meetergo-design="2026">A</button>
      <button id="b" data-meetergo-link="${LINK}">B</button>`;
    const sdk = new MeetergoSDK();
    sdk.boot();
    sdk.startScanner();
    (document.getElementById("b") as HTMLButtonElement).click();
    expect(document.getElementById("mg-default-modal")).not.toBeNull();
    expect(document.getElementById("mg-default-modal-2026")).toBeNull();
    (document.getElementById("a") as HTMLButtonElement).click();
    expect(document.getElementById("mg-default-modal-2026")).not.toBeNull();
    expect(document.getElementById("mg-default-modal")?.style.visibility).toBe("hidden");
    sdk.destroy();

    document.body.innerHTML = "";
    const { callable } = sdkWith({ ns: "u", ui: { design: "2026" }, prerender: false });
    callable("openModal", { ns: "u", link: LINK });
    expect(document.getElementById("mg-u-modal-2026")).not.toBeNull();
  });

  it("Tab cycles inside the dialog", () => {
    const { callable } = sdkWith({ design: "2026", prerender: false });
    callable("openModal", { link: LINK });
    const root = shadowOf("mg-default-modal-2026");
    const modal = q(root, ".modal");
    const iframe = q<HTMLIFrameElement>(root, "iframe");
    iframe.focus();
    // last focusable is the iframe; Tab wraps to the close button
    Object.defineProperty(root, "activeElement", { configurable: true, get: () => iframe });
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    modal.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});

describe("sidebar tab + sheet (2026)", () => {
  it("opens and closes with the classic events, focus moves in and returns, backdrop closes", async () => {
    const { callable } = sdkWith({ design: "2026", sidebar: { link: LINK, buttonText: "Termin buchen", width: "420px" } });
    const seen = events(callable);
    const root = shadowOf("mg-default-sidebar-2026-right");
    const tab = q<HTMLButtonElement>(root, ".edge");
    expect(q(root, ".lbl").textContent).toBe("Termin buchen");
    expect(q(root, ".layer").hasAttribute("inert")).toBe(true);
    const iframe = q<HTMLIFrameElement>(root, "iframe");
    expect(iframe.src).toBe(LINK + "?embed=true");
    expect(iframe.getAttribute("allow")).toBe("payment");
    expect(q(root, ".sheet").style.width).toBe("420px");

    tab.focus();
    tab.click();
    expect(q(root, ".layer").getAttribute("data-open")).toBe("true");
    expect(root.activeElement?.className).toBe("x");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(q(root, ".layer").getAttribute("data-open")).toBe("false");
    expect(root.activeElement).toBe(tab);

    callable("on", { action: "x", callback: () => undefined });
    tab.click();
    q<HTMLElement>(root, ".scrim").click();
    expect(seen).toEqual(["sidebarOpened", "sidebarClosed", "sidebarOpened", "sidebarClosed"]);

    engage(tab);
    await flush();
    expect(q(root, ".nm").textContent).toBe("Lena Hartmann");
  });

  it("toggleSidebar and data-meetergo-layout=sidebar drive the 2026 sidebar", () => {
    const { callable } = sdkWith({ design: "2026", sidebar: { link: LINK, position: "left" } });
    callable.ns.default.toggleSidebar("left");
    expect(q(shadowOf("mg-default-sidebar-2026-left"), ".layer").getAttribute("data-open")).toBe("true");
  });
});

describe("video bubble + card (2026)", () => {
  async function video(extra: Record<string, unknown> = {}) {
    const r = sdkWith({ design: "2026", prerender: false, videoEmbed: { videoSrc: "https://cdn.example.com/v.mp4", bookingLink: LINK, bookingCta: "Erstberatung buchen", ...extra } });
    await flush();
    const host = document.querySelector('[id^="mg-video-default-"]') as HTMLElement;
    return { ...r, root: host.shadowRoot as ShadowRoot };
  }

  it("bubble expands to the card and back with the classic video events", async () => {
    const { callable, root } = await video();
    const seen = events(callable);
    const vw = q(root, ".vw");
    expect(vw.getAttribute("data-state")).toBe("bubble");
    const v = q<HTMLVideoElement>(root, "video");
    expect(v.muted).toBe(true);
    expect(v.autoplay).toBe(true);

    q<HTMLButtonElement>(root, ".hit").click();
    expect(vw.getAttribute("data-state")).toBe("card");
    expect(v.muted).toBe(false);
    expect(root.activeElement?.getAttribute("aria-label")).toBe("Schließen");
    q<HTMLButtonElement>(root, ".tap").click(); // jsdom: paused stays true → play
    key(vw, "Escape");
    expect(vw.getAttribute("data-state")).toBe("bubble");
    expect(root.activeElement).toBe(q(root, ".hit"));
    expect(seen).toEqual(["videoExpanded", "videoPlay", "videoMinimized"]);
  });

  it("CTA opens the booking modal; label shows name and duration; next slot under the CTA", async () => {
    const { root } = await video();
    const v = q<HTMLVideoElement>(root, "video");
    Object.defineProperty(v, "duration", { configurable: true, value: 24.2 });
    v.dispatchEvent(new Event("loadedmetadata"));
    engage(q(root, ".vw"));
    await flush();
    expect(q(root, ".lab span").textContent).toBe("Lena · 0:24");
    expect(q(root, ".act .meta").textContent).toMatch(/frei ab/);
    expect(q(root, ".cta").textContent).toBe("Erstberatung buchen");
    q<HTMLButtonElement>(root, ".cta").click();
    expect(q(shadowOf("mg-default-modal-2026"), "iframe")).not.toBeNull();
  });

  it("reduced motion: no autoplay in the bubble", async () => {
    reducedMotion = true;
    const { root } = await video();
    expect(q<HTMLVideoElement>(root, "video").autoplay).toBe(false);
  });

  it("captions from captionsSrc show in the card", async () => {
    fetchMock.mockImplementation((url: string) =>
      url.endsWith(".vtt")
        ? Promise.resolve({ ok: true, text: () => Promise.resolve("WEBVTT\n\n00:00.000 --> 00:05.000\nHallo, ich bin Lena.\n") })
        : Promise.resolve({ ok: true, json: () => Promise.resolve(card()) })
    );
    const { root } = await video({ captionsSrc: "https://cdn.example.com/c.vtt" });
    await flush();
    q<HTMLButtonElement>(root, ".hit").click();
    const v = q<HTMLVideoElement>(root, "video");
    Object.defineProperty(v, "currentTime", { configurable: true, get: () => 1, set: () => undefined });
    v.dispatchEvent(new Event("timeupdate"));
    expect(q(root, ".cap").textContent).toBe("Hallo, ich bin Lena.");
    expect(q(root, ".cap").hidden).toBe(false);
  });

  it("no captions element content without captionsSrc; dismiss removes the widget", async () => {
    const { root } = await video();
    expect(q(root, ".cap").hidden).toBe(true);
    q<HTMLButtonElement>(root, ".dismiss").click();
    expect(document.querySelector('[id^="mg-video-default-"]')).toBeNull();
  });
});
