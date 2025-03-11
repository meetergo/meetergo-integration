import { MeetergoSettings } from "./declarations";

export class MeetergoIntegration {
  /**
   * Stores DOM elements with bound Meetergo scheduler events
   * @private
   */
  private boundElements: Map<HTMLElement, (e: Event) => void> = new Map();
  constructor() {
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
  }

  public init(): void {
    this.listenToForms();
    this.addFloatingButton();
    this.addSidebar();
    this.addModal();
    this.parseIframes();
    this.parseButtons();
    this.addListeners();
    this.addGeneralCss();
  }

  private addGeneralCss() {
    const style = document.createElement("style");
    style.textContent = /*css*/ `
    .close-button {
      all: unset;
      position: absolute;
      top: 16px;
      right: 16px;
      background: #fff;
      border-radius: 100%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 350ms;
      color: #9ca3af;
      cursor: pointer;
    }

    .close-button:hover{
      color: #000;
    }

    .meetergo-spinner {
      position: absolute;
      width: 48px;
      height: 48px;
      border: 6px solid #FFF;
      border-bottom-color: #d1d5db;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
    }

    @keyframes rotation {
      0% {
          transform: rotate(0deg);
      }
      100% {
          transform: rotate(360deg);
      }
    }
    
    /* Button animations */
    @keyframes meetergo-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    @keyframes meetergo-bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
    }
    
    @keyframes meetergo-slide-in-right {
      0% { transform: translateX(100%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes meetergo-slide-in-left {
      0% { transform: translateX(-100%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes meetergo-slide-in-top {
      0% { transform: translateY(-100%); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes meetergo-slide-in-bottom {
      0% { transform: translateY(100%); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    .meetergo-animation-pulse {
      animation: meetergo-pulse 2s infinite ease-in-out;
    }
    
    .meetergo-animation-bounce {
      animation: meetergo-bounce 2s infinite;
    }
    
    .meetergo-animation-slide-in-right {
      animation: meetergo-slide-in-right 0.5s forwards;
    }
    
    .meetergo-animation-slide-in-left {
      animation: meetergo-slide-in-left 0.5s forwards;
    }
    
    .meetergo-animation-slide-in-top {
      animation: meetergo-slide-in-top 0.5s forwards;
    }
    
    .meetergo-animation-slide-in-bottom {
      animation: meetergo-slide-in-bottom 0.5s forwards;
    }

    /* Sidebar styles */
    .meetergo-sidebar {
      position: fixed;
      top: 0;
      height: 100%;
      transition: transform 0.3s ease;
      z-index: 9998;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    .meetergo-sidebar-left {
      left: 0;
      transform: translateX(-100%);
    }

    .meetergo-sidebar-right {
      right: 0;
      transform: translateX(100%);
    }

    .meetergo-sidebar.open {
      transform: translateX(0);
    }

    .meetergo-sidebar-toggle {
      position: fixed;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: 50px;
      height: 120px;
      background-color: #0A64BC;
      color: white;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      border: none;
      outline: none;
      padding: 12px 5px;
    }

    .meetergo-sidebar-toggle-left {
      left: 0;
      border-radius: 0 8px 8px 0;
      border-left: none;
    }

    .meetergo-sidebar-toggle-right {
      right: 0;
      border-radius: 8px 0 0 8px;
      border-right: none;
    }

    .meetergo-sidebar-toggle:hover {
      background-color: #0852a8;
      width: 55px;
    }
    
    .meetergo-sidebar-toggle-left:hover {
      box-shadow: 4px 0 10px rgba(0, 0, 0, 0.15);
    }
    
    .meetergo-sidebar-toggle-right:hover {
      box-shadow: -4px 0 10px rgba(0, 0, 0, 0.15);
    }
    
    .meetergo-sidebar-toggle-hidden {
      opacity: 0;
      pointer-events: none;
    }

    .meetergo-sidebar-toggle-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .meetergo-sidebar-toggle-text {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      margin-top: 8px;
      font-size: 12px;
      letter-spacing: 1px;
      font-weight: 500;
    }

    .meetergo-sidebar-close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      color: #666;
      padding: 5px;
      font-size: 20px;
      z-index: 10000;
    }

    .meetergo-sidebar-close:hover {
      color: #000;
    }

    .meetergo-sidebar-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      flex: 1;
      overflow: auto;
    }
    `;
    document.head.appendChild(style);
  }

