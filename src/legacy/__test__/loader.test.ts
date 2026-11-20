/**
 * The legacy S3 loader in front of the real v4 SDK: every pre-v4 entry point
 * customers still use must open the same booking page it opened before.
 */
import { CDN_SCRIPT, FALLBACK_SCRIPT, load } from "../loader";

const LINK = "https://cal.meetergo.com/lena/erstberatung";

type Win = Window & { meetergo?: unknown; meetergoSettings?: unknown; __meetergoLegacyLoader?: unknown };
const win = window as Win;

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  delete win.meetergo;
  delete win.meetergoSettings;
  delete win.__meetergoLegacyLoader;
});

afterEach(() => {
  (win.meetergo as { destroy?: () => void } | undefined)?.destroy?.();
});

const injected = () => document.head.querySelectorAll<HTMLScriptElement>(`script[src="${CDN_SCRIPT}"]`);

/** Runs the real v4 bundle the way the browser would once the injected script arrives. */
function arriveV4() {
  jest.isolateModules(() => {
    require("../../v4/browser");
  });
  injected()[0].onload?.(new Event("load"));
}

const flush = () => new Promise((r) => setTimeout(r, 0));

const modalSrc = () =>
  document.querySelector<HTMLIFrameElement>('iframe[name="meetergo-embedded-modal"]')?.getAttribute("src") ?? "";

