/**
 * Sidebar Management Module
 *
 * Handles the creation, management, and lifecycle of sidebars for the Meetergo integration.
 * Provides slide-out sidebar functionality with toggle buttons.
 */
import { SidebarConfig, SidebarPosition } from '../declarations';
export declare class SidebarManager {
    private static instance;
    private activeSidebars;
    private eventListeners;
    private constructor();
    static getInstance(): SidebarManager;
    /**
     * Create and initialize a sidebar
     * @param config Sidebar configuration
     */
    createSidebar(config: SidebarConfig): void;
    /**
     * Remove a sidebar by position
     * @param position Sidebar position to remove
     */
    removeSidebar(position: SidebarPosition): void;
    /**
     * Toggle sidebar open/closed state
     * @param position Sidebar position to toggle
     */
    toggleSidebar(position: SidebarPosition): void;
    /**
     * Check if sidebar is open
     * @param position Sidebar position to check
     * @returns True if sidebar is open
     */
    isSidebarOpen(position: SidebarPosition): boolean;
    /**
     * Build sidebar DOM elements
     * @param config Sidebar configuration
     * @returns Object containing sidebar and toggle button elements
     */
    private buildSidebarElements;
    /**
     * Create sidebar close button
     */
    private createCloseButton;
    /**
     * Create sidebar iframe
     * @param link URL for the iframe
     */
    private createSidebarIframe;
    /**
     * Create sidebar toggle button
     * @param config Sidebar configuration
     * @param buttonText Toggle button text
     * @param buttonIcon Toggle button icon
     * @param buttonPosition Toggle button position
     */
    private createToggleButton;
    /**
     * Set toggle button position styles
     * @param button Toggle button element
     * @param position Button position
     */
    private setToggleButtonPosition;
    /**
     * Set Lucide icon for element
     * @param iconName Name of the Lucide icon
     * @param container Container element for the icon
     */
    private setLucideIcon;
    /**
     * Setup event listeners for sidebar and toggle button
     * @param sidebar Sidebar element
     * @param toggleButton Toggle button element
     */
    private setupSidebarEventListeners;
    /**
     * Clean up event listeners for a specific sidebar
     * @param sidebarId Sidebar ID to clean up listeners for
     */
    private cleanupEventListeners;
    /**
     * Get all active sidebars
     * @returns Array of active sidebar positions
     */
    getActiveSidebars(): SidebarPosition[];
    /**
     * Cleanup method to remove all sidebars and listeners
     */
    cleanup(): void;
}
export declare const sidebarManager: SidebarManager;
