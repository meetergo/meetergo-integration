(() => {
  // src/main.ts
  var MeetergoIntegration = class {
    constructor() {
      window.addEventListener("DOMContentLoaded", () => {
        this.init();
      });
    }
    init() {
      this.listenToForms();
      this.addFloatingButton();
      this.addModal();
      this.parseIframes();
      this.parseButtons();
      this.addListeners();
    }
    onFormSubmit(e) {
      e.preventDefault();
      const target = e.currentTarget;
      if (!target)
        return;
      const targetListener = window.meetergoSettings?.formListeners.find((listener) => {
        if (!target.id) {
          return !listener.formId;
        } else {
          return target.id === listener.formId;
        }
      });
      if (!targetListener)
        return;
      const formData = new FormData(target);
      const data = {};
      for (const [key, value] of formData) {
        data[key] = value.toString();
      }
      window.meetergo.openModalWithContent({
        link: targetListener.link,
        existingParams: data
      });
    }
    listenToForms() {
      const forms = document.querySelectorAll("form");
      for (const form of forms) {
        form.addEventListener("submit", this.onFormSubmit, false);
      }
    }
    addFloatingButton() {
      if (window.meetergoSettings?.floatingButton && window.meetergoSettings?.floatingButton?.position && window.meetergoSettings?.floatingButton.link) {
        const position = window.meetergoSettings.floatingButton.position;
        let button = document.createElement("button");
        button.classList.add("meetergo-modal-button");
        button.innerHTML = window.meetergoSettings?.floatingButton?.text ?? "Book appointment";
        button.setAttribute("link", window.meetergoSettings.floatingButton.link);
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
          const link = button.getAttribute("link");
          if (link) {
            this.openModalWithContent({
              link
            });
          }
        });
      }
    }
    openModalWithContent(settings) {
      const {link, existingParams} = settings;
      const iframe = document.createElement("iframe");
      const params = this.getPrifillParams(existingParams);
      iframe.setAttribute("src", `${link}?${params}`);
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
        const link = anchor.getAttribute("link") ?? "";
        iframe.setAttribute("src", `${link}?${params}`);
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
    getWindowParams() {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const paramObj = {};
      for (const value of params.keys()) {
        const param = params.get(value);
        if (param) {
          paramObj[value] = param;
        }
      }
      return paramObj;
    }
    getPrifillParams(existingParams) {
      const params = [];
      let prefill = {
        ...this.getWindowParams()
      };
      if (window.meetergoSettings?.prefill) {
        prefill = {
          ...prefill,
          ...window.meetergoSettings?.prefill
        };
      }
      prefill = {
        ...prefill,
        ...existingParams
      };
      Object.entries(prefill).forEach(([key, value]) => {
        params.push(`${key}=${encodeURIComponent(value)}`);
      });
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
