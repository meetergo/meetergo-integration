/**
 * Modal Management Module
 *
 * Handles the creation, management, and lifecycle of modals for the Meetergo integration.
 * Provides a clean API for modal operations with proper cleanup and accessibility support.
 */
import { MeetergoModalEvent } from '../declarations';
export interface ModalSettings {
    link: string;
    existingParams?: Record<string, string>;
}
export interface ModalOptions {
    disableModal?: boolean;
    enableAutoResize?: boolean;
}
export declare class ModalManager {
    private static instance;
    private lastActiveElement;
    private eventListeners;
    private resizeObserver;
    private onEventCallback?;
    private constructor();
    static getInstance(): ModalManager;
    /**
     * Set callback for modal events
     * @param callback Callback function for modal events
     */
    setEventCallback(callback: (event: MeetergoModalEvent) => void): void;
    /**
     * Initialize the modal system
     * @param options Modal configuration options
     */
    initialize(options?: ModalOptions): void;
    /**
     * Open modal with content
     * @param settings Modal settings including link and parameters
     */
    openModalWithContent(settings: ModalSettings): void;
    /**
     * Open the modal
     */
    openModal(): void;
    /**
     * Close the modal
     * @param preventClearContent Whether to prevent clearing modal content
     */
    closeModal(preventClearContent?: boolean): void;
    /**
     * Check if modal is currently open
     * @returns True if modal is open
     */
    isModalOpen(): boolean;
    /**
     * Create modal elements in the DOM
     */
    private createModalElements;
    /**
     * Create modal overlay element
     */
    private createOverlay;
    /**
     * Create loading spinner element
     */
    private createSpinner;
    /**
     * Create content container element
     */
    private createContentContainer;
    /**
     * Create accessibility elements (title and description)
     */
    private createAccessibilityElements;
    /**
     * Create close button element
     */
    private createCloseButton;
    /**
     * Create iframe for modal content
     * @param link URL for the iframe
     * @param existingParams Additional parameters to append
     */
    private createIframe;
    /**
     * Build URL parameters string
     * @param existingParams Parameters to include
     */
    private buildURLParams;
    /**
     * Get parameters from current window URL
     */
    private getWindowParams;
    /**
     * Setup event listeners for modal
     */
    private setupEventListeners;
    /**
     * Setup resize observer for responsive behavior
     */
    private setupResizeObserver;
    /**
     * Emit modal event
     * @param event Modal event to emit
     */
    private emitEvent;
    /**
     * Cleanup method to remove all modal elements and listeners
     */
    cleanup(): void;
}
export declare const modalManager: ModalManager;
