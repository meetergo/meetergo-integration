/**
 * Legacy S3 loader.
 *
 * Customer sites still load the embed from the old AWS S3 addresses
 * (liv-showcase…/browser.js, browser-v2.js, browser-v3.js, browser-v4.js).
 * Those addresses cannot be redirected, so this file is what they serve: it
 * loads the current v4 script from the CDN, so every v4 release reaches them.
 *
 * v4 already reads the old snippets (meetergoSettings, .meetergo-iframe,
 * .meetergo-modal-button with link). What it does not cover lives here and
 * only here, so v4 itself carries no pre-v4 behaviour:
 *   - the pre-v4 window.meetergo methods (launchScheduler, openModalWithContent…),
 *     callable from the moment this file runs, as they were
 *   - markup the old script read: href instead of link, .meetergo-styled-button,
 *     links set or changed after load
 *   - clicks that happen before v4 has arrived or binds a button, or when it cannot load
 *   - the old script's rule that a bare init() does nothing
 */

export const CDN_SCRIPT = "https://cdn.meetergo.com/v4/integration.js";
/**
 * A copy of v4 uploaded next to this file, for sites whose Content-Security-Policy
 * allows the S3 host but not the CDN. It is as current as its last upload.
 */
export const FALLBACK_SCRIPT = "https://liv-showcase.s3.eu-central-1.amazonaws.com/meetergo-v4.js";
const LOADED_FLAG = "__meetergoLegacyLoader";

type Params = Record<string, string>;
type OpenModal = (link: string, params?: Params) => void;
type Callable = ((...args: unknown[]) => void) & Record<string, unknown> & { q?: unknown[][] };
type Settings = { floatingButton?: { link?: string } };
type LegacyWindow = {
  meetergo?: Callable;
  meetergoSettings?: Settings;
  [LOADED_FLAG]?: Record<string, never>;
};

const STYLED_BUTTON: Partial<CSSStyleDeclaration> = {
  margin: "0.5rem",
  padding: "0.8rem",
  fontWeight: "bold",
  color: "white",
  backgroundColor: "#0A64BC",
  borderRadius: "0.5rem",
  border: "none",
  cursor: "pointer",
  zIndex: "999",
  transition: "background-color 0.3s ease",
  outline: "none",
  boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
};

// The global Window type still describes the pre-v4 script; this file sees it as v4 plus the legacy surface.
const legacyWindow = () => window as unknown as LegacyWindow;

const isUrl = (value: string | null): value is string => !!value && /^https?:\/\//i.test(value.trim());

const BUTTONS = ".meetergo-modal-button, .meetergo-styled-button";
const EARLY_CLICK_TARGETS = `${BUTTONS}, [data-meetergo-link]`;

/** The link the old script would open for this element: `link`, else a URL in `href`. */
function legacyLink(el: Element): string | null {
  const link = el.getAttribute("link");
  if (link && link.trim()) return link;
  const href = el.getAttribute("href");
  return isUrl(href) ? href : null;
}

/** Rewrites pre-v4 markup into the attributes v4 binds. Idempotent. */
export function upgradeMarkup(root: ParentNode | null = document): void {
  if (!root) return;
  root.querySelectorAll<HTMLElement>(`${BUTTONS}, .meetergo-iframe`).forEach(upgradeElement);
}

function upgradeElement(el: HTMLElement): void {
  if (el.classList.contains("meetergo-iframe")) {
    // v4 reads link / data-src / data-link; the old script also took href.
    if (!el.getAttribute("link") && !el.getAttribute("data-src") && !el.getAttribute("data-link")) {
      const href = el.getAttribute("href");
      if (isUrl(href)) el.setAttribute("link", href);
    }
    return;
  }
  const link = legacyLink(el);
  if (!link) return;
  if (el.getAttribute("link") !== link) el.setAttribute("link", link);
  if (el.classList.contains("meetergo-styled-button") && !el.hasAttribute("data-meetergo-link")) {
    Object.assign(el.style, STYLED_BUTTON);
    if (!el.getAttribute("role")) el.setAttribute("role", "button");
  }
  // v4 opens data-meetergo-link; keep it equal to the link the old script would read at click time.
  if (el.getAttribute("data-meetergo-link") !== link) el.setAttribute("data-meetergo-link", link);
}

