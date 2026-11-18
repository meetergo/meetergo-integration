/**
 * Design 2026 — floating pill + launcher card.
 *
 * Pill: host avatar, label (config `text`), sub-line with the next free time.
 * Click: launcher card with host header, up to 3 days x 3 times and a footer
 * link to all times (the normal booking modal). Clicking a time opens the
 * booking modal with that slot preselected when the booking page supports it.
 * Without link-card data (loading, failed, disabled) the pill opens the modal.
 *
 * create() throws if the widget cannot be built; the namespace then renders
 * the classic button instead.
 */

import type { FloatingButtonConfig } from "../types/index.js";
import { copyFor, detectLang, fill, groupSlots, nextSlotLine, visitorTimeZone, Lang, SlotDay } from "./i18n.js";
import { fetchLinkCard, linkWithSlot, whenIdleOrEngaged, LinkCard } from "./link-card.js";
import { Listeners } from "./runtime.js";
import { Avatar, brandTokens, createShadowHost, dockStyle, el, HostHeader, trapTab, watchClock } from "./ui.js";

const CSS = `
.dock{position:fixed;pointer-events:auto}
.pill{display:flex;align-items:center;min-height:52px;padding:6px 16px 6px 6px;border-radius:999px;border:0;background:var(--brand);color:var(--brand-fg);cursor:pointer;text-align:left;transition:transform .16s,box-shadow .16s;max-width:min(360px,calc(100vw - 24px))}
.pill>*+*{margin-left:10px}
.pill.noav{padding-left:18px}
.pill:hover{transform:translateY(-2px)}
.pill .av{border:2px solid rgba(255,255,255,.9);background:rgba(255,255,255,.18);color:inherit}
.pill .txt{min-width:0}
.pill .t{display:block;font:500 15px/1.15 inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pill .s{display:block;font:500 12px/1.3 ui-monospace,"SFMono-Regular",Menlo,monospace;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.launch{width:340px;max-width:calc(100vw - 24px);background:#fff;border-radius:20px;border:1px solid #E3DED6;overflow:hidden;color:#101623}
.launch .hd{padding:16px 16px 12px}
.launch .bd{padding:4px 16px 16px;display:grid;gap:12px}
.launch .times{display:flex;gap:6px;flex-wrap:wrap}
.launch .ft{border-top:1px solid #EFEAE2;padding:10px 16px;display:flex;justify-content:space-between;align-items:center}
.launch .all{font:500 13px/1.3 inherit;color:var(--brand-text);background:none;border:0;padding:4px 0;cursor:pointer}
.launch .all:hover{text-decoration:underline}
@media (max-width:560px){
  .dock{left:12px!important;right:12px!important;bottom:12px!important;top:auto!important;transform:none!important;display:flex;justify-content:flex-end}
  .dock.c{justify-content:center}
  .launch{width:100%;max-width:none}
  .launch.enter{animation-name:mgUp}
}
`;

export class FloatingButton2026 {
  private host: HTMLElement | null = null;
  private listeners: Listeners | null = null;
  private alive = false;
  private card: LinkCard | null = null;
  private loaded = false;
  private days: SlotDay[] = [];
  private dayIndex = 0;

  constructor(private readonly ns: string, private readonly onOpen: (link: string) => void, private readonly locale?: string) {}

  create(config: FloatingButtonConfig): void {
    this.destroy();
    try {
      this.build(config);
    } catch (err) {
      this.destroy();
      throw err;
    }
  }

