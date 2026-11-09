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
    callable("openModal", { ns: "warm", link: LINK });

    expectDecorated(document.querySelector<HTMLIFrameElement>('iframe[name="meetergo-embedded-modal"]'));
  });

  it("reach the sidebar iframe", () => {
    sdkWith({ ns: "side", iframeAttrs: ATTRS, uiDebug: true, sidebar: { link: LINK } });

    expectDecorated(document.querySelector<HTMLIFrameElement>(".mg-sidebar-iframe"));
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
