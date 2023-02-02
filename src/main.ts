import { MeetergoSettings } from './declarations';

export class MeetergoIntegration {
  constructor() {
    window.addEventListener('DOMContentLoaded', () => {
      this.init();
    });
  }

  public init(): void {
    this.listenToForms();
    this.addFloatingButton();
    this.addModal();
    this.parseIframes();
    this.parseButtons();
    this.addListeners();
    this.addGeneralCss();
  }

  private addGeneralCss() {
    const style = document.createElement('style');
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
    `;
    document.head.appendChild(style);
  }

  public onFormSubmit(e: SubmitEvent): void {
    e.preventDefault();
    const target = e.currentTarget as HTMLFormElement;
    if (!target) return;
    const targetListener = window.meetergoSettings?.formListeners.find(
      (listener) => {
        if (!target.id) {
          return !listener.formId;
        } else {
          return target.id === listener.formId;
        }
      }
    );
    if (!targetListener) return;

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
    const forms = document.querySelectorAll('form');

    for (const form of forms) {
      form.addEventListener('submit', this.onFormSubmit, false);
    }
  }

  private addFloatingButton(): void {
    if (
      window.meetergoSettings?.floatingButton &&
      window.meetergoSettings?.floatingButton?.position &&
      window.meetergoSettings?.floatingButton.link
    ) {
      const position = window.meetergoSettings.floatingButton.position;
      let button = document.createElement('button');
      button.classList.add('meetergo-modal-button');
      button.innerHTML =
        window.meetergoSettings?.floatingButton?.text ?? 'Book appointment';

      button.setAttribute('link', window.meetergoSettings.floatingButton.link);

      // CSS
      button.style.position = 'fixed';
      position.includes('top')
        ? (button.style.top = '0')
        : (button.style.bottom = '0');
      position.includes('left')
        ? (button.style.left = '0')
        : (button.style.right = '0');
      button = this.meetergoStyleButton(button);

      if (window.meetergoSettings?.floatingButton.backgroundColor)
        button.style.backgroundColor =
          window.meetergoSettings?.floatingButton.backgroundColor;
      if (window.meetergoSettings?.floatingButton.textColor)
        button.style.color = window.meetergoSettings?.floatingButton.textColor;

      document.body.appendChild(button);
    }
  }

  private addListeners(): void {
    const buttons = document.getElementsByClassName('meetergo-modal-button');
    for (const button of buttons) {
      button.addEventListener('click', () => {
        const link = button.getAttribute('link');
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
        data: any;
      };
      switch (meetergoEvent.event) {
        case 'open-modal': {
          const data = meetergoEvent.data as {
            link: string;
            params: Record<string, string>;
          };

          this.openModalWithContent({
            link: data.link,
            existingParams: data.params,
          });
          break;
        }
        case 'close-modal': {
          window.meetergo.closeModal();
          break;
        }
      }
    };
  }

  public openModalWithContent(settings: {
    link: string;
    existingParams?: Record<string, string>;
  }): void {
    const { link, existingParams } = settings;
    const iframe = document.createElement('iframe');
    iframe.name = 'meetergo-embedded-modal';
    const params = this.getPrifillParams(existingParams);
    iframe.setAttribute('src', `${link}?${params}`);
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    const modalContent = document.getElementById('meetergo-modal-content');
    if (modalContent) {
      modalContent.replaceChildren(iframe);
    }
    this.openModal();
  }

  private addModal(): void {
    const modal = document.createElement('div');
    modal.id = 'meetergo-modal';
    modal.style.zIndex = '999999';
    modal.style.position = 'fixed';
    modal.style.transition = 'visibility 0s linear 0.1s,opacity 0.3s ease';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';

    const overlay = document.createElement('div');
    overlay.style.zIndex = '1001';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';

    const spinner = document.createElement('div');
    spinner.className = 'meetergo-spinner';
    spinner.style.zIndex = '1002';

    overlay.onclick = () => window.meetergo.closeModal();

    const content = document.createElement('div');
    content.id = 'meetergo-modal-content';
    content.style.zIndex = '1003';
    content.style.position = 'relative';
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.backgroundColor = 'rgba(0,0,0,0)';
    content.style.borderRadius = '0.7rem';
    content.style.overflow = 'hidden';

    const button = document.createElement('button');
    button.className = 'close-button';
    button.style.zIndex = '1004';
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

    modal.appendChild(overlay);
    modal.appendChild(content);
    modal.appendChild(spinner);
    modal.appendChild(button);

    document.body.appendChild(modal);
  }

  public openModal(): void {
    const modal = document.getElementById('meetergo-modal');
    if (modal) {
      modal.style.visibility = 'visible';
      modal.style.opacity = '1';

      const buttons = modal.getElementsByClassName('meetergo-spinner');

      if (buttons.length > 0) {
        const [button] = buttons;

        if (button instanceof HTMLElement) {
          button.style.visibility = 'visible';
          button.style.opacity = '1';
        }
      }
    }
  }

  public closeModal(preventClearContent?: boolean): void {
    const modal = document.getElementById('meetergo-modal');
    if (modal) {
      // Hide Modal
      modal.style.visibility = 'hidden';
      modal.style.opacity = '0';
      const buttons = modal.getElementsByClassName('meetergo-spinner');

      if (buttons.length > 0) {
        const [button] = buttons;

        if (button instanceof HTMLElement) {
          button.style.visibility = 'hidden';
          button.style.opacity = '0';
        }
      }

      if (!preventClearContent) {
        // Clear modal content
        const content = document.getElementById('meetergo-modal-content');
        if (content) {
          content.replaceChildren();
        }
      }
    }
  }

  public parseIframes(): void {
    const anchors = document.getElementsByClassName('meetergo-iframe');
    const params = this.getPrifillParams();
    for (const anchor of anchors) {
      const iframe = document.createElement('iframe');

      const link = anchor.getAttribute('link') ?? '';
      iframe.setAttribute('src', `${link}?${params}`);
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.minHeight = '690px';
      anchor.replaceChildren(iframe);
    }
  }

  public parseButtons(): void {
    const buttons = document.getElementsByClassName('meetergo-styled-button');

    for (let button of buttons) {
      button = this.meetergoStyleButton(button as HTMLButtonElement);
    }
  }
  private getWindowParams(): Record<string, string> {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const paramObj: Record<string, string> = {};
    for (const value of params.keys()) {
      const param = params.get(value);
      if (param) {
        paramObj[value] = param;
      }
    }
    return paramObj;
  }

  private getPrifillParams(existingParams?: Record<string, string>): string {
    const params: string[] = [];
    let prefill = {
      ...this.getWindowParams(),
    };
    if (window.meetergoSettings?.prefill) {
      prefill = {
        ...prefill,
        ...window.meetergoSettings?.prefill,
      };
    }
    prefill = {
      ...prefill,
      ...existingParams,
    };
    Object.entries(prefill).forEach(([key, value]) => {
      params.push(`${key}=${encodeURIComponent(value)}`);
    });
    return params.join('&');
  }

  public setPrefill(prefill: MeetergoSettings['prefill']): void {
    window.meetergoSettings.prefill = prefill;
  }

  private meetergoStyleButton(button: HTMLButtonElement): HTMLButtonElement {
    button.style.margin = '0.5rem';
    button.style.padding = '0.8rem';
    button.style.fontWeight = 'bold';
    button.style.color = 'white';
    button.style.backgroundColor = '#0A64BC';
    button.style.borderRadius = '0.5rem';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.zIndex = '999';

    return button;
  }
}

export const meetergo = new MeetergoIntegration();
