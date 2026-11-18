/**
 * The design-2026 code ships as a separate chunk. Classic pages never request
 * it; 2026 widgets wait for it and fall back to classic if it cannot load.
 */
import { MeetergoSDK } from "../core/sdk";
import { captureScriptBase, resetDesignLoader, DESIGN_CHUNK, CDN_BASE } from "../design/loader";
import { install } from "../design/entry";

const LINK = "https://cal.meetergo.com/lena/erstberatung";
type W = { __meetergoDesign2026?: unknown };

function sdkWith(config: Record<string, unknown>) {
  const sdk = new MeetergoSDK();
  sdk.boot();
  const callable = sdk.buildSDKCallable();
  callable("init", config);
  return callable;
}
const chunkScripts = () => Array.from(document.head.querySelectorAll<HTMLScriptElement>("script[data-meetergo-design-chunk]"));
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
/** The chunk starts after the page's load event, in an idle callback (setTimeout 0 in jsdom). */
const idle = async () => { await new Promise((r) => setTimeout(r, 0)); await flush(); };

beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
});
beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  delete (window as unknown as W).__meetergoDesign2026;
  resetDesignLoader();
});

describe("design chunk loading", () => {
  it("classic pages never request the chunk", () => {
    sdkWith({ floatingButton: { link: LINK }, sidebar: { link: LINK } });
    expect(chunkScripts()).toHaveLength(0);
  });

  it("loads the chunk from the SDK script's own directory, then renders 2026", async () => {
    const own = document.createElement("script");
    own.src = "https://cdn.meetergo.com/v4/integration.js";
    captureScriptBase(own);
    sdkWith({ design: "2026", floatingButton: { link: LINK } });
    expect(document.getElementById("mg-default-float-btn")).toBeNull(); // waits for the chunk
    await idle();
    const [s] = chunkScripts();
    expect(s.src).toBe(`https://cdn.meetergo.com/v4/${DESIGN_CHUNK}`);
    (window as unknown as W).__meetergoDesign2026 = install;
    s.onload?.(new Event("load"));
    await flush();
    expect(document.getElementById("mg-default-float-btn")?.shadowRoot).not.toBeNull();
  });

  it("falls back to the CDN directory, then to classic when the chunk cannot load", async () => {
    const own = document.createElement("script");
    own.src = "https://mirror.example.com/js/browser-v4.js";
    captureScriptBase(own);
    sdkWith({ design: "2026", floatingButton: { link: LINK, text: "Termin" } });
    await idle();
    let [s] = chunkScripts();
    expect(s.src).toBe(`https://mirror.example.com/js/${DESIGN_CHUNK}`);
    s.onerror?.(new Event("error"));
    await flush();
    [s] = chunkScripts();
    expect(s.src).toBe(CDN_BASE + DESIGN_CHUNK);
    s.onerror?.(new Event("error"));
    await flush();
    expect(document.getElementById("mg-default-float-btn")?.className).toBe("mg-float-button");
  });

  it("a 2026 modal waits for the chunk; if it fails, the classic modal opens", async () => {
    const callable = sdkWith({ prerender: false });
    callable("openModal", { link: LINK, ns: "default" });
    expect(chunkScripts()).toHaveLength(0);
    document.body.innerHTML = `<button id="b" data-meetergo-link="${LINK}" data-meetergo-design="2026">B</button>`;
    const sdk = new MeetergoSDK();
    sdk.boot();
    sdk.startScanner();
    (document.getElementById("b") as HTMLButtonElement).click();
    await flush();
    const [s] = chunkScripts();
    expect(s).toBeDefined();
    s.onerror?.(new Event("error"));
    await flush();
    const [s2] = chunkScripts();
    s2?.onerror?.(new Event("error"));
    await flush();
    expect(document.getElementById("mg-default-modal")?.style.visibility).toBe("visible");
    sdk.destroy();
  });

  it("never holds back the page's load event: starts after load, or at once on a user action", async () => {
    const state = Object.getOwnPropertyDescriptor(Document.prototype, "readyState")!;
    Object.defineProperty(document, "readyState", { configurable: true, get: () => "loading" });
    try {
      sdkWith({ design: "2026", floatingButton: { link: LINK } });
      await idle();
      expect(chunkScripts()).toHaveLength(0); // page still loading: nothing requested
      Object.defineProperty(document, "readyState", { configurable: true, get: () => "complete" });
      window.dispatchEvent(new Event("load"));
      await idle();
      expect(chunkScripts()).toHaveLength(1);
    } finally {
      Object.defineProperty(document, "readyState", state);
      delete (document as unknown as { readyState?: unknown }).readyState;
    }
  });

  it("a click on a 2026 booking button loads the chunk immediately, even before load", async () => {
    Object.defineProperty(document, "readyState", { configurable: true, get: () => "loading" });
    try {
      document.body.innerHTML = `<button id="b" data-meetergo-link="${LINK}" data-meetergo-design="2026">B</button>`;
      const sdk = new MeetergoSDK();
      sdk.boot();
      sdk.buildSDKCallable()("init", {});
      expect(chunkScripts()).toHaveLength(0);
      sdk.buildSDKCallable()("openModal", { link: LINK });
      await flush();
      // namespace modal design is classic: no chunk for a classic open
      expect(chunkScripts()).toHaveLength(0);
      (sdk as unknown as { getOrCreate(id: string): { openModal(l: string, p: Record<string, string>, d: string): void } }).getOrCreate("default").openModal(LINK, {}, "2026");
      await flush();
      expect(chunkScripts()).toHaveLength(1);
      sdk.destroy();
    } finally {
      delete (document as unknown as { readyState?: unknown }).readyState;
    }
  });
});