describe("legacy S3 loader", () => {
  it("loads v4 from the CDN once, even when the old script tag is on the page twice", () => {
    load();
    load();
    expect(injected()).toHaveLength(1);
    expect(document.head.querySelector(`link[rel="preload"][href="${CDN_SCRIPT}"]`)).not.toBeNull();
  });

  it("keeps the customer's data-* options on the script it loads", () => {
    const tag = document.createElement("script");
    tag.setAttribute("data-meetergo-design", "2026");
    jest.spyOn(document, "currentScript", "get").mockReturnValue(tag);
    load();
    expect(injected()[0].getAttribute("data-meetergo-design")).toBe("2026");
    jest.restoreAllMocks();
  });

  it("launchScheduler called before v4 arrives opens the booking page once it does", async () => {
    load();
    (win.meetergo as { launchScheduler: (l: string) => void }).launchScheduler(LINK);
    arriveV4();
    await flush();
    expect(modalSrc()).toContain(LINK);
  });

  it("launchScheduler, openModalWithContent and isReady exist on the loaded v4 SDK", async () => {
    load();
    arriveV4();
    const mg = win.meetergo as unknown as Record<string, (...a: unknown[]) => unknown>;
    expect(mg.isReady()).toBe(true);
    mg.openModalWithContent({ link: LINK, existingParams: { firstname: "Lena" } });
    await flush();
    expect(modalSrc()).toContain(LINK);
    expect(modalSrc()).toContain("firstname=Lena");
  });

  it("launchScheduler without a link falls back to the floating button link, like the old script", async () => {
    win.meetergoSettings = { floatingButton: { link: LINK } };
    load();
    arriveV4();
    (win.meetergo as { launchScheduler: () => void }).launchScheduler();
    await flush();
    expect(modalSrc()).toContain(LINK);
  });

  it("a .meetergo-modal-button with only an href opens the popup instead of leaving the page", async () => {
    document.body.innerHTML = `<a class="meetergo-modal-button" href="${LINK}">Termin</a><a class="meetergo-modal-button" href="#">Anker</a>`;
    load();
    arriveV4();
    const [booking, anchor] = Array.from(document.querySelectorAll("a"));
    expect(anchor.hasAttribute("link")).toBe(false);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    booking.dispatchEvent(click);
    await flush();
    expect(click.defaultPrevented).toBe(true);
    expect(modalSrc()).toContain(LINK);
  });

  it("a .meetergo-styled-button keeps its look and opens the booking page", async () => {
    document.body.innerHTML = `<button class="meetergo-styled-button" link="${LINK}">Buchen</button>`;
    load();
    arriveV4();
    const button = document.querySelector("button") as HTMLButtonElement;
    expect(button.style.backgroundColor).toBe("rgb(10, 100, 188)");
    button.click();
    await flush();
    expect(modalSrc()).toContain(LINK);
  });

  it("buttons added after load are upgraded too", async () => {
    load();
    arriveV4();
    document.body.insertAdjacentHTML("beforeend", `<button class="meetergo-styled-button" link="${LINK}">Später</button>`);
    await flush();
    (document.querySelector("button") as HTMLButtonElement).click();
    await flush();
    expect(modalSrc()).toContain(LINK);
  });

  it("a booking button clicked before v4 arrives opens the booking page instead of following its href", async () => {
    // Sites that lazy-load the old script on the first click re-click the button in its onload.
    document.body.innerHTML = `<a class="meetergo-modal-button" href="" link="${LINK}">Termin</a>`;
    load();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    (document.querySelector("a") as HTMLAnchorElement).dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    arriveV4();
    await flush();
    expect(modalSrc()).toContain(LINK);
  });

  it("once v4 runs, the early-click guard steps aside and the popup opens once", async () => {
    document.body.innerHTML = `<button class="meetergo-modal-button" link="${LINK}">Termin</button>`;
    load();
    arriveV4();
    (document.querySelector("button") as HTMLButtonElement).click();
    await flush();
    expect(document.querySelectorAll('iframe[name="meetergo-embedded-modal"]')).toHaveLength(1);
    expect(modalSrc()).toContain(LINK);
  });

  it("if the CDN is blocked (Content-Security-Policy), v4 comes from the copy next to the loader", () => {
    load();
    injected()[0].onerror?.(new Event("error"));
    expect(document.head.querySelectorAll(`script[src="${FALLBACK_SCRIPT}"]`)).toHaveLength(1);
  });

  it("if neither copy of v4 can load, booking links are no longer held back", () => {
    document.body.innerHTML = `<a class="meetergo-modal-button" href="${LINK}">Termin</a>`;
    load();
    injected()[0].onerror?.(new Event("error"));
    document.head.querySelector<HTMLScriptElement>(`script[src="${FALLBACK_SCRIPT}"]`)?.onerror?.(new Event("error"));
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    (document.querySelector("a") as HTMLAnchorElement).dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  it("old methods called right after the tag do not throw, and their calls reach v4", async () => {
    load();
    const mg = win.meetergo as unknown as Record<string, (...a: unknown[]) => unknown>;
    expect(() => {
      mg.setPrefill({ email: "lena@example.com" });
      mg.closeModal();
      mg.openModal();
      mg.init();
      mg.getStatus();
      mg.bindElementToScheduler(null as unknown as HTMLElement, LINK);
    }).not.toThrow();
    mg.launchScheduler(LINK);
    arriveV4();
    await flush();
    expect(modalSrc()).toContain(LINK);
    expect(modalSrc()).toContain("email=lena%40example.com");
  });

  it("an inline .meetergo-iframe that gives its link as href still shows the calendar", () => {
    document.body.innerHTML = `<div class="meetergo-iframe" href="${LINK}"></div>`;
    load();
    arriveV4();
    expect(document.querySelector(".meetergo-iframe iframe")?.getAttribute("src")).toContain(LINK);
  });

  it("a button whose link is set or changed after load opens the current link", async () => {
    const OTHER = "https://cal.meetergo.com/lena/folgetermin";
    document.body.innerHTML = `<button class="meetergo-modal-button">Termin</button>`;
    load();
    arriveV4();
    const button = document.querySelector("button") as HTMLButtonElement;
    button.setAttribute("link", LINK);
    await flush();
    button.click();
    await flush();
    expect(modalSrc()).toContain(LINK);
    (win.meetergo as unknown as { closeModal: () => void }).closeModal();
    button.setAttribute("link", OTHER);
    await flush();
    button.click();
    await flush();
    expect(modalSrc()).toContain(OTHER);
  });

  it("an empty link attribute falls back to the href, like the old script", async () => {
    document.body.innerHTML = `<a class="meetergo-modal-button" link="" href="${LINK}">Termin</a>`;
    load();
    arriveV4();
    (document.querySelector("a") as HTMLAnchorElement).click();
    await flush();
    expect(modalSrc()).toContain(LINK);
  });

  it("a bare init() keeps the floating button, as the old script ignored it", () => {
    win.meetergoSettings = { floatingButton: { link: LINK, position: "bottom-right", text: "Termin" } };
    load();
    arriveV4();
    const count = () => document.body.innerHTML.split("Termin").length - 1;
    const before = count();
    (win.meetergo as unknown as { init: () => void }).init();
    expect(before).toBeGreaterThan(0);
    expect(count()).toBe(before);
  });

  it("a link set right before a programmatic click opens that link, bound or not", async () => {
    const OTHER = "https://cal.meetergo.com/lena/folgetermin";
    document.body.innerHTML = `<button id="a" class="meetergo-modal-button">A</button><button id="b" class="meetergo-modal-button" link="${LINK}">B</button>`;
    load();
    arriveV4();
    const a = document.getElementById("a") as HTMLButtonElement;
    a.setAttribute("link", LINK);
    a.click();
    await flush();
    expect(modalSrc()).toContain(LINK);
    (win.meetergo as unknown as { closeModal: () => void }).closeModal();
    const b = document.getElementById("b") as HTMLButtonElement;
    b.setAttribute("link", OTHER);
    b.click();
    await flush();
    expect(modalSrc()).toContain(OTHER);
    expect(document.querySelectorAll('iframe[name="meetergo-embedded-modal"]')).toHaveLength(1);
  });

  it("a v4 snippet's queued init still runs (browser-v4.js pages)", async () => {
    const q: unknown[][] = [["init", { floatingButton: { link: LINK, text: "Termin" } }]];
    win.meetergo = Object.assign(function () { /* v4 queue stub */ }, { q });
    load();
    arriveV4();
    await flush();
    expect(typeof (win.meetergo as { launchScheduler?: unknown }).launchScheduler).toBe("function");
    expect(document.body.innerHTML).toContain("Termin");
  });

  it("v4's own methods are not replaced", () => {
    load();
    arriveV4();
    const mg = win.meetergo as unknown as Record<string, unknown> & { __sdk: unknown };
    expect(mg.__sdk).toBeDefined();
    expect(String(mg.openModal)).toContain("callable");
  });

  it("bindElementToScheduler / unbindElementFromScheduler bind and release an element", async () => {
    document.body.innerHTML = `<div id="cta">Jetzt buchen</div>`;
    load();
    arriveV4();
    const mg = win.meetergo as unknown as Record<string, (...a: unknown[]) => unknown>;
    const el = document.getElementById("cta") as HTMLElement;
    mg.bindElementToScheduler(el, LINK);
    expect(mg.unbindElementFromScheduler(el)).toBe(true);
    el.click();
    await flush();
    expect(modalSrc()).toBe("");
    mg.bindElementToScheduler(el, LINK);
    el.click();
    await flush();
    expect(modalSrc()).toContain(LINK);
  });
});
