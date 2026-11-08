export type Side = "left" | "right" | "top" | "bottom";
export type Point = [number, number];

export type RouteInput = {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePosition?: Side;
  targetPosition?: Side;
  step?: boolean;
};

export type Obstacle = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WireRoute = {
  id: string;
  kind: "forward" | "back" | "step";
  /** The drawn corners, port to port: every segment is horizontal or vertical. */
  points: Point[];
  path: string;
  labelX: number;
  labelY: number;
};

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Wires grouped by the port they leave (`source`) or reach (`target`), each group in input order. */
function byPort(wires: readonly RouteInput[], end: "source" | "target"): Map<string, RouteInput[]> {
  const groups = new Map<string, RouteInput[]>();
  for (const w of wires) {
    const key = end === "source" ? `${w.source}:${w.sourceHandle ?? ""}` : `${w.target}:${w.targetHandle ?? ""}`;
    const list = groups.get(key) ?? [];
    list.push(w);
    groups.set(key, list);
  }
  return groups;
}

/** Spacing between the horizontal tracks used by back-wires. */
export function backWireLaneOffset(lane: number): number {
  return Math.max(0, lane) * 18;
}

/** Move each loop's vertical stem sideways too, so its route diverges soon after the port. */
export function backWireExitDistance(lane: number): number {
  return 24 + Math.max(0, lane) * 8;
}

/**
 * Produce an SVG path string for a sequence of points with rounded corners.
 * Corners use quadratic beziers (Q) connecting tangent lines at radius `r`.
 */
export function roundedPolyline(points: readonly [number, number][], radius = 10): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;
  if (points.length === 2) return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;

  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const d1 = Math.hypot(cx - px, cy - py);
    const d2 = Math.hypot(nx - cx, ny - cy);
    const ra = Math.min(radius, d1 / 2, d2 / 2);
    if (ra < 0.5) {
      d += ` L ${cx},${cy}`;
    } else {
      const a = [cx - Math.sign(cx - px) * ra, cy - Math.sign(cy - py) * ra];
      const b = [cx + Math.sign(nx - cx) * ra, cy + Math.sign(ny - cy) * ra];
      d += ` L ${a[0]},${a[1]} Q ${cx},${cy} ${b[0]},${b[1]}`;
    }
  }
  const last = points[points.length - 1];
  d += ` L ${last[0]},${last[1]}`;
  return d;
}

const DIR: Record<Side, [number, number]> = {
  right: [1, 0],
  left: [-1, 0],
  top: [0, -1],
  bottom: [0, 1],
};

/** How far a wire runs straight out of its port before it may turn. */
const STUB = 16;
const horizontal = (side: Side) => side === "left" || side === "right";

/** Drop repeated corners and corners on a straight run (but keep a turn back). */
export function simplify(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    if (out.length && out[out.length - 1][0] === p[0] && out[out.length - 1][1] === p[1]) continue;
    if (out.length >= 2) {
      const [a, b] = [out[out.length - 2], out[out.length - 1]];
      const straight = (a[0] === b[0] && b[0] === p[0] && (b[1] - a[1]) * (p[1] - b[1]) >= 0) || (a[1] === b[1] && b[1] === p[1] && (b[0] - a[0]) * (p[0] - b[0]) >= 0);
      if (straight) out.pop();
    }
    out.push([p[0], p[1]]);
  }
  return out;
}

/**
 * A square route from a port on side `sSide` to one on `tSide`: out of each port by a stub,
 * then one or two turns. `channel` is where the middle run sits (x for side ports, y for top
 * and bottom); absent, halfway.
 */
// ponytail: no obstacle avoidance for forward wires; a wire may cross a block until dragged.
export function orthoPoints(s: Point, sSide: Side, t: Point, tSide: Side, channel?: number): Point[] {
  const [sd, td] = [DIR[sSide], DIR[tSide]];
  const a: Point = [s[0] + sd[0] * STUB, s[1] + sd[1] * STUB];
  const b: Point = [t[0] + td[0] * STUB, t[1] + td[1] * STUB];
  let mid: Point[];
  if (horizontal(sSide) === horizontal(tSide)) {
    const k = horizontal(sSide) ? 0 : 1; // the axis the ports face along
    const across = (m: number): Point[] => (k === 0 ? [[m, a[1]], [m, b[1]]] : [[a[0], m], [b[0], m]]);
    const along = (m: number): Point[] => (k === 0 ? [[a[0], m], [b[0], m]] : [[m, a[1]], [m, b[1]]]);
    if (sd[k] === td[k]) mid = across(sd[k] > 0 ? Math.max(a[k], b[k]) : Math.min(a[k], b[k])); // both face the same way
    else if ((b[k] - a[k]) * sd[k] >= 0) mid = across(channel ?? (a[k] + b[k]) / 2); // facing each other
    else mid = along((a[1 - k] + b[1 - k]) / 2); // facing away: cross over between them
  } else {
    mid = [horizontal(sSide) ? [b[0], a[1]] : [a[0], b[1]]];
  }
  return simplify([s, a, ...mid, b, t]);
}

/**
 * A wire's drawn corners from its saved bends: the ports at each end and the bends between,
 * the first and last bend turned square with the port they meet (a block moved since).
 */
export function squareUp(from: Point, bends: readonly Point[], to: Point): Point[] {
  const mid = bends.map((b): Point => [b[0], b[1]]);
  const fix = (b: Point, end: Point) => {
    if (Math.abs(b[1] - end[1]) <= Math.abs(b[0] - end[0])) b[1] = end[1];
    else b[0] = end[0];
  };
  if (mid.length) {
    fix(mid[0], from);
    fix(mid[mid.length - 1], to);
  }
  return [from, ...mid, to];
}

