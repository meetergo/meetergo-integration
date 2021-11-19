import { MeetergoIntegration } from "./main";

type MeetergoSettings = {
  company: string;
  floatingButton?: {
    position?: "top-right" | "bottom-right" | "botton-left" | "top-left";
    text?: string;
    attributes?: Record<string, string>;
  };
  prefill?: {
    firstname?: string | undefined;
    lastname?: string | undefined;
    email?: string | undefined;
    note?: string | undefined;
    phone?: string | undefined;
    country?: string | undefined;
    addressLine1?: string | undefined;
    addressLine2?: string | undefined;
    city?: string | undefined;
    postalCode?: string | undefined;
    vatNumber?: string | undefined;
  };
};

declare global {
  interface Window {
    meetergo: MeetergoIntegration;
    meetergoSettings: MeetergoSettings;
  }
}
