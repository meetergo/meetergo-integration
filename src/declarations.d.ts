import { MeetergoIntegration } from "./main";

type FormListener = {
  link: string;
  formId?: string;
};

type MeetergoSettings = {
  company: string;
  floatingButton?: {
    position?: "top-right" | "bottom-right" | "botton-left" | "top-left";
    text?: string;
    link?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  prefill?: Record<string, string>;
  formListeners: FormListener[];
  disableModal?: boolean;
  onSuccess?: (appointmentId: string) => void;
};

declare global {
  interface Window {
    meetergo: MeetergoIntegration;
    meetergoSettings: MeetergoSettings;
  }
}