/** The pre-v4 window.meetergo methods v4 does not have, forwarded to v4's public API. */
export function addLegacyMethods(target: Callable, open: OpenModal, win: LegacyWindow = legacyWindow()): void {
  const call = (...args: unknown[]) => win.meetergo?.(...args);
  const bound = new WeakMap<HTMLElement, EventListener>();
  const legacy: Record<string, unknown> = {
    launchScheduler: (link?: string, params?: Params) => {
      const resolved = link || win.meetergoSettings?.floatingButton?.link;
      if (resolved) open(resolved, params);
    },
    openModalWithContent: (settings?: { link?: string; existingParams?: Params }) => {
      if (settings?.link) open(settings.link, settings.existingParams);
    },
    bindElementToScheduler: (el: HTMLElement, link?: string, options?: { params?: Params }) => {
      try {
        const handler: EventListener = (e) => {
          e.preventDefault();
          const resolved = link || el.getAttribute("link");
          if (resolved) open(resolved, options?.params);
        };
        el.addEventListener("click", handler);
        bound.set(el, handler);
        if (getComputedStyle(el).cursor !== "pointer") el.style.cursor = "pointer";
        if (!el.getAttribute("role")) el.setAttribute("role", "button");
      } catch {
        // The old script swallowed a missing element; a throw here would stop the customer's script.
      }
      return el;
    },
    unbindElementFromScheduler: (el: HTMLElement) => {
      const handler = el && bound.get(el);
      if (!handler) return false;
      el.removeEventListener("click", handler);
      bound.delete(el);
      return true;
    },
    parseButtons: () => rescan(win),
    parseIframes: () => rescan(win),
    isReady: () => !!win.meetergo?.__sdk,
    getStatus: () => ({
      initialized: !!win.meetergo?.__sdk,
      boundElements: document.querySelectorAll("[data-mg-bound]").length,
      activeTimeouts: 0,
      activeIntervals: 0,
      cacheStats: { idCacheSize: 0, selectorCacheSize: 0 },
    }),
    getParamsFromMainIframe: () => {
      const src = document.querySelector<HTMLIFrameElement>(".meetergo-iframe iframe")?.src;
      return src ? Object.fromEntries(new URL(src).searchParams) : {};
    },
    // Present on v4 itself; on the queue stub they queue for v4, so calls made before it arrives work.
    openModal: (opts?: unknown) => {
      if (opts) call("openModal", typeof opts === "string" ? { link: opts } : opts);
    },
    closeModal: () => call("closeModal"),
    setPrefill: (prefill?: unknown) => call("setPrefill", prefill),
    destroy: () => call("destroy"),
    // The old script initialised itself; a bare init() did nothing.
    init: (config?: unknown) => {
      if (config) call("init", config);
    },
  };
  for (const [name, fn] of Object.entries(legacy)) {
    if (!(name in target)) target[name] = fn;
  }
}

/** On the running v4 SDK: a bare init() would reset the widgets, the old script ignored it. */
function keepBareInitHarmless(mg: Callable): void {
  const init = mg.init as ((config?: unknown) => void) | undefined;
  if (typeof init !== "function" || (init as { __legacy?: boolean }).__legacy) return;
  const guarded = (config?: unknown) => (config === undefined ? undefined : init(config));
  (guarded as { __legacy?: boolean }).__legacy = true;
  mg.init = guarded;
}

function rescan(win: LegacyWindow): void {
  upgradeMarkup();
  (win.meetergo?.__sdk as { scanner?: { scan?: () => void } } | undefined)?.scanner?.scan?.();
}

/** Queue v4 drains on load, so calls made before it arrives are not lost. */
function queueStub(): Callable {
  const stub = function (...args: unknown[]) {
    (stub.q = stub.q || []).push(args);
  } as Callable;
  stub.q = [];
  return stub;
}

export function load(win: LegacyWindow = legacyWindow()): void {
  if (win[LOADED_FLAG]) return;
  const instance: Record<string, never> = {};
  win[LOADED_FLAG] = instance;

  const current = document.currentScript as HTMLScriptElement | null;
  const queued: OpenModal = (link, params) => win.meetergo?.("openModal", { link, params });
  let cdnFailed = false;

  // Old-script pages have no window.meetergo yet; v4-snippet pages already have v4's queue stub.
  if (!win.meetergo) win.meetergo = queueStub();
  addLegacyMethods(win.meetergo, queued, win);

  // The old script read a button's link when it was clicked. Before v4's own handler runs:
  // refresh the link it will read, and open buttons v4 has not bound (yet), e.g. a click
  // before v4 arrived (sites that lazy-load this file on the first click and re-click) or a
  // link set just before a programmatic click. Bound buttons are left to v4. If v4 cannot
  // load at all, step aside so links still lead to the booking page.
  document.addEventListener("click", (e) => {
    if (cdnFailed || win[LOADED_FLAG] !== instance) return;
    const el = (e.target as Element | null)?.closest?.<HTMLElement>(EARLY_CLICK_TARGETS);
    if (!el) return;
    upgradeElement(el);
    if (el.hasAttribute("data-mg-bound")) return;
    const link = el.getAttribute("data-meetergo-link") || el.getAttribute("link");
    if (!link) return;
    e.preventDefault();
    queued(link);
  }, true);

  const start = () => {
    upgradeMarkup();
    if (typeof MutationObserver !== "undefined") {
      // Registered before v4's observer, so added markup is upgraded before v4 scans it.
      // Links set or changed later get a rescan, since v4 does not watch attributes.
      new MutationObserver((records) => {
        let relinked = false;
        for (const r of records) {
          if (r.type === "attributes") {
            const el = r.target as HTMLElement;
            if (el.matches?.(`${BUTTONS}, .meetergo-iframe`)) { upgradeElement(el); relinked = true; }
            continue;
          }
          r.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;
            const el = node as HTMLElement;
            if (el.matches(`${BUTTONS}, .meetergo-iframe`)) upgradeElement(el);
            upgradeMarkup(el);
          });
        }
        if (relinked) rescan(win);
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["link", "href"] });
    }
    inject(CDN_SCRIPT, () => inject(FALLBACK_SCRIPT, () => { cdnFailed = true; }));
  };

  const inject = (src: string, onFail: () => void) => {
    const script = document.createElement("script");
    script.src = src;
    // Carry the customer's data-* options (e.g. data-meetergo-design) over to v4.
    if (current) for (const a of Array.from(current.attributes)) if (a.name.startsWith("data-")) script.setAttribute(a.name, a.value);
    script.onload = () => {
      const mg = win.meetergo;
      if (!mg) return;
      addLegacyMethods(mg, (link, params) => win.meetergo?.("openModal", { link, params }), win);
      keepBareInitHarmless(mg);
    };
    script.onerror = onFail;
    document.head.appendChild(script);
  };

  // Start fetching now; run once the markup it upgrades exists.
  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "script";
  preload.href = CDN_SCRIPT;
  document.head.appendChild(preload);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}
