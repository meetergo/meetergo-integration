import { MeetergoSettings } from "./declarations";

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

  private addSidebar(): void {
    if (
      window.meetergoSettings?.sidebar &&
      window.meetergoSettings?.sidebar.link
    ) {
      const position = window.meetergoSettings.sidebar.position || "right";
      const width = window.meetergoSettings.sidebar.width || "400px";
      const link = window.meetergoSettings.sidebar.link;
      const buttonText =
        window.meetergoSettings.sidebar.buttonText || "Open Scheduler";
      const buttonIcon =
        window.meetergoSettings.sidebar.buttonIcon || "calendar";
      const buttonPosition =
        window.meetergoSettings.sidebar.buttonPosition || "middle-right";

      const sidebar = document.createElement("div");
      sidebar.classList.add("meetergo-sidebar", `meetergo-sidebar-${position}`);
      sidebar.style.width = width;

      const closeButton = document.createElement("button");
      closeButton.classList.add("meetergo-sidebar-close");
      closeButton.setAttribute("aria-label", "Close sidebar");
      closeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

      const iframe = document.createElement("iframe");
      iframe.classList.add("meetergo-sidebar-iframe");
      iframe.src = link;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";

      const toggleButton = document.createElement("button");
      toggleButton.classList.add(
        "meetergo-sidebar-toggle",
        position === "left"
          ? "meetergo-sidebar-toggle-left"
          : "meetergo-sidebar-toggle-right"
      );

      if (buttonPosition.includes("top")) {
        toggleButton.style.top = "120px";
      } else if (buttonPosition.includes("middle")) {
        toggleButton.style.top = "50%";
        toggleButton.style.transform = "translateY(-50%)";
      } else {
        toggleButton.style.bottom = "120px";
        // Reset top if bottom is set
        toggleButton.style.top = "";
      }

      if (buttonIcon) {
        const iconSpan = document.createElement("span");
        iconSpan.classList.add("meetergo-sidebar-toggle-icon");
        toggleButton.appendChild(iconSpan);

        this.fetchLucideIcon(buttonIcon, iconSpan);
      }

      if (buttonText) {
        const textLabel = document.createElement("span");
        textLabel.classList.add("meetergo-sidebar-toggle-text");
        textLabel.textContent = buttonText;
        toggleButton.appendChild(textLabel);
      }

      toggleButton.setAttribute("aria-label", buttonText);
      toggleButton.setAttribute("role", "button");

      if (window.meetergoSettings?.sidebar.backgroundColor) {
        toggleButton.style.backgroundColor =
          window.meetergoSettings.sidebar.backgroundColor;
      }

      if (window.meetergoSettings?.sidebar.textColor) {
        toggleButton.style.color = window.meetergoSettings.sidebar.textColor;
      }

      toggleButton.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        toggleButton.classList.toggle("meetergo-sidebar-toggle-hidden");
      });

      closeButton.addEventListener("click", () => {
        sidebar.classList.remove("open");
        toggleButton.classList.remove("meetergo-sidebar-toggle-hidden");
      });

      sidebar.appendChild(closeButton);
      sidebar.appendChild(iframe);
      document.body.appendChild(sidebar);
      document.body.appendChild(toggleButton);
    }
  }

  private addFloatingButton(): void {
    if (
      window.meetergoSettings?.floatingButton &&
      window.meetergoSettings?.floatingButton?.position &&
      window.meetergoSettings?.floatingButton.link
    ) {
      const position = window.meetergoSettings?.floatingButton.position;
      const animation =
        window.meetergoSettings?.floatingButton.animation || "none";
      let button = document.createElement("button");
      button.classList.add("meetergo-modal-button");

      const buttonText =
        window.meetergoSettings?.floatingButton?.text ?? "Book appointment";
      if (window.meetergoSettings?.floatingButton?.icon) {
        this.loadLucideIcon(
          window.meetergoSettings.floatingButton.icon,
          button,
          buttonText
        );
      } else {
        button.innerHTML = buttonText;
      }

      button.setAttribute("link", window.meetergoSettings.floatingButton.link);

      button.style.position = "fixed";

      let originalTransform = "";

      if (position.includes("top")) {
        button.style.top = "10px";
      } else if (position.includes("middle")) {
        button.style.top = "50%";
        originalTransform = "translateY(-50%)";
        button.style.transform = originalTransform;
      } else {
        // bottom
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
        // right
        button.style.right = "5px";
      }

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
      User: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      Video: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.5V15.5C22 15.5 20.5 14.5 19.5 14.5C18.5 14.5 17 15.5 17 15.5V8.5C17 8.5 18.5 9.5 19.5 9.5C20.5 9.5 22 8.5 22 8.5Z"/><rect width="15" height="14" x="2" y="5" rx="2"/></svg>`,
      Mail: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
      Phone: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
      MessageSquare: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      Coffee: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`,
      Users: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      Briefcase: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
      Handshake: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>`,
      PenTool: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>`,
      Heart: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
      Star: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      BookOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
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
  }

  private addModal(): void {
    try {
      const modal = document.createElement("div");
      modal.id = "meetergo-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "meetergo-modal-title");
      modal.setAttribute("aria-describedby", "meetergo-modal-description");
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
      spinner.setAttribute("role", "status");
      spinner.setAttribute("aria-label", "Loading");
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

      const title = document.createElement("h2");
      title.id = "meetergo-modal-title";
      title.textContent = "Meetergo Booking";
      title.style.position = "absolute";
      title.style.width = "1px";
      title.style.height = "1px";
      title.style.padding = "0";
      title.style.margin = "-1px";
      title.style.overflow = "hidden";
      title.style.clip = "rect(0, 0, 0, 0)";
      title.style.whiteSpace = "nowrap";
      title.style.borderWidth = "0";

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
    try {
      this.lastActiveElement = document.activeElement;

      const modal = document.getElementById("meetergo-modal");
      if (!modal) {
        console.error("meetergo: Modal element not found");
        return;
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
    try {
      const modal = document.getElementById("meetergo-modal");
      if (!modal) {
        console.error(
          "meetergo: Modal element not found when attempting to close"
        );
        return;
      }

      modal.style.visibility = "hidden";
      modal.style.opacity = "0";

      const spinners = modal.getElementsByClassName("meetergo-spinner");
      if (spinners.length > 0) {
        const spinner = spinners[0] as HTMLElement;
        spinner.style.visibility = "hidden";
        spinner.style.opacity = "0";
      }

      if (!preventClearContent) {
        setTimeout(() => {
          const content = document.getElementById("meetergo-modal-content");
          if (content) {
            content.innerHTML = "";
          }
        }, 300);
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
    try {
      const anchors = document.getElementsByClassName("meetergo-iframe");
      if (!anchors.length) {
        return; // No iframes to parse
      }

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

          iframe.setAttribute("src", `${link}?${params}`);
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "none";
          iframe.style.minHeight = "690px";

          const loadingIndicator = document.createElement("div");
          loadingIndicator.className = "meetergo-spinner";
          loadingIndicator.style.position = "absolute";
          loadingIndicator.style.top = "50%";
          loadingIndicator.style.left = "50%";
          loadingIndicator.style.transform = "translate(-50%, -50%)";

          const indicatorId = `meetergo-spinner-${Math.random()
            .toString(36)
            .substring(2, 11)}`;
          loadingIndicator.id = indicatorId;

          iframe.addEventListener("load", () => {
            const spinner = document.getElementById(indicatorId);
            if (spinner && spinner.parentNode) {
              spinner.parentNode.removeChild(spinner);
            }
          });

          if (anchor instanceof HTMLElement) {
            anchor.style.position = "relative";
          }

          if (anchor instanceof HTMLElement) {
            anchor.innerHTML = "";
            anchor.appendChild(iframe);
          }
          anchor.appendChild(loadingIndicator);
        } catch (innerError) {
          console.error(
            "meetergo: Error processing iframe element",
            innerError
          );
        }
      });
    } catch (error) {
      console.error("meetergo: Error parsing iframes", error);
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
  }

  public setPrefill(prefill: MeetergoSettings["prefill"]): void {
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

      window.meetergoSettings.prefill = { ...prefill };

      const modal = document.getElementById("meetergo-modal");
      if (modal && getComputedStyle(modal).visibility === "visible") {
        this.refreshModalWithNewPrefill();
      }
    } catch (error) {
      console.error("meetergo: Error setting prefill values", error);
    }
  }

  private refreshModalWithNewPrefill(): void {
    try {
      const modalContent = document.getElementById("meetergo-modal-content");
      if (!modalContent) return;

      const iframe = modalContent.querySelector("iframe");
      if (!iframe) return;

      const currentSrc = iframe.getAttribute("src");
      if (!currentSrc) return;

      const linkBase = currentSrc.split("?")[0];

      const params = this.getPrifillParams();
      iframe.setAttribute("src", `${linkBase}?${params}`);
    } catch (error) {
      console.error("meetergo: Error refreshing modal with new prefill", error);
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
