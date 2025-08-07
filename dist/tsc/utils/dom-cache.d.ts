/**
 * DOM Element Caching Utility
 *
 * Provides a simple caching mechanism to avoid repeated getElementById/querySelector calls
 * and improve performance when accessing DOM elements frequently.
 */
export declare class DOMCache {
    private static instance;
    private cache;
    private selectorCache;
    private constructor();
    static getInstance(): DOMCache;
    /**
     * Get element by ID with caching
     * @param id Element ID to search for
     * @param forceRefresh Force a fresh lookup, bypassing cache
     * @returns HTMLElement or null if not found
     */
    getElementById(id: string, forceRefresh?: boolean): HTMLElement | null;
    /**
     * Get element by selector with caching
     * @param selector CSS selector string
     * @param forceRefresh Force a fresh lookup, bypassing cache
     * @returns Element or null if not found
     */
    querySelector(selector: string, forceRefresh?: boolean): Element | null;
    /**
     * Get all elements by selector (not cached due to NodeList nature)
     * @param selector CSS selector string
     * @returns NodeListOf<Element>
     */
    querySelectorAll(selector: string): NodeListOf<Element>;
    /**
     * Remove an element from cache
     * @param identifier Element ID or selector to remove from cache
     */
    removeCached(identifier: string): void;
    /**
     * Clear all cached elements
     */
    clearCache(): void;
    /**
     * Get cache statistics
     * @returns Object with cache size information
     */
    getCacheStats(): {
        idCacheSize: number;
        selectorCacheSize: number;
    };
    /**
     * Verify and clean up stale cache entries (elements no longer in DOM)
     */
    cleanupStaleEntries(): void;
}
export declare const domCache: DOMCache;
export declare const getModalElement: () => HTMLElement | null;
export declare const getModalContent: () => HTMLElement | null;
export declare const getSidebar: (position: 'left' | 'right') => Element | null;
export declare const getFloatingButton: () => Element | null;
