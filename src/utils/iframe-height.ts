/**
 * Iframe Height Management Utility
 *
 * Shared utilities for handling iframe height updates with throttling,
 * origin validation, and smooth transitions.
 */

export interface HeightState {
  lastHeight: number;
  lastUpdateTime: number;
  pendingUpdate: number | null;
}

export interface HeightUpdateConfig {
  throttleMs?: number;
  minHeightChange?: number;
  minHeight?: number;
  transitionDuration?: number;
}

const DEFAULT_CONFIG: Required<HeightUpdateConfig> = {
  throttleMs: 100,
  minHeightChange: 10,
  minHeight: 400,
  transitionDuration: 300,
};

/**
 * Valid meetergo origins for message validation
 */
const VALID_MEETERGO_ORIGINS = [
  'https://cal.meetergo.com',
  'https://meetergo.com',
  'https://www.meetergo.com',
  'https://app.meetergo.com',
];

/**
 * Check if origin is a valid meetergo domain
 */
export function isValidMeetergoOrigin(origin: string): boolean {
  // Allow localhost for development/testing
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true;
  }
  return VALID_MEETERGO_ORIGINS.some((validOrigin) => origin === validOrigin || origin.startsWith(validOrigin));
}

/**
 * Parse height from a message event data object
 * Supports multiple message formats used by meetergo
 */
export function parseHeightFromMessage(data: unknown): number | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const messageData = data as Record<string, unknown>;
  let newHeight: number | null = null;

  // Handle Calendly-style height messages (primary)
  if (
    messageData.event === 'meetergo:page_height' &&
    messageData.payload &&
    typeof messageData.payload === 'object' &&
    (messageData.payload as Record<string, unknown>).height
  ) {
    newHeight = parseInt(String((messageData.payload as Record<string, unknown>).height), 10);
  }
  // Handle direct height messages (backup)
  else if (messageData.type === 'meetergo:height-update' && messageData.height) {
    newHeight = parseInt(String(messageData.height), 10);
  }
  else if (messageData.type === 'meetergo:scroll-height' && messageData.scrollHeight) {
    newHeight = parseInt(String(messageData.scrollHeight), 10);
  }

  return newHeight && newHeight > 0 ? newHeight : null;
}

/**
 * Create a height state object with default values
 */
export function createHeightState(): HeightState {
  return {
    lastHeight: 0,
    lastUpdateTime: 0,
    pendingUpdate: null,
  };
}

/**
 * Apply height update to an iframe with smooth transition
 */
export function applyHeightToIframe(
  iframe: HTMLIFrameElement,
  height: number,
  config: HeightUpdateConfig = {}
): void {
  const { minHeight, transitionDuration } = { ...DEFAULT_CONFIG, ...config };
  const finalHeight = Math.max(height, minHeight);

  iframe.style.transition = `height ${transitionDuration / 1000}s cubic-bezier(0.4, 0.0, 0.2, 1)`;
  iframe.style.height = `${finalHeight}px`;
}

/**
 * Remove transition from iframe after animation completes
 */
export function clearIframeTransition(iframe: HTMLIFrameElement): void {
  iframe.style.transition = '';
}

/**
 * Check if height update should be applied based on throttling and significance
 */
export function shouldUpdateHeight(
  newHeight: number,
  state: HeightState,
  config: HeightUpdateConfig = {}
): { shouldUpdate: boolean; shouldThrottle: boolean } {
  const { throttleMs, minHeightChange } = { ...DEFAULT_CONFIG, ...config };
  const currentTime = Date.now();
  const heightDifference = Math.abs(newHeight - state.lastHeight);

  // Skip if height change is too small
  if (heightDifference < minHeightChange) {
    return { shouldUpdate: false, shouldThrottle: false };
  }

  // Check if we need to throttle
  if (currentTime - state.lastUpdateTime < throttleMs) {
    return { shouldUpdate: true, shouldThrottle: true };
  }

  return { shouldUpdate: true, shouldThrottle: false };
}

/**
 * Create updated height state after successful update
 */
export function createUpdatedHeightState(newHeight: number): HeightState {
  return {
    lastHeight: newHeight,
    lastUpdateTime: Date.now(),
    pendingUpdate: null,
  };
}
