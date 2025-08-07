"use strict";
/**
 * Sidebar Management Module
 *
 * Handles the creation, management, and lifecycle of sidebars for the Meetergo integration.
 * Provides slide-out sidebar functionality with toggle buttons.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sidebarManager = exports.SidebarManager = void 0;
// import { domCache } from '../utils/dom-cache'; // Removed unused import
const error_handler_1 = require("../utils/error-handler");
class SidebarManager {
    constructor() {
        this.activeSidebars = new Map();
        this.eventListeners = new Map();
        // Private constructor for singleton pattern
    }
    static getInstance() {
        if (!SidebarManager.instance) {
            SidebarManager.instance = new SidebarManager();
        }
        return SidebarManager.instance;
    }
    /**
     * Create and initialize a sidebar
     * @param config Sidebar configuration
     */
    createSidebar(config) {
        try {
            if (!config.link) {
                error_handler_1.errorHandler.handleError({
                    message: 'Sidebar link is required',
                    level: 'warning',
                    context: 'SidebarManager.createSidebar'
                });
                return;
            }
            const position = config.position || 'right';
            const sidebarId = `meetergo-sidebar-${position}`;
            // Remove existing sidebar if present
            this.removeSidebar(position);
            const { sidebar, toggleButton } = this.buildSidebarElements(config);
            document.body.appendChild(sidebar);
            document.body.appendChild(toggleButton);
            this.activeSidebars.set(sidebarId, sidebar);
            this.setupSidebarEventListeners(sidebar, toggleButton);
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Failed to create sidebar',
                level: 'error',
                context: 'SidebarManager.createSidebar',
                error: error
            });
        }
    }
    /**
     * Remove a sidebar by position
     * @param position Sidebar position to remove
     */
    removeSidebar(position) {
        try {
            const sidebarId = `meetergo-sidebar-${position}`;
            const sidebar = this.activeSidebars.get(sidebarId);
            if (sidebar) {
                // Remove event listeners
                this.cleanupEventListeners(sidebarId);
                // Remove DOM elements
                if (sidebar.parentNode) {
                    sidebar.parentNode.removeChild(sidebar);
                }
                // Remove toggle button
                const toggleButton = document.querySelector(`.meetergo-sidebar-toggle-${position}`);
                if (toggleButton && toggleButton.parentNode) {
                    toggleButton.parentNode.removeChild(toggleButton);
                }
                this.activeSidebars.delete(sidebarId);
            }
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error removing sidebar',
                level: 'warning',
                context: 'SidebarManager.removeSidebar',
                error: error
            });
        }
    }
    /**
     * Toggle sidebar open/closed state
     * @param position Sidebar position to toggle
     */
    toggleSidebar(position) {
        try {
            const sidebarId = `meetergo-sidebar-${position}`;
            const sidebar = this.activeSidebars.get(sidebarId);
            if (sidebar) {
                const isOpen = sidebar.classList.contains('open');
                const toggleButton = document.querySelector(`.meetergo-sidebar-toggle-${position}`);
                if (isOpen) {
                    sidebar.classList.remove('open');
                    toggleButton === null || toggleButton === void 0 ? void 0 : toggleButton.classList.remove('meetergo-sidebar-toggle-hidden');
                }
                else {
                    sidebar.classList.add('open');
                    toggleButton === null || toggleButton === void 0 ? void 0 : toggleButton.classList.add('meetergo-sidebar-toggle-hidden');
                }
            }
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error toggling sidebar',
                level: 'warning',
                context: 'SidebarManager.toggleSidebar',
                error: error
            });
        }
    }
    /**
     * Check if sidebar is open
     * @param position Sidebar position to check
     * @returns True if sidebar is open
     */
    isSidebarOpen(position) {
        const sidebarId = `meetergo-sidebar-${position}`;
        const sidebar = this.activeSidebars.get(sidebarId);
        return (sidebar === null || sidebar === void 0 ? void 0 : sidebar.classList.contains('open')) || false;
    }
    /**
     * Build sidebar DOM elements
     * @param config Sidebar configuration
     * @returns Object containing sidebar and toggle button elements
     */
    buildSidebarElements(config) {
        const position = config.position || 'right';
        const width = config.width || '400px';
        const link = config.link || '';
        const buttonText = config.buttonText || 'Open Scheduler';
        const buttonIcon = config.buttonIcon || 'calendar';
        const buttonPosition = config.buttonPosition || 'middle-right';
        // Create sidebar container
        const sidebar = document.createElement('div');
        sidebar.classList.add('meetergo-sidebar', `meetergo-sidebar-${position}`);
        sidebar.style.width = width;
        // Create close button
        const closeButton = this.createCloseButton();
        // Create iframe
        const iframe = this.createSidebarIframe(link);
        // Create toggle button
        const toggleButton = this.createToggleButton(config, buttonText, buttonIcon, buttonPosition);
        // Assemble sidebar
        sidebar.appendChild(closeButton);
        sidebar.appendChild(iframe);
        return { sidebar, toggleButton };
    }
    /**
     * Create sidebar close button
     */
    createCloseButton() {
        const closeButton = document.createElement('button');
        closeButton.classList.add('meetergo-sidebar-close');
        closeButton.setAttribute('aria-label', 'Close sidebar');
        closeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" 
           fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
        return closeButton;
    }
    /**
     * Create sidebar iframe
     * @param link URL for the iframe
     */
    createSidebarIframe(link) {
        const iframe = document.createElement('iframe');
        iframe.classList.add('meetergo-sidebar-iframe');
        iframe.src = link;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        return iframe;
    }
    /**
     * Create sidebar toggle button
     * @param config Sidebar configuration
     * @param buttonText Toggle button text
     * @param buttonIcon Toggle button icon
     * @param buttonPosition Toggle button position
     */
    createToggleButton(config, buttonText, buttonIcon, buttonPosition) {
        const position = config.position || 'right';
        const toggleButton = document.createElement('button');
        toggleButton.classList.add('meetergo-sidebar-toggle', position === 'left' ? 'meetergo-sidebar-toggle-left' : 'meetergo-sidebar-toggle-right');
        // Set button position
        this.setToggleButtonPosition(toggleButton, buttonPosition);
        // Add icon
        if (buttonIcon) {
            const iconSpan = document.createElement('span');
            iconSpan.classList.add('meetergo-sidebar-toggle-icon');
            this.setLucideIcon(buttonIcon, iconSpan);
            toggleButton.appendChild(iconSpan);
        }
        // Add text
        if (buttonText) {
            const textLabel = document.createElement('span');
            textLabel.classList.add('meetergo-sidebar-toggle-text');
            textLabel.textContent = buttonText;
            toggleButton.appendChild(textLabel);
        }
        // Set accessibility attributes
        toggleButton.setAttribute('aria-label', buttonText);
        toggleButton.setAttribute('role', 'button');
        // Apply custom styles
        if (config.backgroundColor) {
            toggleButton.style.backgroundColor = config.backgroundColor;
        }
        if (config.textColor) {
            toggleButton.style.color = config.textColor;
        }
        return toggleButton;
    }
    /**
     * Set toggle button position styles
     * @param button Toggle button element
     * @param position Button position
     */
    setToggleButtonPosition(button, position) {
        if (position.includes('top')) {
            button.style.top = '120px';
        }
        else if (position.includes('middle')) {
            button.style.top = '50%';
            button.style.transform = 'translateY(-50%)';
        }
        else {
            button.style.bottom = '120px';
            button.style.top = '';
        }
    }
    /**
     * Set Lucide icon for element
     * @param iconName Name of the Lucide icon
     * @param container Container element for the icon
     */
    setLucideIcon(iconName, container) {
        const iconMap = {
            calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
            clock: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`,
            user: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="10" r="4"/></svg>`,
            mail: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
            phone: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
            'message-square': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
        };
        const iconSvg = iconMap[iconName.toLowerCase()] || iconMap['calendar'];
        container.innerHTML = iconSvg;
    }
    /**
     * Setup event listeners for sidebar and toggle button
     * @param sidebar Sidebar element
     * @param toggleButton Toggle button element
     */
    setupSidebarEventListeners(sidebar, toggleButton) {
        try {
            const position = sidebar.classList.contains('meetergo-sidebar-left') ? 'left' : 'right';
            const sidebarId = `meetergo-sidebar-${position}`;
            const listeners = [];
            // Toggle button click handler
            const toggleHandler = () => {
                this.toggleSidebar(position);
            };
            toggleButton.addEventListener('click', toggleHandler);
            listeners.push(toggleHandler);
            // Close button click handler
            const closeButton = sidebar.querySelector('.meetergo-sidebar-close');
            const closeHandler = () => {
                sidebar.classList.remove('open');
                toggleButton.classList.remove('meetergo-sidebar-toggle-hidden');
            };
            closeButton === null || closeButton === void 0 ? void 0 : closeButton.addEventListener('click', closeHandler);
            listeners.push(closeHandler);
            // Keyboard navigation
            const keydownHandler = (evt) => {
                const e = evt;
                if (e.key === 'Escape' && this.isSidebarOpen(position)) {
                    this.toggleSidebar(position);
                }
            };
            document.addEventListener('keydown', keydownHandler);
            listeners.push(keydownHandler);
            this.eventListeners.set(sidebarId, listeners);
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error setting up sidebar event listeners',
                level: 'warning',
                context: 'SidebarManager.setupSidebarEventListeners',
                error: error
            });
        }
    }
    /**
     * Clean up event listeners for a specific sidebar
     * @param sidebarId Sidebar ID to clean up listeners for
     */
    cleanupEventListeners(sidebarId) {
        const listeners = this.eventListeners.get(sidebarId);
        if (listeners) {
            // Note: This is a simplified cleanup. In a real implementation,
            // we'd need to store more information about which elements have which listeners
            this.eventListeners.delete(sidebarId);
        }
    }
    /**
     * Get all active sidebars
     * @returns Array of active sidebar positions
     */
    getActiveSidebars() {
        const positions = [];
        this.activeSidebars.forEach((_, id) => {
            const position = id.includes('left') ? 'left' : 'right';
            positions.push(position);
        });
        return positions;
    }
    /**
     * Cleanup method to remove all sidebars and listeners
     */
    cleanup() {
        try {
            // Remove all sidebars
            const positions = this.getActiveSidebars();
            positions.forEach(position => {
                this.removeSidebar(position);
            });
            // Clear all maps
            this.activeSidebars.clear();
            this.eventListeners.clear();
        }
        catch (error) {
            error_handler_1.errorHandler.handleError({
                message: 'Error during sidebar cleanup',
                level: 'warning',
                context: 'SidebarManager.cleanup',
                error: error
            });
        }
    }
}
exports.SidebarManager = SidebarManager;
// Export singleton instance
exports.sidebarManager = SidebarManager.getInstance();
//# sourceMappingURL=sidebar-manager.js.map