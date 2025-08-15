import { MeetergoIntegration } from "./main";

// Position types used across different components
export type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type SidebarPosition = "left" | "right";
export type Animation = "pulse" | "bounce" | "slide-in" | "none";

// Specific prefill interface with common booking fields
export interface MeetergoPrefill {
  firstname?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  timezone?: string;
  locale?: string;
  // Allow additional custom fields
  [key: string]: string | undefined;
}

// Event types for better type safety
export interface MeetergoBookingEvent {
  type: "booking_completed" | "booking_cancelled" | "booking_rescheduled";
  appointmentId: string;
  data?: Record<string, unknown>;
}

export interface MeetergoModalEvent {
  type: "modal_opened" | "modal_closed" | "modal_loading" | "modal_error";
  data?: Record<string, unknown>;
}

export interface MeetergoVideoEvent {
  type: "video_play" | "video_pause" | "video_expand" | "video_minimize";
  data?: Record<string, unknown>;
}

export type MeetergoEvent =
  | MeetergoBookingEvent
  | MeetergoModalEvent
  | MeetergoVideoEvent;

// Form listener configuration
export interface FormListener {
  link: string;
  formId?: string;
}

// Floating button configuration
export interface FloatingButtonConfig {
  position?: Position;
  text?: string;
  link?: string;
  backgroundColor?: string;
  textColor?: string;
  icon?: string;
  animation?: Animation;
}

// Sidebar configuration
export interface SidebarConfig {
  position?: SidebarPosition;
  width?: string;
  link?: string;
  buttonText?: string;
  buttonIcon?: string;
  buttonPosition?: Position;
  backgroundColor?: string;
  textColor?: string;
}

// Video embed configuration
export interface VideoEmbedConfig {
  videoSrc: string;
  posterImage?: string;
  bookingLink: string;
  bookingCta?: string;
  bookingCtaColor?: string;
  videoCta?: string;
  isRound?: boolean;
  buttonColor?: string;
  offset?: string;
  size?: {
    width?: string;
    height?: string;
  };
  position?: Position;
}

// Main settings interface
export interface MeetergoSettings {
  company: string;
  floatingButton?: FloatingButtonConfig;
  sidebar?: SidebarConfig;
  videoEmbed?: VideoEmbedConfig;
  prefill?: MeetergoPrefill;
  formListeners: FormListener[];
  disableModal?: boolean;
  iframeHeight?: number;
  enableAutoResize?: boolean;
  iframeAlignment?: 'left' | 'center' | 'right';
  /**
   * Callback function that is executed after a booking is successfully completed.
   * Supports both legacy string format and new data object format.
   *
   * @note This callback only works with booking pages hosted on `cal.meetergo.com` and is not supported on legacy pages.
   *
   * @param {BookingSuccessfulData | string} dataOrId - Either the booking data object or appointment ID string
   * @example
   * window.meetergoSettings = {
   *   onSuccess(data) {
   *     console.log("Meeting booked!", data);
   *     // Handle both formats
   *     if (typeof data === 'string') {
   *       // Legacy format - data is appointmentId string
   *       console.log('Appointment ID:', data);
   *     } else {
   *       // New format - data is BookingSuccessfulData object
   *       console.log('Booking data:', data);
   *     }
   *   }
   * };
   */
  onSuccess?: (dataOrId: BookingSuccessfulData | string) => Promise<void> | void;
  onEvent?: (event: MeetergoEvent) => Promise<void> | void;
  enableAutoResize?: boolean;
}

declare global {
  type BookingSuccessfulData = {
    appointmentId?: string;
    secret?: string;
    attendeeEmail?: string;
    bookingType?: "doubleOptIn" | "requireHostConfirmation";
    provisionalBookingId?: string;
  };

  interface Window {
    meetergo: MeetergoIntegration;
    meetergoSettings: MeetergoSettings;
    Hls?: {
      isSupported(): boolean;
      Events: {
        MANIFEST_PARSED: string;
        ERROR: string;
      };
      new (): HlsInstance;
    };
  }

  // Hls.js type declaration
  const Hls: {
    isSupported(): boolean;
    new (): HlsInstance;
    Events: {
      MANIFEST_PARSED: string;
      ERROR: string;
    };
  };

  interface HlsInstance {
    loadSource(url: string): void;
    attachMedia(media: HTMLMediaElement): void;
    on(
      event: string,
      callback: (event: string, data: HlsEventData) => void
    ): void;
  }

  interface HlsEventData {
    type?: string;
    details?: string;
    fatal?: boolean;
    [key: string]: unknown;
  }
}
