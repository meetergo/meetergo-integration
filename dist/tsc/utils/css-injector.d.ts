/**
 * CSS Injection Utility
 *
 * Manages CSS injection into the document with proper cleanup and prevention of duplicate styles.
 * Provides methods to inject, update, and remove CSS styles dynamically.
 */
export interface CSSOptions {
    id: string;
    priority?: 'normal' | 'high';
    media?: string;
    disabled?: boolean;
}
export declare class CSSInjector {
    private static instance;
    private injectedStyles;
    private constructor();
    static getInstance(): CSSInjector;
    /**
     * Inject CSS styles into the document
     * @param css CSS content to inject
     * @param options Options for the style element
     * @returns The created style element
     */
    injectCSS(css: string, options: CSSOptions): HTMLStyleElement;
    /**
     * Update existing CSS or create new if doesn't exist
     * @param css CSS content to inject/update
     * @param options Options for the style element
     * @returns The updated or created style element
     */
    updateCSS(css: string, options: CSSOptions): HTMLStyleElement;
    /**
     * Remove CSS by ID
     * @param id ID of the style element to remove
     * @returns True if element was found and removed, false otherwise
     */
    removeCSS(id: string): boolean;
    /**
     * Check if CSS with given ID exists
     * @param id ID to check
     * @returns True if CSS exists
     */
    hasCSS(id: string): boolean;
    /**
     * Get CSS content by ID
     * @param id ID of the style element
     * @returns CSS content or null if not found
     */
    getCSS(id: string): string | null;
    /**
     * Enable or disable CSS by ID
     * @param id ID of the style element
     * @param disabled Whether to disable the styles
     * @returns True if element was found, false otherwise
     */
    setCSSDisabled(id: string, disabled: boolean): boolean;
    /**
     * Get all injected CSS IDs
     * @returns Array of all injected style IDs
     */
    getAllStyleIds(): string[];
    /**
     * Remove all injected CSS
     */
    removeAllCSS(): void;
    /**
     * Cleanup method to remove all styles
     */
    cleanup(): void;
}
export declare const cssInjector: CSSInjector;
export declare const MeetergoCSSTemplates: {
    base: string;
    animations: string;
    sidebar: string;
    button: string;
    videoEmbed: string;
};
export declare function injectAllMeetergoStyles(): void;
