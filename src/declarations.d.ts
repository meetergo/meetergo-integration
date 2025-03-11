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
}
