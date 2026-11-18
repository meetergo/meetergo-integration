/**
 * Design 2026 — brand colour helpers.
 *
 * From one configured brand colour derive: a readable foreground (ink or white,
 * whichever contrasts more, or the configured text colour if it is readable),
 * a soft tint for selected states and a text shade that stays readable on white.
 */

export const INK = "#101623";
export const DEFAULT_BRAND = "#1A6EF4";

type RGB = [number, number, number];

export function parseColor(input: string | undefined | null): RGB | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(s);
  if (m) return [+m[1], +m[2], +m[3]].map((v) => Math.min(255, v)) as RGB;
  if (s === "white") return [255, 255, 255];
  if (s === "black") return [0, 0, 0];
  return null;
}

function hex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: RGB, b: RGB): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export interface BrandTokens {
  brand: string;
  fg: string;
  soft: string;
  text: string;
}

export function brandTokens(brandInput?: string, textInput?: string): BrandTokens {
  const brand = parseColor(brandInput) ?? (parseColor(DEFAULT_BRAND) as RGB);
  const white: RGB = [255, 255, 255];
  const ink = parseColor(INK) as RGB;

  // A configured text colour wins only while it stays readable on the brand
  const wanted = parseColor(textInput);
  let fg: RGB;
  if (wanted && contrast(wanted, brand) >= 4.5) fg = wanted;
  else fg = contrast(white, brand) >= contrast(ink, brand) ? white : ink;

  const soft = mix(brand, white, 0.9);

  // Darken towards ink until readable as text on white (WCAG AA, 4.5:1)
  let text = brand;
  for (let i = 1; i <= 10 && contrast(text, white) < 4.5; i++) text = mix(brand, ink, i / 10);

  return { brand: hex(brand), fg: hex(fg), soft: hex(soft), text: hex(text) };
}
