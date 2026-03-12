/**
 * Meetergo v4 — Video Embed Manager
 *
 * Ported from v3 with upgrades:
 *   - Namespace-aware (no singleton dependency)
 *   - EventBus integration for video events
 *   - Per-videoId config Map (fixes v3 getVideoConfig TODO)
 *   - onOpen callback replaces direct modalManager dependency
 *   - AbortController for event listener cleanup
 */

import { errorHandler } from "../utils/error-handler.js";
import type { EventBus } from "../core/event-bus.js";
import type { VideoEmbedConfig, Position } from "../types/index.js";

interface VideoState {
  isExpanded: boolean;
  isPlaying: boolean;
  isMuted: boolean;
}

interface VideoEntry {
  container: HTMLElement;
  config: VideoEmbedConfig;
  state: VideoState;
  abort: AbortController;
  timeouts: ReturnType<typeof setTimeout>[];
}

export class VideoEmbedManager {
  private readonly ns: string;
  private readonly bus: EventBus;
  private readonly onOpen: (link: string) => void;
  private entries: Map<string, VideoEntry> = new Map();
  private hlsLoaded = false;

  constructor(ns: string, bus: EventBus, onOpen: (link: string) => void) {
    this.ns = ns;
    this.bus = bus;
    this.onOpen = onOpen;
  }

  async create(config: VideoEmbedConfig): Promise<void> {
    try {
      if (!config.videoSrc || !config.bookingLink) {
        errorHandler.handleError({ message: "Video embed: missing videoSrc or bookingLink", level: "warning", ns: this.ns });
        return;
      }

      if (config.videoSrc.endsWith(".m3u8")) {
        await this.loadHls();
      }

      const videoId = `mg-video-${this.ns}-${Math.random().toString(36).slice(2, 8)}`;
      const abort = new AbortController();
      const state: VideoState = { isExpanded: false, isPlaying: false, isMuted: true };

      const container = this.buildContainer(videoId, config);
      const { video, elements } = this.buildVideoElements(config);

      this.assembleContainer(container, video, elements, config);
      this.wireEvents(videoId, container, video, elements, config, state, abort);

      document.body.appendChild(container);
      this.entries.set(videoId, { container, config, state, abort, timeouts: [] });

      await this.initVideoSource(video, config.videoSrc, config.posterImage, elements.loader);

    } catch (err) {
      errorHandler.handleError({ message: "Failed to create video embed", level: "error", ns: this.ns, error: err as Error });
    }
  }

  remove(videoId: string): void {
    const entry = this.entries.get(videoId);
    if (!entry) return;
    entry.abort.abort();
    entry.timeouts.forEach(clearTimeout);
    entry.container.parentNode?.removeChild(entry.container);
    this.entries.delete(videoId);
  }

  destroy(): void {
    for (const id of [...this.entries.keys()]) this.remove(id);
  }

  getActiveIds(): string[] {
    return [...this.entries.keys()];
  }

  // ── Build elements ────────────────────────────────────────────────────────

  private buildContainer(id: string, cfg: VideoEmbedConfig): HTMLElement {
    const el = document.createElement("div");
    el.id = id;
    const pos = cfg.position ?? "bottom-right";
    const color = cfg.buttonColor ?? "#0a64bc";
    const size = cfg.size ?? { width: "200px", height: "158px" };
    const offset = cfg.offset ?? "16px";
    const isRound = cfg.isRound ?? false;

    Object.assign(el.style, {
      position: "fixed",
      zIndex: "1000",
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      cursor: "pointer",
      transition: "transform 0.3s ease, box-shadow 0.3s ease, width 0.3s ease, height 0.3s ease",
      border: `2px solid ${color}`,
    });

    if (isRound) {
      const d = Math.min(parseInt(size.width ?? "200"), parseInt(size.height ?? "158")) + "px";
      Object.assign(el.style, { width: d, height: d, borderRadius: "50%" });
    } else {
      Object.assign(el.style, { width: size.width ?? "200px", height: size.height ?? "158px", borderRadius: "8px" });
    }

    this.applyPositionStyles(el, pos, offset);
    return el;
  }

