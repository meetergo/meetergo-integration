import { MeetergoSDK } from "../core/sdk";
import { PrerenderManager } from "../core/prerender";

const LINK = "https://cal.meetergo.com/team/analyse";

function sdkWith(config: Record<string, unknown>) {
  const sdk = new MeetergoSDK();
  sdk.boot();
  const callable = sdk.buildSDKCallable();
  callable("init", config);
  return callable;
}

function modalSrc() {
  return document.querySelector<HTMLIFrameElement>('iframe[name="meetergo-embedded-modal"]')?.src;
}

function parked(ns: string) {
  return document.querySelectorAll<HTMLIFrameElement>(`#mg-prerender-parking-${ns} iframe`);
}

beforeAll(() => {
  // jsdom has no matchMedia; createIframe's color-scheme sync needs it
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/landing?utm_source=google&embed=false");
});

describe("prerendered modal src", () => {
  it("matches a freshly created modal: prefill and forwarded page params, reserved params dropped", () => {
    const fresh = sdkWith({ ns: "fresh", prerender: false, prefill: { email: "a@b.de" } });
    fresh("openModal", { ns: "fresh", link: LINK });
    const expected = modalSrc();

    document.body.innerHTML = "";
    const warm = sdkWith({ ns: "warm", prefill: { email: "a@b.de" }, floatingButton: { link: LINK } });
    const prerendered = parked("warm")[0];
    warm("openModal", { ns: "warm", link: LINK });

    expect(expected).toBe(`${LINK}?email=a%40b.de&utm_source=google&embed=true`);
    expect(modalSrc()).toBe(expected);
    expect(document.querySelector('iframe[name="meetergo-embedded-modal"]')).toBe(prerendered);
  });

  it("is unchanged for embeds without prefill on a page without query params", () => {
    window.history.replaceState({}, "", "/landing");
    sdkWith({ ns: "plain", floatingButton: { link: LINK } });

    expect(parked("plain")[0].src).toBe(`${LINK}?embed=true`);
  });

  it("respects forwardQueryParams: false", () => {
    sdkWith({ ns: "noforward", forwardQueryParams: false, floatingButton: { link: LINK } });

    expect(parked("noforward")[0].src).toBe(`${LINK}?embed=true`);
  });

  it("stays prerendered but loads the new prefill when setPrefill ran after warm-up", () => {
    const callable = sdkWith({ ns: "late", floatingButton: { link: LINK } });
    const prerendered = parked("late")[0];

    callable("setPrefill", { ns: "late", email: "late@b.de" });
    callable("openModal", { ns: "late", link: LINK });

    expect(modalSrc()).toContain("email=late%40b.de");
    expect(document.querySelector('iframe[name="meetergo-embedded-modal"]')).toBe(prerendered);
  });

  it("stays prerendered but follows the page URL when it changed after warm-up", () => {
    const callable = sdkWith({ ns: "spa", floatingButton: { link: LINK } });
    const prerendered = parked("spa")[0];

    window.history.replaceState({}, "", "/next-route?utm_source=newsletter");
    callable("openModal", { ns: "spa", link: LINK });

    expect(modalSrc()).toBe(`${LINK}?utm_source=newsletter&embed=true`);
    expect(document.querySelector('iframe[name="meetergo-embedded-modal"]')).toBe(prerendered);
  });

  it("keeps one parked iframe per link and updates its params on a new warm-up", () => {
    const callable = sdkWith({ ns: "rewarm", floatingButton: { link: LINK } });
    callable("setPrefill", { ns: "rewarm", email: "x@b.de" });
    callable("prerender", { ns: "rewarm", link: LINK });

    const iframes = parked("rewarm");
    expect(iframes).toHaveLength(1);
    expect(iframes[0].src).toContain("email=x%40b.de");
  });
});

describe("sidebar src", () => {
  function sidebarIframe() {
    return document.querySelector<HTMLIFrameElement>(".mg-sidebar-iframe");
  }

  it("carries prefill and forwarded page params and allows payment", () => {
    sdkWith({ ns: "side", prefill: { email: "a@b.de" }, sidebar: { link: LINK } });

    expect(sidebarIframe()?.src).toBe(`${LINK}?email=a%40b.de&utm_source=google&embed=true`);
    expect(sidebarIframe()?.getAttribute("allow")).toBe("payment");
  });

  it("is unchanged without prefill on a page without query params", () => {
    window.history.replaceState({}, "", "/landing");
    sdkWith({ ns: "sideplain", sidebar: { link: LINK } });

    expect(sidebarIframe()?.src).toBe(`${LINK}?embed=true`);
    expect(sidebarIframe()?.hasAttribute("loading")).toBe(false);
    expect(sidebarIframe()?.getAttribute("style")).toBeNull();
  });
});

describe("standalone managers keep their old URLs", () => {
  it("PrerenderManager without namespace options forwards no page params", () => {
    const manager = new PrerenderManager("standalone");
    manager.warmUp(LINK);

    expect(parked("standalone")[0].src).toBe(`${LINK}?embed=true`);
  });
});
