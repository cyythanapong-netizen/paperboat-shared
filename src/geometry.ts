// Symmetries and 2D transforms for icons, blocks, ports, and canvas elements.
// Dihedral group D4 (4 orthogonal rotations x 2 reflections = 8 states).

import type { IconDef, Prim, Pt } from "./protocol.ts";

export type RotationDeg = 0 | 90 | 180 | 270;
export type Side = "left" | "right" | "top" | "bottom";

export interface PlacementTransform {
  rotation?: RotationDeg;
  mirror?: boolean;
}

const turn: Record<RotationDeg, (p: Pt) => Pt> = {
  0: (p) => p,
  90: ([x, y]) => [y, 100 - x], // 90° anticlockwise (Modelica standard positive rotation)
  180: ([x, y]) => [100 - x, 100 - y],
  270: ([x, y]) => [100 - y, x], // 270° anticlockwise = 90° clockwise
};

export const flipPointX = ([x, y]: Pt): Pt => [100 - x, y];
export const flipPointY = ([x, y]: Pt): Pt => [x, 100 - y];

const at = (side: Side, a: number): Pt =>
  side === "left" ? [0, a] : side === "right" ? [100, a] : side === "top" ? [a, 0] : [a, 100];

const sideOf = ([x, y]: Pt): { side: Side; at: number } =>
  x === 0 ? { side: "left", at: y } : x === 100 ? { side: "right", at: y } : y === 0 ? { side: "top", at: x } : { side: "bottom", at: x };

/**
 * Applies a placement's rotation and horizontal mirror to an icon.
 * Graphics and ports move together, preserving the 5-unit grid.
 */
export function rotateIcon(icon: IconDef, place: PlacementTransform): IconDef {
  const rot = place.rotation ?? 0;
  const mir = Boolean(place.mirror);
  if (!rot && !mir) return icon;

  const move = (p: Pt) => turn[rot](mir ? flipPointX(p) : p);
  const g = icon.g.map((prim): Prim => {
    switch (prim.t) {
      case "line":
      case "poly":
        return { ...prim, p: prim.p.map(move) };
      case "text": {
        const [x, y] = move([prim.x, prim.y]);
        return { ...prim, x, y };
      }
      default: {
        const [a, b] = [move([prim.x, prim.y]), move([prim.x + prim.w, prim.y + prim.h])];
        const box = { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) };
        if (prim.t !== "arc") return { ...prim, ...box };
        const a0 = (((prim.a0 + rot) % 360) + 360) % 360;
        return { ...prim, ...box, a0, a1: a0 + (prim.a1 - prim.a0) };
      }
    }
  });

  const ports = icon.ports?.map((port) => ({ ...port, ...sideOf(move(at(port.side, port.at))) }));
  const swap = rot === 90 || rot === 270;
  const w = swap ? icon.h : icon.w;
  const h = swap ? icon.w : icon.h;
  return { ...(w && w !== 1 ? { w } : {}), ...(h && h !== 1 ? { h } : {}), g, ...(ports ? { ports } : {}) } as IconDef;
}

const SIDES_CW: Side[] = ["top", "right", "bottom", "left"];

/** Rotates a port side clockwise by a given degree step (default 90° CW). */
export function rotateSideCW(side: Side, deg: 90 | 180 | 270 = 90): Side {
  const idx = SIDES_CW.indexOf(side);
  const shift = deg / 90;
  return SIDES_CW[(idx + shift) % 4];
}

/** Rotates a port side counter-clockwise by a given degree step (default 90° CCW). */
export function rotateSideCCW(side: Side, deg: 90 | 180 | 270 = 90): Side {
  const idx = SIDES_CW.indexOf(side);
  const shift = deg / 90;
  return SIDES_CW[(idx - shift + 4) % 4];
}

/** Flips a port side horizontally across the vertical axis (swaps left and right). */
export function flipSideX(side: Side): Side {
  if (side === "left") return "right";
  if (side === "right") return "left";
  return side;
}

/** Flips a port side vertically across the horizontal axis (swaps top and bottom). */
export function flipSideY(side: Side): Side {
  if (side === "top") return "bottom";
  if (side === "bottom") return "top";
  return side;
}
