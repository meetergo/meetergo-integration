/**
 * Contract: the classic design (the default until the 2026 design becomes the
 * default in a separate release) must render byte-for-byte as before. These
 * snapshots were recorded on origin/main BEFORE the design-2026 work started.
 * If one of them changes, an existing customer embed changes. Do not update
 * the snapshots to make a test pass; fix the code instead.
 */
import { MeetergoSDK } from "../core/sdk";

const LINK = "https://cal.meetergo.com/lena/erstberatung";

function sdkWith(config: Record<string, unknown>) {
  const sdk = new MeetergoSDK();
  sdk.boot();
  const callable = sdk.buildSDKCallable();
  callable("init", config);
  return { sdk, callable };
}

/** Every event the namespace emits, in order, without timestamps. */
function recordEvents(callable: ReturnType<typeof sdkWith>["callable"], ns: string) {
  const seen: Array<{ event: string; data: unknown }> = [];
  callable("on", { action: "*", ns, callback: (env: { event: string; data: unknown }) => seen.push({ event: env.event, data: env.data }) });
  return seen;
}

function styleIds() {
  return Array.from(document.head.querySelectorAll("style")).map((s) => s.id);
}

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});

let randomSpy: jest.SpyInstance;
beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  // deterministic iframe names / video ids
  randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.123456789);
  jest.useFakeTimers();
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  randomSpy.mockRestore();
});

