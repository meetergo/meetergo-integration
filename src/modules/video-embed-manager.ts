/**
 * Video Embed Management Module
 * 
 * Handles the creation, management, and lifecycle of video embeds for the Meetergo integration.
 * Supports HLS video streaming, fallback to poster images, and interactive video controls.
 */

// import { domCache } from '../utils/dom-cache'; // Removed unused import
import { errorHandler } from '../utils/error-handler';
import { VideoEmbedConfig, Position, MeetergoVideoEvent } from '../declarations';

interface VideoElements {
  video: HTMLVideoElement;
  overlayContainer: HTMLElement;
  ctaElement: HTMLElement;
  loadingIndicator: HTMLElement;
  closeButton: HTMLElement;
  ctaButton: HTMLElement;
  pausePlayButton: HTMLElement;
  muteButton: HTMLElement;
  progressContainer: {
    container: HTMLElement;
    bar: HTMLElement;
  };
}
import { modalManager } from './modal-manager';

export interface VideoEmbedState {
  isExpanded: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isPaused: boolean;
}

export class VideoEmbedManager {
  private static instance: VideoEmbedManager;
  private activeVideos: Map<string, HTMLElement> = new Map();
  private videoStates: Map<string, VideoEmbedState> = new Map();
  private eventListeners: Map<string, EventListener[]> = new Map();
  private timeouts: Map<string, number[]> = new Map();
  private hlsLibraryPromise: Promise<void> | null = null;
  private onEventCallback?: (event: MeetergoVideoEvent) => void;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): VideoEmbedManager {
    if (!VideoEmbedManager.instance) {
      VideoEmbedManager.instance = new VideoEmbedManager();
    }
    return VideoEmbedManager.instance;
  }

  /**
   * Set callback for video events
   * @param callback Callback function for video events
   */
  public setEventCallback(callback: (event: MeetergoVideoEvent) => void): void {
    this.onEventCallback = callback;
  }

  /**
   * Create and initialize a video embed
   * @param config Video embed configuration
   */
  public async createVideoEmbed(config: VideoEmbedConfig): Promise<void> {
    try {
      if (!config.videoSrc || !config.bookingLink) {
        errorHandler.handleError({
          message: 'Video embed settings missing or incomplete',
          level: 'warning',
          context: 'VideoEmbedManager.createVideoEmbed'
        });
        return;
      }

      // Ensure HLS.js is loaded if needed
      if (config.videoSrc.endsWith('.m3u8')) {
        await this.ensureHlsLibraryLoaded();
      }

      const videoId = this.generateVideoId();
      const videoContainer = this.createVideoContainer(videoId, config);
      const videoElements = this.createVideoElements(config);
      
      this.assembleVideoEmbed(videoContainer, videoElements, config);
      this.setupVideoEventHandlers(videoId, videoContainer, videoElements, config);
      
      document.body.appendChild(videoContainer);
      this.activeVideos.set(videoId, videoContainer);
      
      // Initialize video state
      this.videoStates.set(videoId, {
        isExpanded: false,
        isPlaying: false,
        isMuted: true,
        isPaused: false
      });

      // Setup video source with error handling
      await this.setupVideoSource(
        videoElements.video, 
        config.videoSrc, 
        config.posterImage, 
        videoElements.loadingIndicator
      );

    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to create video embed',
        level: 'error',
        context: 'VideoEmbedManager.createVideoEmbed',
        error: error as Error
      });
    }
  }

  /**
   * Remove a video embed
   * @param videoId Video ID to remove
   */
  public removeVideoEmbed(videoId: string): void {
    try {
      const videoContainer = this.activeVideos.get(videoId);
      
      if (videoContainer) {
        // Clean up timeouts
        const timeoutList = this.timeouts.get(videoId) || [];
        timeoutList.forEach(timeout => clearTimeout(timeout));
        this.timeouts.delete(videoId);

        // Clean up event listeners
        this.cleanupEventListeners(videoId);

        // Remove from DOM
        if (videoContainer.parentNode) {
          videoContainer.parentNode.removeChild(videoContainer);
        }

        // Clean up state
        this.activeVideos.delete(videoId);
        this.videoStates.delete(videoId);
      }
    } catch (error) {
      errorHandler.handleError({
        message: 'Error removing video embed',
        level: 'warning',
        context: 'VideoEmbedManager.removeVideoEmbed',
        error: error as Error
      });
    }
  }

  /**
   * Generate unique video ID
   */
  private generateVideoId(): string {
    return `meetergo-video-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Create video container element
   * @param videoId Unique video identifier
   * @param config Video configuration
   */
  private createVideoContainer(videoId: string, config: VideoEmbedConfig): HTMLElement {
    const container = document.createElement('div');
    container.id = videoId;
    container.classList.add('meetergo-video-container');

    const position = config.position || 'bottom-right';
    const buttonColor = config.buttonColor || '#0a64bc';
    const size = config.size || { width: '200px', height: '158px' };
    const offset = config.offset || '16px';
    const isRound = config.isRound || false;

    // Base styles
    Object.assign(container.style, {
      position: 'fixed',
      zIndex: '1000',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      cursor: 'pointer',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease, width 0.3s ease, height 0.3s ease',
      border: `2px solid ${buttonColor}`
    });

    // Set size and shape
    if (isRound) {
      const diameter = Math.min(
        parseInt(size.width || '200'), 
        parseInt(size.height || '158')
      ) + 'px';
      Object.assign(container.style, {
        width: diameter,
        height: diameter,
        borderRadius: '50%'
      });
    } else {
      Object.assign(container.style, {
        width: size.width,
        height: size.height,
        borderRadius: '8px'
      });
    }

    // Set position
    this.setPositionStyles(container, position, offset);

    return container;
  }

  /**
   * Create all video elements
   * @param config Video configuration
   */
  private createVideoElements(config: VideoEmbedConfig) {
    const video = this.createVideoElement(config);
    const overlayContainer = this.createOverlayContainer();
    const ctaElement = this.createCTAElement(config);
    const loadingIndicator = this.createLoadingIndicator();
    const closeButton = this.createCloseButton();
    const ctaButton = this.createCTAButton(config);
    const pausePlayButton = this.createPausePlayButton();
    const muteButton = this.createMuteButton();
    const progressContainer = this.createProgressBar(config);

    return {
      video,
      overlayContainer,
      ctaElement,
      loadingIndicator,
      closeButton,
      ctaButton,
      pausePlayButton,
      muteButton,
      progressContainer
    };
  }

  /**
   * Create video element
   * @param config Video configuration
   */
  private createVideoElement(config: VideoEmbedConfig): HTMLVideoElement {
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'metadata';
    
    Object.assign(video.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    });

    if (config.posterImage) {
      video.poster = config.posterImage;
    }

    return video;
  }

  /**
   * Create overlay container
   */
  private createOverlayContainer(): HTMLElement {
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      pointerEvents: 'none'
    });
    return container;
  }

  /**
   * Create CTA text element
   * @param config Video configuration
   */
  private createCTAElement(config: VideoEmbedConfig): HTMLElement {
    const cta = document.createElement('div');
    Object.assign(cta.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: 'white',
      fontSize: '14px',
      textShadow: '0 2px 4px rgba(0,0,0,0.8)',
      fontWeight: 'bold',
      textAlign: 'center',
      whiteSpace: 'nowrap',
      padding: '8px',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderRadius: '4px'
    });
    cta.textContent = config.videoCta || 'Click to watch';
    return cta;
  }

  /**
   * Create loading indicator
   */
  private createLoadingIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    Object.assign(indicator.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '30px',
      height: '30px',
      border: '3px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '50%',
      borderTop: '3px solid #ffffff',
      animation: 'meetergo-spin 1s linear infinite'
    });
    return indicator;
  }

  /**
   * Create close button
   */
  private createCloseButton(): HTMLElement {
    const button = document.createElement('div');
    Object.assign(button.style, {
      position: 'absolute',
      top: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      opacity: '1',
      transition: 'background-color 0.3s ease',
      pointerEvents: 'auto',
      zIndex: '10',
      padding: '0'
    });
    
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" 
           fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;

    return button;
  }

  /**
   * Create CTA button
   * @param config Video configuration
   */
  private createCTAButton(config: VideoEmbedConfig): HTMLElement {
    const button = document.createElement('button');
    const buttonColor = config.buttonColor || '#0a64bc';
    const bookingCta = config.bookingCta || 'Book Appointment';

    Object.assign(button.style, {
      position: 'absolute',
      bottom: '10px',
      left: '50%',
      width: '90%',
      transform: 'translateX(-50%)',
      padding: '10px 20px',
      backgroundColor: buttonColor,
      color: config.bookingCtaColor || 'white',
      border: 'none',
      borderRadius: '4px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'none',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      fontSize: '14px',
      zIndex: '10'
    });

    button.textContent = bookingCta;
    return button;
  }

  /**
   * Create pause/play button
   */
  private createPausePlayButton(): HTMLElement {
    const button = document.createElement('button');
    Object.assign(button.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '60px',
      height: '60px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease, opacity 0.2s ease',
      zIndex: '10',
      padding: '0',
      opacity: '0'
    });

    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" 
           fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
    `;
    
    button.setAttribute('aria-label', 'Pause video');
    return button;
  }

  /**
   * Create mute button
   */
  private createMuteButton(): HTMLElement {
    const button = document.createElement('button');
    Object.assign(button.style, {
      position: 'absolute',
      top: '10px',
      left: '10px',
      width: '30px',
      height: '30px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      zIndex: '10',
      padding: '0'
    });

    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
           fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    `;
    
    button.setAttribute('aria-label', 'Mute video');
    return button;
  }

  /**
   * Create progress bar
   * @param config Video configuration
   */
  private createProgressBar(config: VideoEmbedConfig): { container: HTMLElement; bar: HTMLElement } {
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '5px',
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      display: 'none',
      zIndex: '10',
      overflow: 'hidden'
    });

    const bar = document.createElement('div');
    Object.assign(bar.style, {
      width: '0%',
      height: '100%',
      backgroundColor: config.buttonColor || '#0a64bc',
      transition: 'width 0.05s linear', // Smoother, faster transition
      borderRadius: '0 3px 3px 0'
    });

    container.appendChild(bar);
    return { container, bar };
  }

  /**
   * Assemble video embed elements
   */
  private assembleVideoEmbed(
    container: HTMLElement,
    elements: VideoElements,
    _config: VideoEmbedConfig // eslint-disable-line @typescript-eslint/no-unused-vars
  ): void {
    // Add video
    container.appendChild(elements.video);
    container.appendChild(elements.loadingIndicator);
    
    // Add overlay elements
    elements.overlayContainer.appendChild(elements.closeButton);
    elements.overlayContainer.appendChild(elements.ctaElement);
    container.appendChild(elements.overlayContainer);
    
    // Add interactive elements
    container.appendChild(elements.ctaButton);
    container.appendChild(elements.pausePlayButton);
    container.appendChild(elements.muteButton);
    container.appendChild(elements.progressContainer.container);
  }

  /**
   * Set position styles for video container
   * @param container Video container element
   * @param position Position configuration
   * @param offset Offset from edges
   */
  private setPositionStyles(
    container: HTMLElement,
    position: Position,
    offset: string
  ): void {
    const offsetValue = offset || '16px';

    // Vertical positioning
    if (position.includes('top')) {
      container.style.top = offsetValue;
    } else if (position.includes('middle')) {
      container.style.top = '50%';
      container.style.transform = 'translateY(-50%)';
    } else {
      container.style.bottom = offsetValue;
    }

    // Horizontal positioning
    if (position.includes('left')) {
      container.style.left = offsetValue;
    } else if (position.includes('center')) {
      container.style.left = '50%';
      container.style.transform = container.style.transform
        ? 'translate(-50%, -50%)'
        : 'translateX(-50%)';
    } else {
      container.style.right = offsetValue;
    }
  }

  /**
   * Setup video event handlers
   */
  private setupVideoEventHandlers(
    videoId: string,
    container: HTMLElement,
    elements: VideoElements,
    config: VideoEmbedConfig
  ): void {
    const listeners: EventListener[] = [];
    const timeouts: number[] = [];

    // Video container click handler
    const containerClickHandler = (e: Event) => {
      this.handleVideoContainerClick(videoId, e, elements, config);
    };
    container.addEventListener('click', containerClickHandler);
    listeners.push(containerClickHandler);

    // Close button handler
    const closeHandler = (e: Event) => {
      e.stopPropagation();
      this.handleCloseButtonClick(videoId, container, elements);
    };
    elements.closeButton.addEventListener('click', closeHandler);
    listeners.push(closeHandler);

    // CTA button handler
    const ctaHandler = (e: Event) => {
      e.stopPropagation();
      modalManager.openModalWithContent({ link: config.bookingLink });
    };
    elements.ctaButton.addEventListener('click', ctaHandler);
    listeners.push(ctaHandler);

    // Mute button handler
    const muteHandler = (e: Event) => {
      e.stopPropagation();
      const video = elements.video;
      video.muted = !video.muted;
      
      // Update mute button icon
      const muteButton = elements.muteButton;
      if (video.muted) {
        muteButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
               fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        `;
      } else {
        muteButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" 
               fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        `;
      }
    };
    elements.muteButton.addEventListener('click', muteHandler);
    listeners.push(muteHandler);

    // Video load handler
    const loadHandler = () => {
      elements.loadingIndicator.style.display = 'none';
    };
    elements.video.addEventListener('canplay', loadHandler);
    listeners.push(loadHandler);

    // Progress bar update handler - only when video is expanded and actively playing
    const progressHandler = () => {
      const video = elements.video;
      const state = this.videoStates.get(videoId);
      
      // Only show progress bar when video is expanded (not in mini preview)
      if (state?.isExpanded && video.duration && video.currentTime >= 0) {
        const progress = Math.min((video.currentTime / video.duration) * 100, 100);
        elements.progressContainer.bar.style.width = `${progress}%`;
        
        // Show progress bar when video is actively playing and expanded
        if (!video.paused && elements.progressContainer.container.style.display === 'none') {
          elements.progressContainer.container.style.display = 'block';
        }
      } else {
        // Hide progress bar when video is in mini preview mode
        elements.progressContainer.container.style.display = 'none';
      }
    };
    elements.video.addEventListener('timeupdate', progressHandler);
    listeners.push(progressHandler);

    // Show progress bar only when video is expanded and starts playing
    const playHandler = () => {
      const state = this.videoStates.get(videoId);
      if (state?.isExpanded) {
        elements.progressContainer.container.style.display = 'block';
      }
    };
    elements.video.addEventListener('play', playHandler);
    listeners.push(playHandler);

    // Hide progress bar when video is paused (optional)
    const pauseHandler = () => {
      // Keep progress bar visible when paused so user can see progress
      // elements.progressContainer.container.style.display = 'none';
    };
    elements.video.addEventListener('pause', pauseHandler);
    listeners.push(pauseHandler);

    // Reset progress bar when video ends
    const endedHandler = () => {
      elements.progressContainer.bar.style.width = '0%';
      elements.progressContainer.container.style.display = 'none';
    };
    elements.video.addEventListener('ended', endedHandler);
    listeners.push(endedHandler);

    // Store listeners and timeouts for cleanup
    this.eventListeners.set(videoId, listeners);
    this.timeouts.set(videoId, timeouts);
  }

  /**
   * Handle video container click
   */
  private handleVideoContainerClick(
    videoId: string,
    event: Event,
    elements: VideoElements,
    config: VideoEmbedConfig
  ): void {
    const state = this.videoStates.get(videoId);
    if (!state) return;

    const target = event.target as HTMLElement;

    // Don't handle clicks on interactive elements
    if (
      elements.closeButton.contains(target) ||
      elements.ctaButton.contains(target) ||
      elements.pausePlayButton.contains(target) ||
      elements.muteButton.contains(target)
    ) {
      return;
    }

    if (!state.isExpanded) {
      this.expandVideo(videoId, elements, config);
      this.emitEvent({ type: 'video_expand', data: { videoId } });
    } else {
      this.toggleVideoPlayPause(videoId, elements);
    }
  }

  /**
   * Expand video to full size
   */
  private expandVideo(videoId: string, elements: VideoElements, _config: VideoEmbedConfig): void {
    const container = this.activeVideos.get(videoId);
    const state = this.videoStates.get(videoId);
    
    if (!container || !state) return;

    // Update state
    state.isExpanded = true;
    state.isMuted = false;
    this.videoStates.set(videoId, state);

    // Expand container
    const originalSize = _config.size || { width: '200px', height: '158px' };
    const newWidth = parseInt(originalSize.width || '200') * 2 + 'px';
    const newHeight = parseInt(originalSize.height || '158') * 2 + 'px';

    Object.assign(container.style, {
      width: newWidth,
      height: newHeight,
      borderRadius: '12px',
      cursor: 'pointer'
    });

    // Hide CTA text, show controls
    elements.ctaElement.style.display = 'none';
    elements.ctaButton.style.display = 'block';
    elements.pausePlayButton.style.display = 'flex';
    elements.muteButton.style.display = 'flex';
    elements.progressContainer.container.style.display = 'block';

    // Start video with sound
    elements.video.currentTime = 0;
    elements.video.muted = false;
    elements.video.play().catch(() => {
      console.warn('Meetergo: Could not play video with sound due to browser restrictions');
    });

    this.emitEvent({ type: 'video_play', data: { videoId } });
  }

  /**
   * Handle close button click
   */
  private handleCloseButtonClick(
    videoId: string,
    container: HTMLElement,
    elements: VideoElements
  ): void {
    const state = this.videoStates.get(videoId);
    if (!state) return;

    if (state.isExpanded) {
      this.minimizeVideo(videoId, container, elements);
    } else {
      this.hideVideo(videoId, container);
    }
  }

  /**
   * Minimize expanded video
   */
  private minimizeVideo(_videoId: string, container: HTMLElement, elements: VideoElements): void {
    const state = this.videoStates.get(_videoId);
    if (!state) return;

    const config = this.getVideoConfig(_videoId);
    if (!config) return;

    // Update state
    state.isExpanded = false;
    state.isMuted = true;
    this.videoStates.set(_videoId, state);

    // Restore original size
    const originalSize = config.size || { width: '200px', height: '158px' };
    Object.assign(container.style, {
      width: originalSize.width,
      height: originalSize.height,
      borderRadius: config.isRound ? '50%' : '8px',
      cursor: 'pointer'
    });

    // Show CTA text, hide controls
    elements.ctaElement.style.display = 'block';
    elements.ctaButton.style.display = 'none';
    elements.pausePlayButton.style.display = 'none';
    elements.muteButton.style.display = 'none';
    elements.progressContainer.container.style.display = 'none';

    // Mute video and ensure it's playing
    elements.video.muted = true;
    elements.video.play();

    this.emitEvent({ type: 'video_minimize', data: { videoId: _videoId } });
  }

  /**
   * Hide video completely
   */
  private hideVideo(_videoId: string, container: HTMLElement): void {
    container.style.display = 'none';
    // Could create minimized indicator here
  }

  /**
   * Toggle video play/pause
   */
  private toggleVideoPlayPause(_videoId: string, elements: VideoElements): void {
    const state = this.videoStates.get(_videoId);
    if (!state) return;

    if (state.isPaused) {
      elements.video.play();
      state.isPaused = false;
      this.emitEvent({ type: 'video_play', data: { videoId: _videoId } });
    } else {
      elements.video.pause();
      state.isPaused = true;
      this.emitEvent({ type: 'video_pause', data: { videoId: _videoId } });
    }

    this.videoStates.set(_videoId, state);
  }

  /**
   * Get video configuration by ID
   */
  private getVideoConfig(_videoId?: string): VideoEmbedConfig | null {
    // In a full implementation, we'd store configs per video
    // For now, return the global config if available
    // TODO: Use _videoId to retrieve specific video configuration
    return window.meetergoSettings?.videoEmbed || null;
  }

  /**
   * Setup video source with error handling
   */
  private async setupVideoSource(
    video: HTMLVideoElement,
    videoSrc: string,
    posterImage?: string,
    loadingIndicator?: HTMLElement
  ): Promise<void> {
    try {
      if (videoSrc.endsWith('.m3u8')) {
        await this.setupHlsVideo(video, videoSrc, posterImage, loadingIndicator);
      } else {
        video.src = videoSrc;
        video.onerror = () => {
          console.warn('Meetergo: Video failed to load, using poster image instead');
          if (posterImage) {
            this.fallbackToPoster(video, posterImage);
          }
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
        };
      }
    } catch (error) {
      errorHandler.handleError({
        message: 'Error setting up video source',
        level: 'warning',
        context: 'VideoEmbedManager.setupVideoSource',
        error: error as Error
      });
    }
  }

  /**
   * Setup HLS video with proper error handling
   */
  private async setupHlsVideo(
    video: HTMLVideoElement,
    videoSrc: string,
    posterImage?: string,
    loadingIndicator?: HTMLElement
  ): Promise<void> {
    const secureVideoSrc = videoSrc.replace(/^http:/, 'https:');

    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls();
      hls.loadSource(secureVideoSrc);
      hls.attachMedia(video);
      
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
        });
      });
      
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (data.fatal && posterImage) {
          this.fallbackToPoster(video, posterImage);
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = secureVideoSrc;
      if (posterImage) video.poster = posterImage;
      
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
        });
      });
    } else {
      console.warn('Meetergo: HLS not supported in this browser');
      if (posterImage) {
        this.fallbackToPoster(video, posterImage);
      }
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    }
  }

  /**
   * Fallback to poster image when video fails
   */
  private fallbackToPoster(video: HTMLVideoElement, posterImage: string): void {
    if (!video.parentElement) return;

    const fallbackImg = document.createElement('img');
    fallbackImg.src = posterImage;
    Object.assign(fallbackImg.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    });
    
    video.parentElement.replaceChild(fallbackImg, video);
  }

  /**
   * Ensure HLS library is loaded
   */
  private ensureHlsLibraryLoaded(): Promise<void> {
    if (this.hlsLibraryPromise) {
      return this.hlsLibraryPromise;
    }

    this.hlsLibraryPromise = new Promise((resolve, reject) => {
      if (window.Hls) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load HLS.js'));
      document.head.appendChild(script);
    });

    return this.hlsLibraryPromise;
  }

  /**
   * Clean up event listeners for specific video
   */
  private cleanupEventListeners(videoId: string): void {
    const listeners = this.eventListeners.get(videoId);
    if (listeners) {
      // Note: In a real implementation, we'd need to store element-listener pairs
      // for proper cleanup. This is a simplified version.
      this.eventListeners.delete(videoId);
    }
  }

  /**
   * Emit video event
   * @param event Video event to emit
   */
  private emitEvent(event: MeetergoVideoEvent): void {
    if (this.onEventCallback) {
      this.onEventCallback(event);
    }
  }

  /**
   * Get all active video IDs
   */
  public getActiveVideos(): string[] {
    return Array.from(this.activeVideos.keys());
  }

  /**
   * Cleanup method to remove all videos and listeners
   */
  public cleanup(): void {
    try {
      // Remove all active videos
      const videoIds = this.getActiveVideos();
      videoIds.forEach(videoId => {
        this.removeVideoEmbed(videoId);
      });

      // Clear all maps
      this.activeVideos.clear();
      this.videoStates.clear();
      this.eventListeners.clear();
      this.timeouts.clear();

      // Reset HLS library promise
      this.hlsLibraryPromise = null;

    } catch (error) {
      errorHandler.handleError({
        message: 'Error during video embed cleanup',
        level: 'warning',
        context: 'VideoEmbedManager.cleanup',
        error: error as Error
      });
    }
  }
}

// Export singleton instance
export const videoEmbedManager = VideoEmbedManager.getInstance();