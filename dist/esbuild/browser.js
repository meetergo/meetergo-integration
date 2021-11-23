(() => {
  // src/main.ts
  var ModalType;
  (function(ModalType2) {
    ModalType2["Booking"] = "booking";
    ModalType2["QuickBooking"] = "quick-booking";
  })(ModalType || (ModalType = {}));
  var host = "https://my.meetergo.com";
  var MeetergoIntegration = class {
    constructor() {
      window.addEventListener("DOMContentLoaded", () => {
        this.init();
      });
    }
    init() {
      this.addFloatingButton();
      this.addModal();
      this.parseIframes();
      this.parseButtons();
      this.addListeners();
    }
    addFloatingButton() {
      if (window.meetergoSettings?.floatingButton && window.meetergoSettings?.floatingButton?.position) {
        const position = window.meetergoSettings.floatingButton.position;
        let button = document.createElement("button");
        button.classList.add("meetergo-modal-button");
        button.innerHTML = window.meetergoSettings?.floatingButton?.text ?? "Book appointment";
        const attributes = window.meetergoSettings?.floatingButton?.attributes;
        if (attributes) {
          for (const [key, value] of Object.entries(attributes)) {
            if (key === "data-type" && value === "quick-booking" && !attributes["data-event"])
              continue;
            button.setAttribute(key, value);
          }
        }
        button.style.position = "fixed";
        position.includes("top") ? button.style.top = "0" : button.style.bottom = "0";
        position.includes("left") ? button.style.left = "0" : button.style.right = "0";
        button = this.meetergoStyleButton(button);
        document.body.appendChild(button);
      }
    }
    addListeners() {
      const buttons = document.getElementsByClassName("meetergo-modal-button");
      for (const button of buttons) {
        button.addEventListener("click", () => {
          const type = button.getAttribute("data-type");
          const event = button.getAttribute("data-event");
          this.openModalWithContent({
            type: type ?? ModalType.Booking,
            event: event ?? void 0
          });
        });
      }
    }
    openModalWithContent(settings) {
      const {type, event} = settings;
      const iframe = document.createElement("iframe");
      const params = this.getPrifillParams();
      iframe.setAttribute("src", `${host}${type === ModalType.QuickBooking ? "/quick" : ""}${`/${window.meetergoSettings?.company}`}${event ? `/${event}` : ""}?${params}`);
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      const modalContent = document.getElementById("meetergo-modal-content");
      if (modalContent) {
        modalContent.replaceChildren(iframe);
      }
      this.openModal();
    }
    addModal() {
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
    openModal() {
      const modal = document.getElementById("meetergo-modal");
      if (modal) {
        modal.style.visibility = "visible";
        modal.style.opacity = "1";
      }
    }
    closeModal(preventClearContent) {
      const modal = document.getElementById("meetergo-modal");
      if (modal) {
        modal.style.visibility = "hidden";
        modal.style.opacity = "0";
        if (!preventClearContent) {
          const content = document.getElementById("meetergo-modal-content");
          if (content) {
            content.replaceChildren();
          }
        }
      }
    }
    parseIframes() {
      const anchors = document.getElementsByClassName("meetergo-iframe");
      const params = this.getPrifillParams();
      for (const anchor of anchors) {
        const iframe = document.createElement("iframe");
        const event = anchor.getAttribute("data-event") ?? "";
        iframe.setAttribute("src", `${host}/${window.meetergoSettings?.company}/${event}?${params}`);
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        anchor.replaceChildren(iframe);
      }
    }
    parseButtons() {
      const buttons = document.getElementsByClassName("meetergo-styled-button");
      for (let button of buttons) {
        button = this.meetergoStyleButton(button);
      }
    }
    getPrifillParams() {
      const params = [];
      const prefill = window.meetergoSettings?.prefill;
      if (prefill) {
        Object.entries(prefill).forEach(([key, value]) => {
          params.push(`${key}=${encodeURIComponent(value)}`);
        });
      }
      return params.join("&");
    }
    setPrefill(prefill) {
      window.meetergoSettings.prefill = prefill;
    }
    meetergoStyleButton(button) {
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
  };
  var meetergo = new MeetergoIntegration();

  // src/browser.ts
  window.meetergo = meetergo;
})();
