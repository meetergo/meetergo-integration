/**
 * DOM Element Caching Utility
 * 
 * Provides a simple caching mechanism to avoid repeated getElementById/querySelector calls
 * and improve performance when accessing DOM elements frequently.
 */

export class DOMCache {
  private static instance: DOMCache;
  private cache: Map<string, HTMLElement | null> = new Map();
  private selectorCache: Map<string, Element | null> = new Map();

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): DOMCache {
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
  public getElementById(id: string, forceRefresh = false): HTMLElement | null {
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
  public querySelector(selector: string, forceRefresh = false): Element | null {
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
  public querySelectorAll(selector: string): NodeListOf<Element> {
    return document.querySelectorAll(selector);
  }

  /**
   * Remove an element from cache
   * @param identifier Element ID or selector to remove from cache
   */
  public removeCached(identifier: string): void {
    this.cache.delete(identifier);
    this.selectorCache.delete(identifier);
  }

  /**
   * Clear all cached elements
   */
  public clearCache(): void {
    this.cache.clear();
    this.selectorCache.clear();
  }

  /**
   * Get cache statistics
   * @returns Object with cache size information
   */
  public getCacheStats(): { idCacheSize: number; selectorCacheSize: number } {
    return {
      idCacheSize: this.cache.size,
      selectorCacheSize: this.selectorCache.size
    };
  }

  /**
   * Verify and clean up stale cache entries (elements no longer in DOM)
   */
  public cleanupStaleEntries(): void {
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

// Export singleton instance for easy use
export const domCache = DOMCache.getInstance();

// Common element getters with caching
export const getModalElement = (): HTMLElement | null => 
  domCache.getElementById('meetergo-modal');

export const getModalContent = (): HTMLElement | null => 
  domCache.getElementById('meetergo-modal-content');

export const getSidebar = (position: 'left' | 'right'): Element | null => 
  domCache.querySelector(`.meetergo-sidebar-${position}`);

export const getFloatingButton = (): Element | null => 
  domCache.querySelector('.meetergo-modal-button');