/**
 * Error Handling and Notification System
 * 
 * Provides centralized error handling, user notifications, and recovery strategies
 * for network failures and other errors in the Meetergo integration.
 */

export type ErrorLevel = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorDetails {
  message: string;
  level: ErrorLevel;
  context?: string;
  error?: Error;
  recoverable?: boolean;
  retryAction?: () => Promise<void> | void;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private notificationContainer: HTMLElement | null = null;
  private activeNotifications: Set<HTMLElement> = new Set();
  private maxNotifications = 5;

  private constructor() {
    this.createNotificationContainer();
  }

  public static getInstance(): ErrorHandler {
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
  public handleError(details: ErrorDetails, showNotification?: boolean): void {
    // Always log to console for developers
    this.logError(details);

    // Determine if we should show notification
    const shouldNotify = showNotification ?? (details.level === 'warning' || details.level === 'error' || details.level === 'critical');
    
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
  public handleNetworkError(
    error: Error, 
    context: string, 
    retryAction?: () => Promise<void>, 
    maxRetries = 3
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let retryCount = 0;

      const attemptRetry = async () => {
        try {
          if (retryAction) {
            await retryAction();
            resolve();
          } else {
            reject(error);
          }
        } catch (retryError) {
          retryCount++;
          
          if (retryCount >= maxRetries) {
            this.handleError({
              message: `Network error after ${maxRetries} attempts: ${error.message}`,
              level: 'error',
              context,
              error: retryError as Error,
              recoverable: false
            });
            reject(retryError);
          } else {
            // Show retry notification
            this.showNotification({
              message: `Connection failed. Retrying... (${retryCount}/${maxRetries})`,
              level: 'warning',
              context,
              error: retryError as Error,
              recoverable: true,
              retryAction: attemptRetry
            });
            
            // Exponential backoff
            setTimeout(attemptRetry, Math.pow(2, retryCount) * 1000);
          }
        }
      };

      attemptRetry();
    });
  }

  /**
   * Show a user notification
   * @param details Error or notification details
   */
  private showNotification(details: ErrorDetails): void {
    if (!this.notificationContainer || this.activeNotifications.size >= this.maxNotifications) {
      // Remove oldest notification if at limit
      if (this.activeNotifications.size >= this.maxNotifications) {
        const oldest = Array.from(this.activeNotifications)[0];
        this.removeNotification(oldest);
      }
    }

    const notification = this.createNotificationElement(details);
    this.notificationContainer?.appendChild(notification);
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
  private createNotificationContainer(): void {
    if (this.notificationContainer) return;

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
    } else {
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
  private createNotificationElement(details: ErrorDetails): HTMLElement {
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
  private removeNotification(notification: HTMLElement): void {
    if (!this.activeNotifications.has(notification)) return;

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
  private logError(details: ErrorDetails): void {
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
  private handleCriticalError(details: ErrorDetails): void {
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
  private getNotificationColor(level: ErrorLevel): string {
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
  private getNotificationTimeout(level: ErrorLevel): number {
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
  public clearAllNotifications(): void {
    this.activeNotifications.forEach(notification => {
      this.removeNotification(notification);
    });
  }

  /**
   * Cleanup method to remove notification container
   */
  public cleanup(): void {
    this.clearAllNotifications();
    if (this.notificationContainer && this.notificationContainer.parentNode) {
      this.notificationContainer.parentNode.removeChild(this.notificationContainer);
      this.notificationContainer = null;
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();