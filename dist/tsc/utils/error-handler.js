"use strict";
/**
 * Error Handling and Notification System
 *
 * Provides centralized error handling, user notifications, and recovery strategies
 * for network failures and other errors in the Meetergo integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ErrorHandler = void 0;
const tslib_1 = require("tslib");
class ErrorHandler {
    constructor() {
        this.notificationContainer = null;
        this.activeNotifications = new Set();
        this.maxNotifications = 5;
        this.createNotificationContainer();
    }
    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    /**
     * Handle an error with optional user notification
     * @param details Error details including message, level, and recovery options
     * @param showNotification Whether to show user notification (default: true for warnings and errors)
     */
    handleError(details, showNotification) {
        // Always log to console for developers
        this.logError(details);
        // Determine if we should show notification
        const shouldNotify = showNotification !== null && showNotification !== void 0 ? showNotification : (details.level === 'warning' || details.level === 'error' || details.level === 'critical');
        if (shouldNotify) {
            this.showNotification(details);
        }
        // Handle critical errors
        if (details.level === 'critical') {
            this.handleCriticalError(details);
        }
    }
    /**
     * Handle network-related errors with retry logic
     * @param error The network error
     * @param context Context where the error occurred
     * @param retryAction Function to retry the failed operation
     * @param maxRetries Maximum number of retry attempts
     */
    handleNetworkError(error, context, retryAction, maxRetries = 3) {
        return new Promise((resolve, reject) => {
            let retryCount = 0;
            const attemptRetry = () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                try {
                    if (retryAction) {
                        yield retryAction();
                        resolve();
                    }
                    else {
                        reject(error);
                    }
                }
                catch (retryError) {
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        this.handleError({
                            message: `Network error after ${maxRetries} attempts: ${error.message}`,
                            level: 'error',
                            context,
                            error: retryError,
                            recoverable: false
                        });
                        reject(retryError);
                    }
                    else {
                        // Show retry notification
                        this.showNotification({
                            message: `Connection failed. Retrying... (${retryCount}/${maxRetries})`,
                            level: 'warning',
                            context,
                            error: retryError,
                            recoverable: true,
                            retryAction: attemptRetry
                        });
                        // Exponential backoff
                        setTimeout(attemptRetry, Math.pow(2, retryCount) * 1000);
                    }
                }
            });
            attemptRetry();
        });
    }
    /**
     * Show a user notification
     * @param details Error or notification details
     */
    showNotification(details) {
        var _a;
        if (!this.notificationContainer || this.activeNotifications.size >= this.maxNotifications) {
            // Remove oldest notification if at limit
            if (this.activeNotifications.size >= this.maxNotifications) {
                const oldest = Array.from(this.activeNotifications)[0];
                this.removeNotification(oldest);
            }
        }
        const notification = this.createNotificationElement(details);
        (_a = this.notificationContainer) === null || _a === void 0 ? void 0 : _a.appendChild(notification);
        this.activeNotifications.add(notification);
        // Auto-remove after timeout (except for critical errors)
        if (details.level !== 'critical') {
            const timeout = this.getNotificationTimeout(details.level);
            setTimeout(() => {
                this.removeNotification(notification);
            }, timeout);
        }
    }
    /**
     * Create the notification container element
     */
    createNotificationContainer() {
        if (this.notificationContainer)
            return;
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'meetergo-notifications';
        this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
      pointer-events: none;
    `;
        // Add to body when DOM is ready
        if (document.body) {
            document.body.appendChild(this.notificationContainer);
        }
        else {
            document.addEventListener('DOMContentLoaded', () => {
                if (this.notificationContainer) {
                    document.body.appendChild(this.notificationContainer);
                }
            });
        }
    }
    /**
     * Create a notification element
     * @param details Error details for the notification
     * @returns HTMLElement notification
     */
    createNotificationElement(details) {
        const notification = document.createElement('div');
        notification.style.cssText = `
      background: ${this.getNotificationColor(details.level)};
      color: white;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      pointer-events: auto;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      max-width: 100%;
      word-wrap: break-word;
    `;
        // Create message content
        const messageElement = document.createElement('div');
        messageElement.style.cssText = 'margin-bottom: 8px; font-weight: 500;';
        messageElement.textContent = details.message;
        // Create context if provided
        if (details.context) {
            const contextElement = document.createElement('div');
            contextElement.style.cssText = 'font-size: 12px; opacity: 0.9; margin-bottom: 8px;';
            contextElement.textContent = `Context: ${details.context}`;
            notification.appendChild(contextElement);
        }
        notification.appendChild(messageElement);
        // Add retry button if available
        if (details.retryAction) {
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Retry';
            retryButton.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        margin-right: 8px;
      `;
            retryButton.onclick = () => {
                if (details.retryAction) {
                    details.retryAction();
                }
                this.removeNotification(notification);
            };
            notification.appendChild(retryButton);
        }
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: white;
      font-size: 16px;
      cursor: pointer;
      opacity: 0.7;
      padding: 4px;
      line-height: 1;
    `;
        closeButton.onclick = () => this.removeNotification(notification);
        notification.appendChild(closeButton);
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        return notification;
    }
    /**
     * Remove a notification from the DOM
     * @param notification Notification element to remove
     */
    removeNotification(notification) {
        if (!this.activeNotifications.has(notification))
            return;
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.activeNotifications.delete(notification);
        }, 300);
    }
    /**
     * Log error to console with appropriate level
     * @param details Error details to log
     */
    logError(details) {
        const logMessage = `[Meetergo ${details.level.toUpperCase()}] ${details.message}`;
        const contextMessage = details.context ? ` (Context: ${details.context})` : '';
        switch (details.level) {
            case 'info':
                console.info(logMessage + contextMessage, details.error);
                break;
            case 'warning':
                console.warn(logMessage + contextMessage, details.error);
                break;
            case 'error':
                console.error(logMessage + contextMessage, details.error);
                break;
            case 'critical':
                console.error('🚨 ' + logMessage + contextMessage, details.error);
                break;
        }
    }
    /**
     * Handle critical errors that might break the application
     * @param details Critical error details
     */
    handleCriticalError(details) {
        // For critical errors, we might want to:
        // 1. Disable certain features
        // 2. Fallback to safe mode
        // 3. Report to monitoring service
        console.error('Critical error detected in Meetergo integration:', details);
        // Could add reporting to external service here
        // this.reportToCrashlytics(details);
    }
    /**
     * Get notification background color based on error level
     * @param level Error level
     * @returns CSS color string
     */
    getNotificationColor(level) {
        switch (level) {
            case 'info': return '#2563eb'; // blue
            case 'warning': return '#d97706'; // amber
            case 'error': return '#dc2626'; // red
            case 'critical': return '#7c2d12'; // dark red
            default: return '#6b7280'; // gray
        }
    }
    /**
     * Get notification timeout based on error level
     * @param level Error level
     * @returns Timeout in milliseconds
     */
    getNotificationTimeout(level) {
        switch (level) {
            case 'info': return 3000;
            case 'warning': return 5000;
            case 'error': return 7000;
            case 'critical': return Infinity; // Never auto-close
            default: return 5000;
        }
    }
    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        this.activeNotifications.forEach(notification => {
            this.removeNotification(notification);
        });
    }
    /**
     * Cleanup method to remove notification container
     */
    cleanup() {
        this.clearAllNotifications();
        if (this.notificationContainer && this.notificationContainer.parentNode) {
            this.notificationContainer.parentNode.removeChild(this.notificationContainer);
            this.notificationContainer = null;
        }
    }
}
exports.ErrorHandler = ErrorHandler;
// Export singleton instance
exports.errorHandler = ErrorHandler.getInstance();
//# sourceMappingURL=error-handler.js.map