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

    // Initialize video embed if settings are present
    if (
      window.meetergoSettings?.videoEmbed &&
      window.meetergoSettings.videoEmbed.videoSrc
    ) {
      this.initVideoEmbed();
    }
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
      width: auto;
      min-width: 50px;
      padding: 12px 8px;
      transition: width 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      border: none;
      outline: none;
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
      margin-left: 0;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
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

    .meetergo-styled-button {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
    }

    `;
    document.head.appendChild(style);
  }

  public onFormSubmit(e: Event): void {
    if (!(e.currentTarget instanceof HTMLFormElement)) return;

    const target = e.currentTarget;
    if (!target) return;

    const targetListener = window.meetergoSettings?.formListeners?.find(
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
      User: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a4 4 0 0 0 4 4z"/><circle cx="12" cy="7" r="4"/></svg>`,
      Video: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`,
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

  /**
   * Initializes the video embed feature using settings from window.meetergoSettings
   */
  public initVideoEmbed(): void {
    try {
      const settings = window.meetergoSettings?.videoEmbed;
      if (!settings?.videoSrc || !settings?.bookingLink) {
        console.warn("meetergo: Video embed settings missing or incomplete");
        return;
      }

      // Ensure HLS.js is loaded before proceeding
      this.ensureHlsLibraryLoaded()
        .then(() => {
          this.createVideoEmbed(settings);
        })
        .catch((error) => {
          console.error("meetergo: Failed to load HLS library", error);
        });
    } catch (error) {
      console.error("meetergo: Error initializing video embed", error);
    }
  }

  /**
   * Ensures HLS.js library is loaded
   * @returns Promise that resolves when HLS.js is loaded
   */
  private ensureHlsLibraryLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Hls) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      script.crossOrigin = "anonymous";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load HLS.js"));
      document.head.appendChild(script);
    });
  }

  /**
   * Creates the video embed UI with a video player
   * @param settings The video embed settings from meetergoSettings
   */
  private createVideoEmbed(settings: MeetergoSettings["videoEmbed"]): void {
    if (!settings?.videoSrc || !settings?.bookingLink) return;

    // Extract settings with defaults
    const {
      videoSrc,
      bookingLink,
      posterImage = "",
      position = "bottom-right",
      buttonColor = "#0a64bc",
      bookingCta = "Book Appointment",
      size = { width: "200px", height: "158px" },
      isRound = false,
      offset = "16px", // Added offset with default value
    } = settings;

    // Create container for the video
    const videoContainer = document.createElement("div");
    Object.assign(videoContainer.style, {
      position: "fixed",
      zIndex: "1000",
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      cursor: "pointer",
      transition:
        "transform 0.3s ease, box-shadow 0.3s ease, width 0.3s ease, height 0.3s ease",
      border: `2px solid ${buttonColor}`,
    });

    // Set size and shape
    if (isRound) {
      const diameter =
        Math.min(
          parseInt(size?.width || "200"),
          parseInt(size?.height || "158")
        ) + "px";
      Object.assign(videoContainer.style, {
        width: diameter,
        height: diameter,
        borderRadius: "50%",
      });
    } else {
      Object.assign(videoContainer.style, {
        width: size.width,
        height: size.height,
        borderRadius: "8px",
      });
    }

    // Set position
    this.setPositionStyles(videoContainer, position, offset);

    // Create UI elements
    const {
      video,
      overlayContainer,
      ctaElement,
      loadingIndicator,
      closeButton,
    } = this.createVideoEmbedElements(settings);

    // Make close button always visible
    closeButton.style.opacity = "1";

    // Track expansion state
    let isExpanded = false;
    const originalStyles = {
      width: videoContainer.style.width,
      height: videoContainer.style.height,
      borderRadius: videoContainer.style.borderRadius,
    };

    // Add elements to the DOM
    videoContainer.appendChild(video);
    videoContainer.appendChild(loadingIndicator);
    overlayContainer.appendChild(closeButton);
    overlayContainer.appendChild(ctaElement);
    videoContainer.appendChild(overlayContainer);
    document.body.appendChild(videoContainer);

    // Create CTA button (initially hidden)
    const ctaButton = document.createElement("button");
    Object.assign(ctaButton.style, {
      position: "absolute",
      bottom: "10px", // Changed from -45px to ensure visibility
      left: "50%",
      width: "90%",
      transform: "translateX(-50%)",
      padding: "10px 20px",
      backgroundColor: buttonColor,
      color: settings?.bookingCtaColor || "white",
      border: "none",
      borderRadius: "4px",
      fontWeight: "bold",
      cursor: "pointer",
      display: "none",
      transition: "all 0.3s ease",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      fontSize: "14px",
      zIndex: "10", // Ensure it's above other elements
    });
    ctaButton.textContent = bookingCta;
    videoContainer.appendChild(ctaButton);

    // Create pause/play button (initially hidden)
    const pausePlayButton = document.createElement("button");
    Object.assign(pausePlayButton.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "60px",
      height: "60px",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      color: "white",
      border: "none",
      borderRadius: "50%",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "all 0.3s ease, opacity 0.2s ease",
      zIndex: "10",
      padding: "0",
      opacity: "0",
    });
    pausePlayButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    pausePlayButton.setAttribute("aria-label", "Pause video");
    videoContainer.appendChild(pausePlayButton);

    // Create mute button (initially hidden)
    const muteButton = document.createElement("button");
    Object.assign(muteButton.style, {
      position: "absolute",
      top: "10px",
      left: "10px",
      width: "30px",
      height: "30px",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      color: "white",
      border: "none",
      borderRadius: "50%",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "all 0.3s ease",
      zIndex: "10",
      padding: "0",
    });
    muteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    muteButton.setAttribute("aria-label", "Mute video");
    videoContainer.appendChild(muteButton);

    // Create progress bar container (initially hidden)
    const progressContainer = document.createElement("div");
    Object.assign(progressContainer.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "5px",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      display: "none",
      zIndex: "10",
      overflow: "hidden",
    });

    // Create progress bar
    const progressBar = document.createElement("div");
    Object.assign(progressBar.style, {
      width: "0%",
      height: "100%",
      backgroundColor: buttonColor,
      transition: "width 0.1s linear",
    });

    progressContainer.appendChild(progressBar);
    videoContainer.appendChild(progressContainer);

    // Set up video source with error handling
    this.setupVideoSource(video, videoSrc, posterImage, loadingIndicator);

    // Hide loading indicator when video is ready
    video.addEventListener("canplay", () => {
      loadingIndicator.style.display = "none";
    });

    // Track video play state
    let isVideoPaused = false;
    let isMuted = false;

    // Function to toggle pause/play
    const togglePlayPause = () => {
      if (isVideoPaused) {
        video.play();
        pausePlayButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
        pausePlayButton.setAttribute("aria-label", "Pause video");
      } else {
        video.pause();
        pausePlayButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        pausePlayButton.setAttribute("aria-label", "Play video");
      }
      isVideoPaused = !isVideoPaused;
    };

    // Function to toggle mute/unmute
    const toggleMute = () => {
      if (isMuted) {
        video.muted = false;
        muteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        muteButton.setAttribute("aria-label", "Mute video");
      } else {
        video.muted = true;
        muteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
        muteButton.setAttribute("aria-label", "Unmute video");
      }
      isMuted = !isMuted;
    };

    // Update progress bar
    const updateProgressBar = () => {
      if (video.duration) {
        const progress = (video.currentTime / video.duration) * 100;
        progressBar.style.width = `${progress}%`;
      }
    };

    // Add event handler for pause/play button
    pausePlayButton.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePlayPause();
    });

    // Add event handler for mute button
    muteButton.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMute();
    });

    // Add event handler for video timeupdate to update progress bar
    video.addEventListener("timeupdate", updateProgressBar);

    // Show pause button briefly when video is clicked
    const showPauseButtonBriefly = () => {
      pausePlayButton.style.opacity = "1";
      setTimeout(() => {
        if (!isVideoPaused) {
          pausePlayButton.style.opacity = "0";
        }
      }, 1500);
    };

    // Improved hover effect for CTA button
    ctaButton.addEventListener("mouseenter", () => {
      ctaButton.style.transform = "translateX(-50%) translateY(-4px)";
      ctaButton.style.boxShadow = "0 6px 14px rgba(0,0,0,0.3)";
      ctaButton.style.backgroundColor = this.adjustColor(buttonColor, -20); // Darken the button color
    });

    ctaButton.addEventListener("mouseleave", () => {
      ctaButton.style.transform = "translateX(-50%)";
      ctaButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      ctaButton.style.backgroundColor = buttonColor;
    });

    // Add event handlers with expanded functionality
    videoContainer.addEventListener("click", (e) => {
      if (e.target === closeButton || closeButton.contains(e.target as Node)) {
        return;
      }

      if (
        e.target === pausePlayButton ||
        pausePlayButton.contains(e.target as Node)
      ) {
        return;
      }

      if (e.target === muteButton || muteButton.contains(e.target as Node)) {
        return;
      }

      if (e.target === ctaButton || ctaButton.contains(e.target as Node)) {
        // CTA button click pauses video and opens booking link
        if (!isVideoPaused) {
          togglePlayPause(); // Always ensure video is paused when clicking CTA
        }
        this.openModalWithContent({ link: bookingLink });
        return;
      }

      if (isExpanded) {
        // When maximized, clicking the video toggles play/pause
        togglePlayPause();
        showPauseButtonBriefly();
        return;
      }

      // First click: expand video
      isExpanded = true;

      // Make video bigger (100% increase)
      const newWidth = parseInt(originalStyles.width) * 2 + "px";
      const newHeight = parseInt(originalStyles.height) * 2 + "px";

      Object.assign(videoContainer.style, {
        width: newWidth,
        height: newHeight,
        borderRadius: "12px", // Slightly larger radius for expanded state
        cursor: "pointer", // Keep pointer cursor for play/pause functionality
      });

      // Hide the CTA overlay text
      ctaElement.style.display = "none";

      // Show CTA button, pause button, mute button, and progress bar
      ctaButton.style.display = "block";
      pausePlayButton.style.display = "flex";
      muteButton.style.display = "flex";
      progressContainer.style.display = "block";

      // Reset video and enable sound
      video.currentTime = 0;
      video.muted = false;
      isMuted = false;
      video.play().catch(() => {
        console.warn(
          "meetergo: Couldn't play video with sound due to browser restrictions"
        );
      });

      // Reset pause state
      isVideoPaused = false;

      // Show pause button briefly
      showPauseButtonBriefly();

      // Start updating progress bar
      updateProgressBar();
    });

    // Close button functionality
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent video container click event

      // Reset to initial state if expanded
      if (isExpanded) {
        isExpanded = false;

        // Restore original size
        Object.assign(videoContainer.style, {
          width: originalStyles.width,
          height: originalStyles.height,
          borderRadius: originalStyles.borderRadius,
          cursor: "pointer", // Restore pointer cursor when minimized
        });

        // Show the CTA overlay text again
        ctaElement.style.display = "block";

        // Hide CTA button, pause button, mute button, and progress bar
        ctaButton.style.display = "none";
        pausePlayButton.style.display = "none";
        muteButton.style.display = "none";
        progressContainer.style.display = "none";

        // Mute video again and ensure it's playing
        video.muted = true;
        video.play();
        isVideoPaused = false;
      } else {
        // If not expanded, hide the video completely
        videoContainer.style.display = "none";
        this.createMinimizedIndicator(videoContainer, buttonColor);
      }
    });

    // Hover effects
    videoContainer.addEventListener("mouseenter", () => {
      this.applyHoverEffects(videoContainer, ctaElement, closeButton);
    });

    videoContainer.addEventListener("mouseleave", () => {
      this.removeHoverEffects(videoContainer, closeButton);
    });

    // Add accessibility support
    this.addAccessibilitySupport(
      videoContainer,
      closeButton,
      ctaButton,
      bookingLink,
      pausePlayButton,
      muteButton
    );

    // Check video loading status after timeout
    this.addVideoLoadingTimeout(video, posterImage, loadingIndicator);
  }

  /**
   * Creates all the necessary elements for the video embed
   */
  private createVideoEmbedElements(settings: MeetergoSettings["videoEmbed"]) {
    // Create overlay container
    const overlayContainer = document.createElement("div");
    Object.assign(overlayContainer.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      pointerEvents: "none",
    });

    // Create CTA text overlay (using videoCta instead of bookingCta)
    const ctaElement = document.createElement("div");
    Object.assign(ctaElement.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      color: "white",
      fontSize: "14px",
      textShadow: "0 2px 4px rgba(0,0,0,0.8)",
      fontWeight: "bold",
      textAlign: "center",
      whiteSpace: "nowrap",
      padding: "8px",
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      backgroundColor: "rgba(0, 0, 0, 0.4)", // Added for better visibility
      borderRadius: "4px", // Added for better styling
    });
    ctaElement.textContent = settings?.videoCta || "Click to watch";

    // Create loading indicator
    const loadingIndicator = this.createLoadingIndicator();

    // Create close button - now always visible
    const closeButton = document.createElement("div");
    Object.assign(closeButton.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      borderRadius: "50%",
      width: "20px",
      height: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      opacity: "1", // Changed from 0 to 1 to make always visible
      transition: "background-color 0.3s ease",
      pointerEvents: "auto",
      zIndex: "10",
      padding: "0",
    });
    closeButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    // Create video element
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = "metadata";
    Object.assign(video.style, {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    });

    if (settings?.posterImage) {
      video.poster = settings.posterImage;
    }

    // Add animation stylesheet once
    this.ensureAnimationStylesExist();

    return {
      video,
      overlayContainer,
      ctaElement,
      loadingIndicator,
      closeButton,
    };
  }

  /**
   * Creates and returns a loading indicator element
   */
  private createLoadingIndicator(): HTMLElement {
    const loadingIndicator = document.createElement("div");
    Object.assign(loadingIndicator.style, {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "30px",
      height: "30px",
      border: "3px solid rgba(255, 255, 255, 0.3)",
      borderRadius: "50%",
      borderTop: "3px solid #ffffff",
      animation: "meetergo-spin 1s linear infinite",
    });
    return loadingIndicator;
  }

  /**
   * Ensures animation styles exist in the document
   */
  private ensureAnimationStylesExist(): void {
    if (!document.getElementById("meetergo-animations")) {
      const style = document.createElement("style");
      style.id = "meetergo-animations";
      style.textContent = `@keyframes meetergo-spin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }`;
      document.head.appendChild(style);
    }
  }

  /**
   * Sets position styles for the video container with offset support
   */
  private setPositionStyles(
    container: HTMLElement,
    position: string,
    offset = "16px"
  ): void {
    const offsetValue = offset || "16px";

    // Vertical positioning
    if (position.includes("top")) {
      container.style.top = offsetValue;
    } else if (position.includes("middle")) {
      container.style.top = "50%";
      container.style.transform = "translateY(-50%)";
    } else {
      container.style.bottom = offsetValue;
    }

    // Horizontal positioning
    if (position.includes("left")) {
      container.style.left = offsetValue;
    } else if (position.includes("center")) {
      container.style.left = "50%";
      container.style.transform = container.style.transform
        ? "translate(-50%, -50%)"
        : "translateX(-50%)";
    } else {
      container.style.right = offsetValue;
    }
  }

  /**
   * Sets up video source with proper error handling
   */
  private setupVideoSource(
    video: HTMLVideoElement,
    videoSrc: string,
    posterImage: string,
    loadingIndicator: HTMLElement
  ): void {
    if (videoSrc.endsWith(".m3u8")) {
      this.setupHlsVideo(video, videoSrc, posterImage, loadingIndicator);
    } else {
      video.src = videoSrc;
      video.onerror = () => {
        console.warn(
          "meetergo: Video failed to load, using poster image instead"
        );
        this.fallbackToPoster(video, posterImage);
        loadingIndicator.style.display = "none";
      };
    }
  }

  /**
   * Helper function to adjust color brightness
   * @param color Hex color string
   * @param percent Percentage to lighten (positive) or darken (negative)
   */
  private adjustColor(color: string, percent: number): string {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = Math.max(0, Math.min(255, R + Math.round((R * percent) / 100)));
    G = Math.max(0, Math.min(255, G + Math.round((G * percent) / 100)));
    B = Math.max(0, Math.min(255, B + Math.round((B * percent) / 100)));

    const RR = R.toString(16).padStart(2, "0");
    const GG = G.toString(16).padStart(2, "0");
    const BB = B.toString(16).padStart(2, "0");

    return `#${RR}${GG}${BB}`;
  }

  private setupHlsVideo(
    videoElement: HTMLVideoElement,
    videoSrc: string,
    posterUrl: string | undefined,
    container: HTMLElement
  ): void {
    // Ensure we're using HTTPS for all resources
    const secureVideoSrc = videoSrc.replace(/^http:/, "https:");

    if (window.Hls && window.Hls.isSupported()) {
      this.initHlsPlayer(videoElement, secureVideoSrc, posterUrl, container);
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      // For Safari which has native HLS support
      videoElement.src = secureVideoSrc;
      if (posterUrl) videoElement.poster = posterUrl;
      videoElement.addEventListener("loadedmetadata", () => {
        videoElement.play().catch(() => {
          this.fallbackToPoster(videoElement, container);
        });
      });
      videoElement.addEventListener("error", () => {
        this.fallbackToPoster(videoElement, container);
      });
    } else {
      console.warn("meetergo: HLS not supported in this browser");
      this.fallbackToPoster(videoElement, container);
    }
  }

  private initHlsPlayer(
    video: HTMLVideoElement,
    videoSrc: string,
    posterImage: string | undefined,
    loadingIndicator: HTMLElement
  ): void {
    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          loadingIndicator.style.display = "none";
        });
      });
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (posterImage) {
            this.fallbackToPoster(video, posterImage);
          }
          loadingIndicator.style.display = "none";
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoSrc;
      if (posterImage) video.poster = posterImage;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {
          loadingIndicator.style.display = "none";
        });
      });
    } else {
      console.warn("meetergo: HLS is not supported in this browser");
      if (posterImage) {
        this.fallbackToPoster(video, posterImage);
      }
      loadingIndicator.style.display = "none";
    }
  }

  private fallbackToPoster(
    video: HTMLVideoElement,
    posterImage: string | HTMLElement
  ): void {
    if (!video.parentElement) return;

    if (typeof posterImage === "string") {
      const fallbackImg = document.createElement("img");
      fallbackImg.src = posterImage;
      Object.assign(fallbackImg.style, {
        width: "100%",
        height: "100%",
        objectFit: "cover",
      });
      video.parentElement.replaceChild(fallbackImg, video);
    } else if (posterImage instanceof HTMLElement) {
      // If posterImage is an HTMLElement (container), just hide the video
      video.style.display = "none";
    }
  }

  /**
   * Apply hover effects to video container
   */
  private applyHoverEffects(
    videoContainer: HTMLElement,
    ctaElement: HTMLElement,
    closeButton: HTMLElement
  ): void {
    // Scale effect
    if (videoContainer.style.transform.includes("translate")) {
      videoContainer.style.transform =
        videoContainer.style.transform.replace(/scale\([\d.]+\)/g, "") +
        " scale(1.05)";
    } else {
      videoContainer.style.transform = "scale(1.05)";
    }

    videoContainer.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.2)";

    // Change close button background on hover instead of opacity
    closeButton.style.backgroundColor = "rgba(0, 0, 0, 0.7)";

    // Only enhance CTA text if it's visible
    if (ctaElement.style.display !== "none") {
      ctaElement.style.textShadow = "0 1px 3px rgba(0,0,0,0.9)";
    }
  }

  /**
   * Remove hover effects from video container
   */
  private removeHoverEffects(
    videoContainer: HTMLElement,
    closeButton: HTMLElement
  ): void {
    if (videoContainer.style.transform.includes("translate")) {
      videoContainer.style.transform = videoContainer.style.transform.replace(
        / scale\([\d.]+\)/g,
        ""
      );
    } else {
      videoContainer.style.transform = "";
    }

    videoContainer.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";

    // Reset close button background on mouse leave
    closeButton.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  }

  /**
   * Create minimized indicator when video is closed
   */
  private createMinimizedIndicator(
    videoContainer: HTMLElement,
    buttonColor: string
  ): void {
    const minimizedIndicator = document.createElement("div");
    Object.assign(minimizedIndicator.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      backgroundColor: buttonColor,
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
      cursor: "pointer",
      zIndex: "9999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });
    minimizedIndicator.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    document.body.appendChild(minimizedIndicator);

    minimizedIndicator.addEventListener("click", () => {
      videoContainer.style.display = "block";
      document.body.removeChild(minimizedIndicator);
    });
  }

  /**
   * Add accessibility support
   */
  private addAccessibilitySupport(
    videoContainer: HTMLElement,
    closeButton: HTMLElement,
    ctaButton: HTMLElement,
    bookingLink: string,
    pausePlayButton?: HTMLElement,
    muteButton?: HTMLElement
  ): void {
    videoContainer.setAttribute("role", "button");
    videoContainer.setAttribute("aria-label", "Click to expand video");
    videoContainer.setAttribute("tabindex", "0");
    ctaButton.setAttribute("role", "button");
    ctaButton.setAttribute("aria-label", "Book an appointment");
    ctaButton.setAttribute("tabindex", "0");

    if (pausePlayButton) {
      pausePlayButton.setAttribute("role", "button");
      pausePlayButton.setAttribute("tabindex", "0");

      pausePlayButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pausePlayButton.click();
        }
      });
    }

    if (muteButton) {
      muteButton.setAttribute("role", "button");
      muteButton.setAttribute("tabindex", "0");

      muteButton.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          muteButton.click();
        }
      });
    }

    videoContainer.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        videoContainer.click();
      } else if (e.key === "Escape") {
        closeButton.click();
      }
    });

    ctaButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.openModalWithContent({ link: bookingLink });
      }
    });
  }

  /**
   * Add timeout to check video loading status
   */
  private addVideoLoadingTimeout(
    video: HTMLVideoElement,
    posterImage: string,
    loadingIndicator: HTMLElement
  ): void {
    setTimeout(() => {
      if (video.readyState === 0 && video.error === null) {
        console.warn(
          "meetergo: Video failed to load after timeout, using poster image"
        );
        this.fallbackToPoster(video, posterImage);
        loadingIndicator.style.display = "none";
      }
    }, 3000);
  }
}

export const meetergo = new MeetergoIntegration();
