/**
 * Video Embed Management Module
 *
 * Handles the creation, management, and lifecycle of video embeds for the Meetergo integration.
 * Supports HLS video streaming, fallback to poster images, and interactive video controls.
 */
import { VideoEmbedConfig, MeetergoVideoEvent } from '../declarations';
export interface VideoEmbedState {
    isExpanded: boolean;
    isPlaying: boolean;
    isMuted: boolean;
    isPaused: boolean;
}
export declare class VideoEmbedManager {
    private static instance;
    private activeVideos;
    private videoStates;
    private eventListeners;
    private timeouts;
    private hlsLibraryPromise;
    private onEventCallback?;
    private constructor();
    static getInstance(): VideoEmbedManager;
    /**
     * Set callback for video events
     * @param callback Callback function for video events
     */
    setEventCallback(callback: (event: MeetergoVideoEvent) => void): void;
    /**
     * Create and initialize a video embed
     * @param config Video embed configuration
     */
    createVideoEmbed(config: VideoEmbedConfig): Promise<void>;
    /**
     * Remove a video embed
     * @param videoId Video ID to remove
     */
    removeVideoEmbed(videoId: string): void;
    /**
     * Generate unique video ID
     */
    private generateVideoId;
    /**
     * Create video container element
     * @param videoId Unique video identifier
     * @param config Video configuration
     */
    private createVideoContainer;
    /**
     * Create all video elements
     * @param config Video configuration
     */
    private createVideoElements;
    /**
     * Create video element
     * @param config Video configuration
     */
    private createVideoElement;
    /**
     * Create overlay container
     */
    private createOverlayContainer;
    /**
     * Create CTA text element
     * @param config Video configuration
     */
    private createCTAElement;
    /**
     * Create loading indicator
     */
    private createLoadingIndicator;
    /**
     * Create close button
     */
    private createCloseButton;
    /**
     * Create CTA button
     * @param config Video configuration
     */
    private createCTAButton;
    /**
     * Create pause/play button
     */
    private createPausePlayButton;
    /**
     * Create mute button
     */
    private createMuteButton;
    /**
     * Create progress bar
     * @param config Video configuration
     */
    private createProgressBar;
    /**
     * Assemble video embed elements
     */
    private assembleVideoEmbed;
    /**
     * Set position styles for video container
     * @param container Video container element
     * @param position Position configuration
     * @param offset Offset from edges
     */
    private setPositionStyles;
    /**
     * Setup video event handlers
     */
    private setupVideoEventHandlers;
    /**
     * Handle video container click
     */
    private handleVideoContainerClick;
    /**
     * Expand video to full size
     */
    private expandVideo;
    /**
     * Handle close button click
     */
    private handleCloseButtonClick;
    /**
     * Minimize expanded video
     */
    private minimizeVideo;
    /**
     * Hide video completely
     */
    private hideVideo;
    /**
     * Toggle video play/pause
     */
    private toggleVideoPlayPause;
    /**
     * Get video configuration by ID
     */
    private getVideoConfig;
    /**
     * Setup video source with error handling
     */
    private setupVideoSource;
    /**
     * Setup HLS video with proper error handling
     */
    private setupHlsVideo;
    /**
     * Fallback to poster image when video fails
     */
    private fallbackToPoster;
    /**
     * Ensure HLS library is loaded
     */
    private ensureHlsLibraryLoaded;
    /**
     * Clean up event listeners for specific video
     */
    private cleanupEventListeners;
    /**
     * Emit video event
     * @param event Video event to emit
     */
    private emitEvent;
    /**
     * Get all active video IDs
     */
    getActiveVideos(): string[];
    /**
     * Cleanup method to remove all videos and listeners
     */
    cleanup(): void;
}
export declare const videoEmbedManager: VideoEmbedManager;
