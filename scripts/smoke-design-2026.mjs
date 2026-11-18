#!/usr/bin/env node
/**
 * Playwright smoke test for the design-2026 widgets on test-design-2026.html.
 * Not part of `npm test` (CI has no browsers). Run after `npm run build-v4`:
 *
 *   node scripts/smoke-design-2026.mjs
 *   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core CHROMIUM=/path/to/chrome node scripts/smoke-design-2026.mjs
 *
 * Screenshots land in $SHOTS (default /tmp/mg-design-2026-shots).
 */
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, extname, resolve } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";

const require = createRequire(import.meta.url);
const ROOT = resolve(new URL("..", import.meta.url).pathname);
const SHOTS = process.env.SHOTS ?? "/tmp/mg-design-2026-shots";
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? "playwright-core");

function findChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const base = join(homedir(), ".cache/ms-playwright");
  if (!existsSync(base)) return undefined;
  const dirs = readdirSync(base).filter((d) => d.startsWith("chromium_headless_shell-")).sort().reverse();
  for (const d of dirs) {
    const p = join(base, d, "chrome-headless-shell-linux64/chrome-headless-shell");
    if (existsSync(p)) return p;
  }
  return undefined;
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".map": "application/json" };
const server = createServer(async (req, res) => {
  try {
    const path = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!path.startsWith(ROOT)) throw new Error("outside");
    const body = await readFile(path);
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/test-design-2026.html`;
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ executablePath: findChromium() });
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failures++; };

async function page(params, viewport = { width: 1280, height: 800 }, extra = {}) {
  const ctx = await browser.newContext({ viewport, locale: "de-DE", timezoneId: "Europe/Berlin", ...extra });
  const p = await ctx.newPage();
  const errors = [];
  const requests = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("request", (r) => requests.push(r.url()));
  // keep the smoke test offline: stub the real booking page and the video
  await p.route(/cal\.meetergo\.com/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<body style='font:16px system-ui;padding:24px'>Buchungsseite (Stub)</body>" }));
  await p.route(/\.mp4$/, (r) => r.fulfill({ status: 404, body: "" }));
  await p.goto(`${base}?${new URLSearchParams(params)}`);
  return { p, ctx, errors, requests };
}
const shadow = (p, hostSel, sel) => p.locator(`${hostSel} >> css=${sel}`);

try {
  // ── Floating 2026: pill with next slot → launcher → time → modal with slot param
  {
    const { p, ctx, errors } = await page({ design: "2026", widget: "floating" });
    const pill = shadow(p, "#mg-default-float-btn", ".pill");
    await pill.hover();
    await shadow(p, "#mg-default-float-btn", ".pill .s").filter({ hasText: /frei ab/ }).waitFor({ timeout: 5000 });
    check(true, "floating: pill shows the next free time");
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/floating-2026-closed.png` });
    await pill.click();
    const launch = shadow(p, "#mg-default-float-btn", ".launch");
    await launch.waitFor();
    await p.waitForTimeout(400);
    check(await shadow(p, "#mg-default-float-btn", ".chip").count() > 0, "floating: launcher lists times");
    await p.screenshot({ path: `${SHOTS}/floating-2026-open.png` });
    await p.keyboard.press("Escape");
    check(await launch.isHidden(), "floating: Escape closes the launcher");
    check(await p.evaluate(() => document.getElementById("mg-default-float-btn").shadowRoot.activeElement?.className.includes("pill")), "floating: focus returns to the pill");
    await pill.click();
    await shadow(p, "#mg-default-float-btn", ".chip").first().click();
    const frame = p.locator("#mg-default-modal-2026 >> css=iframe");
    await frame.waitFor();
    const src = await frame.getAttribute("src");
    check(/[?&]slot=20\d\d-/.test(src), `floating: time opens the modal with slot param (${src.slice(0, 90)}…)`);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/modal-2026-open.png` });
    await p.keyboard.press("Escape");
    await p.waitForTimeout(100);
    check(await p.evaluate(() => document.getElementById("mg-default-float-btn").shadowRoot.activeElement?.className.includes("pill")), "modal: focus returns to the pill after Escape");
    check(errors.length === 0, `floating: no page errors ${errors.join(" ")}`);
    await ctx.close();
  }
  // ── Floating 2026 with failing endpoint: renders without data
  {
    const { p, ctx, errors } = await page({ design: "2026", widget: "floating", card: "fail" });
    const pill = shadow(p, "#mg-default-float-btn", ".pill");
    await p.waitForTimeout(400); // entrance animation
    const before = await pill.boundingBox();
    await pill.hover();
    await p.waitForTimeout(800);
    const after = await pill.boundingBox();
    check(before.height === after.height, "fail: pill height unchanged after failed fetch");
    await pill.click();
    await p.locator("#mg-default-modal-2026 >> css=iframe").waitFor();
    check(true, "fail: pill opens the modal directly");
    check(errors.length === 0, "fail: no page errors");
    await ctx.close();
  }
  // ── Phone: launcher as full-width card, modal as bottom sheet
  {
    const { p, ctx } = await page({ design: "2026", widget: "floating" }, { width: 390, height: 780 }, { isMobile: true, hasTouch: true });
    const pill = shadow(p, "#mg-default-float-btn", ".pill");
    await pill.hover().catch(() => undefined);
    await shadow(p, "#mg-default-float-btn", ".pill .s").filter({ hasText: /frei ab/ }).waitFor({ timeout: 5000 });
    await p.screenshot({ path: `${SHOTS}/floating-2026-phone-closed.png` });
    await pill.click();
    await p.waitForTimeout(350);
    const box = await shadow(p, "#mg-default-float-btn", ".launch").boundingBox();
    check(box && Math.round(box.width) === 390 - 24, `phone: launcher spans the width (${box?.width})`);
    await p.screenshot({ path: `${SHOTS}/floating-2026-phone-open.png` });
    await shadow(p, "#mg-default-float-btn", ".all").click();
    await p.waitForTimeout(400);
    const m = await p.locator("#mg-default-modal-2026 >> css=.modal").boundingBox();
    check(m && Math.round(m.y + m.height) === 780 && Math.round(m.width) === 390, "phone: modal is a bottom sheet");
    await p.screenshot({ path: `${SHOTS}/modal-2026-phone.png` });
    await ctx.close();
  }
  // ── Sidebar 2026
  {
    const { p, ctx, errors } = await page({ design: "2026", widget: "sidebar" });
    const tab = shadow(p, "#mg-default-sidebar-2026-right", ".edge");
    await tab.waitFor();
    await p.waitForTimeout(400);
    const tb = await tab.boundingBox();
    check(Math.abs(tb.y + tb.height / 2 - 400) <= 2 && Math.round(tb.x + tb.width) === 1280, "sidebar: tab centred on the right edge");
    await tab.hover();
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${SHOTS}/sidebar-2026-closed.png` });
    await tab.click();
    await p.waitForTimeout(400);
    const sheet = await shadow(p, "#mg-default-sidebar-2026-right", ".sheet").boundingBox();
    check(sheet && Math.round(sheet.y) === 10 && Math.round(1280 - sheet.x - sheet.width) === 10, "sidebar: sheet floats 10px from the edges");
    await p.screenshot({ path: `${SHOTS}/sidebar-2026-open.png` });
    await p.keyboard.press("Escape");
    check(await p.evaluate(() => document.getElementById("mg-default-sidebar-2026-right").shadowRoot.activeElement?.className.includes("edge")), "sidebar: Escape closes and focus returns to the tab");
    check(errors.length === 0, "sidebar: no page errors");
    await ctx.close();
  }
  // ── Video 2026
  {
    const { p, ctx, errors } = await page({ design: "2026", widget: "video" });
    const vw = shadow(p, '[id^="mg-video-default-"]', ".vw");
    await vw.waitFor();
    await p.waitForTimeout(400); // entrance animation
    const b = await vw.boundingBox();
    check(Math.round(b.width) === 128 && Math.round(b.height) === 184, "video: bubble is 128x184");
    await vw.hover();
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${SHOTS}/video-2026-closed.png` });
    await shadow(p, '[id^="mg-video-default-"]', ".hit").click();
    await p.waitForTimeout(400);
    const c = await vw.boundingBox();
    check(Math.round(c.width) === 320, "video: expanded card is 320 wide");
    await p.screenshot({ path: `${SHOTS}/video-2026-open.png` });
    check(errors.length === 0, "video: no page errors");
    await ctx.close();
  }
  // ── Classic stays classic
  {
    const { p, ctx, requests } = await page({ design: "classic", widget: "all" });
    await p.waitForTimeout(300);
    check(!requests.some((u) => /design-2026\.[^/]*\.js|link-card/.test(u)), "classic: no design chunk or link-card request");
    check(await p.locator("#mg-default-float-btn.mg-float-button").count() === 1, "classic: floating button is today's element");
    check(await p.locator("[data-meetergo-design='2026'][id^='mg-']").count() === 0, "classic: no 2026 hosts");
    await p.screenshot({ path: `${SHOTS}/classic-all.png` });
    await ctx.close();
  }
  // ── Reduced motion and visitor dark mode: still light, no animation
  {
    const { p, ctx } = await page({ design: "2026", widget: "floating", dark: "on" }, undefined, { reducedMotion: "reduce", colorScheme: "dark" });
    const anim = await p.evaluate(() => getComputedStyle(document.getElementById("mg-default-float-btn").shadowRoot.querySelector(".pill")).animationName);
    check(anim === "none", `reduced motion: no entrance animation (${anim})`);
    const bg = await p.evaluate(() => { document.getElementById("mg-default-float-btn").shadowRoot.querySelector(".launch").hidden = false; return getComputedStyle(document.getElementById("mg-default-float-btn").shadowRoot.querySelector(".launch")).backgroundColor; });
    check(bg === "rgb(255, 255, 255)", "dark visitor: card stays light");
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(failures ? `\n${failures} failure(s)` : `\nall smoke checks passed; screenshots in ${SHOTS}`);
process.exit(failures ? 1 : 0);