describe("classic design contract (default, no design flag)", () => {
  it("floating button DOM, ids, classes and inline styles", () => {
    sdkWith({
      ns: "fb",
      floatingButton: { link: LINK, text: "Termin buchen", backgroundColor: "#0F7B5F", textColor: "#fff", icon: "calendar", animation: "pulse", position: "bottom-right" },
    });
    expect(document.body.innerHTML).toMatchSnapshot();
    expect(styleIds()).toMatchSnapshot();
  });

  it("floating button in every position keeps today's inline styles", () => {
    const positions = ["top-left", "top-center", "top-right", "middle-left", "middle-center", "middle-right", "bottom-left", "bottom-center", "bottom-right"];
    const out = positions.map((position) => {
      document.body.innerHTML = "";
      sdkWith({ ns: "p", floatingButton: { link: LINK, position } });
      return `${position}: ${document.getElementById("mg-p-float-btn")?.getAttribute("style")}`;
    });
    expect(out).toMatchSnapshot();
  });

  it("floating button click opens the classic modal with today's DOM and events", () => {
    const { callable } = sdkWith({ ns: "fbm", floatingButton: { link: LINK, text: "Book" } });
    const events = recordEvents(callable, "fbm");
    (document.getElementById("mg-fbm-float-btn") as HTMLButtonElement).click();
    expect(document.getElementById("mg-fbm-modal")?.outerHTML).toMatchSnapshot();
    expect(events).toMatchSnapshot();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("modal open/close cycle: DOM, events and focus return", () => {
    document.body.innerHTML = `<button id="opener">Open</button>`;
    const opener = document.getElementById("opener") as HTMLButtonElement;
    opener.focus();
    const { callable } = sdkWith({ ns: "m", prerender: false });
    const events = recordEvents(callable, "m");

    callable("openModal", { ns: "m", link: LINK, params: { firstname: "Jonas" } });
    expect(document.getElementById("mg-m-modal")?.outerHTML).toMatchSnapshot("open");
    expect(document.activeElement?.className).toBe("mg-close-button");
    expect(opener.hasAttribute("inert")).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    jest.advanceTimersByTime(400);
    expect(document.getElementById("mg-m-modal")?.outerHTML).toMatchSnapshot("closed");
    expect(document.activeElement).toBe(opener);
    expect(opener.hasAttribute("inert")).toBe(false);

    // reopen same link reuses nothing (content cleared) → fresh load; reopen fires same events
    callable("openModal", { ns: "m", link: LINK });
    callable("closeModal", { ns: "m" });
    expect(events).toMatchSnapshot("events");
  });

  it("modal with prerender: warm-up parking and acquire keep today's behaviour", () => {
    const { callable } = sdkWith({ ns: "pr", floatingButton: { link: LINK } });
    const parking = document.getElementById("mg-prerender-parking-pr");
    expect(parking?.outerHTML).toMatchSnapshot("parking");
    const events = recordEvents(callable, "pr");
    (document.getElementById("mg-pr-float-btn") as HTMLButtonElement).click();
    expect(parking?.children.length).toBe(0);
    expect(document.getElementById("mg-pr-modal-content")?.innerHTML).toMatchSnapshot("acquired");
    callable("closeModal", { ns: "pr" });
    expect(parking?.children.length).toBe(1);
    (document.getElementById("mg-pr-float-btn") as HTMLButtonElement).click();
    expect(events).toMatchSnapshot("events");
  });

  it("sidebar DOM, ids, classes, open/close events and focus", () => {
    const { callable } = sdkWith({
      ns: "sb",
      sidebar: { link: LINK, position: "right", buttonText: "Termin buchen", backgroundColor: "#0F7B5F", textColor: "#fff", width: "420px" },
    });
    const events = recordEvents(callable, "sb");
    expect(document.body.innerHTML).toMatchSnapshot("closed");
    const toggle = document.querySelector(".mg-sidebar-toggle") as HTMLButtonElement;
    toggle.focus();
    toggle.click();
    expect(document.getElementById("mg-sb-sidebar-right")?.outerHTML).toMatchSnapshot("open");
    expect(document.activeElement?.className).toBe("mg-sidebar-close");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.activeElement).toBe(toggle);
    callable("on", { action: "noop", ns: "sb", callback: () => undefined });
    expect(events).toMatchSnapshot("events");
  });

  it("sidebar left with defaults", () => {
    sdkWith({ ns: "sl", sidebar: { link: LINK, position: "left" } });
    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("video embed DOM, styles and expand/minimize events", async () => {
    // jsdom does not implement media playback
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: () => Promise.resolve() });
    Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: () => undefined });
    const { callable } = sdkWith({
      ns: "v",
      videoEmbed: { videoSrc: "https://cdn.example.com/v.mp4", posterImage: "https://cdn.example.com/p.jpg", bookingLink: LINK, bookingCta: "Termin buchen", buttonColor: "#0F7B5F" },
    });
    const events = recordEvents(callable, "v");
    await Promise.resolve();
    await Promise.resolve();
    const container = document.querySelector('[id^="mg-video-v-"]') as HTMLElement;
    expect(container.outerHTML).toMatchSnapshot("minimized");
    container.click();
    expect(container.outerHTML).toMatchSnapshot("expanded");
    const ctaBtn = container.querySelectorAll("button")[0] as HTMLButtonElement;
    ctaBtn.click();
    const closeBtn = container.querySelector("div > div > div") as HTMLElement;
    closeBtn.click();
    expect(events.map((e) => e.event)).toMatchSnapshot("events");
  });

  it("data attribute buttons open the classic modal", () => {
    document.body.innerHTML = `<button data-meetergo-link="${LINK}" data-meetergo-ns="da">Book</button>`;
    const sdk = new MeetergoSDK();
    sdk.boot();
    sdk.startScanner();
    (document.querySelector("[data-meetergo-link]") as HTMLButtonElement).click();
    expect(document.getElementById("mg-da-modal")).not.toBeNull();
    expect(document.querySelector("[data-meetergo-design]")).toBeNull();
    expect(document.querySelectorAll("*").length).toMatchSnapshot();
    sdk.destroy();
  });

  it("injects exactly today's global style ids", () => {
    sdkWith({ ns: "s", floatingButton: { link: LINK }, sidebar: { link: LINK } });
    expect(styleIds()).toEqual(["mg-v4-video", "mg-v4-button", "mg-v4-sidebar", "mg-v4-animations", "mg-v4-base"]);
    expect(Array.from(document.head.querySelectorAll("style")).map((s) => s.textContent)).toMatchSnapshot();
  });
});
