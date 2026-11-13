// MATLAB colour maps. The chart and the Station both name a map; the mesh and the colour bar
// read the same stops, so `colormap(jet)` draws one gradient, not two approximations.
export type Rgb = readonly [number, number, number];

const VIRIDIS: readonly Rgb[] = [
  [0x44, 0x01, 0x54], [0x3b, 0x52, 0x8b], [0x21, 0x91, 0x8c], [0x5e, 0xc9, 0x62], [0xfd, 0xe7, 0x25],
];

// Parula's nine anchors (MATLAB R2014b+): blue, cyan, green, ochre, yellow.
const PARULA: readonly Rgb[] = [
  [0x35, 0x21, 0x7b], [0x2f, 0x4d, 0xb2], [0x30, 0x7d, 0xb7], [0x32, 0xa1, 0x93], [0x6b, 0xb9, 0x55],
  [0xa5, 0xc8, 0x3e], [0xd6, 0xcc, 0x2d], [0xf2, 0xd0, 0x2c], [0xf7, 0xdd, 0x35], [0xf9, 0xeb, 0x7a],
];

const JET: readonly Rgb[] = [
  [0, 0, 0.5], [0, 0, 1], [0, 0.5, 1], [0, 1, 1], [0.5, 1, 0.5], [1, 1, 0], [1, 0.5, 0], [1, 0, 0], [0.5, 0, 0],
].map(([r, g, b]) => [r * 255, g * 255, b * 255] as Rgb);

const HOT: readonly Rgb[] = [[0x0b, 0x00, 0x00], [0xe6, 0x00, 0x00], [0xff, 0xb3, 0x00], [0xff, 0xff, 0xff]];
const GRAY: readonly Rgb[] = [[0, 0, 0], [255, 255, 255]];
const COOL: readonly Rgb[] = [[0, 255, 255], [255, 0, 255]];
const SPRING: readonly Rgb[] = [[255, 0, 255], [255, 255, 0]];
const SUMMER: readonly Rgb[] = [[0, 128, 102], [255, 255, 102]];
const AUTUMN: readonly Rgb[] = [[255, 0, 0], [255, 255, 0]];
const WINTER: readonly Rgb[] = [[0, 0, 255], [0, 255, 128]];
const BONE: readonly Rgb[] = [[0, 0, 0], [84, 84, 116], [166, 166, 166], [255, 255, 255]];
const COPPER: readonly Rgb[] = [[0, 0, 0], [255, 160, 102]];
const PINK: readonly Rgb[] = [[30, 8, 8], [166, 100, 100], [255, 210, 210]];
const LINES: readonly Rgb[] = [[0, 0, 255], [0, 128, 0], [255, 0, 0], [0, 191, 191], [191, 0, 191], [191, 191, 0], [64, 64, 64]];
const PLASMA: readonly Rgb[] = [[13, 8, 135], [126, 3, 168], [204, 71, 120], [248, 149, 64], [240, 249, 33]];
const INFERNO: readonly Rgb[] = [[0, 0, 4], [87, 16, 110], [188, 55, 84], [249, 142, 9], [252, 255, 164]];
const MAGMA: readonly Rgb[] = [[0, 0, 4], [81, 18, 124], [183, 55, 121], [252, 137, 97], [252, 253, 191]];
const CIVIDIS: readonly Rgb[] = [[0, 34, 78], [65, 77, 107], [124, 123, 120], [189, 175, 111], [254, 232, 56]];
const TURBO: readonly Rgb[] = [[48, 18, 59], [70, 134, 251], [27, 229, 181], [164, 252, 60], [251, 185, 56], [227, 68, 10], [122, 4, 3]];
const GRAYS: readonly Rgb[] = [[255, 255, 255], [0, 0, 0]];
const RDBU: readonly Rgb[] = [[103, 0, 31], [214, 96, 77], [247, 247, 247], [67, 147, 195], [5, 48, 97]];
const BALANCE: readonly Rgb[] = [[24, 28, 67], [60, 115, 180], [241, 236, 236], [199, 90, 65], [60, 9, 18]];
const THERMAL: readonly Rgb[] = [[3, 35, 51], [72, 54, 132], [182, 78, 109], [243, 144, 61], [231, 250, 90]];
const COOLWARM: readonly Rgb[] = [[59, 76, 192], [140, 175, 254], [221, 221, 221], [244, 154, 123], [180, 4, 38]];
const BLUES: readonly Rgb[] = [[247, 251, 255], [198, 219, 239], [107, 174, 214], [33, 113, 181], [8, 48, 107]];
const REDS: readonly Rgb[] = [[255, 245, 240], [252, 187, 161], [251, 106, 74], [203, 24, 29], [103, 0, 13]];
const GREENS: readonly Rgb[] = [[247, 252, 245], [199, 233, 192], [116, 196, 118], [35, 139, 69], [0, 68, 27]];

