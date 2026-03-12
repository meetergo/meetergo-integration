/**
 * Meetergo v4 — DOM Cache
 *
 * Namespace-aware caching to avoid repeated getElementById/querySelector calls.
 * Upgraded from v3: supports `clearNamespace(ns)` to remove all entries for one namespace.
 */

export class DOMCache {
  private idCache: Map<string, HTMLElement | null> = new Map();
  private selectorCache: Map<string, Element | null> = new Map();

  /** Get element by ID with connection-check invalidation */
  getElementById(id: string, forceRefresh = false): HTMLElement | null {
    if (!forceRefresh && this.idCache.has(id)) {
      const el = this.idCache.get(id);
      if (el && el.isConnected) return el;
    }
    const el = document.getElementById(id);
    this.idCache.set(id, el);
    return el;
  }

  /** Get element by CSS selector with connection-check invalidation */
  querySelector(selector: string, forceRefresh = false): Element | null {
    if (!forceRefresh && this.selectorCache.has(selector)) {
      const el = this.selectorCache.get(selector);
      if (el && el.isConnected) return el;
    }
    const el = document.querySelector(selector);
    this.selectorCache.set(selector, el);
    return el;
  }

  /** Always a live query — NodeList not cached */
  querySelectorAll(selector: string): NodeListOf<Element> {
    return document.querySelectorAll(selector);
  }

  /** Remove a single entry by id or selector */
  remove(identifier: string): void {
    this.idCache.delete(identifier);
    this.selectorCache.delete(identifier);
  }

  /**
   * Remove all cache entries whose key starts with the namespace prefix.
   * Useful when a namespace is destroyed.
   */
  clearNamespace(ns: string): void {
    const prefix = `meetergo-${ns}-`;
    for (const key of this.idCache.keys()) {
      if (key.startsWith(prefix)) this.idCache.delete(key);
    }
    for (const key of this.selectorCache.keys()) {
      if (key.includes(prefix)) this.selectorCache.delete(key);
    }
  }

  /** Remove all stale (disconnected) entries */
  cleanStale(): void {
    for (const [k, el] of this.idCache) {
      if (el && !el.isConnected) this.idCache.delete(k);
    }
    for (const [k, el] of this.selectorCache) {
      if (el && !el.isConnected) this.selectorCache.delete(k);
    }
  }

  /** Clear all cached entries */
  clear(): void {
    this.idCache.clear();
    this.selectorCache.clear();
  }

  get stats(): { idEntries: number; selectorEntries: number } {
    return {
      idEntries: this.idCache.size,
      selectorEntries: this.selectorCache.size,
    };
  }
}

/** Shared singleton instance */
export const domCache = new DOMCache();
