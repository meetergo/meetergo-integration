import { MeetergoEvent, MeetergoPrefill, Position } from "./declarations";
import { domCache } from "./utils/dom-cache";
import { errorHandler } from "./utils/error-handler";
import { cssInjector, injectAllMeetergoStyles } from "./utils/css-injector";
import { modalManager } from "./modules/modal-manager";
import { sidebarManager } from "./modules/sidebar-manager";
import { videoEmbedManager } from "./modules/video-embed-manager";
import {
  isValidMeetergoOrigin,
  parseHeightFromMessage,
  createHeightState,
  applyHeightToIframe,
  clearIframeTransition,
  shouldUpdateHeight,
  createUpdatedHeightState,
} from "./utils/iframe-height";

declare global {
  interface SubmitEvent extends Event {
    readonly currentTarget: EventTarget & HTMLFormElement;
    readonly target: EventTarget | null;
    readonly submitter: HTMLElement | null;
    preventDefault(): void;
  }
}

interface ModalSettings {
  link: string;
  existingParams?: Record<string, string>;
}

interface MeetergoMessageEvent {
  event: string;
  data: unknown;
}

interface OpenModalData {
  link: string;
  params: Record<string, string>;
}

interface BookingSuccessfulData {
  appointmentId?: string;
  [key: string]: unknown;
}

export class MeetergoIntegration {
  /**
   * Stores DOM elements with bound meetergo scheduler events
   * @private
   */
  private boundElements: Map<HTMLElement, (e: Event) => void> = new Map();
  private timeouts: Set<number> = new Set();
  private intervals: Set<number> = new Set();
  private isInitialized = false;
  private trackedIframes: Map<string, { iframe: HTMLIFrameElement; spinnerId?: string }> = new Map();
  private formListeners: Map<HTMLFormElement, (e: Event) => void> = new Map();
  private globalHeightHandler: ((event: MessageEvent) => void) | null = null;
  private globalClickHandler: ((e: Event) => void) | null = null;
  private globalMessageHandler: ((e: MessageEvent) => void) | null = null;
  private iframeHeightState: Map<string, { lastHeight: number; lastUpdateTime: number; pendingUpdate: number | null }> = new Map();

