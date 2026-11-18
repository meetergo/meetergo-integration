/**
 * Contract, part 2: legacy entry points and network behaviour of the classic
 * design. Snapshots recorded on origin/main (afd21d2) before the design-2026
 * work; they must not change. Do not update them to make a test pass.
 */
import { MeetergoSDK } from "../core/sdk";

const LINK = "https://cal.meetergo.com/lena/erstberatung";

type Win = Window & { meetergo?: unknown; meetergoSettings?: unknown };

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});

let randomSpy: jest.SpyInstance;
const sdks: MeetergoSDK[] = [];
beforeEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
  delete (window as Win).meetergo;
  delete (window as Win).meetergoSettings;
  randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.123456789);
});
afterEach(() => {
  sdks.splice(0).forEach((s) => s.destroy());
  randomSpy.mockRestore();
});

function bootScanner() {
  const sdk = new MeetergoSDK();
  sdks.push(sdk);
  sdk.boot();
  sdk.startScanner();
  return sdk;
}

describe("classic contract: legacy entry points", () => {
  it("v3 .meetergo-modal-button with link attribute", () => {
    document.body.innerHTML = `<button class="meetergo-modal-button" link="${LINK}">Termin</button>`;
    bootScanner();
    (document.querySelector(".meetergo-modal-button") as HTMLButtonElement).click();
    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("v3 .meetergo-iframe with data-src and with link", () => {
    document.body.innerHTML = `
      <div class="meetergo-iframe" data-src="${LINK}"></div>
      <div class="meetergo-iframe" link="${LINK}?lang=en" data-align="center"></div>`;
    bootScanner();
    expect(document.body.innerHTML).toMatchSnapshot();
  });

  it("window.meetergoSettings (v3 settings object)", () => {
    (window as Win).meetergoSettings = {
      floatingButton: { link: LINK, text: "Termin buchen", position: "bottom-left" },
      sidebar: { link: LINK, buttonText: "Buchen" },
      prefill: { email: "a@b.de" },
    };
    bootScanner();
    expect(document.body.innerHTML).toMatchSnapshot();
    expect(Array.from(document.head.querySelectorAll("style")).map((s) => s.id)).toMatchSnapshot();
  });

  it("the script loaded twice keeps one SDK and one set of widgets", () => {
    document.body.innerHTML = `<button data-meetergo-link="${LINK}">A</button>`;
    const q: unknown[][] = [["init", { floatingButton: { link: LINK, text: "Termin" } }]];
    const stub = Object.assign(function () { /* queue stub */ }, { q });
    (window as Win).meetergo = stub;
    jest.isolateModules(() => { require("../browser"); });
    const first = (window as Win).meetergo;
    document.body.insertAdjacentHTML("beforeend", `<button data-meetergo-link="${LINK}">B</button>`);
    jest.isolateModules(() => { require("../browser"); });
    expect((window as Win).meetergo).toBe(first);
    expect(document.querySelectorAll(".mg-float-button").length).toBe(1);
    expect(document.querySelectorAll("[data-mg-bound]").length).toBe(2);
    expect(document.body.innerHTML).toMatchSnapshot();
    ((first as unknown) as { __sdk: MeetergoSDK }).__sdk.destroy();
  });
});

describe("classic contract: network", () => {
  it("a classic .m3u8 video loads hls.js from exactly the old URL", async () => {
    const sdk = new MeetergoSDK();
    sdks.push(sdk);
    sdk.boot();
    sdk.buildSDKCallable()("init", { videoEmbed: { videoSrc: "https://video.example.com/a.m3u8", bookingLink: LINK } });
    await Promise.resolve();
    const scripts = Array.from(document.head.querySelectorAll("script")).map((s) => s.getAttribute("src"));
    expect(scripts).toEqual(["https://cdn.jsdelivr.net/npm/hls.js@latest"]);
  });

  it("classic widgets request nothing else (no fetch, no extra scripts)", () => {
    const fetchMock = jest.fn();
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
    const sdk = new MeetergoSDK();
    sdks.push(sdk);
    sdk.boot();
    sdk.buildSDKCallable()("init", { floatingButton: { link: LINK }, sidebar: { link: LINK } });
    (document.getElementById("mg-default-float-btn") as HTMLButtonElement).click();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.head.querySelectorAll("script").length).toBe(0);
    delete (global as unknown as { fetch?: unknown }).fetch;
  });
});
