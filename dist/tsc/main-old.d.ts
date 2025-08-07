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
export declare class MeetergoIntegration {
    /**
     * Stores DOM elements with bound Meetergo scheduler events
     * @private
     */
    private boundElements;
    constructor();
    init(): void;
    private addGeneralCss;
    onFormSubmit(e: Event): void;
    private listenToForms;
    private addSidebar;
    private addFloatingButton;
    private loadLucideIcon;
    private fetchLucideIcon;
    private addListeners;
    getParamsFromMainIframe(): Record<string, string>;
    openModalWithContent(settings: ModalSettings): void;
    private addModal;
    private lastActiveElement;
    /**
     * Binds the meetergo scheduler to any DOM element
     * @param element DOM element to bind the scheduler to
     * @param schedulerLink The link to the meetergo scheduler
     * @param options Optional configuration for the binding
     * @returns The bound element for chaining
     */
    bindElementToScheduler(element: HTMLElement, schedulerLink?: string, options?: {
        params?: Record<string, string>;
        removeExistingListeners?: boolean;
    }): HTMLElement;
    /**
     * Unbinds a previously bound element from the Meetergo scheduler
     * @param element The element to unbind
     * @returns true if the element was unbound, false otherwise
     */
    unbindElementFromScheduler(element: HTMLElement): boolean;
    /**
     * Programmatically launches the Meetergo scheduler
     * @param schedulerLink Optional custom link to use
     * @param params Optional parameters to pass to the scheduler
     */
    launchScheduler(schedulerLink?: string, params?: Record<string, string>): void;
    openModal(): void;
    closeModal(preventClearContent?: boolean): void;
    parseIframes(): void;
    private postScrollHeightToParent;
    sendScrollHeightToParent(): void;
    parseButtons(): void;
    private getWindowParams;
    private getPrifillParams;
    setPrefill(prefill: MeetergoSettings["prefill"]): void;
    private refreshModalWithNewPrefill;
    private meetergoStyleButton;
    /**
     * Initializes the video embed feature using settings from window.meetergoSettings
     */
    initVideoEmbed(): void;
    /**
     * Ensures HLS.js library is loaded
     * @returns Promise that resolves when HLS.js is loaded
     */
    private ensureHlsLibraryLoaded;
    /**
     * Creates the video embed UI with a video player
     * @param settings The video embed settings from meetergoSettings
     */
    private createVideoEmbed;
    /**
     * Creates all the necessary elements for the video embed
     */
    private createVideoEmbedElements;
    /**
     * Creates and returns a loading indicator element
     */
    private createLoadingIndicator;
    /**
     * Ensures animation styles exist in the document
     */
    private ensureAnimationStylesExist;
    /**
     * Sets position styles for the video container with offset support
     */
    private setPositionStyles;
    /**
     * Sets up video source with proper error handling
     */
    private setupVideoSource;
    /**
     * Helper function to adjust color brightness
     * @param color Hex color string
     * @param percent Percentage to lighten (positive) or darken (negative)
     */
    private adjustColor;
    private setupHlsVideo;
    private initHlsPlayer;
    private fallbackToPoster;
    /**
     * Apply hover effects to video container
     */
    private applyHoverEffects;
    /**
     * Remove hover effects from video container
     */
    private removeHoverEffects;
    /**
     * Create minimized indicator when video is closed
     */
    private createMinimizedIndicator;
    /**
     * Add accessibility support
     */
    private addAccessibilitySupport;
    /**
     * Add timeout to check video loading status
     */
    private addVideoLoadingTimeout;
}
export declare const meetergo: MeetergoIntegration;
export {};
