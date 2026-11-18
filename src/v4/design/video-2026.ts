/**
 * Design 2026 — video bubble + expanded card.
 *
 * Bubble: 128x184 portrait, 20 px radius, label chip "Name · 0:24" (duration
 * from the video metadata). Expanded: 320 px card with progress bar, mute
 * toggle, close, optional WebVTT captions (`captionsSrc`), the primary CTA
 * (`bookingCta`) and the next free time under it. Emits the same video events
 * as the classic widget (videoExpanded, videoMinimized, videoPlay, videoPause).
 */

import { loadHls } from "./hls.js";
import { rt, Listeners } from "./runtime.js";
import type { HlsInstance } from "../types/index.js";
import type { EventBus } from "../core/event-bus.js";
import type { VideoEmbedConfig } from "../types/index.js";
import { copyFor, detectLang, groupSlots, nextSlotLine, visitorTimeZone } from "./i18n.js";
import { fetchLinkCard, whenIdleOrEngaged } from "./link-card.js";
import { brandTokens, createShadowHost, dockStyle, el, ICONS, prefersReducedMotion, trapTab, watchClock } from "./ui.js";

const CSS = `
.vdock{position:fixed;pointer-events:auto}
.vw{position:relative;width:128px;height:184px;border-radius:20px;overflow:hidden;background:#101623;color:#fff;transition:width .28s cubic-bezier(.2,.8,.2,1),height .28s cubic-bezier(.2,.8,.2,1),border-radius .28s,transform .18s;display:flex;flex-direction:column}
.vw[data-state="bubble"]:hover{transform:translateY(-3px) scale(1.02)}
.vw[data-state="card"]{width:320px;height:auto;max-width:calc(100vw - 24px);border-radius:22px}
.media{position:relative;flex:1;min-height:0}
.vw[data-state="card"] .media{flex:none;height:380px;max-height:calc(100vh - 160px)}
video{width:100%;height:100%;object-fit:cover;display:block;background:#101623}
.hit{position:absolute;top:0;right:0;bottom:0;left:0;border:0;padding:0;background:transparent;cursor:pointer;border-radius:inherit}
.lab{position:absolute;left:8px;right:8px;bottom:8px;display:flex;align-items:center;padding:6px 8px;border-radius:10px;background:rgba(16,22,35,.72);color:#fff;font:500 12px/1.2 inherit;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);pointer-events:none;white-space:nowrap;overflow:hidden}
.lab i{margin-right:6px;width:18px;height:18px;border-radius:999px;background:var(--brand);color:var(--brand-fg);display:grid;place-items:center;flex:none}
.lab span{overflow:hidden;text-overflow:ellipsis}
.dismiss{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:999px;border:0;padding:0;background:rgba(16,22,35,.55);color:#fff;display:grid;place-items:center;cursor:pointer}
.dismiss svg{width:11px;height:11px}
.top{position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between}
.ic{width:32px;height:32px;border-radius:10px;background:rgba(16,22,35,.6);color:#fff;border:0;padding:0;display:grid;place-items:center;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.ic:focus-visible,.hit:focus-visible,.dismiss:focus-visible{outline:2px solid #fff;outline-offset:-2px}
.prog{position:absolute;left:12px;right:12px;top:48px;height:3px;border-radius:3px;background:rgba(255,255,255,.3);overflow:hidden;pointer-events:none}
.prog b{display:block;height:100%;width:0;background:#fff}
.cap{position:absolute;left:12px;right:12px;bottom:12px;padding:8px 10px;border-radius:10px;background:rgba(16,22,35,.72);font-size:14px;line-height:1.4;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);pointer-events:none}
.tap{position:absolute;top:56px;right:0;bottom:0;left:0;border:0;padding:0;background:transparent;cursor:pointer}
.act{padding:12px;display:grid;gap:8px;background:#101623}
.act .cta{width:100%}
.act .meta{color:#B6BCC8;text-align:center;min-height:16px}
.vw[data-state="bubble"] .card-only,.vw[data-state="card"] .bubble-only{display:none!important}
@media (max-width:560px){
  .vdock.card{left:12px!important;right:12px!important;bottom:12px!important;top:auto!important;transform:none!important}
  .vw[data-state="card"]{width:auto;max-width:none}
  .vw[data-state="card"] .media{height:320px}
}
`;

interface Cue { start: number; end: number; text: string; }