const MAPS: Record<string, readonly Rgb[]> = {
  parula: PARULA, viridis: VIRIDIS, jet: JET, hot: HOT, gray: GRAY, grey: GRAY, cool: COOL,
  spring: SPRING, summer: SUMMER, autumn: AUTUMN, winter: WINTER, bone: BONE, copper: COPPER,
  pink: PINK, lines: LINES, plasma: PLASMA, inferno: INFERNO, magma: MAGMA, cividis: CIVIDIS,
  turbo: TURBO, grays: GRAYS, greys: GRAYS, rdbu: RDBU, balance: BALANCE, thermal: THERMAL,
  coolwarm: COOLWARM, blues: BLUES, reds: REDS, greens: GREENS,
};

/** MATLAB's per-line colour order (R2014b and later). */
export const MATLAB_COLORS = ["#0072BD", "#D95319", "#EDB120", "#7E2F8E", "#77AC30", "#4DBEEE", "#A2142F"] as const;

/** A map name (supporting `_r` reversal), or an n × 3 matrix of RGB values 0..1, as stops. Unknown names fall back to parula. */
export function colormapStops(name?: string | readonly (readonly number[])[] | null): readonly Rgb[] {
  if (Array.isArray(name) && name.length) {
    return name
      .filter((row) => Array.isArray(row) && row.length >= 3)
      .map((row) => [row[0] * 255, row[1] * 255, row[2] * 255] as Rgb);
  }
  const raw = String(name ?? "parula").trim().toLowerCase();
  const rev = raw.endsWith("_r");
  const key = rev ? raw.slice(0, -2) : raw;
  const stops = MAPS[key] ?? PARULA;
  return rev ? [...stops].reverse() : stops;
}

/** The RGB at `t` in 0..1, interpolated in sRGB. */
export function sampleColormap(name: string | readonly (readonly number[])[] | undefined, t: number): Rgb {
  const stops = colormapStops(name);
  if (stops.length === 1) return stops[0];
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (stops.length - 1);
  const k = Math.min(stops.length - 2, Math.floor(x));
  const f = x - k;
  return [
    stops[k][0] + (stops[k + 1][0] - stops[k][0]) * f,
    stops[k][1] + (stops[k + 1][1] - stops[k][1]) * f,
    stops[k][2] + (stops[k + 1][2] - stops[k][2]) * f,
  ];
}

/** A CSS gradient for a colour bar, low at the bottom. */
export function colormapCss(name?: string | readonly (readonly number[])[] | null, steps = 32): string {
  const stops: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const [r, g, b] = sampleColormap(name ?? undefined, t);
    stops.push(`rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)}) ${(t * 100).toFixed(2)}%`);
  }
  return `linear-gradient(to top, ${stops.join(", ")})`;
}

/** The color as `#rrggbb`, for canvas and CSS. */
export function rgbHex([r, g, b]: Rgb): string {
  const hex = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