  constructor() {
    try {
      const documentIsLoaded =
        document &&
        (document.readyState === "complete" ||
          document.readyState === "interactive");

      if (documentIsLoaded) {
        this.init();
      } else {
        window.addEventListener("DOMContentLoaded", () => {
          this.init();
        });
      }
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to initialize MeetergoIntegration",
        level: "critical",
        context: "MeetergoIntegration.constructor",
        error: error as Error,
      });
    }
  }

  public init(): void {
    try {
      if (this.isInitialized) {
        console.warn(
          "meetergo: Already initialized, skipping duplicate initialization"
        );
        return;
      }

      // Inject CSS styles first
      injectAllMeetergoStyles();

      // Setup event callbacks
      this.setupEventCallbacks();

      // Initialize core modules
      modalManager.initialize({
        disableModal: window.meetergoSettings?.disableModal,
        enableAutoResize: window.meetergoSettings?.enableAutoResize,
      });

      // Initialize components based on settings
      this.initializeComponents();

      // Setup global event listeners
      this.addListeners();

      this.isInitialized = true;

      errorHandler.handleError(
        {
          message: "meetergo integration initialized successfully",
          level: "info",
          context: "MeetergoIntegration.init",
        },
        false
      );
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to initialize meetergo integration",
        level: "error",
        context: "MeetergoIntegration.init",
        error: error as Error,
      });
    }
  }

  /**
   * Setup event callbacks for all modules
   * @private
   */
  private setupEventCallbacks(): void {
    // Setup modal event callback
    modalManager.setEventCallback((event) => {
      this.handleMeetergoEvent(event);
    });

    // Setup video event callback
    videoEmbedManager.setEventCallback((event) => {
      this.handleMeetergoEvent(event);
    });
  }

  /**
   * Handle meetergo events from modules
   * @private
   */
  private handleMeetergoEvent(event: MeetergoEvent): void {
    try {
      // Call user-defined event handler if available
      if (window.meetergoSettings?.onEvent) {
        window.meetergoSettings.onEvent(event);
      }

      // Handle specific events internally if needed
      switch (event.type) {
        case "booking_completed":
          if (window.meetergoSettings?.onSuccess && "appointmentId" in event) {
            window.meetergoSettings.onSuccess(event.appointmentId);
          }
          break;
        case "modal_error":
          errorHandler.handleError({
            message: "Modal error occurred",
            level: "warning",
            context: "MeetergoIntegration.handleMeetergoEvent",
            error: event.data?.error as Error,
          });
          break;
      }
    } catch (error) {
      errorHandler.handleError({
        message: "Error handling meetergo event",
        level: "warning",
        context: "MeetergoIntegration.handleMeetergoEvent",
        error: error as Error,
      });
    }
  }

  /**
   * Initialize components based on settings
   * @private
   */
  private initializeComponents(): void {
    try {
      // Initialize sidebar if configured
      if (window.meetergoSettings?.sidebar?.link) {
        sidebarManager.createSidebar(window.meetergoSettings.sidebar);
      }

      // Initialize floating button if configured
      if (window.meetergoSettings?.floatingButton) {
        this.addFloatingButton();
      }

      // Initialize video embed if configured
      if (window.meetergoSettings?.videoEmbed?.videoSrc) {
        videoEmbedManager.createVideoEmbed(window.meetergoSettings.videoEmbed);
      }

      // Initialize form listeners
      this.listenToForms();

      // Parse existing elements
      this.parseIframes();
      this.parseButtons();
    } catch (error) {
      errorHandler.handleError({
        message: "Error initializing components",
        level: "error",
        context: "MeetergoIntegration.initializeComponents",
        error: error as Error,
      });
    }
  }

  public onFormSubmit(e: Event): void {
    if (!(e.currentTarget instanceof HTMLFormElement)) return;

    const target = e.currentTarget;
    if (!target) return;

    try {
      const targetListener = window.meetergoSettings?.formListeners?.find(
        (listener) => {
          if (!target.id) return false;
          return target.id === listener.formId;
        }
      );

      // This should always exist since we only attach listeners to configured forms
      // But check defensively just in case
      if (!targetListener) {
        return;
      }

      const formData = new FormData(target);
      const data: Record<string, string> = {};
      for (const [key, value] of formData) {
        data[key] = value.toString();
      }

      this.openModalWithContent({
        link: targetListener.link,
        existingParams: data,
      });
    } catch (error) {
      errorHandler.handleError({
        message: "Error handling form submission",
        level: "error",
        context: "MeetergoIntegration.onFormSubmit",
        error: error as Error,
      });
    }
  }

  private listenToForms(): void {
    try {
      // Only listen to forms that are explicitly configured in formListeners
      const formListeners = window.meetergoSettings?.formListeners;

      if (!formListeners || formListeners.length === 0) {
        return; // No form listeners configured, skip
      }

      const boundHandler = this.onFormSubmit.bind(this);

      // Attach listeners only to configured forms
      for (const listener of formListeners) {
        if (!listener.formId) continue;

        const form = document.getElementById(listener.formId);
        if (form instanceof HTMLFormElement) {
          // Skip if already listening
          if (this.formListeners.has(form)) continue;

          form.addEventListener("submit", boundHandler, false);
          this.formListeners.set(form, boundHandler);
        }
      }
    } catch (error) {
      errorHandler.handleError({
        message: "Error setting up form listeners",
        level: "warning",
        context: "MeetergoIntegration.listenToForms",
        error: error as Error,
      });
    }
  }

  private addFloatingButton(): void {
    try {
      const config = window.meetergoSettings?.floatingButton;
      if (!config?.position || !config.link) {
        return;
      }

      const position = config.position;
      const animation = config.animation || "none";

      let button = document.createElement("button");
      button.classList.add("meetergo-modal-button");

      const buttonText = config.text ?? "Book appointment";

      if (config.icon) {
        this.loadLucideIcon(config.icon, button, buttonText);
      } else {
        button.innerHTML = buttonText;
      }

      button.setAttribute("link", config.link);
      button.style.position = "fixed";

      // Position the button
      this.positionFloatingButton(button, position);

      // Apply styles
      button = this.meetergoStyleButton(button);

      // Apply custom colors
      if (config.backgroundColor) {
        button.style.backgroundColor = config.backgroundColor;
      }
      if (config.textColor) {
        button.style.color = config.textColor;
      }

      // Apply animation
      this.applyButtonAnimation(button, animation, position);

      document.body.appendChild(button);
    } catch (error) {
      errorHandler.handleError({
        message: "Error creating floating button",
        level: "warning",
        context: "MeetergoIntegration.addFloatingButton",
        error: error as Error,
      });
    }
  }

  /**
   * Position floating button based on configuration
   * @private
   */
  private positionFloatingButton(
    button: HTMLElement,
    position: Position
  ): void {
    let originalTransform = "";

    if (position.includes("top")) {
      button.style.top = "10px";
    } else if (position.includes("middle")) {
      button.style.top = "50%";
      originalTransform = "translateY(-50%)";
      button.style.transform = originalTransform;
    } else {
      button.style.bottom = "10px";
    }

    if (position.includes("left")) {
      button.style.left = "5px";
    } else if (position.includes("center")) {
      button.style.left = "50%";
      originalTransform = originalTransform
        ? "translate(-50%, -50%)"
        : "translateX(-50%)";
      button.style.transform = originalTransform;
    } else {
      button.style.right = "5px";
    }
  }

  /**
   * Apply animation to button
   * @private
   */
  private applyButtonAnimation(
    button: HTMLElement,
    animation: string,
    position: Position
  ): void {
    if (animation === "none") return;

    if (animation === "pulse") {
      button.classList.add("meetergo-animation-pulse");
    } else if (animation === "bounce") {
      button.classList.add("meetergo-animation-bounce");
    } else if (animation === "slide-in") {
      if (position.includes("right")) {
        button.classList.add("meetergo-animation-slide-in-right");
      } else if (position.includes("left")) {
        button.classList.add("meetergo-animation-slide-in-left");
      } else if (position.includes("top")) {
        button.classList.add("meetergo-animation-slide-in-top");
      } else {
        button.classList.add("meetergo-animation-slide-in-bottom");
      }
    }
  }

  private loadLucideIcon(
    iconName: string,
    button: HTMLButtonElement,
    buttonText: string
  ): void {
    button.style.display = "inline-flex";
    button.style.alignItems = "center";
    button.style.justifyContent = "center";

    button.innerHTML = "";

    if (iconName) {
      const iconSpan = document.createElement("span");
      iconSpan.style.display = "inline-flex";
      iconSpan.style.alignItems = "center";

      if (buttonText) {
        iconSpan.style.marginRight = "8px";
      }

      button.appendChild(iconSpan);
      this.fetchLucideIcon(iconName, iconSpan);
    }

    if (buttonText) {
      button.appendChild(document.createTextNode(buttonText));
    }
  }

  private fetchLucideIcon(iconName: string, container: HTMLElement): void {
    const iconMap: Record<string, string> = {
      CalendarPlus: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><line x1="12" x2="12" y1="14" y2="18"/><line x1="10" x2="14" y1="16" y2="16"/></svg>`,
      CalendarPlus2: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M16 21v-6"/><path d="M19 18h-6"/></svg>`,
      Calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
      Clock: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      User: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a4 4 0 0 0 4 4z"/><circle cx="12" cy="7" r="4"/></svg>`,
    };

    if (iconMap[iconName]) {
      container.innerHTML = iconMap[iconName];
    } else {
      container.innerHTML = iconMap["Calendar"];
      console.warn(
        `meetergo: Icon '${iconName}' not found, using default Calendar icon`
      );
    }
  }

  private addListeners(): void {
    try {
      // Store click handler for cleanup
      this.globalClickHandler = (e: Event) => {
        const target = e.target as HTMLElement;
        const button = target.closest(".meetergo-modal-button") as HTMLElement;

        if (button) {
          e.preventDefault();
          const link =
            button.getAttribute("link") || button.getAttribute("href");
          if (link) {
            this.openModalWithContent({ link });
          } else {
            errorHandler.handleError({
              message: "Button clicked without a link attribute",
              level: "warning",
              context: "MeetergoIntegration.addListeners",
            });
          }
        }
      };
      document.body.addEventListener("click", this.globalClickHandler);

      // Note: ESC key handler is in modal-manager.ts, no duplicate needed here

      // Store message handler for cleanup
      this.globalMessageHandler = (e: MessageEvent) => {
        try {
          const meetergoEvent = e.data as MeetergoMessageEvent;

          switch (meetergoEvent.event) {
            case "open-modal": {
              const iframeParams = this.getParamsFromMainIframe();
              const data = meetergoEvent.data as OpenModalData;

              if (!data.link) {
                errorHandler.handleError({
                  message: "Missing link in open-modal event",
                  level: "error",
                  context: "MeetergoIntegration.addListeners",
                });
                return;
              }

              this.openModalWithContent({
                link: data.link,
                existingParams: { ...data.params, ...iframeParams },
              });
              break;
            }
            case "close-modal": {
              this.closeModal();
              break;
            }
            case "booking-successful": {
              if (window.meetergoSettings?.onSuccess) {
                const data = meetergoEvent.data as BookingSuccessfulData;
                window.meetergoSettings.onSuccess(data);
              }
              break;
            }
            default: {
              // Ignore unrecognized events
              break;
            }
          }
        } catch (error) {
          errorHandler.handleError({
            message: "Error handling message event",
            level: "warning",
            context: "MeetergoIntegration.addListeners",
            error: error as Error,
          });
        }
      };
      window.addEventListener("message", this.globalMessageHandler);
    } catch (error) {
      errorHandler.handleError({
        message: "Error setting up event listeners",
        level: "error",
        context: "MeetergoIntegration.addListeners",
        error: error as Error,
      });
    }
  }

  public getParamsFromMainIframe(): Record<string, string> {
    const iframeParams: Record<string, string> = {};
    const divIframe = domCache.querySelector(".meetergo-iframe") as HTMLElement;

    if (divIframe) {
      const linkAttr = divIframe.getAttribute("link");
      if (linkAttr) {
        const queryString = linkAttr.split("?")[1];
        if (queryString) {
          const urlParams = new URLSearchParams(queryString);
          urlParams.forEach((value, key) => {
            iframeParams[key] = value;
          });
        }
      }
    }
    return iframeParams;
  }

  public openModalWithContent(settings: ModalSettings): void {
    modalManager.openModalWithContent(settings);
  }

  public openModal(): void {
    modalManager.openModal();
  }

  public closeModal(preventClearContent?: boolean): void {
    modalManager.closeModal(preventClearContent);
  }

  /**
   * Binds the meetergo scheduler to any DOM element
   */
  public bindElementToScheduler(
    element: HTMLElement,
    schedulerLink?: string,
    options?: {
      params?: Record<string, string>;
      removeExistingListeners?: boolean;
    }
  ): HTMLElement {
    try {
      if (options?.removeExistingListeners) {
        if (this.boundElements.has(element)) {
          const oldHandler = this.boundElements.get(element);
          if (oldHandler) {
            element.removeEventListener("click", oldHandler);
            this.boundElements.delete(element);
          }
        }
      }

      const clickHandler = (e: Event) => {
        e.preventDefault();
        const link = schedulerLink || element.getAttribute("link");

        if (!link) {
          errorHandler.handleError({
            message: "No scheduler link provided for bound element",
            level: "error",
            context: "MeetergoIntegration.bindElementToScheduler",
          });
          return;
        }

        this.openModalWithContent({
          link,
          existingParams: options?.params,
        });
      };

      element.addEventListener("click", clickHandler);
      this.boundElements.set(element, clickHandler);

      if (getComputedStyle(element).cursor !== "pointer") {
        element.style.cursor = "pointer";
      }

      if (!element.getAttribute("role")) {
        element.setAttribute("role", "button");
      }

      return element;
    } catch (error) {
      errorHandler.handleError({
        message: "Error binding element to scheduler",
        level: "error",
        context: "MeetergoIntegration.bindElementToScheduler",
        error: error as Error,
      });
      return element;
    }
  }

  /**
   * Unbinds a previously bound element from the meetergo scheduler
   */
  public unbindElementFromScheduler(element: HTMLElement): boolean {
    try {
      if (this.boundElements.has(element)) {
        const handler = this.boundElements.get(element);
        if (handler) {
          element.removeEventListener("click", handler);
          this.boundElements.delete(element);
          return true;
        }
      }
      return false;
    } catch (error) {
      errorHandler.handleError({
        message: "Error unbinding element from scheduler",
        level: "warning",
        context: "MeetergoIntegration.unbindElementFromScheduler",
        error: error as Error,
      });
      return false;
    }
  }

  /**
   * Programmatically launches the meetergo scheduler
   */
  public launchScheduler(
    schedulerLink?: string,
    params?: Record<string, string>
  ): void {
    try {
      let link = schedulerLink;

      if (!link && window.meetergoSettings?.floatingButton?.link) {
        link = window.meetergoSettings.floatingButton.link;
      }

      if (!link) {
        errorHandler.handleError({
          message: "No scheduler link provided for launch",
          level: "error",
          context: "MeetergoIntegration.launchScheduler",
        });
        return;
      }

      this.openModalWithContent({ link, existingParams: params });
    } catch (error) {
      errorHandler.handleError({
        message: "Error launching scheduler programmatically",
        level: "error",
        context: "MeetergoIntegration.launchScheduler",
        error: error as Error,
      });
    }
  }

  public parseIframes(): void {
    try {
      const anchors = document.getElementsByClassName("meetergo-iframe");
      if (!anchors.length) return;

      const params = this.getPrifillParams();

      Array.from(anchors).forEach((anchor) => {
        try {
          const iframe = document.createElement("iframe");
          iframe.title = "meetergo Booking Calendar";
          iframe.setAttribute("loading", "lazy");

          const link =
            (anchor.getAttribute("link") || anchor.getAttribute("href")) ?? "";

          if (!link) {
            console.warn("meetergo: Iframe element missing link attribute");
            return;
          }

          // Get alignment from data attribute or settings (default to center)
          const alignment = anchor.getAttribute("data-align") ||
                          window.meetergoSettings?.iframeAlignment ||
                          "center";

          // Add alignment and embed=true params so the booking page knows it's embedded
          const urlParams = params
            ? `${params}&align=${alignment}&embed=true`
            : `align=${alignment}&embed=true`;
          iframe.setAttribute("src", `${link}?${urlParams}`);
          iframe.style.width = "100%";
          iframe.style.border = "none";
          iframe.style.overflow = "hidden";
          iframe.style.display = "block";

          // Use a reliable fixed height that works for most booking scenarios
          const reliableHeight = this.calculateReliableHeight();
          iframe.style.height = `${reliableHeight}px`;
          iframe.style.minHeight = "400px";
          iframe.style.overflow = "auto"; // Allow scrolling as fallback if needed

          // Apply alignment to the container
          if (anchor instanceof HTMLElement) {
            // Set data-align attribute for CSS targeting
            anchor.setAttribute("data-align", alignment as string);

            // Reset any existing inline styles
            anchor.style.display = "block";
            anchor.style.textAlign = alignment as string;

            // For iframe alignment, we need to control the iframe's display
            if (alignment === "left") {
              iframe.style.marginLeft = "0";
              iframe.style.marginRight = "auto";
              iframe.style.maxWidth = "960px"; // Match meetergo's max width
            } else if (alignment === "right") {
              iframe.style.marginLeft = "auto";
              iframe.style.marginRight = "0";
              iframe.style.maxWidth = "960px"; // Match meetergo's max width
            } else {
              // center (default)
              iframe.style.marginLeft = "auto";
              iframe.style.marginRight = "auto";
            }
          }

          const loadingIndicator = document.createElement("div");
          loadingIndicator.className = "meetergo-spinner";

          const indicatorId = `meetergo-spinner-${Math.random()
            .toString(36)
            .substring(2, 11)}`;
          loadingIndicator.id = indicatorId;

          // Setup auto-resize monitoring (enabled by default, disabled only when data-resize="false")
          const enableResize =
            anchor.getAttribute("data-resize") !== "false" &&
            window.meetergoSettings?.enableAutoResize !== false;

          if (enableResize) {
            this.setupMinimalAutoResize(iframe, indicatorId);
          } else {
            // If auto-resize is disabled, use iframe load event as fallback
            iframe.addEventListener("load", () => {
              const spinner = document.getElementById(indicatorId);
              if (spinner && spinner.parentNode) {
                spinner.parentNode.removeChild(spinner);
              }
            });
          }

          // Fallback: Remove spinner after timeout if content doesn't signal ready
          this.createTimeout(() => {
            const spinner = document.getElementById(indicatorId);
            if (spinner && spinner.parentNode) {
              spinner.parentNode.removeChild(spinner);
            }
          }, 10000); // 10 second timeout

          if (anchor instanceof HTMLElement) {
            anchor.style.position = "relative";
            anchor.innerHTML = "";
            anchor.appendChild(iframe);
            anchor.appendChild(loadingIndicator);
          }
        } catch (innerError) {
          errorHandler.handleError({
            message: "Error processing iframe element",
            level: "warning",
            context: "MeetergoIntegration.parseIframes",
            error: innerError as Error,
          });
        }
      });
    } catch (error) {
      errorHandler.handleError({
        message: "Error parsing iframes",
        level: "warning",
        context: "MeetergoIntegration.parseIframes",
        error: error as Error,
      });
    }
  }

  public sendScrollHeightToParent(): void {
    const scrollHeight = document.body.scrollHeight;
    window.parent.postMessage({ scrollHeight: scrollHeight }, "*");
  }

  /**
   * Get initial iframe height (auto-resize will adjust as needed)
   */
  private calculateReliableHeight(): number {
    // Use custom height if configured, otherwise use sensible default
    const customHeight = window.meetergoSettings?.iframeHeight;
    if (customHeight && typeof customHeight === "number" && customHeight > 400) {
      return customHeight;
    }
    // Default height - auto-resize will adjust once content loads
    return 800;
  }

  /**
   * Setup global message handler for all iframe height updates (single handler, not one per iframe)
   */
  private setupGlobalHeightListener(): void {
    if (this.globalHeightHandler) return; // Already setup

    this.globalHeightHandler = (event: MessageEvent) => {
      // Validate origin using shared utility
      if (!isValidMeetergoOrigin(event.origin)) {
        return;
      }

      // Parse height from message using shared utility
      const newHeight = parseHeightFromMessage(event.data);
      if (!newHeight) {
        return;
      }

      // Find the iframe that sent this message by matching event.source
      let matchedIframeId: string | null = null;
      let matchedIframe: HTMLIFrameElement | null = null;
      let matchedSpinnerId: string | undefined = undefined;

      this.trackedIframes.forEach((data, iframeId) => {
        if (!document.contains(data.iframe)) {
          // Clean up stale references
          this.trackedIframes.delete(iframeId);
          this.iframeHeightState.delete(iframeId);
          return;
        }

        // Match the message source to the iframe's contentWindow
        if (data.iframe.contentWindow === event.source) {
          matchedIframeId = iframeId;
          matchedIframe = data.iframe;
          matchedSpinnerId = data.spinnerId;
        }
      });

      // Only update the iframe that sent the message
      if (!matchedIframe || !matchedIframeId) {
        return;
      }

      // Remove spinner on first height message (content is ready)
      if (matchedSpinnerId) {
        const spinner = document.getElementById(matchedSpinnerId);
        if (spinner && spinner.parentNode) {
          spinner.parentNode.removeChild(spinner);
        }
        // Clear spinner ID so we don't try to remove it again
        const trackedData = this.trackedIframes.get(matchedIframeId);
        if (trackedData) {
          trackedData.spinnerId = undefined;
        }
      }

      const state = this.iframeHeightState.get(matchedIframeId) || createHeightState();
      const { shouldUpdate, shouldThrottle } = shouldUpdateHeight(newHeight, state);

      if (!shouldUpdate) {
        return;
      }

      // Capture values for closure
      const iframeToUpdate = matchedIframe;
      const iframeIdToUpdate = matchedIframeId;

      if (shouldThrottle) {
        if (state.pendingUpdate) {
          window.clearTimeout(state.pendingUpdate);
        }
        state.pendingUpdate = window.setTimeout(() => {
          this.updateIframeHeight(iframeToUpdate, newHeight, iframeIdToUpdate);
        }, 100);
        this.iframeHeightState.set(iframeIdToUpdate, state);
        return;
      }

      this.updateIframeHeight(iframeToUpdate, newHeight, iframeIdToUpdate);
    };

    window.addEventListener("message", this.globalHeightHandler);
  }

  /**
   * Update iframe height with smooth transition
   */
  private updateIframeHeight(iframe: HTMLIFrameElement, height: number, iframeId: string): void {
    applyHeightToIframe(iframe, height);

    // Remove transition after animation using tracked timeout
    this.createTimeout(() => {
      clearIframeTransition(iframe);
    }, 300);

    // Update state using shared utility
    this.iframeHeightState.set(iframeId, createUpdatedHeightState(Math.max(height, 400)));
  }

  /**
   * Register iframe for auto-resize (uses single global handler)
   */
  private setupMinimalAutoResize(iframe: HTMLIFrameElement, spinnerId?: string): void {
    try {
      // Ensure global handler is setup
      this.setupGlobalHeightListener();

      // Generate unique ID and track the iframe with its spinner
      const iframeId = `iframe-${Math.random().toString(36).substring(2, 11)}`;
      this.trackedIframes.set(iframeId, { iframe, spinnerId });
      this.iframeHeightState.set(iframeId, {
        lastHeight: 0,
        lastUpdateTime: 0,
        pendingUpdate: null,
      });
    } catch (error) {
      console.warn("meetergo auto-resize: Setup failed", error);
    }
  }

  public parseButtons(): void {
    try {
      const buttons = document.getElementsByClassName("meetergo-styled-button");

      for (let button of buttons) {
        button = this.meetergoStyleButton(button as HTMLButtonElement);

        if (button instanceof HTMLElement) {
          const link = button.getAttribute("link");
          if (link) {
            this.bindElementToScheduler(button, link);
          }
        }
      }
    } catch (error) {
      errorHandler.handleError({
        message: "Error parsing buttons",
        level: "warning",
        context: "MeetergoIntegration.parseButtons",
        error: error as Error,
      });
    }
  }

  private getWindowParams(): Record<string, string> {
    try {
      const search = window.location.search;
      if (!search) return {};

      const params = new URLSearchParams(search);
      const paramObj: Record<string, string> = {};

      params.forEach((value, key) => {
        if (value && value.trim() !== "") {
          paramObj[key] = value;
        }
      });

      return paramObj;
    } catch (error) {
      errorHandler.handleError({
        message: "Error parsing window parameters",
        level: "warning",
        context: "MeetergoIntegration.getWindowParams",
        error: error as Error,
      });
      return {};
    }
  }

  private getPrifillParams(existingParams?: Record<string, string>): string {
    try {
      const params: string[] = [];
      let prefill = this.getWindowParams();

      if (window.meetergoSettings?.prefill) {
        // Filter out undefined values to maintain Record<string, string> type
        const filteredPrefill: Record<string, string> = {};
        Object.entries(window.meetergoSettings.prefill).forEach(
          ([key, value]) => {
            if (value !== undefined) {
              filteredPrefill[key] = value;
            }
          }
        );
        prefill = { ...prefill, ...filteredPrefill };
      }

      if (existingParams) {
        prefill = { ...prefill, ...existingParams };
      }

      Object.entries(prefill).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          try {
            const encodedKey = encodeURIComponent(key);
            const encodedValue = encodeURIComponent(String(value));
            params.push(`${encodedKey}=${encodedValue}`);
          } catch (encodingError) {
            console.warn(
              `meetergo: Error encoding parameter ${key}`,
              encodingError
            );
          }
        }
      });

      return params.join("&");
    } catch (error) {
      errorHandler.handleError({
        message: "Error generating prefill parameters",
        level: "warning",
        context: "MeetergoIntegration.getPrifillParams",
        error: error as Error,
      });
      return "";
    }
  }

  public setPrefill(prefill: MeetergoPrefill): void {
    try {
      if (!prefill) {
        console.warn("meetergo: Attempted to set undefined or null prefill");
        return;
      }

      if (!window.meetergoSettings) {
        console.warn("meetergo: Settings object not initialized");
        window.meetergoSettings = {
          company: "",
          formListeners: [],
          prefill: {},
        };
      }

      // Filter out undefined values to maintain Record<string, string> type
      const filteredPrefill: Record<string, string> = {};
      Object.entries(prefill).forEach(([key, value]) => {
        if (value !== undefined) {
          filteredPrefill[key] = value;
        }
      });
      window.meetergoSettings.prefill = filteredPrefill;

      if (modalManager.isModalOpen()) {
        this.refreshModalWithNewPrefill();
      }
    } catch (error) {
      errorHandler.handleError({
        message: "Error setting prefill values",
        level: "warning",
        context: "MeetergoIntegration.setPrefill",
        error: error as Error,
      });
    }
  }

  private refreshModalWithNewPrefill(): void {
    try {
      const modalContent = domCache.getElementById("meetergo-modal-content");
      if (!modalContent) return;

      const iframe = modalContent.querySelector("iframe");
      if (!iframe) return;

      const currentSrc = iframe.getAttribute("src");
      if (!currentSrc) return;

      const linkBase = currentSrc.split("?")[0];
      const params = this.getPrifillParams();
      iframe.setAttribute("src", `${linkBase}?${params}`);
    } catch (error) {
      errorHandler.handleError({
        message: "Error refreshing modal with new prefill",
        level: "warning",
        context: "MeetergoIntegration.refreshModalWithNewPrefill",
        error: error as Error,
      });
    }
  }

  private meetergoStyleButton(button: HTMLButtonElement): HTMLButtonElement {
    try {
      if (!button) {
        console.warn("meetergo: Attempted to style undefined button");
        return button;
      }

      const styles = {
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

      Object.assign(button.style, styles);

      if (!button.getAttribute("role")) {
        button.setAttribute("role", "button");
      }

      return button;
    } catch (error) {
      errorHandler.handleError({
        message: "Error styling button",
        level: "warning",
        context: "MeetergoIntegration.meetergoStyleButton",
        error: error as Error,
      });
      return button;
    }
  }

  /**
   * Create a timeout with automatic tracking
   * @param callback Function to execute
   * @param delay Delay in milliseconds
   * @returns Timeout ID
   */
  public createTimeout(callback: () => void, delay: number): number {
    const timeoutId = window.setTimeout(() => {
      this.timeouts.delete(timeoutId);
      callback();
    }, delay);

    this.timeouts.add(timeoutId);
    return timeoutId;
  }

  /**
   * Create an interval with automatic tracking
   * @param callback Function to execute
   * @param delay Delay in milliseconds
   * @returns Interval ID
   */
  public createInterval(callback: () => void, delay: number): number {
    const intervalId = window.setInterval(callback, delay);
    this.intervals.add(intervalId);
    return intervalId;
  }

  /**
   * Clear a tracked timeout
   * @param timeoutId Timeout ID to clear
   */
  public clearTrackedTimeout(timeoutId: number): void {
    window.clearTimeout(timeoutId);
    this.timeouts.delete(timeoutId);
  }

  /**
   * Clear a tracked interval
   * @param intervalId Interval ID to clear
   */
  public clearTrackedInterval(intervalId: number): void {
    window.clearInterval(intervalId);
    this.intervals.delete(intervalId);
  }

  /**
   * Cleanup method that removes all event listeners, timeouts, intervals, and DOM elements
   */
  public destroy(): void {
    try {
      // Clear all timeouts
      this.timeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      this.timeouts.clear();

      // Clear all intervals
      this.intervals.forEach((intervalId) => {
        window.clearInterval(intervalId);
      });
      this.intervals.clear();

      // Unbind all bound elements
      this.boundElements.forEach((handler, element) => {
        try {
          element.removeEventListener("click", handler);
        } catch (error) {
          // Element might have been removed from DOM
        }
      });
      this.boundElements.clear();

      // Clean up global height handler
      if (this.globalHeightHandler) {
        window.removeEventListener("message", this.globalHeightHandler);
        this.globalHeightHandler = null;
      }
      this.trackedIframes.clear();
      this.iframeHeightState.clear();

      // Clean up global click handler
      if (this.globalClickHandler) {
        document.body.removeEventListener("click", this.globalClickHandler);
        this.globalClickHandler = null;
      }

      // Clean up global message handler
      if (this.globalMessageHandler) {
        window.removeEventListener("message", this.globalMessageHandler);
        this.globalMessageHandler = null;
      }

      // Clean up form listeners
      this.formListeners.forEach((handler, form) => {
        try {
          form.removeEventListener("submit", handler);
        } catch (error) {
          // Form might have been removed from DOM
        }
      });
      this.formListeners.clear();

      // Cleanup all modules
      modalManager.cleanup();
      sidebarManager.cleanup();
      videoEmbedManager.cleanup();
      errorHandler.cleanup();
      cssInjector.cleanup();

      // Clear DOM cache
      domCache.clearCache();

      // Remove floating buttons
      const floatingButtons = document.querySelectorAll(
        ".meetergo-modal-button"
      );
      floatingButtons.forEach((button) => {
        if (button.parentNode) {
          button.parentNode.removeChild(button);
        }
      });

      // Reset state
      this.isInitialized = false;
    } catch (error) {
      errorHandler.handleError({
        message: "Error during cleanup",
        level: "warning",
        context: "MeetergoIntegration.destroy",
        error: error as Error,
      });
    }
  }

  /**
   * Check if integration is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get integration status and statistics
   */
  public getStatus(): {
    initialized: boolean;
    boundElements: number;
    activeTimeouts: number;
    activeIntervals: number;
    cacheStats: { idCacheSize: number; selectorCacheSize: number };
  } {
    return {
      initialized: this.isInitialized,
      boundElements: this.boundElements.size,
      activeTimeouts: this.timeouts.size,
      activeIntervals: this.intervals.size,
      cacheStats: domCache.getCacheStats(),
    };
  }
}

export const meetergo = new MeetergoIntegration();
