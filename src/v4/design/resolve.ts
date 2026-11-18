/**
 * Which design a widget renders in.
 *
 * Precedence (first set wins):
 *   1. per call / element: data-meetergo-design on the clicked element
 *   2. per widget: floatingButton.design, sidebar.design, videoEmbed.design, ui.design (modal)
 *   3. namespace: meetergo('init', { design })
 *   4. script tag: <script data-meetergo-design="2026" src=".../integration.js">
 *   5. default: "classic" (today's look, unchanged)
 */

import type { WidgetDesign } from "../types/index.js";

export const DESIGN_ATTR = "data-meetergo-design";

let scriptDesign: WidgetDesign | undefined;

export function normalizeDesign(value: unknown): WidgetDesign | undefined {
  if (value === "2026" || value === 2026) return "2026";
  if (value === "classic") return "classic";
  return undefined;
}

/** Remember the design set on the SDK's own script tag (call at script evaluation). */
export function captureScriptDesign(script: Element | null | undefined): void {
  const v = normalizeDesign(script?.getAttribute(DESIGN_ATTR));
  if (v) scriptDesign = v;
}

/** Design from the script tag, if any (captured at load, or any meetergo script tag carrying the attribute). */
export function scriptTagDesign(): WidgetDesign | undefined {
  if (scriptDesign) return scriptDesign;
  if (typeof document === "undefined") return undefined;
  return normalizeDesign(document.querySelector(`script[${DESIGN_ATTR}]`)?.getAttribute(DESIGN_ATTR));
}

export function resolveDesign(...candidates: unknown[]): WidgetDesign {
  for (const c of candidates) {
    const v = normalizeDesign(c);
    if (v) return v;
  }
  return "classic";
}

/** Test hook */
export function resetScriptDesign(): void {
  scriptDesign = undefined;
}
