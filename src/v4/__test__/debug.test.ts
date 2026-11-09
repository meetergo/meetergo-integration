import { MeetergoSDK } from "../core/sdk";

function sdk() {
  const instance = new MeetergoSDK();
  instance.boot();
  return instance.buildSDKCallable();
}

let debugSpy: jest.SpyInstance;

beforeEach(() => {
  document.body.innerHTML = "";
  debugSpy = jest.spyOn(console, "debug").mockImplementation(() => undefined);
});

afterEach(() => debugSpy.mockRestore());

describe("debug option", () => {
  it("logs every call for a namespace initialised with debug: true", () => {
    const callable = sdk();
    callable("init", { ns: "sales", debug: true });
    callable("setPrefill", { ns: "sales", email: "a@b.de" });

    expect(debugSpy).toHaveBeenCalledWith("[Meetergo:sales]", "init", { ns: "sales", debug: true });
    expect(debugSpy).toHaveBeenCalledWith("[Meetergo:sales]", "setPrefill", { ns: "sales", email: "a@b.de" });
  });

  it("stays silent without debug, and for other namespaces", () => {
    const callable = sdk();
    callable("init", { ns: "sales", debug: true });
    debugSpy.mockClear();

    callable("init", { ns: "support" });
    callable("setPrefill", { ns: "support", email: "a@b.de" });
    callable("setPrefill", { email: "a@b.de" });

    expect(debugSpy).not.toHaveBeenCalled();
  });
});

describe("debug option with the loader snippet", () => {
  it("logs calls queued before the script loaded", () => {
    const instance = new MeetergoSDK();
    instance.boot();
    instance.drainQueue([["init", { ns: "queued", debug: true }], ["setPrefill", { ns: "queued", email: "a@b.de" }]]);

    expect(debugSpy).toHaveBeenCalledWith("[Meetergo:queued]", "init", { ns: "queued", debug: true });
    expect(debugSpy).toHaveBeenCalledWith("[Meetergo:queued]", "setPrefill", { ns: "queued", email: "a@b.de" });
  });
});
