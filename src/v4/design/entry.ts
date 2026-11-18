/**
 * Entry of the lazily loaded design chunk (dist/v4/design-2026.<hash>.js).
 *
 * Registers an installer on window; the main bundle calls it with the shared
 * runtime pieces (see runtime.ts) and gets the 2026 widget classes back.
 */

import { setRuntime } from "./runtime.js";
import type { DesignRuntime } from "./runtime.js";
import { FloatingButton2026 } from "./floating-2026.js";
import { Sidebar2026Manager } from "./sidebar-2026.js";
import { Video2026Manager } from "./video-2026.js";
import { defineModal2026 } from "./modal-2026.js";
import type { Modal2026Ctor } from "./modal-2026.js";

export interface DesignApi {
  FloatingButton2026: typeof FloatingButton2026;
  Sidebar2026Manager: typeof Sidebar2026Manager;
  Video2026Manager: typeof Video2026Manager;
  Modal2026: Modal2026Ctor;
}

export type DesignInstaller = (deps: DesignRuntime) => DesignApi;

let api: DesignApi | null = null;

export const install: DesignInstaller = (deps) => {
  if (!api) {
    setRuntime(deps);
    api = { FloatingButton2026, Sidebar2026Manager, Video2026Manager, Modal2026: defineModal2026() };
  }
  return api;
};

if (typeof window !== "undefined") {
  (window as unknown as { __meetergoDesign2026?: DesignInstaller }).__meetergoDesign2026 = install;
}
