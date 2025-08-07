"use strict";
/**
 * DOM Element Caching Utility
 *
 * Provides a simple caching mechanism to avoid repeated getElementById/querySelector calls
 * and improve performance when accessing DOM elements frequently.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFloatingButton = exports.getSidebar = exports.getModalContent = exports.getModalElement = exports.domCache = exports.DOMCache = void 0;
class DOMCache {
    constructor() {
        this.cache = new Map();
        this.selectorCache = new Map();
        // Private constructor for singleton pattern
    }
    static getInstance() {
        if (!DOMCache.instance) {
            DOMCache.instance = new DOMCache();
        }
        return DOMCache.instance;
    }
    /**
     * Get element by ID with caching
     * @param id Element ID to search for
     * @param forceRefresh Force a fresh lookup, bypassing cache
     * @returns HTMLElement or null if not found
     */
    getElementById(id, forceRefresh = false) {
        if (!forceRefresh && this.cache.has(id)) {
            const cached = this.cache.get(id);
            // Verify element is still in DOM
            if (cached && cached.isConnected) {
                return cached;
            }
        }
        const element = document.getElementById(id);
        this.cache.set(id, element);
        return element;
    }
    /**
     * Get element by selector with caching
     * @param selector CSS selector string
     * @param forceRefresh Force a fresh lookup, bypassing cache
     * @returns Element or null if not found
     */
    querySelector(selector, forceRefresh = false) {
        if (!forceRefresh && this.selectorCache.has(selector)) {
            const cached = this.selectorCache.get(selector);
            // Verify element is still in DOM
            if (cached && cached.isConnected) {
                return cached;
            }
        }
        const element = document.querySelector(selector);
        this.selectorCache.set(selector, element);
        return element;
    }
    /**
     * Get all elements by selector (not cached due to NodeList nature)
     * @param selector CSS selector string
     * @returns NodeListOf<Element>
     */
    querySelectorAll(selector) {
        return document.querySelectorAll(selector);
    }
    /**
     * Remove an element from cache
     * @param identifier Element ID or selector to remove from cache
     */
    removeCached(identifier) {
        this.cache.delete(identifier);
        this.selectorCache.delete(identifier);
    }
    /**
     * Clear all cached elements
     */
    clearCache() {
        this.cache.clear();
        this.selectorCache.clear();
    }
    /**
     * Get cache statistics
     * @returns Object with cache size information
     */
    getCacheStats() {
        return {
            idCacheSize: this.cache.size,
            selectorCacheSize: this.selectorCache.size
        };
    }
    /**
     * Verify and clean up stale cache entries (elements no longer in DOM)
     */
    cleanupStaleEntries() {
        // Clean ID cache
        for (const [id, element] of this.cache.entries()) {
            if (element && !element.isConnected) {
                this.cache.delete(id);
            }
        }
        // Clean selector cache
        for (const [selector, element] of this.selectorCache.entries()) {
            if (element && !element.isConnected) {
                this.selectorCache.delete(selector);
            }
        }
    }
}
exports.DOMCache = DOMCache;
// Export singleton instance for easy use
exports.domCache = DOMCache.getInstance();
// Common element getters with caching
const getModalElement = () => exports.domCache.getElementById('meetergo-modal');
exports.getModalElement = getModalElement;
const getModalContent = () => exports.domCache.getElementById('meetergo-modal-content');
exports.getModalContent = getModalContent;
const getSidebar = (position) => exports.domCache.querySelector(`.meetergo-sidebar-${position}`);
exports.getSidebar = getSidebar;
const getFloatingButton = () => exports.domCache.querySelector('.meetergo-modal-button');
exports.getFloatingButton = getFloatingButton;
//# sourceMappingURL=dom-cache.js.map