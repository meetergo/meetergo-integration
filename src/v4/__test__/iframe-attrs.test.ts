import { MeetergoSDK } from "../core/sdk";

const LINK = "https://cal.meetergo.com/team/analyse";
const ATTRS = { "data-analytics": "booking", referrerpolicy: "no-referrer" };

function sdkWith(config: Record<string, unknown>) {
  const sdk = new MeetergoSDK();
  sdk.boot();
  const callable = sdk.buildSDKCallable();
  callable("init", config);
  return { callable };
}

function expectDecorated(iframe: HTMLIFrameElement | null) {
  expect(iframe).not.toBeNull();
  for (const [key, value] of Object.entries(ATTRS)) {
    expect(iframe?.getAttribute(key)).toBe(value);
  }
  expect(iframe?.style.outline).toBe("2px solid #22c55e");
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
});

describe("iframeAttrs and uiDebug from init", () => {
  it("reach the inline embed iframe", () => {
    document.body.innerHTML = `<div id="booking"></div>`;
    const { callable } = sdkWith({ ns: "inline", iframeAttrs: ATTRS, uiDebug: true });

    callable("inline", { ns: "inline", link: LINK, elementOrSelector: "#booking" });

    expectDecorated(document.querySelector<HTMLIFrameElement>("#booking iframe"));
  });

  it("reach a freshly created modal iframe", () => {
    const { callable } = sdkWith({ ns: "modal", iframeAttrs: ATTRS, uiDebug: true, prerender: false });

    callable("openModal", { ns: "modal", link: LINK });

    expectDecorated(document.querySelector<HTMLIFrameElement>('iframe[name="meetergo-embedded-modal"]'));
  });

  it("reach a prerendered modal iframe", () => {
    const { callable } = sdkWith({ ns: "warm", iframeAttrs: ATTRS, uiDebug: true });

    callable("prerender", { ns: "warm", link: LINK });
    const parked = document.querySelector<HTMLIFrameElement>("#mg-prerender-parking-warm iframe");
    expectDecorated(parked);

    callable("openModal", { ns: "warm", link: LINK });

    expect(document.querySelector('iframe[name="meetergo-embedded-modal"]')).toBe(parked);

    expectDecorated(document.querySelector<HTMLIFrameElement>('iframe[name="meetergo-embedded-modal"]'));
  });

  it("reach the sidebar iframe", () => {
    sdkWith({ ns: "side", iframeAttrs: ATTRS, uiDebug: true, sidebar: { link: LINK } });

    expectDecorated(document.querySelector<HTMLIFrameElement>(".mg-sidebar-iframe"));
  });

  it("cannot replace the attributes the SDK sizes, names and loads iframes with", () => {
    document.body.innerHTML = `<div id="booking"></div>`;
    const { callable } = sdkWith({
      ns: "owned",
      uiDebug: true,
      iframeAttrs: { ...ATTRS, src: "https://example.com", name: "x", class: "x", style: "height:1px", loading: "eager" },
    });

    callable("inline", { ns: "owned", link: LINK, elementOrSelector: "#booking" });

    const iframe = document.querySelector<HTMLIFrameElement>("#booking iframe");
    expectDecorated(iframe);
    expect(iframe?.src.startsWith(LINK)).toBe(true);
    expect(iframe?.name).not.toBe("x");
    expect(iframe?.getAttribute("class")).not.toBe("x");
    expect(iframe?.style.height).toBe("700px");
    expect(iframe?.getAttribute("loading")).toBe("lazy");
  });

  it("leave iframes untouched when not configured", () => {
    document.body.innerHTML = `<div id="booking"></div>`;
    const { callable } = sdkWith({ ns: "plain" });

    callable("inline", { ns: "plain", link: LINK, elementOrSelector: "#booking" });

    const iframe = document.querySelector<HTMLIFrameElement>("#booking iframe");
    expect(iframe?.hasAttribute("data-analytics")).toBe(false);
    expect(iframe?.style.outline).toBe("");
  });
});
