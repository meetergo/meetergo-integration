"use strict";
/**
 * CSS Injection Utility
 *
 * Manages CSS injection into the document with proper cleanup and prevention of duplicate styles.
 * Provides methods to inject, update, and remove CSS styles dynamically.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectAllMeetergoStyles = exports.MeetergoCSSTemplates = exports.cssInjector = exports.CSSInjector = void 0;
class CSSInjector {
    constructor() {
        this.injectedStyles = new Map();
        // Private constructor for singleton pattern
    }
    static getInstance() {
        if (!CSSInjector.instance) {
            CSSInjector.instance = new CSSInjector();
        }
        return CSSInjector.instance;
    }
    /**
     * Inject CSS styles into the document
     * @param css CSS content to inject
     * @param options Options for the style element
     * @returns The created style element
     */
    injectCSS(css, options) {
        // Remove existing style with same ID if it exists
        this.removeCSS(options.id);
        const style = document.createElement('style');
        style.id = options.id;
        style.textContent = css;
        if (options.media) {
            style.media = options.media;
        }
        if (options.disabled) {
            style.disabled = options.disabled;
        }
        // Insert based on priority
        if (options.priority === 'high') {
            // Insert at the end of head for higher specificity
            document.head.appendChild(style);
        }
        else {
            // Insert at the beginning of head for normal priority
            const firstChild = document.head.firstChild;
            if (firstChild) {
                document.head.insertBefore(style, firstChild);
            }
            else {
                document.head.appendChild(style);
            }
        }
        this.injectedStyles.set(options.id, style);
        return style;
    }
    /**
     * Update existing CSS or create new if doesn't exist
     * @param css CSS content to inject/update
     * @param options Options for the style element
     * @returns The updated or created style element
     */
    updateCSS(css, options) {
        const existing = this.injectedStyles.get(options.id);
        if (existing) {
            existing.textContent = css;
            if (options.media !== undefined) {
                existing.media = options.media;
            }
            if (options.disabled !== undefined) {
                existing.disabled = options.disabled;
            }
            return existing;
        }
        return this.injectCSS(css, options);
    }
    /**
     * Remove CSS by ID
     * @param id ID of the style element to remove
     * @returns True if element was found and removed, false otherwise
     */
    removeCSS(id) {
        const style = this.injectedStyles.get(id);
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
            this.injectedStyles.delete(id);
            return true;
        }
        return false;
    }
    /**
     * Check if CSS with given ID exists
     * @param id ID to check
     * @returns True if CSS exists
     */
    hasCSS(id) {
        const style = this.injectedStyles.get(id);
        return style !== undefined && style.parentNode !== null;
    }
    /**
     * Get CSS content by ID
     * @param id ID of the style element
     * @returns CSS content or null if not found
     */
    getCSS(id) {
        const style = this.injectedStyles.get(id);
        return style ? style.textContent : null;
    }
    /**
     * Enable or disable CSS by ID
     * @param id ID of the style element
     * @param disabled Whether to disable the styles
     * @returns True if element was found, false otherwise
     */
    setCSSDisabled(id, disabled) {
        const style = this.injectedStyles.get(id);
        if (style) {
            style.disabled = disabled;
            return true;
        }
        return false;
    }
    /**
     * Get all injected CSS IDs
     * @returns Array of all injected style IDs
     */
    getAllStyleIds() {
        return Array.from(this.injectedStyles.keys());
    }
    /**
     * Remove all injected CSS
     */
    removeAllCSS() {
        this.injectedStyles.forEach((_style, id) => {
            this.removeCSS(id);
        });
    }
    /**
     * Cleanup method to remove all styles
     */
    cleanup() {
        this.removeAllCSS();
    }
}
exports.CSSInjector = CSSInjector;
// Export singleton instance
exports.cssInjector = CSSInjector.getInstance();
// Predefined CSS styles for Meetergo components
exports.MeetergoCSSTemplates = {
    // Base styles for all components
    base: `
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

    .close-button:hover {
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
      animation: meetergo-rotation 1s linear infinite;
    }

    @keyframes meetergo-rotation {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    /* Improved iframe styling - remove scrollbars and ensure smooth appearance */
    .meetergo-iframe {
      overflow: hidden !important;
      position: relative !important;
      display: block !important;
    }

    .meetergo-iframe iframe {
      width: 100% !important;
      border: none !important;
      overflow: hidden !important;
      display: block !important;
      transition: height 0.3s ease !important;
    }
  `,
    // Animation styles
    animations: `
    @keyframes meetergo-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    @keyframes meetergo-bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
    }
    
    @keyframes meetergo-slide-in-right {
      0% { transform: translateX(100%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes meetergo-slide-in-left {
      0% { transform: translateX(-100%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes meetergo-slide-in-top {
      0% { transform: translateY(-100%); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes meetergo-slide-in-bottom {
      0% { transform: translateY(100%); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    .meetergo-animation-pulse {
      animation: meetergo-pulse 2s infinite ease-in-out;
    }
    
    .meetergo-animation-bounce {
      animation: meetergo-bounce 2s infinite;
    }
    
    .meetergo-animation-slide-in-right {
      animation: meetergo-slide-in-right 0.5s forwards;
    }
    
    .meetergo-animation-slide-in-left {
      animation: meetergo-slide-in-left 0.5s forwards;
    }
    
    .meetergo-animation-slide-in-top {
      animation: meetergo-slide-in-top 0.5s forwards;
    }
    
    .meetergo-animation-slide-in-bottom {
      animation: meetergo-slide-in-bottom 0.5s forwards;
    }
  `,
    // Sidebar styles
    sidebar: `
    .meetergo-sidebar {
      position: fixed;
      top: 0;
      height: 100%;
      transition: transform 0.3s ease;
      z-index: 9998;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    .meetergo-sidebar-left {
      left: 0;
      transform: translateX(-100%);
    }

    .meetergo-sidebar-right {
      right: 0;
      transform: translateX(100%);
    }

    .meetergo-sidebar.open {
      transform: translateX(0);
    }

    .meetergo-sidebar-toggle {
      position: fixed;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: auto;
      min-width: 50px;
      padding: 12px 8px;
      transition: width 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      border: none;
      outline: none;
    }

    .meetergo-sidebar-toggle-left {
      left: 0;
      border-radius: 0 8px 8px 0;
      border-left: none;
    }

    .meetergo-sidebar-toggle-right {
      right: 0;
      border-radius: 8px 0 0 8px;
      border-right: none;
    }

    .meetergo-sidebar-toggle:hover {
      background-color: #0852a8;
    }
    
    .meetergo-sidebar-toggle-left:hover {
      box-shadow: 4px 0 10px rgba(0, 0, 0, 0.15);
    }
    
    .meetergo-sidebar-toggle-right:hover {
      box-shadow: -4px 0 10px rgba(0, 0, 0, 0.15);
    }
    
    .meetergo-sidebar-toggle-hidden {
      opacity: 0;
      pointer-events: none;
    }

    .meetergo-sidebar-toggle-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .meetergo-sidebar-toggle-text {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      margin-top: 8px;
      margin-left: 0;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .meetergo-sidebar-close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      color: #666;
      padding: 5px;
      font-size: 20px;
      z-index: 10000;
    }

    .meetergo-sidebar-close:hover {
      color: #000;
    }

    .meetergo-sidebar-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      flex: 1;
      overflow: auto;
    }
  `,
    // Button styles
    button: `
    .meetergo-styled-button {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
      margin: 0.5rem;
      padding: 0.8rem;
      font-weight: bold;
      color: white;
      background-color: #0A64BC;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      z-index: 999;
      transition: background-color 0.3s ease;
      outline: none;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }

    .meetergo-styled-button:hover {
      background-color: #0850A0 !important;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
    }

    .meetergo-styled-button:focus {
      outline: 2px solid #0A64BC !important;
      outline-offset: 2px !important;
    }

    .meetergo-styled-button:active {
      transform: translateY(1px) !important;
    }
  `,
    // Video embed styles
    videoEmbed: `
    @keyframes meetergo-spin {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
  `
};
// Convenience function to inject all default Meetergo styles
function injectAllMeetergoStyles() {
    const injector = CSSInjector.getInstance();
    injector.injectCSS(exports.MeetergoCSSTemplates.base, {
        id: 'meetergo-base-styles',
        priority: 'normal'
    });
    injector.injectCSS(exports.MeetergoCSSTemplates.animations, {
        id: 'meetergo-animation-styles',
        priority: 'normal'
    });
    injector.injectCSS(exports.MeetergoCSSTemplates.sidebar, {
        id: 'meetergo-sidebar-styles',
        priority: 'normal'
    });
    injector.injectCSS(exports.MeetergoCSSTemplates.button, {
        id: 'meetergo-button-styles',
        priority: 'normal'
    });
    injector.injectCSS(exports.MeetergoCSSTemplates.videoEmbed, {
        id: 'meetergo-video-styles',
        priority: 'normal'
    });
}
exports.injectAllMeetergoStyles = injectAllMeetergoStyles;
//# sourceMappingURL=css-injector.js.map