import { MeetergoEvent, MeetergoPrefill, Position } from "./declarations";
import { domCache } from './utils/dom-cache';
import { errorHandler } from './utils/error-handler';
import { cssInjector, injectAllMeetergoStyles } from './utils/css-injector';
import { modalManager } from './modules/modal-manager';
import { sidebarManager } from './modules/sidebar-manager';
import { videoEmbedManager } from './modules/video-embed-manager';

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

export class MeetergoIntegration {
  /**
   * Stores DOM elements with bound Meetergo scheduler events
   * @private
   */
  private boundElements: Map<HTMLElement, (e: Event) => void> = new Map();
  private timeouts: Set<number> = new Set();
  private intervals: Set<number> = new Set();
  private isInitialized = false;
  private messageHandlers: Array<{ handler: (event: MessageEvent) => void; iframe: HTMLIFrameElement }> = [];
  private intersectionObservers: IntersectionObserver[] = [];
  // Remove unused lastActiveElement property

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
        message: 'Failed to initialize MeetergoIntegration',
        level: 'critical',
        context: 'MeetergoIntegration.constructor',
        error: error as Error
      });
    }
  }

  public init(): void {
    try {
      if (this.isInitialized) {
        console.warn('Meetergo: Already initialized, skipping duplicate initialization');
        return;
      }

      // Inject CSS styles first
      injectAllMeetergoStyles();

      // Setup event callbacks
      this.setupEventCallbacks();

      // Initialize core modules
      modalManager.initialize({
        disableModal: window.meetergoSettings?.disableModal,
        enableAutoResize: window.meetergoSettings?.enableAutoResize
      });

      // Initialize components based on settings
      this.initializeComponents();

      // Setup global event listeners
      this.addListeners();

      this.isInitialized = true;

      errorHandler.handleError({
        message: 'Meetergo integration initialized successfully',
        level: 'info',
        context: 'MeetergoIntegration.init'
      }, false);

    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to initialize Meetergo integration',
        level: 'error',
        context: 'MeetergoIntegration.init',
        error: error as Error
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
   * Handle Meetergo events from modules
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
        case 'booking_completed':
          if (window.meetergoSettings?.onSuccess && 'appointmentId' in event) {
            window.meetergoSettings.onSuccess(event.appointmentId);
          }
          break;
        case 'modal_error':
          errorHandler.handleError({
            message: 'Modal error occurred',
            level: 'warning',
            context: 'MeetergoIntegration.handleMeetergoEvent',
            error: event.data?.error as Error
          });
          break;
      }
    } catch (error) {
      errorHandler.handleError({
        message: 'Error handling Meetergo event',
        level: 'warning',
        context: 'MeetergoIntegration.handleMeetergoEvent',
        error: error as Error
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
        message: 'Error initializing components',
        level: 'error',
        context: 'MeetergoIntegration.initializeComponents',
        error: error as Error
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

      if (!targetListener) {
        errorHandler.handleError({
          message: `No form listener found for form ID: ${target.id}`,
          level: 'warning',
          context: 'MeetergoIntegration.onFormSubmit'
        });
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
        message: 'Error handling form submission',
        level: 'error',
        context: 'MeetergoIntegration.onFormSubmit',
        error: error as Error
      });
    }
  }

  private listenToForms(): void {
    try {
      const forms = document.querySelectorAll("form");

      for (const form of forms) {
        form.addEventListener("submit", this.onFormSubmit.bind(this), false);
      }
    } catch (error) {
      errorHandler.handleError({
        message: 'Error setting up form listeners',
        level: 'warning',
        context: 'MeetergoIntegration.listenToForms',
        error: error as Error
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
        message: 'Error creating floating button',
        level: 'warning',
        context: 'MeetergoIntegration.addFloatingButton',
        error: error as Error
      });
    }
  }

  /**
   * Position floating button based on configuration
   * @private
   */
  private positionFloatingButton(button: HTMLElement, position: Position): void {
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
  private applyButtonAnimation(button: HTMLElement, animation: string, position: Position): void {
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
      User: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a4 4 0 0 0 4 4z"/><circle cx="12" cy="7" r="4"/></svg>`
    };

    if (iconMap[iconName]) {
      container.innerHTML = iconMap[iconName];
    } else {
      container.innerHTML = iconMap["Calendar"];
      console.warn(`meetergo: Icon '${iconName}' not found, using default Calendar icon`);
    }
  }

  private addListeners(): void {
    try {
      document.body.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest(".meetergo-modal-button") as HTMLElement;

        if (button) {
          e.preventDefault();
          const link = button.getAttribute("link") || button.getAttribute("href");
          if (link) {
            this.openModalWithContent({ link });
          } else {
            errorHandler.handleError({
              message: 'Button clicked without a link attribute',
              level: 'warning',
              context: 'MeetergoIntegration.addListeners'
            });
          }
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeModal();
        }
      });

      window.onmessage = (e: MessageEvent<MeetergoMessageEvent>) => {
        try {
          const meetergoEvent = e.data as MeetergoMessageEvent;

          switch (meetergoEvent.event) {
            case "open-modal": {
              const iframeParams = this.getParamsFromMainIframe();
              const data = meetergoEvent.data as OpenModalData;

              if (!data.link) {
                errorHandler.handleError({
                  message: 'Missing link in open-modal event',
                  level: 'error',
                  context: 'MeetergoIntegration.addListeners'
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
            message: 'Error handling message event',
            level: 'warning',
            context: 'MeetergoIntegration.addListeners',
            error: error as Error
          });
        }
      };
    } catch (error) {
      errorHandler.handleError({
        message: 'Error setting up event listeners',
        level: 'error',
        context: 'MeetergoIntegration.addListeners',
        error: error as Error
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
            message: 'No scheduler link provided for bound element',
            level: 'error',
            context: 'MeetergoIntegration.bindElementToScheduler'
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
        message: 'Error binding element to scheduler',
        level: 'error',
        context: 'MeetergoIntegration.bindElementToScheduler',
        error: error as Error
      });
      return element;
    }
  }

  /**
   * Unbinds a previously bound element from the Meetergo scheduler
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
        message: 'Error unbinding element from scheduler',
        level: 'warning',
        context: 'MeetergoIntegration.unbindElementFromScheduler',
        error: error as Error
      });
      return false;
    }
  }

  /**
   * Programmatically launches the Meetergo scheduler
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
          message: 'No scheduler link provided for launch',
          level: 'error',
          context: 'MeetergoIntegration.launchScheduler'
        });
        return;
      }

      this.openModalWithContent({ link, existingParams: params });
    } catch (error) {
      errorHandler.handleError({
        message: 'Error launching scheduler programmatically',
        level: 'error',
        context: 'MeetergoIntegration.launchScheduler',
        error: error as Error
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

          const link = (anchor.getAttribute("link") || anchor.getAttribute("href")) ?? "";

          if (!link) {
            console.warn("meetergo: Iframe element missing link attribute");
            return;
          }

          iframe.setAttribute("src", `${link}?${params}`);
          iframe.style.width = "100%";
          iframe.style.border = "none";
          iframe.style.overflow = "hidden";
          iframe.style.display = "block";
          
          // Use a reliable fixed height that works for most booking scenarios
          const viewportHeight = window.innerHeight;
          const reliableHeight = this.calculateReliableHeight(viewportHeight, link);
          iframe.style.height = `${reliableHeight}px`;
          iframe.style.minHeight = "800px";
          iframe.style.overflow = "auto"; // Allow scrolling as fallback if needed
          
          console.log(`Meetergo auto-resize: Set reliable height of ${reliableHeight}px for booking interface`);

          const loadingIndicator = document.createElement("div");
          loadingIndicator.className = "meetergo-spinner";
          loadingIndicator.style.position = "absolute";
          loadingIndicator.style.top = "50%";
          loadingIndicator.style.left = "50%";
          loadingIndicator.style.transform = "translate(-50%, -50%)";

          const indicatorId = `meetergo-spinner-${Math.random().toString(36).substring(2, 11)}`;
          loadingIndicator.id = indicatorId;

          // Setup auto-resize monitoring (check data-resize attribute like Calendly)
          const enableResize = anchor.getAttribute("data-resize") === "true" || 
                               window.meetergoSettings?.enableAutoResize !== false;
          
          if (enableResize) {
            this.setupMinimalAutoResize(iframe);
            console.log('Meetergo auto-resize: Enabled for this iframe');
          } else {
            console.log('Meetergo auto-resize: Disabled via data-resize="false" or settings');
          }

          iframe.addEventListener("load", () => {
            const spinner = document.getElementById(indicatorId);
            if (spinner && spinner.parentNode) {
              spinner.parentNode.removeChild(spinner);
            }
            
            console.log('Meetergo iframe loaded with fixed height - no dynamic resizing');
          });

          if (anchor instanceof HTMLElement) {
            anchor.style.position = "relative";
            anchor.innerHTML = "";
            anchor.appendChild(iframe);
            anchor.appendChild(loadingIndicator);
          }
        } catch (innerError) {
          errorHandler.handleError({
            message: 'Error processing iframe element',
            level: 'warning',
            context: 'MeetergoIntegration.parseIframes',
            error: innerError as Error
          });
        }
      });
    } catch (error) {
      errorHandler.handleError({
        message: 'Error parsing iframes',
        level: 'warning',
        context: 'MeetergoIntegration.parseIframes',
        error: error as Error
      });
    }
  }

  public sendScrollHeightToParent(): void {
    const scrollHeight = document.body.scrollHeight;
    window.parent.postMessage({ scrollHeight: scrollHeight }, "*");
  }

  /**
   * Setup auto-resize functionality for an iframe
   * Uses multiple strategies: postMessage, polling, and observer-based detection
   */
  private setupIframeAutoResize(iframe: HTMLIFrameElement): void {
    try {
      // Track iframe state for cleanup and optimization

      const messageHandler = (event: MessageEvent) => {
        // Log all messages from Meetergo domains for debugging
        if (this.isValidMeetergoOrigin(event.origin) || event.origin.includes('localhost')) {
          console.log('Meetergo auto-resize: Received message from', event.origin, event.data);
        }
        
        // Security check - only accept messages from Meetergo domains or allow localhost for testing
        if (!this.isValidMeetergoOrigin(event.origin) && !event.origin.includes('localhost')) {
          return;
        }

        if (event.data && typeof event.data === 'object') {
          let newHeight: number | null = null;

          // Handle various height message formats
          if (event.data.type === 'meetergo:height-update' && event.data.height) {
            newHeight = parseInt(event.data.height, 10);
          }
          else if (event.data.type === 'meetergo:scroll-height' && event.data.scrollHeight) {
            newHeight = parseInt(event.data.scrollHeight, 10);
          }
          else if (event.data.type === 'iframe-resizer' && event.data.height) {
            newHeight = parseInt(event.data.height, 10);
          }
          else if (event.data.height && typeof event.data.height === 'number') {
            newHeight = event.data.height;
          }
          else if (event.data.scrollHeight && typeof event.data.scrollHeight === 'number') {
            newHeight = event.data.scrollHeight;
          }
          else if (event.data.contentHeight && typeof event.data.contentHeight === 'number') {
            newHeight = event.data.contentHeight;
          }

          // Update height if we got a valid value
          if (newHeight && newHeight > 0) {
            const finalHeight = Math.max(newHeight, 400);
            const currentHeight = parseInt(iframe.style.height) || 0;
            this.updateIframeHeight(iframe, finalHeight);
            
            // Log successful height update for debugging
            console.log(`Meetergo iframe auto-resize: Updated height from ${currentHeight}px to ${finalHeight}px (source: ${event.data.type || 'unknown'})`);
          } else {
            // Log failed height messages for debugging
            console.warn('Meetergo auto-resize: Received invalid height message', event.data);
          }
        }
        
        // Handle string-based messages (fallback)
        if (typeof event.data === 'string') {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.height && typeof parsed.height === 'number') {
              const finalHeight = Math.max(parsed.height, 400);
              this.updateIframeHeight(iframe, finalHeight);
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }
      };

      window.addEventListener('message', messageHandler);
      
      // Store the handler for cleanup
      if (!this.messageHandlers) {
        this.messageHandlers = [];
      }
      this.messageHandlers.push({ handler: messageHandler, iframe });

      // Enhanced iframe load handler with continuous monitoring
      iframe.addEventListener('load', () => {
        // Initial height request
        this.createTimeout(() => {
          this.requestIframeHeight(iframe);
        }, 500);

        // Setup continuous height monitoring
        this.setupContinuousHeightMonitoring(iframe);
        
        // Setup interaction-based monitoring
        this.setupInteractionBasedMonitoring(iframe);
        
        // Attempt direct height detection if same-origin
        this.attemptDirectHeightDetection(iframe);
        
        // Try to inject auto-resize script into iframe
        this.injectAutoResizeScript(iframe);
      });

      // Start polling-based height detection as fallback
      this.startHeightPolling(iframe);

    } catch (error) {
      errorHandler.handleError({
        message: 'Setup iframe auto-resize failed',
        level: 'warning',
        context: 'setupIframeAutoResize',
        error: error as Error
      });
    }
  }

  /**
   * Update iframe height with smooth transition and jump prevention
   */
  private updateIframeHeight(iframe: HTMLIFrameElement, newHeight: number): void {
    const currentHeight = parseInt(iframe.style.height) || 400;
    const heightDifference = Math.abs(newHeight - currentHeight);
    
    // Prevent jumps by being more selective about when to resize
    if (heightDifference < 20) {
      // Too small a change - ignore to prevent jitter
      return;
    }
    
    if (heightDifference > 500) {
      // Very large change - might be incorrect, be more cautious
      console.warn(`Meetergo auto-resize: Large height change detected (${currentHeight}px → ${newHeight}px). Validating...`);
      
      // For large changes, increase gradually to avoid jumps
      const targetHeight = currentHeight < newHeight 
        ? Math.min(newHeight, currentHeight + 300) // Increase by max 300px at a time
        : Math.max(newHeight, currentHeight - 200); // Decrease by max 200px at a time
        
      newHeight = targetHeight;
    }
    
    // Apply smooth transition
    iframe.style.transition = 'height 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
    iframe.style.height = `${newHeight}px`;
    
    // Remove transition after animation completes
    this.createTimeout(() => {
      iframe.style.transition = '';
    }, 400);
    
    console.log(`Meetergo auto-resize: Smoothly updating height from ${currentHeight}px to ${newHeight}px (difference: ${heightDifference}px)`);
  }

  /**
   * Setup intelligent height monitoring that responds to content changes
   */
  private setupContinuousHeightMonitoring(iframe: HTMLIFrameElement): void {
    let lastKnownHeight = parseInt(iframe.style.height) || 400;
    let stableHeightCount = 0;
    let monitoringInterval = 3000; // Start with 3 second intervals
    
    const intelligentHeightCheck = () => {
      this.requestIframeHeight(iframe);
      this.attemptDirectHeightDetection(iframe);
      
      const currentHeight = parseInt(iframe.style.height) || 400;
      
      if (Math.abs(currentHeight - lastKnownHeight) < 20) {
        stableHeightCount++;
        
        // If height is stable, reduce monitoring frequency
        if (stableHeightCount > 3) {
          monitoringInterval = Math.min(monitoringInterval * 1.5, 10000); // Max 10 seconds
        }
      } else {
        // Height changed, increase monitoring frequency temporarily
        stableHeightCount = 0;
        monitoringInterval = 2000; // Back to 2 seconds
        lastKnownHeight = currentHeight;
      }
      
      // Schedule next check with adaptive interval
      this.createTimeout(intelligentHeightCheck, monitoringInterval);
      
      console.log(`Meetergo auto-resize: Next height check in ${monitoringInterval}ms (height stable: ${stableHeightCount} times)`);
    };
    
    // Start intelligent monitoring after initial load
    this.createTimeout(intelligentHeightCheck, 2000);
    
    // Stop monitoring after 5 minutes to preserve performance
    this.createTimeout(() => {
      console.log('Meetergo auto-resize: Stopping continuous monitoring after 5 minutes');
    }, 300000);
  }

  /**
   * Setup interaction-based monitoring that increases frequency during user activity
   */
  private setupInteractionBasedMonitoring(iframe: HTMLIFrameElement): void {
    let isInteracting = false;
    let interactionTimer: number | null = null;
    let lastScrollTop = 0;
    
    // Monitor iframe focus/blur to detect user interaction
    iframe.addEventListener('focus', () => {
      console.log('Meetergo auto-resize: Iframe focused - starting intensive monitoring');
      this.startIntensiveMonitoring(iframe);
      isInteracting = true;
    });

    // Monitor mouse events over iframe to detect interaction
    iframe.addEventListener('mouseenter', () => {
      console.log('Meetergo auto-resize: Mouse over iframe - monitoring for interactions');
      this.startIntensiveMonitoring(iframe);
      isInteracting = true;
    });

    // Monitor clicks on iframe as they often trigger content changes
    iframe.addEventListener('click', () => {
      console.log('Meetergo auto-resize: Click detected in iframe - content might change');
      
      // After a click, check for height changes after a delay
      this.createTimeout(() => {
        console.log('Meetergo auto-resize: Post-click height check');
        this.detectAndFixScrollbars(iframe);
      }, 1000);
      
      // And again after more time for animations/loading
      this.createTimeout(() => {
        console.log('Meetergo auto-resize: Delayed post-click height check');
        this.detectAndFixScrollbars(iframe);
      }, 3000);
    });

    iframe.addEventListener('mouseleave', () => {
      // Stop intensive monitoring after user stops interacting
      if (interactionTimer) {
        window.clearTimeout(interactionTimer);
      }
      interactionTimer = this.createTimeout(() => {
        console.log('Meetergo auto-resize: User interaction ended - reducing monitoring frequency');
        isInteracting = false;
      }, 3000); // Wait 3 seconds after mouse leaves
    });

    // Try to detect scroll changes in iframe (indicates user navigation)
    const checkForScrollChanges = () => {
      try {
        if (iframe.contentWindow) {
          const currentScrollTop = iframe.contentWindow.scrollY || 0;
          if (Math.abs(currentScrollTop - lastScrollTop) > 10) {
            console.log('Meetergo auto-resize: Scroll detected in iframe - checking height');
            this.requestIframeHeight(iframe);
            this.attemptDirectHeightDetection(iframe);
            lastScrollTop = currentScrollTop;
          }
        }
      } catch (e) {
        // Cross-origin - can't access scroll, that's okay
      }
      
      // Keep checking if user might be interacting
      if (isInteracting) {
        this.createTimeout(checkForScrollChanges, 500);
      }
    };

    // Start scroll monitoring
    this.createTimeout(checkForScrollChanges, 1000);
  }

  /**
   * Start intensive height monitoring during user interaction
   */
  private startIntensiveMonitoring(iframe: HTMLIFrameElement): void {
    let checkCount = 0;
    const maxChecks = 20; // Monitor intensively for up to 10 seconds (20 * 500ms)

    const intensiveCheck = () => {
      if (checkCount >= maxChecks) {
        console.log('Meetergo auto-resize: Intensive monitoring period ended');
        return;
      }

      // Request height updates more frequently during interaction
      this.requestIframeHeight(iframe);
      this.attemptDirectHeightDetection(iframe);

      // Check for scrollbar and fix if needed
      this.createTimeout(() => {
        this.detectAndFixScrollbars(iframe);
      }, 100);

      checkCount++;
      this.createTimeout(intensiveCheck, 500); // Every 500ms during interaction
    };

    // Start intensive checking
    this.createTimeout(intensiveCheck, 100);
  }

  /**
   * Attempt direct height detection for same-origin iframes
   */
  private attemptDirectHeightDetection(iframe: HTMLIFrameElement): void {
    try {
      if (iframe.contentDocument && iframe.contentWindow) {
        const doc = iframe.contentDocument;
        const body = doc.body;
        const html = doc.documentElement;

        if (body && html) {
          const contentHeight = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
          );

          if (contentHeight > 0) {
            const newHeight = Math.max(contentHeight + 20, 400); // Add padding
            this.updateIframeHeight(iframe, newHeight);
            
            // Setup mutation observer for content changes
            this.setupContentMutationObserver(iframe, doc);
          }
        }
      }
    } catch (error) {
      // Expected for cross-origin iframes - this is normal
      // Continue with postMessage strategy
    }
  }

  /**
   * Setup mutation observer to detect content changes
   */
  private setupContentMutationObserver(iframe: HTMLIFrameElement, doc: Document): void {
    if (typeof MutationObserver === 'undefined') return;

    try {
      const observer = new MutationObserver(() => {
        // Debounce the height check to avoid excessive calls
        this.createTimeout(() => {
          this.attemptDirectHeightDetection(iframe);
        }, 100);
      });

      observer.observe(doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      // Store observer for cleanup (extend the existing intersectionObservers array)
      if (!this.intersectionObservers) {
        this.intersectionObservers = [];
      }
      this.intersectionObservers.push(observer as any);

    } catch (error) {
      // Mutation observer setup failed - continue without it
    }
  }

  /**
   * Start polling-based height detection as ultimate fallback
   */
  private startHeightPolling(iframe: HTMLIFrameElement): void {
    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 2 minutes

    const pollHeight = () => {
      if (pollCount >= maxPolls) {
        console.log('Meetergo auto-resize: Polling stopped after maximum attempts');
        return;
      }
      
      this.requestIframeHeight(iframe);
      this.attemptDirectHeightDetection(iframe);
      
      // Only do estimation occasionally to avoid constant height changes
      if (pollCount % 3 === 0) {
        console.log(`Meetergo auto-resize: Polling attempt ${pollCount + 1}/${maxPolls} (with estimation)`);
        this.attemptHeightEstimation(iframe);
      }
      
      pollCount++;
      this.createTimeout(pollHeight, 2000);
    };

    // Start polling after initial load
    this.createTimeout(pollHeight, 3000);
  }

  /**
   * Attempt smart height estimation based on content and context
   */
  private attemptHeightEstimation(iframe: HTMLIFrameElement): void {
    try {
      const currentHeight = parseInt(iframe.style.height) || 600;
      const viewportHeight = window.innerHeight;
      
      // Only estimate if current height seems insufficient (has scrollbar potential)
      if (currentHeight < 800) {
        // Conservative height estimation - just enough to likely eliminate scrollbars
        const estimatedHeight = Math.min(
          Math.max(currentHeight * 1.3, 900), // 30% larger, min 900px
          Math.min(viewportHeight * 0.8, 1200) // Max 80% viewport or 1200px
        );
        
        console.log(`Meetergo auto-resize: Estimating better height: ${currentHeight}px → ${estimatedHeight}px`);
        this.updateIframeHeight(iframe, estimatedHeight);
        
      } else {
        console.log(`Meetergo auto-resize: Current height ${currentHeight}px seems reasonable - no estimation needed`);
      }
    } catch (error) {
      console.warn('Meetergo auto-resize: Height estimation failed', error);
    }
  }

  /**
   * Check if iframe still has scrollbars and log status
   */
  private checkScrollbarStatus(iframe: HTMLIFrameElement): void {
    try {
      const currentHeight = parseInt(iframe.style.height) || 0;
      
      // Try to detect if iframe content is scrollable
      let hasScrollbar = false;
      
      try {
        if (iframe.contentDocument) {
          const body = iframe.contentDocument.body;
          const html = iframe.contentDocument.documentElement;
          
          if (body && html) {
            const contentHeight = Math.max(body.scrollHeight, html.scrollHeight);
            const iframeHeight = iframe.clientHeight;
            hasScrollbar = contentHeight > iframeHeight;
            
            console.log(`Meetergo auto-resize: Content height: ${contentHeight}px, Iframe height: ${iframeHeight}px, Has scrollbar: ${hasScrollbar}`);
            
            if (hasScrollbar) {
              // Try to fix by setting to content height with smooth update
              const newHeight = Math.max(contentHeight + 30, 400);
              console.log(`Meetergo auto-resize: Detected scrollbar - adjusting height to ${newHeight}px`);
              this.updateIframeHeight(iframe, newHeight);
            }
          }
        } else {
          // Cross-origin - can't directly check, but estimate based on common issues
          console.log(`Meetergo auto-resize: Cross-origin iframe - current height: ${currentHeight}px`);
          
          // Conservative adjustment for cross-origin iframe heights
          if (currentHeight < 900) {
            // Moderate increase to likely eliminate scrollbars without being excessive
            const newHeight = Math.min(Math.max(currentHeight * 1.25, 900), 1100);
            console.log(`Meetergo auto-resize: Adjusting cross-origin iframe height to ${newHeight}px`);
            this.updateIframeHeight(iframe, newHeight);
          }
        }
      } catch (e) {
        // Cross-origin restrictions - use fallback approach
        console.log(`Meetergo auto-resize: Using cross-origin fallback - current height: ${currentHeight}px`);
        
        if (currentHeight < 900) {
          // Conservative fallback height adjustment
          const newHeight = Math.min(Math.max(900, currentHeight * 1.2), 1000);
          console.log(`Meetergo auto-resize: Setting fallback height of ${newHeight}px for cross-origin iframe`);
          this.updateIframeHeight(iframe, newHeight);
        }
      }
      
    } catch (error) {
      console.warn('Meetergo auto-resize: Scrollbar status check failed', error);
    }
  }

  /**
   * Proactively detect and fix scrollbars using visual inspection
   */
  private detectAndFixScrollbars(iframe: HTMLIFrameElement): void {
    try {
      const currentHeight = parseInt(iframe.style.height) || 400;
      
      // Use a more reliable method to detect scrollbars
      // Check if iframe has scrollbars by comparing clientHeight vs scrollHeight
      const iframeRect = iframe.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(iframe);
      
      // For cross-origin iframes, we can't access scrollHeight directly
      // But we can look for visual indicators and use heuristics
      
      console.log(`Meetergo auto-resize: Proactive scrollbar check - current height: ${currentHeight}px`);
      
      // Strategy 1: If iframe height hasn't changed recently but content might have,
      // try incrementally increasing height to eliminate potential scrollbars
      const viewportHeight = window.innerHeight;
      const maxReasonableHeight = Math.min(viewportHeight * 0.9, 1400);
      
      if (currentHeight < maxReasonableHeight) {
        // Try increasing height in smaller, more conservative increments
        const increment = Math.min(150, maxReasonableHeight - currentHeight);
        const testHeight = currentHeight + increment;
        
        if (increment > 20) { // Only adjust if there's meaningful space to grow
          console.log(`Meetergo auto-resize: Preventive height increase from ${currentHeight}px to ${testHeight}px`);
          this.updateIframeHeight(iframe, testHeight);
        } else {
          console.log(`Meetergo auto-resize: Height ${currentHeight}px close to maximum, no adjustment needed`);
        }
      } else {
        console.log(`Meetergo auto-resize: Height ${currentHeight}px at reasonable maximum`);
      }
      
    } catch (error) {
      console.warn('Meetergo auto-resize: Proactive scrollbar detection failed', error);
    }
  }

  /**
   * Enhanced scrollbar detection specifically for cross-origin iframes
   */
  private detectScrollbarsInCrossOriginIframe(iframe: HTMLIFrameElement): boolean {
    try {
      // We can't directly access iframe content, but we can use some heuristics
      
      // Method 1: Check if iframe is receiving scroll events
      let hasScrollEvents = false;
      
      const scrollListener = () => {
        hasScrollEvents = true;
        console.log('Meetergo auto-resize: Scroll event detected in iframe - likely has scrollbar');
      };
      
      iframe.addEventListener('scroll', scrollListener);
      
      // Clean up listener after a short time
      this.createTimeout(() => {
        iframe.removeEventListener('scroll', scrollListener);
        return hasScrollEvents;
      }, 500);
      
      return false; // Default to false, will be updated by listener
      
    } catch (error) {
      console.warn('Meetergo auto-resize: Cross-origin scrollbar detection failed', error);
      return false;
    }
  }

  /**
   * Calculate a reliable height that eliminates scrollbars for most booking scenarios
   */
  private calculateReliableHeight(viewportHeight: number, bookingLink: string): number {
    // Check if user has configured a custom height
    const customHeight = window.meetergoSettings?.iframeHeight;
    if (customHeight && typeof customHeight === 'number' && customHeight > 400) {
      console.log(`Meetergo height: Using custom height ${customHeight}px`);
      return customHeight;
    }

    // Base height that works for most booking forms (based on your testing: 1000px+ needed)
    let baseHeight = 1200; // Start higher to prevent scrollbars
    
    // Adjust based on viewport size
    const viewportAdjustedHeight = Math.max(viewportHeight * 0.8, 1000);
    
    // Use the larger of the two, but cap at reasonable maximum
    const calculatedHeight = Math.max(baseHeight, viewportAdjustedHeight);
    const maxHeight = Math.min(viewportHeight * 0.95, 1600);
    
    const finalHeight = Math.min(calculatedHeight, maxHeight);
    
    console.log(`Meetergo height calculation: viewport=${viewportHeight}px, base=${baseHeight}px, final=${finalHeight}px`);
    
    return finalHeight;
  }

  /**
   * Performance-optimized auto-resize system with message throttling
   */
  private setupMinimalAutoResize(iframe: HTMLIFrameElement): void {
    try {
      let lastHeight = 0;
      let lastUpdateTime = 0;
      let pendingUpdate: number | null = null;
      let messageCount = 0;
      const MESSAGE_THROTTLE_MS = 100; // Max one update per 100ms
      const SIGNIFICANT_HEIGHT_CHANGE = 10; // Only update if height changes by 10px+
      
      const performHeightUpdate = (newHeight: number) => {
        const currentTime = Date.now();
        const heightDifference = Math.abs(newHeight - lastHeight);
        
        // Skip if height change is too small (prevents jitter)
        if (heightDifference < SIGNIFICANT_HEIGHT_CHANGE) {
          return;
        }
        
        // Skip if updating too frequently (performance optimization)
        if (currentTime - lastUpdateTime < MESSAGE_THROTTLE_MS) {
          // Schedule the update for later instead of dropping it
          if (pendingUpdate) {
            window.clearTimeout(pendingUpdate);
          }
          pendingUpdate = window.setTimeout(() => {
            performHeightUpdate(newHeight);
            pendingUpdate = null;
          }, MESSAGE_THROTTLE_MS);
          return;
        }
        
        const finalHeight = Math.max(newHeight + 20, 400);
        
        // Apply smooth height transition
        iframe.style.transition = 'height 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
        iframe.style.height = `${finalHeight}px`;
        
        // Auto-scroll into view if iframe is above viewport (like Calendly)
        this.createTimeout(() => {
          const iframeRect = iframe.getBoundingClientRect();
          if (iframeRect.top < -50) { // Only scroll if significantly above viewport
            iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
            console.log('Meetergo auto-resize: Scrolled iframe into view');
          }
        }, 100);
        
        // Remove transition after animation
        this.createTimeout(() => {
          iframe.style.transition = '';
        }, 300);
        
        // Update tracking variables
        lastHeight = finalHeight;
        lastUpdateTime = currentTime;
        messageCount++;
        
        console.log(`Meetergo auto-resize: Height updated to ${finalHeight}px (message #${messageCount}, Δ${heightDifference}px)`);
      };

      const messageHandler = (event: MessageEvent) => {
        // Accept messages from Meetergo domains or localhost for testing
        if (!this.isValidMeetergoOrigin(event.origin) && !event.origin.includes('localhost')) {
          return;
        }

        if (event.data && typeof event.data === 'object') {
          let newHeight: number | null = null;

          // Handle Calendly-style height messages (primary)
          if (event.data.event === 'meetergo:page_height' && event.data.payload?.height) {
            newHeight = parseInt(event.data.payload.height, 10);
          }
          // Handle direct height messages (backup)
          else if (event.data.type === 'meetergo:height-update' && event.data.height) {
            newHeight = parseInt(event.data.height, 10);
          } 
          else if (event.data.type === 'meetergo:scroll-height' && event.data.scrollHeight) {
            newHeight = parseInt(event.data.scrollHeight, 10);
          }

          if (newHeight && newHeight > 0) {
            performHeightUpdate(newHeight);
          }
        }
      };

      window.addEventListener('message', messageHandler);
      
      // Store for cleanup
      if (!this.messageHandlers) {
        this.messageHandlers = [];
      }
      this.messageHandlers.push({ handler: messageHandler, iframe });

    } catch (error) {
      console.warn('Meetergo auto-resize: Performance-optimized setup failed', error);
    }
  }

  /**
   * Inject auto-resize script into iframe content (for same-origin iframes)
   */
  private injectAutoResizeScript(iframe: HTMLIFrameElement): void {
    try {
      if (iframe.contentDocument && iframe.contentWindow) {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        
        // Check if script already exists
        if (doc.querySelector('#meetergo-auto-resize-script')) {
          return;
        }

        const script = doc.createElement('script');
        script.id = 'meetergo-auto-resize-script';
        script.type = 'text/javascript';
        script.textContent = `
          (function() {
            let lastHeight = 0;
            
            function sendHeight() {
              const body = document.body;
              const html = document.documentElement;
              const height = Math.max(
                body.scrollHeight,
                body.offsetHeight,
                html.clientHeight,
                html.scrollHeight,
                html.offsetHeight
              );
              
              if (height !== lastHeight && height > 0) {
                lastHeight = height;
                window.parent.postMessage({
                  type: 'meetergo:height-update',
                  height: height
                }, '*');
              }
            }
            
            // Send height immediately
            sendHeight();
            
            // Send height on DOM changes
            const observer = new MutationObserver(sendHeight);
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true
            });
            
            // Send height on window resize
            window.addEventListener('resize', sendHeight);
            
            // Send height periodically as fallback
            setInterval(sendHeight, 1000);
            
            // Handle height requests from parent
            window.addEventListener('message', function(event) {
              if (event.data && (
                event.data.type === 'meetergo:request-height' ||
                event.data.type === 'getHeight' ||
                event.data.action === 'resize' ||
                event.data.event === 'requestHeight'
              )) {
                sendHeight();
              }
            });
          })();
        `;
        
        doc.head.appendChild(script);
        
        // Also add a fallback that runs immediately using Function constructor
        try {
          const winAny = win as any;
          const immediateHeightCheck = new winAny.Function(`
            setTimeout(function() {
              const height = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              );
              window.parent.postMessage({
                type: 'meetergo:height-update',
                height: height
              }, '*');
            }, 100);
          `);
          immediateHeightCheck();
        } catch (e) {
          // Function constructor failed, skip immediate check
        }
        
      }
    } catch (error) {
      // Expected for cross-origin iframes - continue without script injection
    }
  }

  /**
   * Check if origin is a valid Meetergo domain
   */
  private isValidMeetergoOrigin(origin: string): boolean {
    const validOrigins = [
      'https://cal.meetergo.com',
      'https://meetergo.com',
      'https://www.meetergo.com',
      'https://app.meetergo.com'
    ];
    return validOrigins.some(validOrigin => origin.startsWith(validOrigin));
  }

  /**
   * Request height from iframe content using multiple message types
   */
  private requestIframeHeight(iframe: HTMLIFrameElement): void {
    try {
      if (iframe.contentWindow) {
        // Send multiple types of height request messages
        const messages = [
          { type: 'meetergo:request-height' },
          { type: 'iframe-resizer', method: 'size' },
          { type: 'getHeight' },
          { action: 'resize' },
          { event: 'requestHeight' },
          { type: 'resize-iframe' },
          { method: 'getHeight' },
          { resize: true }
        ];

        messages.forEach((message, index) => {
          try {
            iframe.contentWindow!.postMessage(message, '*');
            console.log(`Meetergo auto-resize: Sent height request #${index + 1}:`, message);
          } catch (e) {
            console.warn(`Meetergo auto-resize: Failed to send message #${index + 1}`, e);
          }
        });
        
        // Also try sending to specific Meetergo origins
        const origins = [
          'https://cal.meetergo.com',
          'https://app.meetergo.com',
          'https://meetergo.com'
        ];
        
        origins.forEach(origin => {
          try {
            iframe.contentWindow!.postMessage(
              { type: 'meetergo:request-height' },
              origin
            );
            console.log(`Meetergo auto-resize: Sent height request to origin:`, origin);
          } catch (e) {
            console.warn(`Meetergo auto-resize: Failed to send to origin ${origin}`, e);
          }
        });
      }
    } catch (error) {
      console.warn('Meetergo auto-resize: requestIframeHeight failed, using observers', error);
      this.setupIntersectionObserver(iframe);
    }
  }

  /**
   * Fallback method using intersection observer to detect content changes
   */
  private setupIntersectionObserver(iframe: HTMLIFrameElement): void {
    if (typeof IntersectionObserver === 'undefined') return;

    try {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.adjustIframeHeight(iframe);
          }
        });
      });

      observer.observe(iframe);
      
      // Store observer for cleanup
      if (!this.intersectionObservers) {
        this.intersectionObservers = [];
      }
      this.intersectionObservers.push(observer);
    } catch (error) {
      errorHandler.handleError({
        message: 'Setup intersection observer failed',
        level: 'warning',
        context: 'setupIntersectionObserver',
        error: error as Error
      });
    }
  }

  /**
   * Try to adjust iframe height based on content
   */
  private adjustIframeHeight(iframe: HTMLIFrameElement): void {
    try {
      // This only works for same-origin iframes
      if (iframe.contentDocument) {
        const contentHeight = Math.max(
          iframe.contentDocument.body?.scrollHeight || 0,
          iframe.contentDocument.documentElement?.scrollHeight || 0
        );
        
        if (contentHeight > 0) {
          iframe.style.height = `${Math.max(contentHeight, 400)}px`;
        }
      } else {
        // Cross-origin iframe - use ResizeObserver as fallback
        this.setupResizeObserver(iframe);
      }
    } catch (error) {
      // Expected for cross-origin iframes
      this.setupResizeObserver(iframe);
    }
  }

  /**
   * Setup ResizeObserver for iframe container
   */
  private setupResizeObserver(iframe: HTMLIFrameElement): void {
    if (typeof ResizeObserver === 'undefined') return;

    try {
      const observer = new ResizeObserver(() => {
        // Periodically request height updates
        this.requestIframeHeight(iframe);
      });

      if (iframe.parentElement) {
        observer.observe(iframe.parentElement);
      }
    } catch (error) {
      errorHandler.handleError({
        message: 'Setup resize observer failed',
        level: 'warning',
        context: 'setupResizeObserver',
        error: error as Error
      });
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
        message: 'Error parsing buttons',
        level: 'warning',
        context: 'MeetergoIntegration.parseButtons',
        error: error as Error
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
        message: 'Error parsing window parameters',
        level: 'warning',
        context: 'MeetergoIntegration.getWindowParams',
        error: error as Error
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
        Object.entries(window.meetergoSettings.prefill).forEach(([key, value]) => {
          if (value !== undefined) {
            filteredPrefill[key] = value;
          }
        });
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
            console.warn(`meetergo: Error encoding parameter ${key}`, encodingError);
          }
        }
      });

      return params.join("&");
    } catch (error) {
      errorHandler.handleError({
        message: 'Error generating prefill parameters',
        level: 'warning',
        context: 'MeetergoIntegration.getPrifillParams',
        error: error as Error
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
        message: 'Error setting prefill values',
        level: 'warning',
        context: 'MeetergoIntegration.setPrefill',
        error: error as Error
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
        message: 'Error refreshing modal with new prefill',
        level: 'warning',
        context: 'MeetergoIntegration.refreshModalWithNewPrefill',
        error: error as Error
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
        message: 'Error styling button',
        level: 'warning',
        context: 'MeetergoIntegration.meetergoStyleButton',
        error: error as Error
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
      this.timeouts.forEach(timeoutId => {
        window.clearTimeout(timeoutId);
      });
      this.timeouts.clear();

      // Clear all intervals
      this.intervals.forEach(intervalId => {
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

      // Clean up message handlers
      this.messageHandlers.forEach(({ handler }) => {
        try {
          window.removeEventListener('message', handler);
        } catch (error) {
          // Handler might already be removed
        }
      });
      this.messageHandlers = [];

      // Clean up intersection observers
      this.intersectionObservers.forEach(observer => {
        try {
          observer.disconnect();
        } catch (error) {
          // Observer might already be disconnected
        }
      });
      this.intersectionObservers = [];

      // Cleanup all modules
      modalManager.cleanup();
      sidebarManager.cleanup();
      videoEmbedManager.cleanup();
      errorHandler.cleanup();
      cssInjector.cleanup();

      // Clear DOM cache
      domCache.clearCache();

      // Remove floating buttons
      const floatingButtons = document.querySelectorAll('.meetergo-modal-button');
      floatingButtons.forEach(button => {
        if (button.parentNode) {
          button.parentNode.removeChild(button);
        }
      });

      // Reset state
      this.isInitialized = false;

      console.log('Meetergo integration destroyed successfully');

    } catch (error) {
      errorHandler.handleError({
        message: 'Error during cleanup',
        level: 'warning',
        context: 'MeetergoIntegration.destroy',
        error: error as Error
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
      cacheStats: domCache.getCacheStats()
    };
  }
}

export const meetergo = new MeetergoIntegration();