  private buildVideoElements(cfg: VideoEmbedConfig) {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = "metadata";
    if (cfg.posterImage) video.poster = cfg.posterImage;
    Object.assign(video.style, { width: "100%", height: "100%", objectFit: "cover" });

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      pointerEvents: "none",
    });

    const cta = document.createElement("div");
    Object.assign(cta.style, {
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%,-50%)",
      color: "white", fontSize: "14px", textShadow: "0 2px 4px rgba(0,0,0,0.8)",
      fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap",
      padding: "8px", maxWidth: "100%", overflow: "hidden",
      backgroundColor: "rgba(0,0,0,0.4)", borderRadius: "4px",
    });
    cta.textContent = cfg.videoCta ?? "Click to watch";

    const loader = document.createElement("div");
    Object.assign(loader.style, {
      position: "absolute", top: "50%", left: "50%",
      width: "30px", height: "30px",
      border: "3px solid rgba(255,255,255,0.3)", borderRadius: "50%",
      borderTop: "3px solid #fff",
      animation: "mg-video-spin 1s linear infinite",
    });

    const closeBtn = document.createElement("div");
    Object.assign(closeBtn.style, {
      position: "absolute", top: "10px", right: "10px",
      backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "50%",
      width: "20px", height: "20px",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", pointerEvents: "auto", zIndex: "10",
    });
    closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    const ctaBtn = document.createElement("button");
    const btnColor = cfg.buttonColor ?? "#0a64bc";
    Object.assign(ctaBtn.style, {
      position: "absolute", bottom: "10px", left: "50%",
      width: "90%", transform: "translateX(-50%)",
      padding: "10px 20px",
      backgroundColor: btnColor,
      color: cfg.bookingCtaColor ?? "white",
      border: "none", borderRadius: "4px",
      fontWeight: "bold", cursor: "pointer",
      display: "none", zIndex: "10",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)", fontSize: "14px",
    });
    ctaBtn.textContent = cfg.bookingCta ?? "Book Appointment";

    const playBtn = document.createElement("button");
    Object.assign(playBtn.style, {
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%,-50%)",
      width: "60px", height: "60px",
      backgroundColor: "rgba(0,0,0,0.5)", color: "white",
      border: "none", borderRadius: "50%",
      display: "none", alignItems: "center", justifyContent: "center",
      cursor: "pointer", zIndex: "10", padding: "0", opacity: "0",
    });
    playBtn.setAttribute("aria-label", "Pause video");
    playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

    const muteBtn = document.createElement("button");
    Object.assign(muteBtn.style, {
      position: "absolute", top: "10px", left: "10px",
      width: "30px", height: "30px",
      backgroundColor: "rgba(0,0,0,0.5)", color: "white",
      border: "none", borderRadius: "50%",
      display: "none", alignItems: "center", justifyContent: "center",
      cursor: "pointer", zIndex: "10", padding: "0",
    });
    muteBtn.setAttribute("aria-label", "Mute video");
    muteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

    const progressWrap = document.createElement("div");
    Object.assign(progressWrap.style, {
      position: "absolute", top: "0", left: "0", width: "100%",
      height: "5px", backgroundColor: "rgba(0,0,0,0.3)",
      display: "none", zIndex: "10", overflow: "hidden",
    });
    const progressBar = document.createElement("div");
    Object.assign(progressBar.style, {
      width: "0%", height: "100%",
      backgroundColor: cfg.buttonColor ?? "#0a64bc",
      transition: "width 0.05s linear", borderRadius: "0 3px 3px 0",
    });
    progressWrap.appendChild(progressBar);

    return {
      video,
      elements: { overlay, cta, loader, closeBtn, ctaBtn, playBtn, muteBtn, progressWrap, progressBar },
    };
  }

  private assembleContainer(container: HTMLElement, video: HTMLVideoElement, els: ReturnType<VideoEmbedManager["buildVideoElements"]>["elements"], _cfg: VideoEmbedConfig): void {
    const { overlay, cta, loader, closeBtn, ctaBtn, playBtn, muteBtn, progressWrap } = els;
    overlay.appendChild(closeBtn);
    overlay.appendChild(cta);
    container.append(video, loader, overlay, ctaBtn, playBtn, muteBtn, progressWrap);
  }

  private wireEvents(
    videoId: string,
    container: HTMLElement,
    video: HTMLVideoElement,
    els: ReturnType<VideoEmbedManager["buildVideoElements"]>["elements"],
    cfg: VideoEmbedConfig,
    state: VideoState,
    abort: AbortController
  ): void {
    const { loader, closeBtn, ctaBtn, playBtn, muteBtn, progressWrap, progressBar, cta, overlay } = els;
    const sig = abort.signal;

    // Container click → expand
    container.addEventListener("click", () => {
      if (!state.isExpanded) {
        this.expand(videoId, container, video, els, cfg, state);
      }
    }, { signal: sig });

    // Close button
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.minimize(videoId, container, video, els, cfg, state);
    }, { signal: sig });

    // CTA booking button
    ctaBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onOpen(cfg.bookingLink);
    }, { signal: sig });

    // Pause/play toggle
    playBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (video.paused) {
        video.play();
        state.isPlaying = true;
        this.bus.emit("videoPlay", { videoId });
      } else {
        video.pause();
        state.isPlaying = false;
        this.bus.emit("videoPause", { videoId });
      }
    }, { signal: sig });

    // Mute toggle
    muteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.isMuted = !state.isMuted;
      video.muted = state.isMuted;
      muteBtn.setAttribute("aria-label", state.isMuted ? "Unmute video" : "Mute video");
    }, { signal: sig });

    // Progress bar
    video.addEventListener("timeupdate", () => {
      if (video.duration) {
        progressBar.style.width = `${(video.currentTime / video.duration) * 100}%`;
      }
    }, { signal: sig });
  }

  private expand(
    videoId: string,
    container: HTMLElement,
    video: HTMLVideoElement,
    els: ReturnType<VideoEmbedManager["buildVideoElements"]>["elements"],
    cfg: VideoEmbedConfig,
    state: VideoState
  ): void {
    state.isExpanded = true;
    const { ctaBtn, playBtn, muteBtn, progressWrap, cta, loader } = els;

    Object.assign(container.style, { width: "340px", height: "280px", borderRadius: "8px", zIndex: "1001" });
    container.style.borderRadius = "8px";

    cta.style.display = "none";
    loader.style.display = "none";
    ctaBtn.style.display = "block";
    playBtn.style.display = "flex";
    muteBtn.style.display = "flex";
    progressWrap.style.display = "block";

    setTimeout(() => { playBtn.style.opacity = "1"; }, 100);

    video.muted = false;
    state.isMuted = false;
    video.play().then(() => { state.isPlaying = true; }).catch(() => { video.muted = true; video.play(); });

    this.bus.emit("videoExpanded", { videoId });
  }

  private minimize(
    videoId: string,
    container: HTMLElement,
    video: HTMLVideoElement,
    els: ReturnType<VideoEmbedManager["buildVideoElements"]>["elements"],
    cfg: VideoEmbedConfig,
    state: VideoState
  ): void {
    state.isExpanded = false;
    const size = cfg.size ?? { width: "200px", height: "158px" };
    const isRound = cfg.isRound ?? false;

    const { ctaBtn, playBtn, muteBtn, progressWrap, cta } = els;

    Object.assign(container.style, {
      width: isRound ? Math.min(parseInt(size.width ?? "200"), parseInt(size.height ?? "158")) + "px" : size.width ?? "200px",
      height: isRound ? Math.min(parseInt(size.width ?? "200"), parseInt(size.height ?? "158")) + "px" : size.height ?? "158px",
      borderRadius: isRound ? "50%" : "8px",
      zIndex: "1000",
    });

    ctaBtn.style.display = "none";
    playBtn.style.display = "none";
    muteBtn.style.display = "none";
    progressWrap.style.display = "none";
    cta.style.display = "block";

    video.muted = true;
    state.isMuted = true;

    this.bus.emit("videoMinimized", { videoId });
  }

  private applyPositionStyles(el: HTMLElement, pos: Position, offset: string): void {
    if (pos.includes("top"))    el.style.top    = offset;
    if (pos.includes("bottom")) el.style.bottom = offset;
    if (pos.includes("left"))   el.style.left   = offset;
    if (pos.includes("right"))  el.style.right  = offset;
    if (pos.includes("middle")) { el.style.top = "50%"; el.style.transform = "translateY(-50%)"; }
    if (pos.includes("center") && (pos.startsWith("top") || pos.startsWith("bottom"))) {
      el.style.left = "50%"; el.style.transform = "translateX(-50%)";
    }
    if (pos === "middle-center") { el.style.top = "50%"; el.style.left = "50%"; el.style.transform = "translate(-50%,-50%)"; }
  }

  private async initVideoSource(
    video: HTMLVideoElement,
    src: string,
    poster: string | undefined,
    loader: HTMLElement
  ): Promise<void> {
    loader.style.display = "block";

    const timeout = setTimeout(() => { loader.style.display = "none"; }, 5000);

    if (src.endsWith(".m3u8") && window.Hls?.isSupported()) {
      const hls = new window.Hls!();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(window.Hls!.Events.MANIFEST_PARSED, () => {
        clearTimeout(timeout);
        loader.style.display = "none";
        video.play().catch(() => {});
      });
      hls.on(window.Hls!.Events.ERROR, (_, data) => {
        if ((data as { fatal?: boolean }).fatal) {
          clearTimeout(timeout);
          loader.style.display = "none";
          if (poster) video.poster = poster;
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        clearTimeout(timeout);
        loader.style.display = "none";
        video.play().catch(() => {});
      }, { once: true });
    } else {
      video.src = src;
      clearTimeout(timeout);
      loader.style.display = "none";
    }
  }

  private async loadHls(): Promise<void> {
    if (this.hlsLoaded || window.Hls) { this.hlsLoaded = true; return; }
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      script.onload = () => { this.hlsLoaded = true; resolve(); };
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }
}