/**
 * Segment `i` (points i to i+1) dragged to pass through `at`: it moves across itself, its
 * neighbours stretch. A segment at a port gets a new corner there, so the port end stays put.
 */
export function dragSegment(points: readonly Point[], i: number, at: Point): Point[] {
  const pts = points.map((p): Point => [p[0], p[1]]);
  if (i < 0 || i >= pts.length - 1) return pts;
  if (i === 0) {
    pts.unshift([pts[0][0], pts[0][1]]);
    i++;
  }
  if (i + 1 === pts.length - 1) pts.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
  const k = pts[i][1] === pts[i + 1][1] ? 1 : 0; // a horizontal run moves in y
  pts[i][k] = pts[i + 1][k] = Math.round(at[k]);
  return simplify(pts);
}

/** The middle of a route's longest segment: where its label (a delete button) goes. */
export function middleOf(points: readonly Point[]): Point {
  let best: Point = points[0];
  let len = -1;
  for (let i = 0; i + 1 < points.length; i++) {
    const [p, q] = [points[i], points[i + 1]];
    const d = Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]);
    if (d > len) [best, len] = [[(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], d];
  }
  return best;
}

/**
 * Route all wires on the canvas in one deterministic pass:
 * 1. Back wires (loops) are assigned distinct horizontal tracks below all intermediate obstacles
 *    and nested so shorter loops sit closer to blocks without overlapping.
 * 2. Forward wires (signal and step) run square, out of each port then across; wires into one
 *    port get distinct vertical channels.
 */
export function routeWires(
  wires: readonly RouteInput[],
  obstacles: readonly Obstacle[] = [],
): Map<string, WireRoute> {
  const results = new Map<string, WireRoute>();
  if (wires.length === 0) return results;

  const isBack = (w: RouteInput) =>
    (w.sourcePosition ?? "right") === "right" &&
    (w.targetPosition ?? "left") === "left" &&
    w.tx < w.sx + 8;

  const backWires = wires.filter(isBack);
  const forwardWires = wires.filter((w) => !isBack(w));

  // --- Back-wires (loops) ---
  if (backWires.length > 0) {
    // Sort loops by horizontal span: inner (shorter) loops get lower lanes (closer to blocks).
    const sortedLoops = [...backWires].sort(
      (a, b) =>
        (a.sx - a.tx) - (b.sx - b.tx) ||
        a.sx - b.sx ||
        byText(a.source, b.source) ||
        byText(a.id, b.id),
    );
    const loopLaneMap = new Map(sortedLoops.map((w, lane) => [w.id, lane]));

    // Exit lanes per source handle
    const bySource = byPort(backWires, "source");
    const sourceExitLaneMap = new Map<string, number>();
    for (const list of bySource.values()) {
      list.sort((a, b) => a.ty - b.ty || byText(a.id, b.id));
      list.forEach((w, i) => sourceExitLaneMap.set(w.id, i));
    }

    // Exit lanes per target handle
    const byTarget = byPort(backWires, "target");
    const targetExitLaneMap = new Map<string, number>();
    for (const list of byTarget.values()) {
      list.sort((a, b) => a.sy - b.sy || byText(a.id, b.id));
      list.forEach((w, i) => targetExitLaneMap.set(w.id, i));
    }

    for (const w of backWires) {
      const loopLane = loopLaneMap.get(w.id) ?? 0;
      const sLane = sourceExitLaneMap.get(w.id) ?? 0;
      const tLane = targetExitLaneMap.get(w.id) ?? 0;

      const exitSource = backWireExitDistance(sLane);
      const exitTarget = backWireExitDistance(tLane);

      // Find obstacles whose horizontal bounds overlap [tx - exitTarget - 4, sx + exitSource + 4]
      const spanMin = w.tx - exitTarget - 4;
      const spanMax = w.sx + exitSource + 4;
      const obstaclesInSpan = obstacles.filter((o) => o.x + o.width >= spanMin && o.x <= spanMax);
      const maxObstacleBottom = obstaclesInSpan.length
        ? Math.max(...obstaclesInSpan.map((o) => o.y + o.height))
        : -Infinity;

      const baseBelow = Math.max(w.sy, w.ty, maxObstacleBottom) + 28;
      const below = baseBelow + backWireLaneOffset(loopLane);

      const pts: [number, number][] = [
        [w.sx, w.sy],
        [w.sx + exitSource, w.sy],
        [w.sx + exitSource, below],
        [w.tx - exitTarget, below],
        [w.tx - exitTarget, w.ty],
        [w.tx, w.ty],
      ];
      const points = simplify(pts);
      results.set(w.id, {
        id: w.id,
        kind: "back",
        points,
        path: roundedPolyline(points, 10),
        labelX: (w.sx + w.tx) / 2,
        labelY: below,
      });
    }
  }

  // --- Forward wires (signal and step): square, a channel per wire into a shared target ---
  for (const list of byPort(forwardWires, "target").values()) {
    list.sort((a, b) => a.sy - b.sy || byText(a.id, b.id));
    const count = list.length;
    list.forEach((w, lane) => {
      const sSide = w.sourcePosition ?? "right";
      const tSide = w.targetPosition ?? "left";
      let channel: number | undefined;
      if (sSide === "right" && tSide === "left" && count > 1) {
        const midX = (w.sx + w.tx) / 2 + (lane - (count - 1) / 2) * 12;
        channel = Math.max(w.sx + STUB, Math.min(w.tx - STUB, midX));
      }
      const points = orthoPoints([w.sx, w.sy], sSide, [w.tx, w.ty], tSide, channel);
      const [labelX, labelY] = middleOf(points);
      results.set(w.id, { id: w.id, kind: w.step ? "step" : "forward", points, path: roundedPolyline(points, 8), labelX, labelY });
    });
  }

  return results;
}
