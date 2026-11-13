import uPlot from "uplot";
import { valueAt } from "./math.ts";

export type PanScaleOpts = { log?: boolean; reverse?: boolean };

/** Format a numeric coordinate or measurement value compactly for readouts. */
export function formatCoord(x: number | null | undefined, digits = 3): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "–";
  if (Math.abs(x) >= 1e4 || (x !== 0 && Math.abs(x) < 1e-3)) return x.toExponential(2);
  return x.toFixed(digits);
}

/** Pan an X axis `[min, max]` window by a pixel drag delta `dxPx` across `wPx` pixels. */
export function panXRange(min: number, max: number, dxPx: number, wPx: number, opts?: PanScaleOpts): [number, number] {
  if (wPx <= 0 || !Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min, max];
  const sign = opts?.reverse ? -1 : 1;
  const frac = (dxPx / wPx) * sign;
  if (opts?.log && min > 0 && max > 0) {
    const k = Math.pow(max / min, -frac);
    return [min * k, max * k];
  }
  const dx = frac * (max - min);
  return [min - dx, max - dx];
}

/** Pan a Y axis `[min, max]` window by a pixel drag delta `dyPx` across `hPx` pixels. */
export function panYRange(min: number, max: number, dyPx: number, hPx: number, opts?: PanScaleOpts): [number, number] {
  if (hPx <= 0 || !Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min, max];
  const sign = opts?.reverse ? -1 : 1;
  const frac = (dyPx / hPx) * sign;
  if (opts?.log && min > 0 && max > 0) {
    const k = Math.pow(max / min, frac);
    return [min * k, max * k];
  }
  const dy = frac * (max - min);
  return [min + dy, max + dy];
}

/** Zoom `[min, max]` by `factor` anchored at data coordinate `at`. */
export function zoomRangeAround(min: number, max: number, at: number, factor: number, log = false): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(at)) return [min, max];
  if (log && min > 0 && max > 0 && at > 0) {
    const lo = Math.exp(Math.log(at) - (Math.log(at) - Math.log(min)) * factor);
    const hi = Math.exp(Math.log(at) + (Math.log(max) - Math.log(at)) * factor);
    return lo < hi ? [lo, hi] : [min, max];
  }
  const lo = at - (at - min) * factor;
  const hi = at + (max - at) * factor;
  return lo < hi ? [lo, hi] : [min, max];
}

/** Read and clear a finished uPlot box selection (`> 4px` wide and tall) into data bounds. */
export function applyBoxZoom(
  u: uPlot,
  yScales: readonly string[] = ["y"],
): { x: [number, number]; y: Record<string, [number, number]> } | null {
  const s = u.select;
  if (s.width <= 4 || s.height <= 4) {
    u.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
    return null;
  }
  const x0 = u.posToVal(s.left, "x");
  const x1 = u.posToVal(s.left + s.width, "x");
  const y: Record<string, [number, number]> = {};
  for (const key of yScales) {
    if (!(key in u.scales)) continue;
    const y0 = u.posToVal(s.top + s.height, key);
    const y1 = u.posToVal(s.top, key);
    if (Number.isFinite(y0) && Number.isFinite(y1)) {
      y[key] = [Math.min(y0, y1), Math.max(y0, y1)];
    }
  }
  u.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
  if (!Number.isFinite(x0) || !Number.isFinite(x1)) return null;
  return { x: [Math.min(x0, x1), Math.max(x0, x1)], y };
}

/** Find which cursor (`0` or `1`) is within `thresholdPx` CSS pixels of `pxX`, or `-1`. */
export function nearXCursor(u: uPlot, cursors: readonly [number, number] | null, pxX: number, thresholdPx = 7): number {
  if (!cursors) return -1;
  return cursors.findIndex((t) => Math.abs(u.valToPos(t, "x") - pxX) < thresholdPx);
}

/** Shared uPlot cursor hook binding: plain drag pans, box zoom tool or Ctrl/Meta drag zooms, double-click resets. */
export function cursorBind(isBoxZoom: () => boolean, onReset: () => void): uPlot.Cursor {
  return {
    x: false,
    y: false,
    points: { show: false },
    drag: { x: true, y: true, setScale: false },
    bind: {
      mousedown: (_u, _t, handler) => (e: MouseEvent) => {
        if (isBoxZoom() || e.ctrlKey || e.metaKey) handler(e);
        return null;
      },
      dblclick: () => () => {
        onReset();
        return null;
      },
    },
  };
}

