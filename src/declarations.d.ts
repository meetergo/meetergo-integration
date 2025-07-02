import { MeetergoIntegration } from "./main";

type FormListener = {
  link: string;
  formId?: string;
};

type MeetergoSettings = {
  company: string;
  floatingButton?: {
    position?:
      | "top-left"
      | "top-center"
      | "top-right"
      | "middle-left"
      | "middle-center"
      | "middle-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right";
    text?: string;
    link?: string;
    backgroundColor?: string;
    textColor?: string;
    icon?: string;
    animation?: "pulse" | "bounce" | "slide-in" | "none";
  };
  sidebar?: {
    position?: "left" | "right";
    width?: string;
    link?: string;
    buttonText?: string;
    buttonIcon?: string;
    buttonPosition?:
      | "top-left"
      | "top-center"
      | "top-right"
      | "middle-left"
      | "middle-center"
      | "middle-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right";
    backgroundColor?: string;
    textColor?: string;
  };
  videoEmbed?: {
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
    position?:
      | "top-left"
      | "top-center"
      | "top-right"
      | "middle-left"
      | "middle-center"
      | "middle-right"
      | "bottom-left"
      | "bottom-center"
      | "bottom-right";
  };
  prefill?: Record<string, string>;
  formListeners: FormListener[];
  disableModal?: boolean;
  /**
   * Callback function that is executed after a booking is successfully completed.
   * It receives a data object with details about the booking.
   *
   * @param {BookingSuccessfulData} data - The booking data, containing details like `appointmentId`, `bookingType`, etc.
   * @example
   * window.meetergoSettings = {
   *   onSuccess(data) {
   *     console.log("Meeting booked!", data);
   *     // e.g. redirect to a thank you page
   *     if (data.appointmentId) {
   *       window.location.href = `/thank-you?id=${data.appointmentId}`;
   *     }
   *   }
   * };
   */
  onSuccess?: (data: BookingSuccessfulData) => void;
  enableAutoResize?: boolean;
};

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
