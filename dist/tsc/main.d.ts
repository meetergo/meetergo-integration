import { MeetergoPrefill } from "./declarations";
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
    private timeouts;
    private intervals;
    private isInitialized;
    private messageHandlers;
    private intersectionObservers;
    constructor();
    init(): void;
    /**
     * Setup event callbacks for all modules
     * @private
     */
    private setupEventCallbacks;
    /**
     * Handle Meetergo events from modules
     * @private
     */
    private handleMeetergoEvent;
    /**
     * Initialize components based on settings
     * @private
     */
    private initializeComponents;
    onFormSubmit(e: Event): void;
    private listenToForms;
    private addFloatingButton;
    /**
     * Position floating button based on configuration
     * @private
     */
    private positionFloatingButton;
    /**
     * Apply animation to button
     * @private
     */
    private applyButtonAnimation;
    private loadLucideIcon;
    private fetchLucideIcon;
    private addListeners;
    getParamsFromMainIframe(): Record<string, string>;
    openModalWithContent(settings: ModalSettings): void;
    openModal(): void;
    closeModal(preventClearContent?: boolean): void;
    /**
     * Binds the meetergo scheduler to any DOM element
     */
    bindElementToScheduler(element: HTMLElement, schedulerLink?: string, options?: {
        params?: Record<string, string>;
        removeExistingListeners?: boolean;
    }): HTMLElement;
    /**
     * Unbinds a previously bound element from the Meetergo scheduler
     */
    unbindElementFromScheduler(element: HTMLElement): boolean;
    /**
     * Programmatically launches the Meetergo scheduler
     */
    launchScheduler(schedulerLink?: string, params?: Record<string, string>): void;
    parseIframes(): void;
    sendScrollHeightToParent(): void;
    /**
     * Setup auto-resize functionality for an iframe
     * Uses postMessage communication to receive height updates from the iframe content
     */
    private setupIframeAutoResize;
    /**
     * Check if origin is a valid Meetergo domain
     */
    private isValidMeetergoOrigin;
    /**
     * Request height from iframe content
     */
    private requestIframeHeight;
    /**
     * Fallback method using intersection observer to detect content changes
     */
    private setupIntersectionObserver;
    /**
     * Try to adjust iframe height based on content
     */
    private adjustIframeHeight;
    /**
     * Setup ResizeObserver for iframe container
     */
    private setupResizeObserver;
    parseButtons(): void;
    private getWindowParams;
    private getPrifillParams;
    setPrefill(prefill: MeetergoPrefill): void;
    private refreshModalWithNewPrefill;
    private meetergoStyleButton;
    /**
     * Create a timeout with automatic tracking
     * @param callback Function to execute
     * @param delay Delay in milliseconds
     * @returns Timeout ID
     */
    createTimeout(callback: () => void, delay: number): number;
    /**
     * Create an interval with automatic tracking
     * @param callback Function to execute
     * @param delay Delay in milliseconds
     * @returns Interval ID
     */
    createInterval(callback: () => void, delay: number): number;
    /**
     * Clear a tracked timeout
     * @param timeoutId Timeout ID to clear
     */
    clearTrackedTimeout(timeoutId: number): void;
    /**
     * Clear a tracked interval
     * @param intervalId Interval ID to clear
     */
    clearTrackedInterval(intervalId: number): void;
    /**
     * Cleanup method that removes all event listeners, timeouts, intervals, and DOM elements
     */
    destroy(): void;
    /**
     * Check if integration is initialized
     */
    isReady(): boolean;
    /**
     * Get integration status and statistics
     */
    getStatus(): {
        initialized: boolean;
        boundElements: number;
        activeTimeouts: number;
        activeIntervals: number;
        cacheStats: {
            idCacheSize: number;
            selectorCacheSize: number;
        };
    };
}
export declare const meetergo: MeetergoIntegration;
export {};