  private build(config: FloatingButtonConfig): void {
    const lang: Lang = detectLang(this.locale);
    const copy = copyFor(lang);
    const tz = visitorTimeZone();
    const label = config.text || copy.book;
    const showNext = config.showNextSlot !== false;
    const avatarOpt = config.avatar ?? "host";
    const position = config.position ?? "bottom-right";

    const { host, root } = createShadowHost(config.domId ?? `mg-${this.ns}-float-btn`, CSS, 999990, brandTokens(config.backgroundColor, config.textColor));
    const ls = new Listeners();
    this.host = host;
    this.listeners = ls;
    this.alive = true;

    const dock = el("div", "dock");
    Object.assign(dock.style, dockStyle(position, "20px"));
    if (position.endsWith("center")) dock.classList.add("c");

    // ── Pill
    const pill = el("button", "pill sh enter", { type: "button" });
    const avatar = new Avatar(40, avatarOpt);
    if (avatarOpt === false) pill.classList.add("noav");
    else pill.appendChild(avatar.node);
    const txt = el("span", "txt");
    const t = el("span", "t");
    t.textContent = label;
    const s = el("span", "s");
    s.textContent = config.subline ?? "";
    s.hidden = !config.subline;
    txt.append(t, s);
    pill.appendChild(txt);
    pill.setAttribute("aria-label", label);
    pill.setAttribute("aria-haspopup", "dialog");
    pill.setAttribute("aria-expanded", "false");

    // ── Launcher card
    const launch = el("div", "launch sh enter", { role: "dialog", "aria-modal": "false" });
    launch.hidden = true;
    const titleId = `mg-${this.ns}-launch-title`;
    launch.setAttribute("aria-labelledby", titleId);
    const header = new HostHeader(44, avatarOpt, label, copy, titleId);
    header.close.style.marginLeft = "auto";
    const bd = el("div", "bd");
    const nextLbl = el("div", "meta");
    nextLbl.textContent = copy.nextTimes;
    const daysRow = el("div", "days", { role: "group", "aria-label": copy.nextTimes });
    const times = el("div", "times");
    bd.append(nextLbl, daysRow, times);
    const ft = el("div", "ft");
    const powered = el("span", "powered");
    powered.textContent = "meetergo";
    const all = el("button", "all", { type: "button" });
    all.textContent = copy.allTimes;
    ft.append(powered, all);
    launch.append(header.node, bd, ft);

    dock.append(pill, launch);
    root.appendChild(dock);

    // Day/time buttons are rebuilt on every refresh; their listeners live here
    let slotListeners = new Listeners();

    const renderTimes = () => {
      times.innerHTML = "";
      const day = this.days[this.dayIndex];
      if (!day) return;
      for (const slot of day.times) {
        const chip = el("button", "chip", { type: "button", "aria-label": fill(copy.slot, { d: day.long, t: slot.label }) });
        chip.textContent = slot.label;
        slotListeners.on(chip, "click", () => {
          const slotParam = this.card?.slotParam;
          closeLauncher();
          this.onOpen(slotParam ? linkWithSlot(config.link, slotParam, slot.iso) : config.link);
        });
        times.appendChild(chip);
      }
    };
    const renderDays = () => {
      slotListeners.clear();
      slotListeners = new Listeners();
      daysRow.innerHTML = "";
      this.days.forEach((d, i) => {
        const b = el("button", "day", { type: "button", "aria-pressed": String(i === this.dayIndex) });
        const bl = el("b");
        bl.textContent = d.label;
        const sp = el("span");
        sp.textContent = d.sub;
        b.append(bl, sp);
        slotListeners.on(b, "click", () => {
          this.dayIndex = i;
          daysRow.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-pressed", String(j === i)));
          renderTimes();
        });
        daysRow.appendChild(b);
      });
      renderTimes();
    };
    ls.add(() => slotListeners.clear());

    /** Regroup from the cached card: drops past times, keeps "Heute" correct. */
    const refresh = () => {
      const prevKey = this.days[this.dayIndex]?.key;
      this.days = showNext && this.card ? groupSlots(this.card.nextSlots.map((x) => x.start), lang, tz) : [];
      const keep = this.days.findIndex((d) => d.key === prevKey);
      this.dayIndex = keep >= 0 ? keep : 0;
      if (!config.subline && showNext) {
        const line = nextSlotLine(this.days, lang);
        s.textContent = line ?? "";
        s.hidden = !line;
        pill.setAttribute("aria-label", line ? `${label}, ${line}` : label);
      }
      renderDays();
      // Nothing left to pick (all times passed while open): fall back to the pill
      if (!this.days.length && !launch.hidden) closeLauncher(false);
    };

    const apply = (card: LinkCard | null) => {
      if (!this.alive) return;
      this.card = card;
      this.loaded = true;
      avatar.update(card);
      header.update(card);
      refresh();
    };

    const load = () => {
      if (!showNext && avatarOpt !== "host") { apply(null); return; }
      fetchLinkCard(config.link, tz, lang)
        .then(apply)
        .catch(() => { try { apply(null); } catch { /* render stays as is */ } });
    };
    ls.add(whenIdleOrEngaged(pill, load));
    ls.add(watchClock(() => { if (this.loaded) refresh(); }));

    const openLauncher = () => {
      pill.hidden = true;
      pill.setAttribute("aria-expanded", "true");
      launch.hidden = false;
      const first = (daysRow.querySelector('[aria-pressed="true"]') as HTMLElement | null) ?? header.close;
      first.focus({ preventScroll: true });
    };
    const closeLauncher = (returnFocus = true) => {
      if (launch.hidden) return;
      launch.hidden = true;
      pill.hidden = false;
      pill.setAttribute("aria-expanded", "false");
      if (returnFocus) pill.focus({ preventScroll: true });
    };

    ls.on(pill, "click", () => {
      if (this.loaded) refresh();
      if (this.loaded && this.days.length) openLauncher();
      else this.onOpen(config.link);
    });
    ls.on(header.close, "click", () => closeLauncher());
    ls.on(all, "click", () => { closeLauncher(); this.onOpen(config.link); });
    ls.on(launch, "keydown", ((e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); closeLauncher(); } }) as EventListener);
    trapTab(launch, root, ls);
    // Click outside closes the launcher
    ls.on(document, "pointerdown", ((e: Event) => {
      if (!launch.hidden && !e.composedPath().includes(launch)) closeLauncher(false);
    }) as EventListener);

    document.body.appendChild(host);
  }

  destroy(): void {
    this.alive = false;
    this.listeners?.clear();
    this.host?.parentNode?.removeChild(this.host);
    this.host = null;
    this.listeners = null;
    this.card = null;
    this.loaded = false;
    this.days = [];
  }
}