/** Minimal WebVTT parser: timings and plain text, tags stripped. */
export function parseVtt(src: string): Cue[] {
  const toSec = (t: string) => {
    const p = t.trim().split(":").map(parseFloat);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  };
  const cues: Cue[] = [];
  for (const block of src.replace(/\r/g, "").split(/\n\n+/)) {
    const lines = block.split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, b] = lines[i].split("-->");
    const text = lines.slice(i + 1).join("\n").replace(/<[^>]+>/g, "").trim();
    const start = toSec(a), end = toSec(b.trim().split(/\s+/)[0]);
    if (text && !isNaN(start) && !isNaN(end)) cues.push({ start, end, text });
  }
  return cues;
}

function duration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export class Video2026Manager {
  private host: HTMLElement | null = null;
  private listeners: Listeners | null = null;
  private hls: HlsInstance | null = null;
  private alive = false;

  constructor(
    private readonly ns: string,
    private readonly bus: EventBus,
    private readonly onOpen: (link: string) => void,
    private readonly locale?: string
  ) {}

  /** Rejects if the widget cannot be built; the namespace then renders the classic video. */
  async create(config: VideoEmbedConfig): Promise<void> {
    if (!config.videoSrc || !config.bookingLink) {
      rt.errorHandler.handleError({ message: "Video embed: missing videoSrc or bookingLink", level: "warning", ns: this.ns });
      return;
    }
    this.destroy();
    try {
      const lang = detectLang(this.locale);
      const copy = copyFor(lang);
      const tz = visitorTimeZone();
      const reduced = prefersReducedMotion();
      const videoId = `mg-video-${this.ns}-${Math.random().toString(36).slice(2, 8)}`;
      const { host, root } = createShadowHost(videoId, CSS, 999990, brandTokens(config.buttonColor, config.bookingCtaColor));
      const ls = new Listeners();
      this.host = host;
      this.listeners = ls;
      this.alive = true;
      const state = { expanded: false };
      let hostName = "";
      let dur = "";
      let cues: Cue[] = [];

      const vdock = el("div", "vdock");
      Object.assign(vdock.style, dockStyle(config.position ?? "bottom-right", config.offset ?? "20px"));
      const vw = el("div", "vw sh enter", { "data-state": "bubble" });
      vdock.appendChild(vw);
      const media = el("div", "media");
      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.autoplay = !reduced;
      video.preload = "metadata";
      if (config.posterImage) video.poster = config.posterImage;

      // Bubble controls
      const hit = el("button", "hit bubble-only", { type: "button", "aria-label": copy.playVideo, "aria-expanded": "false" });
      const lab = el("span", "lab bubble-only", { "aria-hidden": "true" });
      const labIcon = el("i");
      labIcon.innerHTML = ICONS.play;
      const labText = el("span");
      labText.textContent = config.videoCta ?? copy.playVideo;
      lab.append(labIcon, labText);
      const dismiss = el("button", "dismiss bubble-only", { type: "button", "aria-label": copy.hideVideo });
      dismiss.innerHTML = ICONS.x;

      // Card controls
      const tap = el("button", "tap card-only", { type: "button", "aria-label": copy.pause });
      const top = el("div", "top card-only");
      const mute = el("button", "ic", { type: "button", "aria-label": copy.mute, "aria-pressed": "false" });
      mute.innerHTML = ICONS.sound;
      const close = el("button", "ic", { type: "button", "aria-label": copy.close });
      close.innerHTML = ICONS.x;
      top.append(mute, close);
      const prog = el("div", "prog card-only", { "aria-hidden": "true" });
      const bar = el("b");
      prog.appendChild(bar);
      const cap = el("div", "cap card-only", { "aria-live": "off" });
      cap.hidden = true;
      media.append(video, hit, lab, dismiss, tap, top, prog, cap);

      const act = el("div", "act card-only");
      const cta = el("button", "cta", { type: "button" });
      cta.innerHTML = ICONS.cal;
      cta.appendChild(document.createTextNode(config.bookingCta ?? copy.book));
      const meta = el("div", "meta");
      act.append(cta, meta);
      vw.append(media, act);
      root.appendChild(vdock);

      const updateLabel = () => {
        const first = hostName.split(/\s+/)[0];
        const parts = [first, dur].filter(Boolean);
        labText.textContent = parts.length ? parts.join(" · ") : (config.videoCta ?? copy.playVideo);
        hit.setAttribute("aria-label", first ? `${copy.playVideo}: ${hostName}` : copy.playVideo);
      };
      ls.on(video, "loadedmetadata", () => {
        if (isFinite(video.duration) && video.duration > 0) { dur = duration(video.duration); updateLabel(); }
      });
      ls.on(video, "timeupdate", () => {
        if (video.duration) bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
        if (cues.length && state.expanded) {
          const t = video.currentTime;
          const cue = cues.find((c) => t >= c.start && t <= c.end);
          cap.textContent = cue ? cue.text : "";
          cap.hidden = !cue;
        }
      });

      if (config.captionsSrc && typeof fetch === "function") {
        fetch(config.captionsSrc, { credentials: "omit" })
          .then((r) => (r.ok ? r.text() : ""))
          .then((t) => { cues = parseVtt(t); })
          .catch(() => undefined);
      }

      const setMuted = (m: boolean) => {
        video.muted = m;
        mute.innerHTML = m ? ICONS.muted : ICONS.sound;
        mute.setAttribute("aria-label", m ? copy.unmute : copy.mute);
        mute.setAttribute("aria-pressed", String(m));
      };

      const expand = () => {
        if (state.expanded) return;
        state.expanded = true;
        vw.setAttribute("data-state", "card");
        vw.setAttribute("role", "dialog");
        vw.setAttribute("aria-label", hostName || copy.playVideo);
        hit.setAttribute("aria-expanded", "true");
        try { video.currentTime = 0; } catch { /* not seekable yet */ }
        setMuted(false);
        video.play().catch(() => { setMuted(true); video.play().catch(() => undefined); });
        close.focus({ preventScroll: true });
        this.bus.emit("videoExpanded", { videoId });
      };
      const minimize = () => {
        if (!state.expanded) return;
        state.expanded = false;
        vw.setAttribute("data-state", "bubble");
        vw.removeAttribute("role");
        vw.removeAttribute("aria-label");
        hit.setAttribute("aria-expanded", "false");
        cap.hidden = true;
        setMuted(true);
        if (reduced) video.pause();
        hit.focus({ preventScroll: true });
        this.bus.emit("videoMinimized", { videoId });
      };

      ls.on(hit, "click", expand);
      ls.on(close, "click", minimize);
      ls.on(dismiss, "click", () => this.destroy());
      ls.on(mute, "click", () => setMuted(!video.muted));
      ls.on(tap, "click", () => {
        if (video.paused) {
          video.play().catch(() => undefined);
          tap.setAttribute("aria-label", copy.pause);
          this.bus.emit("videoPlay", { videoId });
        } else {
          video.pause();
          tap.setAttribute("aria-label", copy.play);
          this.bus.emit("videoPause", { videoId });
        }
      });
      ls.on(cta, "click", () => this.onOpen(config.bookingLink));
      ls.on(vw, "keydown", ((e: KeyboardEvent) => { if (e.key === "Escape" && state.expanded) { e.stopPropagation(); minimize(); } }) as EventListener);
      trapTab(vw, root, ls);

      let card: { nextSlots: Array<{ start: string }> } | null = null;
      const refreshMeta = () => {
        if (config.subline) { meta.textContent = config.subline; return; }
        if (config.showNextSlot === false || !card) return;
        meta.textContent = nextSlotLine(groupSlots(card.nextSlots.map((x) => x.start), lang, tz), lang) ?? "";
      };
      ls.add(whenIdleOrEngaged(vw, () => {
        fetchLinkCard(config.bookingLink, tz, lang)
          .then((c) => {
            if (!this.alive || !c) return;
            if (config.avatar !== false && c.host) { hostName = c.host.name; updateLabel(); }
            card = c;
            refreshMeta();
          })
          .catch(() => undefined);
      }));
      ls.add(watchClock(refreshMeta));
      refreshMeta();

      // Keep the expanded card fixed to the phone's bottom edge
      const syncDock = () => vdock.classList.toggle("card", state.expanded);
      ls.on(hit, "click", syncDock);
      ls.on(close, "click", syncDock);
      ls.on(vw, "keydown", syncDock);

      document.body.appendChild(host);
    } catch (err) {
      this.destroy();
      throw err;
    }

    const video = this.host?.shadowRoot?.querySelector("video") as HTMLVideoElement | null;
    if (!video) return;
    if (config.videoSrc.endsWith(".m3u8")) await this.attachHls(video, config.videoSrc, config.posterImage);
    else video.src = config.videoSrc;
  }

  destroy(): void {
    this.alive = false;
    try { this.hls?.destroy(); } catch { /* already gone */ }
    this.hls = null;
    this.listeners?.clear();
    this.host?.parentNode?.removeChild(this.host);
    this.host = null;
    this.listeners = null;
  }

  private async attachHls(video: HTMLVideoElement, src: string, poster?: string): Promise<void> {
    if (video.canPlayType("application/vnd.apple.mpegurl")) { video.src = src; return; }
    await loadHls();
    // Destroyed (or re-created) while hls.js was loading: attach nothing
    if (!this.alive || !video.isConnected) return;
    if (window.Hls?.isSupported()) {
      const hls = new window.Hls();
      this.hls = hls as unknown as HlsInstance;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.ERROR, (_, data) => { if (data.fatal && poster) video.poster = poster; });
    } else {
      video.src = src;
    }
  }
}
