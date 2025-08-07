/**
 * Error Handling and Notification System
 *
 * Provides centralized error handling, user notifications, and recovery strategies
 * for network failures and other errors in the Meetergo integration.
 */
export declare type ErrorLevel = 'info' | 'warning' | 'error' | 'critical';
export interface ErrorDetails {
    message: string;
    level: ErrorLevel;
    context?: string;
    error?: Error;
    recoverable?: boolean;
    retryAction?: () => Promise<void> | void;
}
export declare class ErrorHandler {
    private static instance;
    private notificationContainer;
    private activeNotifications;
    private maxNotifications;
    private constructor();
    static getInstance(): ErrorHandler;
    /**
     * Handle an error with optional user notification
     * @param details Error details including message, level, and recovery options
     * @param showNotification Whether to show user notification (default: true for warnings and errors)
     */
    handleError(details: ErrorDetails, showNotification?: boolean): void;
    /**
     * Handle network-related errors with retry logic
     * @param error The network error
     * @param context Context where the error occurred
     * @param retryAction Function to retry the failed operation
     * @param maxRetries Maximum number of retry attempts
     */
    handleNetworkError(error: Error, context: string, retryAction?: () => Promise<void>, maxRetries?: number): Promise<void>;
    /**
     * Show a user notification
     * @param details Error or notification details
     */
    private showNotification;
    /**
     * Create the notification container element
     */
    private createNotificationContainer;
    /**
     * Create a notification element
     * @param details Error details for the notification
     * @returns HTMLElement notification
     */
    private createNotificationElement;
    /**
     * Remove a notification from the DOM
     * @param notification Notification element to remove
     */
    private removeNotification;
    /**
     * Log error to console with appropriate level
     * @param details Error details to log
     */
    private logError;
    /**
     * Handle critical errors that might break the application
     * @param details Critical error details
     */
    private handleCriticalError;
    /**
     * Get notification background color based on error level
     * @param level Error level
     * @returns CSS color string
     */
    private getNotificationColor;
    /**
     * Get notification timeout based on error level
     * @param level Error level
     * @returns Timeout in milliseconds
     */
    private getNotificationTimeout;
    /**
     * Clear all notifications
     */
    clearAllNotifications(): void;
    /**
     * Cleanup method to remove notification container
     */
    cleanup(): void;
}
export declare const errorHandler: ErrorHandler;
