/**
 * Modal Management Module
 * 
 * Handles the creation, management, and lifecycle of modals for the Meetergo integration.
 * Provides a clean API for modal operations with proper cleanup and accessibility support.
 */

import { domCache } from '../utils/dom-cache';
import { errorHandler } from '../utils/error-handler';
import { MeetergoModalEvent } from '../declarations';

export interface ModalSettings {
  link: string;
  existingParams?: Record<string, string>;
}

export interface ModalOptions {
  disableModal?: boolean;
  enableAutoResize?: boolean;
}

export class ModalManager {
  private static instance: ModalManager;
  private lastActiveElement: Element | null = null;
  // Removed unused currentModal property
  private eventListeners: Map<string, EventListener> = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private onEventCallback?: (event: MeetergoModalEvent) => void;

  private constructor() {
    // Private constructor for singleton pattern
    this.setupResizeObserver();
  }

  public static getInstance(): ModalManager {
    if (!ModalManager.instance) {
      ModalManager.instance = new ModalManager();
    }
    return ModalManager.instance;
  }

  /**
   * Set callback for modal events
   * @param callback Callback function for modal events
   */
  public setEventCallback(callback: (event: MeetergoModalEvent) => void): void {
    this.onEventCallback = callback;
  }

  /**
   * Initialize the modal system
   * @param options Modal configuration options
   */
  public initialize(options: ModalOptions = {}): void {
    try {
      if (!options.disableModal) {
        this.createModalElements();
        this.setupEventListeners();
      }
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to initialize modal system',
        level: 'error',
        context: 'ModalManager.initialize',
        error: error as Error
      });
    }
  }

  /**
   * Open modal with content
   * @param settings Modal settings including link and parameters
   */
  public openModalWithContent(settings: ModalSettings): void {
    try {
      const { link, existingParams } = settings;

      if (!link) {
        errorHandler.handleError({
          message: 'Link is required for opening modal',
          level: 'error',
          context: 'ModalManager.openModalWithContent'
        });
        return;
      }

      this.emitEvent({ type: 'modal_loading' });

      const iframe = this.createIframe(link, existingParams);
      const modalContent = domCache.getElementById('meetergo-modal-content');
      
      if (!modalContent) {
        errorHandler.handleError({
          message: 'Modal content element not found',
          level: 'error',
          context: 'ModalManager.openModalWithContent'
        });
        return;
      }

      modalContent.innerHTML = '';
      modalContent.appendChild(iframe);
      this.openModal();

    } catch (error) {
      errorHandler.handleError({
        message: 'Error opening modal with content',
        level: 'error',
        context: 'ModalManager.openModalWithContent',
        error: error as Error
      });
      this.emitEvent({ type: 'modal_error', data: { error: error as Error } });
    }
  }

  /**
   * Open the modal
   */
  public openModal(): void {
    try {
      this.lastActiveElement = document.activeElement;
      
      const modal = domCache.getElementById('meetergo-modal');
      if (!modal) {
        errorHandler.handleError({
          message: 'Modal element not found',
          level: 'error',
          context: 'ModalManager.openModal'
        });
        return;
      }

      // Track current modal state
      modal.style.visibility = 'visible';
      modal.style.opacity = '1';

      // Show loading spinner
      const spinners = modal.getElementsByClassName('meetergo-spinner');
      if (spinners.length > 0) {
        const spinner = spinners[0] as HTMLElement;
        spinner.style.visibility = 'visible';
        spinner.style.opacity = '1';
      }

      // Focus close button for accessibility
      const closeButton = modal.querySelector('.close-button') as HTMLElement;
      if (closeButton) {
        setTimeout(() => {
          closeButton.focus();
        }, 100);
      }

      // Prevent body scrolling
      document.body.style.overflow = 'hidden';

      this.emitEvent({ type: 'modal_opened' });

    } catch (error) {
      errorHandler.handleError({
        message: 'Error opening modal',
        level: 'error',
        context: 'ModalManager.openModal',
        error: error as Error
      });
    }
  }

  /**
   * Close the modal
   * @param preventClearContent Whether to prevent clearing modal content
   */
  public closeModal(preventClearContent = false): void {
    try {
      const modal = domCache.getElementById('meetergo-modal');
      if (!modal) {
        errorHandler.handleError({
          message: 'Modal element not found when attempting to close',
          level: 'warning',
          context: 'ModalManager.closeModal'
        });
        return;
      }

      modal.style.visibility = 'hidden';
      modal.style.opacity = '0';

      // Hide loading spinner
      const spinners = modal.getElementsByClassName('meetergo-spinner');
      if (spinners.length > 0) {
        const spinner = spinners[0] as HTMLElement;
        spinner.style.visibility = 'hidden';
        spinner.style.opacity = '0';
      }

      // Clear content after animation
      if (!preventClearContent) {
        setTimeout(() => {
          const content = domCache.getElementById('meetergo-modal-content');
          if (content) {
            content.innerHTML = '';
          }
        }, 300);
      }

      // Restore body scrolling
      document.body.style.overflow = '';

      // Restore focus
      if (this.lastActiveElement instanceof HTMLElement) {
        setTimeout(() => {
          (this.lastActiveElement as HTMLElement).focus();
        }, 100);
      }

      // Reset modal state
      this.emitEvent({ type: 'modal_closed' });

    } catch (error) {
      errorHandler.handleError({
        message: 'Error closing modal',
        level: 'error',
        context: 'ModalManager.closeModal',
        error: error as Error
      });
    }
  }

  /**
   * Check if modal is currently open
   * @returns True if modal is open
   */
  public isModalOpen(): boolean {
    const modal = domCache.getElementById('meetergo-modal');
    return modal !== null && modal.style.visibility === 'visible';
  }

  /**
   * Create modal elements in the DOM
   */
  private createModalElements(): void {
    try {
      // Check if modal already exists
      if (domCache.getElementById('meetergo-modal')) {
        return;
      }

      const modal = document.createElement('div');
      modal.id = 'meetergo-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'meetergo-modal-title');
      modal.setAttribute('aria-describedby', 'meetergo-modal-description');
      
      Object.assign(modal.style, {
        zIndex: '999999',
        position: 'fixed',
        transition: 'visibility 0s linear 0.1s,opacity 0.3s ease',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        visibility: 'hidden',
        opacity: '0'
      });

      // Create overlay
      const overlay = this.createOverlay();
      
      // Create loading spinner
      const spinner = this.createSpinner();
      
      // Create content container
      const content = this.createContentContainer();
      
      // Create accessibility elements
      const { title, description } = this.createAccessibilityElements();
      
      // Create close button
      const closeButton = this.createCloseButton();

      // Assemble modal
      const fragment = document.createDocumentFragment();
      fragment.appendChild(overlay);
      fragment.appendChild(content);
      fragment.appendChild(spinner);
      fragment.appendChild(closeButton);
      fragment.appendChild(title);
      fragment.appendChild(description);

      modal.appendChild(fragment);
      document.body.appendChild(modal);

    } catch (error) {
      errorHandler.handleError({
        message: 'Error creating modal elements',
        level: 'error',
        context: 'ModalManager.createModalElements',
        error: error as Error
      });
    }
  }

  /**
   * Create modal overlay element
   */
  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      zIndex: '1001',
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.6)'
    });

    overlay.onclick = (e) => {
      e.preventDefault();
      this.closeModal();
    };

    return overlay;
  }

  /**
   * Create loading spinner element
   */
  private createSpinner(): HTMLElement {
    const spinner = document.createElement('div');
    spinner.className = 'meetergo-spinner';
    spinner.setAttribute('role', 'status');
    spinner.setAttribute('aria-label', 'Loading');
    spinner.style.zIndex = '1002';
    return spinner;
  }

  /**
   * Create content container element
   */
  private createContentContainer(): HTMLElement {
    const content = document.createElement('div');
    content.id = 'meetergo-modal-content';
    
    Object.assign(content.style, {
      zIndex: '1003',
      position: 'relative',
      width: '100%',
      maxWidth: '900px',
      maxHeight: '90vh',
      height: 'auto',
      backgroundColor: 'rgba(0,0,0,0)',
      borderRadius: '0.7rem',
      overflow: 'hidden',
      padding: '16px'
    });

    return content;
  }

  /**
   * Create accessibility elements (title and description)
   */
  private createAccessibilityElements(): { title: HTMLElement; description: HTMLElement } {
    const title = document.createElement('h2');
    title.id = 'meetergo-modal-title';
    title.textContent = 'Meetergo Booking';
    
    const description = document.createElement('p');
    description.id = 'meetergo-modal-description';
    description.textContent = 'Calendar booking interface';

    // Screen reader only styles
    const srOnlyStyles = {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      borderWidth: '0'
    };

    Object.assign(title.style, srOnlyStyles);
    Object.assign(description.style, srOnlyStyles);

    return { title, description };
  }

  /**
   * Create close button element
   */
  private createCloseButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'close-button';
    button.setAttribute('aria-label', 'Close booking modal');
    button.setAttribute('type', 'button');
    button.style.zIndex = '1004';
    
    button.onclick = (e) => {
      e.preventDefault();
      this.closeModal();
    };

    button.innerHTML = `
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" 
           height="24px" width="24px" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M289.94 256l95-95A24 24 0 00351 127l-95 95-95-95a24 24 0 00-34 34l95 95-95 95a24 24 0 1034 34l95-95 95 95a24 24 0 0034-34z"></path>
      </svg>
    `;

    return button;
  }

  /**
   * Create iframe for modal content
   * @param link URL for the iframe
   * @param existingParams Additional parameters to append
   */
  private createIframe(link: string, existingParams?: Record<string, string>): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.name = 'meetergo-embedded-modal';
    
    // Build URL with parameters
    const params = this.buildURLParams(existingParams);
    iframe.setAttribute('src', `${link}?${params}`);
    
    Object.assign(iframe.style, {
      width: '100%',
      height: '700px',
      minHeight: '400px',
      maxHeight: 'calc(90vh - 32px)',
      border: 'none',
      display: 'block',
      overflow: 'hidden'
    });

    // Setup iframe load handler
    iframe.addEventListener('load', () => {
      // Hide spinner when iframe loads
      const modal = domCache.getElementById('meetergo-modal');
      if (modal) {
        const spinners = modal.getElementsByClassName('meetergo-spinner');
        if (spinners.length > 0) {
          const spinner = spinners[0] as HTMLElement;
          spinner.style.display = 'none';
        }
      }
    });

    return iframe;
  }

  /**
   * Build URL parameters string
   * @param existingParams Parameters to include
   */
  private buildURLParams(existingParams?: Record<string, string>): string {
    const params: string[] = [];

    // Get window parameters
    const windowParams = this.getWindowParams();
    
    // Get prefill from settings if available
    let allParams = { ...windowParams };
    if (window.meetergoSettings?.prefill) {
      // Filter out undefined values
      const filteredPrefill: Record<string, string> = {};
      Object.entries(window.meetergoSettings.prefill).forEach(([key, value]) => {
        if (value !== undefined) {
          filteredPrefill[key] = value;
        }
      });
      allParams = { ...allParams, ...filteredPrefill };
    }
    
    if (existingParams) {
      allParams = { ...allParams, ...existingParams };
    }

    Object.entries(allParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        try {
          const encodedKey = encodeURIComponent(key);
          const encodedValue = encodeURIComponent(String(value));
          params.push(`${encodedKey}=${encodedValue}`);
        } catch (error) {
          console.warn(`Meetergo: Error encoding parameter ${key}`, error);
        }
      }
    });

    return params.join('&');
  }

  /**
   * Get parameters from current window URL
   */
  private getWindowParams(): Record<string, string> {
    try {
      const search = window.location.search;
      if (!search) {
        return {};
      }

      const params = new URLSearchParams(search);
      const paramObj: Record<string, string> = {};

      params.forEach((value, key) => {
        if (value && value.trim() !== '') {
          paramObj[key] = value;
        }
      });

      return paramObj;
    } catch (error) {
      console.error('Meetergo: Error parsing window parameters', error);
      return {};
    }
  }

  /**
   * Setup event listeners for modal
   */
  private setupEventListeners(): void {
    // Keyboard event listener for ESC key
    const keydownListener: EventListener = (evt: Event) => {
      const e = evt as KeyboardEvent;
      if (e.key === 'Escape' && this.isModalOpen()) {
        this.closeModal();
      }
    };

    document.addEventListener('keydown', keydownListener);
    this.eventListeners.set('keydown', keydownListener);
  }

  /**
   * Setup resize observer for responsive behavior
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        // Handle responsive modal behavior here if needed
        // Could adjust modal size based on container changes
      });
    }
  }


  /**
   * Emit modal event
   * @param event Modal event to emit
   */
  private emitEvent(event: MeetergoModalEvent): void {
    if (this.onEventCallback) {
      this.onEventCallback(event);
    }
  }

  /**
   * Cleanup method to remove all modal elements and listeners
   */
  public cleanup(): void {
    try {
      // Close modal if open
      if (this.isModalOpen()) {
        this.closeModal();
      }

      // Remove event listeners
      this.eventListeners.forEach((listener, event) => {
        document.removeEventListener(event, listener as EventListener);
      });
      this.eventListeners.clear();

      // Disconnect resize observer
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }

      // Remove modal element
      const modal = domCache.getElementById('meetergo-modal');
      if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }

      // Clear cache
      domCache.removeCached('meetergo-modal');
      domCache.removeCached('meetergo-modal-content');

      // Reset modal state
      this.lastActiveElement = null;

    } catch (error) {
      errorHandler.handleError({
        message: 'Error during modal cleanup',
        level: 'warning',
        context: 'ModalManager.cleanup',
        error: error as Error
      });
    }
  }
}

// Export singleton instance
export const modalManager = ModalManager.getInstance();