  public onFormSubmit(e: Event): void {
    if (!(e.currentTarget instanceof HTMLFormElement)) return;

    const target = e.currentTarget;
    e.preventDefault();
    if (!target) return;

    const targetListener = window.meetergoSettings?.formListeners.find(
      (listener) => {
        // Need to define `id`
        if (!target.id) return false;
        return target.id === listener.formId;
      }
    );
    if (!targetListener) return;

    e.preventDefault();
    const formData = new FormData(target);
    const data: Record<string, string> = {};
    for (const [key, value] of formData) {
      data[key] = value.toString();
    }
    window.meetergo.openModalWithContent({
      link: targetListener.link,
      existingParams: data,
    });
  }

  private listenToForms(): void {
    const forms = document.querySelectorAll("form");

    for (const form of forms) {
      form.addEventListener("submit", this.onFormSubmit, false);
    }
  }

  private addFloatingButton(): void {
    if (
      window.meetergoSettings?.floatingButton &&
      window.meetergoSettings?.floatingButton?.position &&
      window.meetergoSettings?.floatingButton.link
    ) {
      const position = window.meetergoSettings?.floatingButton.position;
      let button = document.createElement("button");
      button.classList.add("meetergo-modal-button");
      button.innerHTML =
        window.meetergoSettings?.floatingButton?.text ?? "Book appointment";

      button.setAttribute("link", window.meetergoSettings.floatingButton.link);

      // CSS
      button.style.position = "fixed";
      position.includes("top")
        ? (button.style.top = "0")
        : (button.style.bottom = "0");
      position.includes("left")
        ? (button.style.left = "0")
        : (button.style.right = "0");
      button = this.meetergoStyleButton(button);

      if (window.meetergoSettings?.floatingButton.backgroundColor)
        button.style.backgroundColor =
          window.meetergoSettings?.floatingButton.backgroundColor;
      if (window.meetergoSettings?.floatingButton.textColor)
        button.style.color = window.meetergoSettings?.floatingButton.textColor;

      if (animation !== "none") {
        if (animation === "pulse") {
          button.classList.add("meetergo-animation-pulse");
        } else if (animation === "bounce") {
          button.classList.add("meetergo-animation-bounce");
        } else if (animation === "slide-in") {
          // Choose slide-in direction based on button position
          if (position.includes("right")) {
            button.classList.add("meetergo-animation-slide-in-right");
          } else if (position.includes("left")) {
            button.classList.add("meetergo-animation-slide-in-left");
          } else if (position.includes("top")) {
            button.classList.add("meetergo-animation-slide-in-top");
          } else {
            // bottom
            button.classList.add("meetergo-animation-slide-in-bottom");
          }
        }
      }

      document.body.appendChild(button);
    }
  }