/** Draw two draggable vertical measurement cursors with flag labels (`1`/`2` or `A`/`B`). */
export function drawXCursors(
  ctx: CanvasRenderingContext2D,
  u: uPlot,
  cursors: readonly [number, number],
  opts: { labels?: readonly [string, string]; ink: string; screenBg: string; r?: number },
): void {
  const { left, top, width, height } = u.bbox;
  const r = opts.r ?? 1;
  const labels = opts.labels ?? ["1", "2"];
  ctx.save();
  ctx.font = `${10 * r}px monospace`;
  cursors.forEach((t, i) => {
    const x = u.valToPos(t, "x", true);
    if (x < left || x > left + width) return;
    ctx.strokeStyle = opts.ink;
    ctx.lineWidth = Math.max(1, r);
    ctx.setLineDash([3 * r, 3 * r]);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = opts.ink;
    ctx.fillRect(x - 6 * r, top, 12 * r, 13 * r);
    ctx.fillStyle = opts.screenBg;
    ctx.fillText(labels[i] ?? String(i + 1), x - 3 * r, top + 10 * r);
  });
  ctx.restore();
}

/** Draw a faint live hover crosshair at `(xVal, yVal)` clipped inside the plot area. */
export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  u: uPlot,
  xVal: number | null,
  yVal: number | null,
  opts: { color: string; yScale?: string; r?: number },
): void {
  if (xVal === null && yVal === null) return;
  const { left, top, width, height } = u.bbox;
  const r = opts.r ?? 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.strokeStyle = opts.color;
  ctx.lineWidth = Math.max(1, r * 0.85);
  ctx.setLineDash([3 * r, 3 * r]);
  if (xVal !== null && Number.isFinite(xVal)) {
    const px = u.valToPos(xVal, "x", true);
    if (px >= left && px <= left + width) {
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, top + height);
      ctx.stroke();
    }
  }
  if (yVal !== null && Number.isFinite(yVal)) {
    const py = u.valToPos(yVal, opts.yScale ?? "y", true);
    if (py >= top && py <= top + height) {
      ctx.beginPath();
      ctx.moveTo(left, py);
      ctx.lineTo(left + width, py);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function isNonDecreasing(xs: ArrayLike<number | null | undefined>): boolean {
  let prev = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    const v = xs[i];
    if (v === null || v === undefined || !Number.isFinite(v)) return false;
    if (v < prev) return false;
    prev = v;
  }
  return xs.length > 0;
}

/** Sample `y` at `targetX` via linear interpolation for monotonic `x`, else nearest finite `(x, y)` in X. */
export function sampleSeriesAtX(
  xs: ArrayLike<number | null | undefined>,
  ys: ArrayLike<number | null | undefined>,
  targetX: number,
): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n === 0 || !Number.isFinite(targetX)) return null;
  if (isNonDecreasing(xs)) {
    const fy = new Float64Array(n);
    const fx = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const y = ys[i];
      if (y === null || y === undefined || !Number.isFinite(y)) {
        // Fall through to nearest-point scan when data contains gaps.
        fx[0] = NaN;
        break;
      }
      fx[i] = Number(xs[i]);
      fy[i] = y;
    }
    if (!Number.isNaN(fx[0])) return valueAt(fx, fy, targetX);
  }
  let bestDist = Infinity;
  let bestY: number | null = null;
  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i];
    if (x === null || x === undefined || y === null || y === undefined) continue;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const d = Math.abs(x - targetX);
    if (d < bestDist) {
      bestDist = d;
      bestY = y;
    }
  }
  return bestY;
}

/** Find the closest finite sample `(x, y)` to `(targetX, targetY)` normalized by axis spans. */
export function nearestSample(
  xs: ArrayLike<number | null | undefined>,
  ys: ArrayLike<number | null | undefined>,
  targetX: number,
  targetY: number,
  xSpan: number,
  ySpan: number,
): { index: number; x: number; y: number; dist: number } | null {
  const n = Math.min(xs.length, ys.length);
  if (n === 0 || !Number.isFinite(targetX) || !Number.isFinite(targetY)) return null;
  const sx = xSpan > 0 && Number.isFinite(xSpan) ? xSpan : 1;
  const sy = ySpan > 0 && Number.isFinite(ySpan) ? ySpan : 1;
  let best: { index: number; x: number; y: number; dist: number } | null = null;
  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i];
    if (x === null || x === undefined || y === null || y === undefined) continue;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const dist = Math.hypot((x - targetX) / sx, (y - targetY) / sy);
    if (!best || dist < best.dist) best = { index: i, x, y, dist };
  }
  return best;
}
