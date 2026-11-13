/**
 * Geometry for the Squero Studio logo: "squero" over its water, the product in brackets, `squero [om]`.
 *
 * Everything is in font units at font-size 100, from module m = 13 (stem width of Geist 600 "H"):
 * - Wordmark: "squero" Geist 600 ink at x 0, baseline 0 (advance 333).
 * - Water: 5 square dots of 1.5m (19.5) in --signal, spread evenly under "squero".
 *   Sitting at descender(q) + lift + 0.5m (35.565), so at the top of ripple it never touches "q".
 * - Tag: the product code, lowercase, in bold ink brackets ("a chosen option sits in brackets in
 *   bold ink", DESIGN.md): Geist Mono 600 at font-size 100 on the same baseline. Mono and Sans share
 *   an x-height, so the code sits on the wordmark's x-line. One word space after "squero" (x 357),
 *   which puts the "[" ink 3m after the "o" ink.
 * - Block: top of "[" (−75) to the bottom of the water (55.065).
 * - Ripple motion: idle ripple every 5 s; live continuous ripple (1.4 s) when running.
 *   Turned off under prefers-reduced-motion.
 */

export const STEM_M = 13;

export const WATER_DOTS = [0, 78.375, 156.75, 235.125, 313.5] as const;
export const WATER_Y = 35.565;
export const DOT_SIZE = 19.5; // 1.5 * m
export const RIPPLE_LIFT = 13.065; // 0.67 * DOT_SIZE

export const TAG_GEOMETRY = {
  x: 357, // "squero" advance 333 + one word space 24
  fontSize: 100,
} as const;

export const SQUERO_LOGO_VIEWBOX = {
  x: 0,
  y: -75, // top of "["
  width: 585, // right ink of "]"
  height: 75 + WATER_Y + DOT_SIZE,
} as const;

export type SqueroLogoProps = {
  product?: string;
  height?: number;
  running?: boolean;
};

export function logoWidth(height: number): number {
  return (height * SQUERO_LOGO_VIEWBOX.width) / SQUERO_LOGO_VIEWBOX.height;
}
