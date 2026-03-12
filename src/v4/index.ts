/**
 * Meetergo v4 — ESM / npm Entry Point
 *
 * For use in npm packages, bundlers (Vite, Webpack), and React apps.
 * Does NOT auto-initialize. Consumers call new MeetergoSDK() themselves.
 *
 * Usage:
 *   import { MeetergoSDK } from "@meetergo/embed";
 *   const sdk = new MeetergoSDK();
 *   sdk.boot();
 *   sdk.callable("init", { floatingButton: { link: "..." } });
 */

// Core
export { MeetergoSDK, SDK_VERSION } from "./core/sdk.js";
export { MeetergoNamespace } from "./core/namespace.js";
export { EventBus } from "./core/event-bus.js";
export { ColorSchemeManager } from "./core/color-scheme.js";
export { PrerenderManager } from "./core/prerender.js";

// Utils
export { cssInjector, CSSInjector, injectAllBaseStyles, MeetergoCSSv4 } from "./utils/css-injector.js";
export { domCache, DOMCache } from "./utils/dom-cache.js";
export { errorHandler, ErrorHandler } from "./utils/error-handler.js";
export { buildIframeURL, collectIframeParams } from "./utils/url-params.js";
export { createIframe } from "./utils/iframe-factory.js";
export { getIcon, setIcon } from "./utils/icons.js";
export { createThrottledHandler, createThrottledResizeHandler } from "./utils/throttle.js";

// Modules
export { ModalManager } from "./modules/modal-manager.js";
export { SidebarManager } from "./modules/sidebar-manager.js";
export { VideoEmbedManager } from "./modules/video-embed-manager.js";
export { FloatingButton } from "./modules/floating-button.js";
export { InlineEmbedManager } from "./modules/inline-embed.js";
export { FormListenerManager } from "./modules/form-listener.js";
export { DataAttrScanner } from "./modules/data-attr-scanner.js";

// Snippet
export { LOADER_SNIPPET, generateLoaderSnippet } from "./snippet/loader.js";

// Types
export type {
  // Primitives
  Position,
  SidebarPosition,
  ButtonAnimation,
  ColorScheme,
  IframeAlignment,
  EmbedLayout,

  // Prefill / Booking
  MeetergoPrefill,
  BookingSuccessfulData,

  // Theme
  ThemeTokens,
  PerThemeTokens,
  UiConfig,

  // Events
  MeetergoEvent,
  MeetergoEventEnvelope,
  MeetergoEventName,
  EventHandler,
  WildcardHandler,
  LinkReadyEvent,
  LinkFailedEvent,
  BookingSuccessfulEvent,
  BookingCancelledEvent,
  BookingRescheduledEvent,
  ModalOpenedEvent,
  ModalClosedEvent,
  SidebarOpenedEvent,
  SidebarClosedEvent,
  VideoPlayEvent,
  VideoPauseEvent,
  VideoExpandedEvent,
  VideoMinimizedEvent,
  BookerViewedEvent,
  RoutedEvent,

  // Component configs
  FloatingButtonConfig,
  SidebarConfig,
  VideoEmbedConfig,
  FormListener,
  InlineEmbedConfig,
  PrerenderConfig,
  NamespaceConfig,

  // API
  SDKCallable,
  NamespaceHandle,
} from "./types/index.js";