  private addListeners(): void {
    const buttons = document.getElementsByClassName("meetergo-modal-button");
    for (const button of buttons) {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const link =
          button.getAttribute("link") ||
          button.getAttribute("href") ||
          button.getAttribute("data-url");
        if (link) {
          this.openModalWithContent({
            link,
          });
        }
      });
    }

    window.onmessage = (e) => {
      const meetergoEvent = e.data as {
        event: string;
        data: unknown;
      };
      switch (meetergoEvent.event) {
        case "open-modal": {
          const iframeParams = this.getParamsFromMainIframe();
          const data = meetergoEvent.data as {
            link: string;
            params: Record<string, string>;
          };
          this.openModalWithContent({
            link: data.link,
            existingParams: { ...data.params, ...iframeParams },
          });
          break;
        }
        case "close-modal": {
          window.meetergo.closeModal();
          break;
        }
        case "booking-complete": {
          window.meetergoSettings.onSuccess &&
            window.meetergoSettings.onSuccess(meetergoEvent.data as string);
          break;
        }
        case "embed-resize": {
          if (!window.meetergoSettings?.enableAutoResize) break;

          const iframe = document.querySelector(
            ".meetergo-iframe iframe"
          ) as HTMLElement | null;
          const data = meetergoEvent.data as {
            height: number; // height in px
          };

          if (!iframe) break;
          iframe.style.height = `${data.height}px`;
          break;
        }
      }
    };

    // Check if icon exists in our map
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
      document.body.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest(".meetergo-modal-button") as HTMLElement;

        if (button) {
          e.preventDefault();
          const link =
            button.getAttribute("link") || button.getAttribute("href");
          if (link) {
            this.openModalWithContent({ link });
          } else {
            console.warn("meetergo: Button clicked without a link attribute");
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
                console.error("Meetergo: Missing link in open-modal event");
                return;
              }

              this.openModalWithContent({
                link: data.link,
                existingParams: { ...data.params, ...iframeParams },
              });
              break;
            }
            case "close-modal": {
              window.meetergo.closeModal();
              break;
            }
            default: {
              // Ignore unrecognized events
              break;
            }
          }
        } catch (error) {
          console.error("meetergo: Error handling message event", error);
        }
      };
    } catch (error) {
      console.error("meetergo: Error setting up event listeners", error);
    }
  }

  public getParamsFromMainIframe(): Record<string, string> {
    const iframeParams: Record<string, string> = {};
    const divIframe: HTMLElement | null =
      document.querySelector(".meetergo-iframe");
    if (divIframe) {
      const linkAttr =
        divIframe.getAttribute("link") ||
        divIframe.getAttribute("href") ||
        divIframe.getAttribute("data-url");
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
    try {
      if (window.meetergoSettings?.disableModal) {
        return;
      }
      const { link, existingParams } = settings;

      if (!link) {
        console.error("meetergo: Link is required for opening modal");
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.name = "meetergo-embedded-modal";
      const params = this.getPrifillParams(existingParams);
      iframe.setAttribute("src", `${link}?${params}`);
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";

      const modalContent = document.getElementById("meetergo-modal-content");
      if (!modalContent) {
        console.error("meetergo: Modal content element not found");
        return;
      }

      modalContent.innerHTML = "";
      modalContent.appendChild(iframe);
      this.openModal();
    } catch (error) {
      console.error("meetergo: Error opening modal with content", error);
    }
    const { link, existingParams } = settings;
    const iframe = document.createElement("iframe");
    iframe.name = "meetergo-embedded-modal";
    const params = this.getPrifillParams(existingParams);
    iframe.setAttribute("src", `${link}?${params}`);
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden"; // Set initial visibility to hidden

    // Add event listener to show iframe when it loads
    iframe.onload = () => {
      iframe.style.visibility = "visible"; // Show iframe after it has loaded
    };

    const modalContent = document.getElementById("meetergo-modal-content");
    if (modalContent) {
      modalContent.replaceChildren(iframe);
    }
    this.openModal();
  }

  private addModal(): void {
    const modal = document.createElement("div");
    modal.id = "meetergo-modal";
    modal.style.zIndex = "999999";
    modal.style.position = "fixed";
    modal.style.transition = "visibility 0s linear 0.1s,opacity 0.3s ease";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.visibility = "hidden";
    modal.style.opacity = "0";

    const overlay = document.createElement("div");
    overlay.style.zIndex = "1001";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.6)";

    const spinner = document.createElement("div");
    spinner.className = "meetergo-spinner";
    spinner.style.zIndex = "1002";

      overlay.onclick = (e) => {
        e.preventDefault();
        window.meetergo.closeModal();
      };

    const content = document.createElement("div");
    content.id = "meetergo-modal-content";
    content.style.zIndex = "1003";
    content.style.position = "relative";
    content.style.width = "100%";
    content.style.height = "100%";
    content.style.backgroundColor = "rgba(0,0,0,0)";
    content.style.borderRadius = "0.7rem";
    content.style.overflow = "hidden";
    content.style.padding = "16px";

    const button = document.createElement("button");
    button.className = "close-button";
    button.style.zIndex = "1004";
    button.onclick = () => window.meetergo.closeModal();
    button.innerHTML = /*html*/ `<svg
      stroke="currentColor"
      fill="currentColor"
      stroke-width="0"
      viewBox="0 0 512 512"
      height="24px"
      width="24px"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M289.94 256l95-95A24 24 0 00351 127l-95 95-95-95a24 24 0 00-34 34l95 95-95 95a24 24 0 1034 34l95-95 95 95a24 24 0 0034-34z"
      ></path>
    </svg>`;

      const description = document.createElement("p");
      description.id = "meetergo-modal-description";
      description.textContent = "Calendar booking interface";
      description.style.position = "absolute";
      description.style.width = "1px";
      description.style.height = "1px";
      description.style.padding = "0";
      description.style.margin = "-1px";
      description.style.overflow = "hidden";
      description.style.clip = "rect(0, 0, 0, 0)";
      description.style.whiteSpace = "nowrap";
      description.style.borderWidth = "0";

      const button = document.createElement("button");
      button.className = "close-button";
      button.setAttribute("aria-label", "Close booking modal");
      button.setAttribute("type", "button");
      button.style.zIndex = "1004";
      button.onclick = (e) => {
        e.preventDefault();
        window.meetergo.closeModal();
      };
      button.innerHTML = /*html*/ `<svg
        stroke="currentColor"
        fill="currentColor"
        stroke-width="0"
        viewBox="0 0 512 512"
        height="24px"
        width="24px"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M289.94 256l95-95A24 24 0 00351 127l-95 95-95-95a24 24 0 00-34 34l95 95-95 95a24 24 0 1034 34l95-95 95 95a24 24 0 0034-34z"
        ></path>
      </svg>`;

      const fragment = document.createDocumentFragment();
      fragment.appendChild(overlay);
      fragment.appendChild(content);
      fragment.appendChild(spinner);
      fragment.appendChild(button);
      fragment.appendChild(title);
      fragment.appendChild(description);

      modal.appendChild(fragment);
      document.body.appendChild(modal);
    } catch (error) {
      console.error("meetergo: Error adding modal to the page", error);
    }
  }

  private lastActiveElement: Element | null = null;

  /**
   * Binds the meetergo scheduler to any DOM element
   * @param element DOM element to bind the scheduler to
   * @param schedulerLink The link to the meetergo scheduler
   * @param options Optional configuration for the binding
   * @returns The bound element for chaining
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
      // If we should remove existing listeners
      if (options?.removeExistingListeners) {
        // If this element was previously bound, remove the old listener
        if (this.boundElements.has(element)) {
          const oldHandler = this.boundElements.get(element);
          if (oldHandler) {
            element.removeEventListener("click", oldHandler);
            this.boundElements.delete(element);
          }
        }
      }

      // Create the event handler that will open the scheduler
      const clickHandler = (e: Event) => {
        e.preventDefault();

        // Use the provided scheduler link or check if the element has a link attribute
        const link = schedulerLink || element.getAttribute("link");

        if (!link) {
          console.error(
            "meetergo: No scheduler link provided for bound element"
          );
          return;
        }

        this.openModalWithContent({
          link,
          existingParams: options?.params,
        });
      };

      // Bind the event handler
      element.addEventListener("click", clickHandler);

      // Store the element and its handler for potential cleanup later
      this.boundElements.set(element, clickHandler);

      // Make sure the element looks clickable
      if (getComputedStyle(element).cursor !== "pointer") {
        element.style.cursor = "pointer";
      }

      // Add a role if it doesn't have one
      if (!element.getAttribute("role")) {
        element.setAttribute("role", "button");
      }

      return element;
    } catch (error) {
      console.error("Meetergo: Error binding element to scheduler", error);
      return element;
    }
  }

  /**
   * Unbinds a previously bound element from the Meetergo scheduler
   * @param element The element to unbind
   * @returns true if the element was unbound, false otherwise
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
      console.error("meetergo: Error unbinding element from scheduler", error);
      return false;
    }
  }

  /**
   * Programmatically launches the Meetergo scheduler
   * @param schedulerLink Optional custom link to use
   * @param params Optional parameters to pass to the scheduler
   */
  public launchScheduler(
    schedulerLink?: string,
    params?: Record<string, string>
  ): void {
    try {
      let link = schedulerLink;

      // If no link is provided, try to use the default one from settings
      if (!link && window.meetergoSettings?.floatingButton?.link) {
        link = window.meetergoSettings.floatingButton.link;
      }

      if (!link) {
        console.error("meetergo: No scheduler link provided for launch");
        return;
      }

      this.openModalWithContent({
        link,
        existingParams: params,
      });
    } catch (error) {
      console.error(
        "meetergo: Error launching scheduler programmatically",
        error
      );
    }
  }

  public openModal(): void {
    const modal = document.getElementById("meetergo-modal");
    if (modal) {
      modal.style.visibility = "visible";
      modal.style.opacity = "1";

      const buttons = modal.getElementsByClassName("meetergo-spinner");

      if (buttons.length > 0) {
        const [button] = buttons;

        if (button instanceof HTMLElement) {
          button.style.visibility = "visible";
          button.style.opacity = "1";
        }
      }

      modal.style.visibility = "visible";
      modal.style.opacity = "1";

      const spinners = modal.getElementsByClassName("meetergo-spinner");
      if (spinners.length > 0) {
        const spinner = spinners[0] as HTMLElement;
        spinner.style.visibility = "visible";
        spinner.style.opacity = "1";
      }

      const closeButton = modal.querySelector(".close-button") as HTMLElement;
      if (closeButton) {
        setTimeout(() => {
          closeButton.focus();
        }, 100);
      }

      document.body.style.overflow = "hidden";
    } catch (error) {
      console.error("meetergo: Error opening modal", error);
    }
  }

  public closeModal(preventClearContent?: boolean): void {
    const modal = document.getElementById("meetergo-modal");
    if (modal) {
      // Hide Modal
      modal.style.visibility = "hidden";
      modal.style.opacity = "0";
      const buttons = modal.getElementsByClassName("meetergo-spinner");

      modal.style.visibility = "hidden";
      modal.style.opacity = "0";

        if (button instanceof HTMLElement) {
          button.style.visibility = "hidden";
          button.style.opacity = "0";
        }
      }

      if (!preventClearContent) {
        // Clear modal content
        const content = document.getElementById("meetergo-modal-content");
        if (content) {
          content.replaceChildren();
        }
      }

      document.body.style.overflow = "";

      if (this.lastActiveElement instanceof HTMLElement) {
        setTimeout(() => {
          (this.lastActiveElement as HTMLElement).focus();
        }, 100);
      }
    } catch (error) {
      console.error("meetergo: Error closing modal", error);
    }
  }

  public parseIframes(): void {
    const anchors = document.getElementsByClassName("meetergo-iframe");
    const params = this.getPrifillParams();
    for (const anchor of anchors) {
      const iframe = document.createElement("iframe");

      const link =
        (anchor.getAttribute("link") ||
          anchor.getAttribute("href") ||
          anchor.getAttribute("data-url")) ??
        "";
      iframe.setAttribute("src", `${link}?${params}`);
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.minHeight = "690px";
      anchor.replaceChildren(iframe);
    }
  }

  private postScrollHeightToParent(scrollHeight: number): void {
    window.parent.postMessage({ scrollHeight: scrollHeight }, "*");
  }

  public sendScrollHeightToParent(): void {
    const scrollHeight = document.body.scrollHeight;

    this.postScrollHeightToParent(scrollHeight);
  }

  public parseButtons(): void {
    const buttons = document.getElementsByClassName("meetergo-styled-button");

    for (let button of buttons) {
      button = this.meetergoStyleButton(button as HTMLButtonElement);

      // Also bind clickable elements to the scheduler if they have a link attribute
      if (button instanceof HTMLElement) {
        const link = button.getAttribute("link");
        if (link) {
          this.bindElementToScheduler(button, link);
        }
      }
    }
  }
  private getWindowParams(): Record<string, string> {
    try {
      const search = window.location.search;
      if (!search) {
        return {};
      }

      const params = new URLSearchParams(search);
      const paramObj: Record<string, string> = {};

      // More efficient iteration through URLSearchParams
      params.forEach((value, key) => {
        // Only include non-empty values
        if (value && value.trim() !== "") {
          paramObj[key] = value;
        }
      });

      return paramObj;
    } catch (error) {
      console.error("meetergo: Error parsing window parameters", error);
      return {};
    }
  }

  private getPrifillParams(existingParams?: Record<string, string>): string {
    try {
      const params: string[] = [];

      let prefill = this.getWindowParams();

      if (window.meetergoSettings?.prefill) {
        prefill = {
          ...prefill,
          ...window.meetergoSettings.prefill,
        };
      }

      if (existingParams) {
        prefill = {
          ...prefill,
          ...existingParams,
        };
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
      console.error("meetergo: Error generating prefill parameters", error);
      return "";
    }
    prefill = {
      ...prefill,
      ...existingParams,
    };
    Object.entries(prefill).forEach(([key, value]) => {
      params.push(`${key}=${encodeURIComponent(value)}`);
    });
    return params.join("&");
  }

  public setPrefill(prefill: MeetergoSettings["prefill"]): void {
    if (window.meetergoSettings) {
      window.meetergoSettings.prefill = prefill;
    }
  }

  private meetergoStyleButton(button: HTMLButtonElement): HTMLButtonElement {
    button.style.margin = "0.5rem";
    button.style.padding = "0.8rem";
    button.style.fontWeight = "bold";
    button.style.color = "white";
    button.style.backgroundColor = "#0A64BC";
    button.style.borderRadius = "0.5rem";
    button.style.border = "none";
    button.style.cursor = "pointer";
    button.style.zIndex = "999";

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

      const styleId = "meetergo-button-styles";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          .meetergo-styled-button:hover {
            background-color: #0850A0 !important;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
          }
          .meetergo-styled-button:focus {
            outline: 2px solid #0A64BC !important;
            outline-offset: 2px !important;
          }
          .meetergo-styled-button:active {
            transform: translateY(1px) !important;
          }
        `;
        document.head.appendChild(style);
      }

      if (!button.getAttribute("role")) {
        button.setAttribute("role", "button");
      }

      return button;
    } catch (error) {
      console.error("meetergo: Error styling button", error);
      return button;
    }
  }
}

export const meetergo = new MeetergoIntegration();
