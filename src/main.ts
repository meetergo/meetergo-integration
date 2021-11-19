import { MeetergoSettings } from "./declarations";

export enum ModalType {
  Booking = "booking",
  QuickBooking = "quick-booking",
}

const host = "https://my.meetergo.com";

export class MeetergoIntegration {
  constructor() {
    window.addEventListener("DOMContentLoaded", () => {
      this.init();
    });
  }

  public init(): void {
    this.addFloatingButton();
    this.addModal();
    this.parseIframes();
    this.parseButtons();
    this.addListeners();
  }

  private addFloatingButton(): void {
    if (
      window.meetergoSettings?.floatingButton &&
      window.meetergoSettings?.floatingButton?.position
    ) {
      const position = window.meetergoSettings.floatingButton.position;
      let button = document.createElement("button");
      button.classList.add("meetergo-modal-button");
      button.innerHTML =
        window.meetergoSettings?.floatingButton?.text ?? "Book appointment";
      if (window.meetergoSettings?.floatingButton?.attributes) {
        for (const [key, value] of Object.entries(
          window.meetergoSettings.floatingButton.attributes
        )) {
          button.setAttribute(key, value);
        }
      }

      // CSS
      button.style.position = "fixed";
      position.includes("top")
        ? (button.style.top = "0")
        : (button.style.bottom = "0");
      position.includes("left")
        ? (button.style.left = "0")
        : (button.style.right = "0");
      button = this.meetergoStyleButton(button);

      document.body.appendChild(button);
    }
  }

  private addListeners(): void {
    const buttons = document.getElementsByClassName("meetergo-modal-button");
    for (const button of buttons) {
      button.addEventListener("click", () => {
        const type = button.getAttribute("data-type") as ModalType | null;
        const event = button.getAttribute("data-event");
        this.openModalWithContent({
          type: type ?? ModalType.Booking,
          event: event ?? undefined,
        });
      });
    }
  }

  public openModalWithContent(settings: {
    type: ModalType;
    event?: string;
  }): void {
    const { type, event } = settings;
    const iframe = document.createElement("iframe");
    const params = this.getPrifillParams();
    iframe.setAttribute(
      "src",
      `${host}/${type === ModalType.QuickBooking ? "quick/" : ""}${
        window.meetergoSettings?.company
      }/${event}?${params}`
    );
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    const modalContent = document.getElementById("meetergo-modal-content");
    if (modalContent) {
      modalContent.replaceChildren(iframe);
    }
    this.openModal();
  }

  private addModal(): void {
    const modal = document.createElement("div");
    modal.id = "meetergo-modal";
    modal.style.zIndex = "1000";
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
    overlay.style.backgroundColor = "rgba(0,0,0,0.7)";

    overlay.onclick = () => window.meetergo.closeModal();

    const content = document.createElement("div");
    content.id = "meetergo-modal-content";
    content.style.zIndex = "1002";
    content.style.position = "relative";
    content.style.width = "90%";
    content.style.height = "90%";
    content.style.backgroundColor = "white";
    content.style.borderRadius = "0.7rem";
    content.style.maxWidth = "800px";
    content.style.maxHeight = "850px";
    content.style.overflow = "hidden";

    modal.appendChild(overlay);
    modal.appendChild(content);

    document.body.appendChild(modal);
  }

  public openModal(): void {
    const modal = document.getElementById("meetergo-modal");
    if (modal) {
      modal.style.visibility = "visible";
      modal.style.opacity = "1";
    }
  }

  public closeModal(preventClearContent?: boolean): void {
    const modal = document.getElementById("meetergo-modal");
    if (modal) {
      // Hide Modal
      modal.style.visibility = "hidden";
      modal.style.opacity = "0";
      if (!preventClearContent) {
        // Clear modal content
        const content = document.getElementById("meetergo-modal-content");
        if (content) {
          content.replaceChildren();
        }
      }
    }
  }

  public parseIframes(): void {
    const anchors = document.getElementsByClassName("meetergo-iframe");
    const params = this.getPrifillParams();
    for (const anchor of anchors) {
      const iframe = document.createElement("iframe");

      const event = anchor.getAttribute("data-event") ?? "";
      iframe.setAttribute(
        "src",
        `${host}/${window.meetergoSettings?.company}/${event}?${params}`
      );
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      anchor.replaceChildren(iframe);
    }
  }

  public parseButtons(): void {
    const buttons = document.getElementsByClassName("meetergo-styled-button");

    for (let button of buttons) {
      button = this.meetergoStyleButton(button as HTMLButtonElement);
    }
  }

  private getPrifillParams(): string {
    const params: string[] = [];
    const prefill = window.meetergoSettings?.prefill;
    if (prefill) {
      Object.entries(prefill).forEach(([key, value]) => {
        params.push(`${key}=${encodeURIComponent(value)}`);
      });
    }
    return params.join("&");
  }

  public setPrefill(prefill: MeetergoSettings["prefill"]): void {
    window.meetergoSettings.prefill = prefill;
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

    return button;
  }
}

export const meetergo = new MeetergoIntegration();
