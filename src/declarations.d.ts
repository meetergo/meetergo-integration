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
  onSuccess?: (appointmentId: string) => void;
  enableAutoResize?: boolean;
};

declare global {
  interface Window {
    meetergo: MeetergoIntegration;
    meetergoSettings: MeetergoSettings;
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
