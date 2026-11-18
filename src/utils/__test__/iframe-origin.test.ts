import { isTrustedFrameOrigin } from "../iframe-height";

function frame(src: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.src = src;
  return iframe;
}

describe("isTrustedFrameOrigin", () => {
  it("trusts meetergo's own booking domains", () => {
    const iframe = frame("https://cal.meetergo.com/anna/intro");
    expect(isTrustedFrameOrigin("https://cal.meetergo.com", iframe)).toBe(true);
  });

  it("trusts a customer's own booking domain the embed itself framed", () => {
    // A booking page on termine.kanzlei.de reports its height from there.
    const iframe = frame("https://termine.kanzlei.de/anna/intro?embed=true");
    expect(isTrustedFrameOrigin("https://termine.kanzlei.de", iframe)).toBe(true);
  });

  it("does not trust another origin than the one framed", () => {
    const iframe = frame("https://termine.kanzlei.de/anna/intro");
    expect(isTrustedFrameOrigin("https://evil.example", iframe)).toBe(false);
  });

  it("does not trust a lookalike of the framed domain", () => {
    const iframe = frame("https://termine.kanzlei.de/anna/intro");
    expect(isTrustedFrameOrigin("https://termine.kanzlei.de.evil.example", iframe)).toBe(false);
  });

  it("falls back to meetergo's domains when there is no frame to compare", () => {
    expect(isTrustedFrameOrigin("https://cal.meetergo.com", null)).toBe(true);
    expect(isTrustedFrameOrigin("https://termine.kanzlei.de", null)).toBe(false);
  });
});
