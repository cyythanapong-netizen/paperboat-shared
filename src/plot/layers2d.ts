// Canvas rendering and hit/cursor sampling for generalized 2D plot layers inside Plot2D (uPlot).
import type uPlot from "uplot";
import { nearestSample, sampleSeriesAtX } from "../scope/interact.ts";
import { sampleColormap } from "./colormaps.ts";

export type NumericArray = ArrayLike<number>;

export type Plot2DLayerBase = {
  label?: string;
  secondaryY?: boolean;
  hidden?: boolean;
};

export type Plot2DLayer =
  | (Plot2DLayerBase & {
      kind: "lines" | "stairs" | "scatter" | "scatterlines";
      x: NumericArray;
      y: NumericArray;
      color?: string;
      colors?: readonly string[];
      linewidth?: number;
      linestyle?: "solid" | "dashed" | "dotted" | "dashdot";
      marker?: string;
      markersize?: number | readonly number[];
      markercolor?: string | readonly string[];
      strokecolor?: string;
      strokewidth?: number;
    })
  | (Plot2DLayerBase & {
      kind: "linesegments";
      x: NumericArray;
      y: NumericArray;
      color?: string | readonly string[];
      linewidth?: number;
      linestyle?: "solid" | "dashed" | "dotted" | "dashdot";
    })
  | (Plot2DLayerBase & {
      kind: "stem";
      x: NumericArray;
      y: NumericArray;
      baseline: NumericArray;
      color?: string;
      stemcolor?: string | readonly string[];
      trunkcolor?: string;
      stemwidth?: number;
      stemlinestyle?: "solid" | "dashed" | "dotted" | "dashdot";
      trunkwidth?: number;
      trunklinestyle?: "solid" | "dashed" | "dotted" | "dashdot";
      marker?: string;
      markersize?: number;
      strokecolor?: string;
      strokewidth?: number;
    })
  | (Plot2DLayerBase & {
      kind: "barplot" | "hist";
      x0: NumericArray;
      x1: NumericArray;
      y0: NumericArray;
      y1: NumericArray;
      color?: string | readonly string[];
      strokecolor?: string;
      strokewidth?: number;
    })
  | (Plot2DLayerBase & {
      kind: "errorbars";
      x: NumericArray;
      y: NumericArray;
      low: NumericArray;
      high: NumericArray;
      direction: string;
      linewidth?: number;
      whiskerwidth?: number;
      color?: string | readonly string[];
    })
  | (Plot2DLayerBase & {
      kind: "band";
      x: NumericArray;
      lo: NumericArray;
      hi: NumericArray;
      color?: string;
    })
  | (Plot2DLayerBase & {
      kind: "area";
      x: NumericArray;
      y: NumericArray;
      baseline: number;
      color?: string;
      fillcolor?: string;
      linewidth?: number;
      linestyle?: "solid" | "dashed" | "dotted" | "dashdot";
    })
  | (Plot2DLayerBase & {
      kind: "heatmap";
      xe: NumericArray;
      ye: NumericArray;
      nx: number;
      ny: number;
      z: NumericArray;
      colormap: string | readonly (readonly number[])[];
      colorrange: readonly [number, number];
      nancolor?: string;
      interpolate?: boolean;
      alpha?: number;
    })
  | (Plot2DLayerBase & {
      kind: "image";
      xe: NumericArray;
      ye: NumericArray;
      nx: number;
      ny: number;
      rgba: Uint8Array;
      interpolate?: boolean;
      alpha?: number;
    })
  | (Plot2DLayerBase & {
      kind: "contour";
      groups: readonly { level: number; color: string; coords: NumericArray }[];
      linewidth?: number;
      linestyle?: "solid" | "dashed" | "dotted" | "dashdot";
    })
  | (Plot2DLayerBase & {
      kind: "contourf";
      bands: readonly { color: string; polygons: readonly (readonly number[])[] }[];
    })
  | (Plot2DLayerBase & {
      kind: "hlines" | "vlines";
      values: NumericArray;
      min: NumericArray;
      max: NumericArray;
      color?: string | readonly string[];
      linewidth?: number;
      linestyle?: "solid" | "dashed" | "dotted" | "dashdot";
    })
  | (Plot2DLayerBase & {
      kind: "ablines";
      a: NumericArray;
      b: NumericArray;
      color?: string | readonly string[];
      linewidth?: number;
      linestyle?: "solid" | "dashed" | "dotted" | "dashdot";
    })
  | (Plot2DLayerBase & {
      kind: "poly";
      x: NumericArray;
      y: NumericArray;
      color?: string;
      strokecolor?: string;
      strokewidth?: number;
    })
  | (Plot2DLayerBase & {
      kind: "series" | "multiline";
      x: NumericArray;
      series: readonly { y: NumericArray; color: string; label?: string }[];
      linewidth?: number;
      linestyle?: "solid" | "dashed" | "dotted" | "dashdot";
      marker?: string;
      markersize?: number;
    })
  | (Plot2DLayerBase & {
      kind: "text";
      items: readonly {
        x: number;
        y: number;
        text: string;
        color?: string;
        fontsize?: number;
        rotation?: number;
        offset?: readonly [number, number];
        halign?: string;
        valign?: string;
      }[];
    })
  | (Plot2DLayerBase & {
      kind: "annotation";
      xt: number;
      yt: number;
      x: number;
      y: number;
      text: string;
      color?: string;
      fontsize?: number;
      linewidth?: number;
      arrowsize?: number;
    })
  | (Plot2DLayerBase & {
      kind: "mesh2d";
      triangles: readonly { color: string; x: readonly number[]; y: readonly number[] }[];
      strokecolor?: string;
      strokewidth?: number;
    });

function dashPattern(style: string | undefined, width: number, r: number): number[] {
  const w = Math.max(1, width * r);
  switch (style) {
    case "dashed": return [6 * w, 4 * w];
    case "dotted": return [1.5 * w, 3 * w];
    case "dashdot": return [6 * w, 3 * w, 1.5 * w, 3 * w];
    default: return [];
  }
}

const atColor = (c: string | readonly string[] | undefined, i: number, fallback = "#0072BD"): string =>
  Array.isArray(c) ? (c[i % c.length] ?? fallback) : (typeof c === "string" ? c : fallback);

/** Draw a marker symbol at canvas coordinates `(cx, cy)`. */
export function drawMarkerSymbol(
  ctx: CanvasRenderingContext2D,
  marker: string,
  cx: number,
  cy: number,
  radius: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
): void {
  const shape = marker === "square" ? "s" : marker === "diamond" ? "d" : marker === "pentagram" ? "p"
    : marker === "hexagram" ? "h" : marker === "none" ? "" : marker;
  if (!shape) return;
  const r = Math.max(1, radius);
  const poly = (n: number, rot: number) => {
    ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const a = rot + (k * 2 * Math.PI) / n;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  };
  const strokeOnly = ["+", "x", "*", "_", "|"].includes(shape);
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = stroke !== "transparent" ? stroke : fill;
  ctx.fillStyle = fill;
  if (strokeOnly) {
    ctx.beginPath();
    if (shape === "+") {
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    } else if (shape === "x") {
      ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
    } else if (shape === "*") {
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx - r * 0.5, cy - r * 0.87); ctx.lineTo(cx + r * 0.5, cy + r * 0.87);
      ctx.moveTo(cx - r * 0.5, cy + r * 0.87); ctx.lineTo(cx + r * 0.5, cy - r * 0.87);
    } else if (shape === "_") {
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    } else {
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    }
    ctx.stroke();
    return;
  }
  if (shape === "o" || shape === ".") {
    ctx.beginPath();
    ctx.arc(cx, cy, shape === "." ? Math.max(1, r * 0.45) : r, 0, Math.PI * 2);
  } else if (shape === "s") {
    ctx.beginPath();
    ctx.rect(cx - r, cy - r, r * 2, r * 2);
  } else if (shape === "d") poly(4, -Math.PI / 2);
  else if (shape === "^") poly(3, -Math.PI / 2);
  else if (shape === "v") poly(3, Math.PI / 2);
  else if (shape === ">") poly(3, 0);
  else if (shape === "<") poly(3, Math.PI);
  else if (shape === "p") poly(5, -Math.PI / 2);
  else if (shape === "h") poly(6, -Math.PI / 2);
  else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  if (fill && fill !== "transparent") ctx.fill();
  if (strokeWidth > 0 && stroke && stroke !== "transparent") ctx.stroke();
}

function strokePolyline(
  ctx: CanvasRenderingContext2D,
  u: uPlot,
  x: NumericArray,
  y: NumericArray,
  yScale: string,
  color: string,
  widthPx: number,
  linestyle: string | undefined,
  r: number,
): void {
  const n = Math.min(x.length, y.length);
  if (n === 0 || !color || color === "transparent") return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.75, widthPx * r);
  ctx.setLineDash(dashPattern(linestyle, widthPx, r));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  let pen = false;
  for (let i = 0; i < n; i++) {
    const xv = x[i], yv = y[i];
    if (!Number.isFinite(xv) || !Number.isFinite(yv)) { pen = false; continue; }
    const px = u.valToPos(xv, "x", true);
    const py = u.valToPos(yv, yScale, true);
    if (!Number.isFinite(px) || !Number.isFinite(py)) { pen = false; continue; }
    if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function isUniformGrid(edges: NumericArray): boolean {
  const n = edges.length;
  if (n < 3) return true;
  const d0 = edges[1] - edges[0];
  if (!Number.isFinite(d0) || d0 === 0) return false;
  const tol = Math.abs(d0) * 1e-3;
  for (let i = 2; i < n; i++) {
    if (Math.abs((edges[i] - edges[i - 1]) - d0) > tol) return false;
  }
  return true;
}

function buildHeatmapCanvas(
  nx: number,
  ny: number,
  z: NumericArray,
  colormap: string | readonly (readonly number[])[],
  range: readonly [number, number],
  alpha: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, nx);
  canvas.height = Math.max(1, ny);
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(canvas.width, canvas.height);
  const lo = range[0];
  const span = range[1] - lo || 1;
  const aByte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  for (let j = 0; j < ny; j++) {
    const rowTop = ny - 1 - j;
    for (let i = 0; i < nx; i++) {
      const v = z[j * nx + i];
      const off = (rowTop * nx + i) * 4;
      if (!Number.isFinite(v)) {
        img.data[off + 3] = 0;
        continue;
      }
      const [rr, gg, bb] = sampleColormap(colormap, (v - lo) / span);
      img.data[off] = Math.round(rr);
      img.data[off + 1] = Math.round(gg);
      img.data[off + 2] = Math.round(bb);
      img.data[off + 3] = aByte;
    }
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

function buildRgbaCanvas(nx: number, ny: number, rgba: Uint8Array): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, nx);
  canvas.height = Math.max(1, ny);
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(canvas.width, canvas.height);
  img.data.set(rgba.subarray(0, img.data.length));
  g.putImageData(img, 0, 0);
  return canvas;
}

/** Render all visible Plot2DLayer entries inside uPlot's plot box (`u.bbox`). */
export function drawPlotLayers(
  u: uPlot,
  layers: readonly Plot2DLayer[],
  hidden: ReadonlySet<number>,
  xLog: boolean,
  yLog: boolean,
  cache: WeakMap<object, HTMLCanvasElement>,
  r: number,
): void {
  if (!layers.length) return;
  const { ctx } = u;
  const { left, top, width, height } = u.bbox;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();

  layers.forEach((layer, idx) => {
    if (layer.hidden || hidden.has(idx)) return;
    const ys = layer.secondaryY ? "y2" : "y";

    if (layer.kind === "heatmap" || layer.kind === "image") {
      if (!layer.nx || !layer.ny || layer.xe.length < 2 || layer.ye.length < 2) return;
      if (layer.kind === "heatmap" && (xLog || yLog || !isUniformGrid(layer.xe) || !isUniformGrid(layer.ye))) {
        const lo = layer.colorrange[0], span = layer.colorrange[1] - lo || 1;
        ctx.save();
        ctx.globalAlpha = layer.alpha ?? 1;
        for (let j = 0; j < layer.ny; j++) {
          const py0 = u.valToPos(layer.ye[j], ys, true);
          const py1 = u.valToPos(layer.ye[j + 1], ys, true);
          if (!Number.isFinite(py0) || !Number.isFinite(py1)) continue;
          const yTop = Math.min(py0, py1), yH = Math.max(1, Math.abs(py1 - py0));
          for (let i = 0; i < layer.nx; i++) {
            const v = layer.z[j * layer.nx + i];
            if (!Number.isFinite(v)) continue;
            const px0 = u.valToPos(layer.xe[i], "x", true);
            const px1 = u.valToPos(layer.xe[i + 1], "x", true);
            if (!Number.isFinite(px0) || !Number.isFinite(px1)) continue;
            const [rr, gg, bb] = sampleColormap(layer.colormap, (v - lo) / span);
            ctx.fillStyle = `rgb(${Math.round(rr)} ${Math.round(gg)} ${Math.round(bb)})`;
            ctx.fillRect(Math.min(px0, px1), yTop, Math.max(1, Math.abs(px1 - px0)), yH);
          }
        }
        ctx.restore();
        return;
      }
      let off = cache.get(layer);
      if (!off) {
        off = layer.kind === "heatmap"
          ? buildHeatmapCanvas(layer.nx, layer.ny, layer.z, layer.colormap, layer.colorrange, layer.alpha ?? 1)
          : buildRgbaCanvas(layer.nx, layer.ny, layer.rgba);
        cache.set(layer, off);
      }
      const x0 = u.valToPos(layer.xe[0], "x", true);
      const x1 = u.valToPos(layer.xe[layer.nx], "x", true);
      const y0 = u.valToPos(layer.ye[layer.ny], ys, true);
      const y1 = u.valToPos(layer.ye[0], ys, true);
      if (!Number.isFinite(x0) || !Number.isFinite(x1) || !Number.isFinite(y0) || !Number.isFinite(y1)) return;
      ctx.save();
      if (layer.kind === "image" && layer.alpha !== undefined) ctx.globalAlpha = layer.alpha;
      ctx.imageSmoothingEnabled = !!layer.interpolate;
      ctx.drawImage(off, Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      ctx.restore();
      return;
    }

    if (layer.kind === "contourf") {
      for (const band of layer.bands) {
        ctx.fillStyle = band.color;
        for (const poly of band.polygons) {
          if (poly.length < 6) continue;
          ctx.beginPath();
          for (let i = 0; i < poly.length; i += 2) {
            const px = u.valToPos(poly[i], "x", true), py = u.valToPos(poly[i + 1], ys, true);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      return;
    }

    if (layer.kind === "contour") {
      const lw = layer.linewidth ?? 1.2;
      ctx.save();
      ctx.lineWidth = lw * r;
      ctx.setLineDash(dashPattern(layer.linestyle, lw, r));
      for (const grp of layer.groups) {
        ctx.strokeStyle = grp.color;
        ctx.beginPath();
        for (let i = 0; i + 3 < grp.coords.length; i += 4) {
          ctx.moveTo(u.valToPos(grp.coords[i], "x", true), u.valToPos(grp.coords[i + 1], ys, true));
          ctx.lineTo(u.valToPos(grp.coords[i + 2], "x", true), u.valToPos(grp.coords[i + 3], ys, true));
        }
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (layer.kind === "mesh2d") {
      for (const t of layer.triangles) {
        if (t.x.length < 3 || t.y.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(u.valToPos(t.x[0], "x", true), u.valToPos(t.y[0], ys, true));
        ctx.lineTo(u.valToPos(t.x[1], "x", true), u.valToPos(t.y[1], ys, true));
        ctx.lineTo(u.valToPos(t.x[2], "x", true), u.valToPos(t.y[2], ys, true));
        ctx.closePath();
        ctx.fillStyle = t.color;
        ctx.fill();
        if ((layer.strokewidth ?? 0) > 0 && layer.strokecolor && layer.strokecolor !== "transparent") {
          ctx.strokeStyle = layer.strokecolor;
          ctx.lineWidth = (layer.strokewidth ?? 0.5) * r;
          ctx.stroke();
        }
      }
      return;
    }

    if (layer.kind === "band") {
      const n = Math.min(layer.x.length, layer.lo.length, layer.hi.length);
      if (n < 2) return;
      ctx.fillStyle = layer.color ?? "rgba(0, 114, 189, 0.25)";
      let start = 0;
      while (start < n) {
        while (start < n && (!Number.isFinite(layer.x[start]) || !Number.isFinite(layer.lo[start]) || !Number.isFinite(layer.hi[start]))) start++;
        let end = start;
        while (end < n && Number.isFinite(layer.x[end]) && Number.isFinite(layer.lo[end]) && Number.isFinite(layer.hi[end])) end++;
        if (end - start >= 2) {
          ctx.beginPath();
          for (let i = start; i < end; i++) {
            const px = u.valToPos(layer.x[i], "x", true), py = u.valToPos(layer.hi[i], ys, true);
            if (i === start) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          for (let i = end - 1; i >= start; i--) {
            ctx.lineTo(u.valToPos(layer.x[i], "x", true), u.valToPos(layer.lo[i], ys, true));
          }
          ctx.closePath();
          ctx.fill();
        }
        start = end + 1;
      }
      return;
    }

    if (layer.kind === "area") {
      const n = Math.min(layer.x.length, layer.y.length);
      if (n < 2) return;
      ctx.fillStyle = layer.fillcolor ?? "rgba(0, 114, 189, 0.25)";
      let start = 0;
      while (start < n) {
        while (start < n && (!Number.isFinite(layer.x[start]) || !Number.isFinite(layer.y[start]))) start++;
        let end = start;
        while (end < n && Number.isFinite(layer.x[end]) && Number.isFinite(layer.y[end])) end++;
        if (end - start >= 2) {
          const baseY = u.valToPos(layer.baseline, ys, true);
          ctx.beginPath();
          ctx.moveTo(u.valToPos(layer.x[start], "x", true), baseY);
          for (let i = start; i < end; i++) ctx.lineTo(u.valToPos(layer.x[i], "x", true), u.valToPos(layer.y[i], ys, true));
          ctx.lineTo(u.valToPos(layer.x[end - 1], "x", true), baseY);
          ctx.closePath();
          ctx.fill();
        }
        start = end + 1;
      }
      if ((layer.linewidth ?? 1) > 0) strokePolyline(ctx, u, layer.x, layer.y, ys, layer.color ?? "#0072BD", layer.linewidth ?? 1.5, layer.linestyle, r);
      return;
    }

    if (layer.kind === "barplot" || layer.kind === "hist") {
      const n = Math.min(layer.x0.length, layer.x1.length, layer.y0.length, layer.y1.length);
      for (let i = 0; i < n; i++) {
        const px0 = u.valToPos(layer.x0[i], "x", true), px1 = u.valToPos(layer.x1[i], "x", true);
        const py0 = u.valToPos(layer.y0[i], ys, true), py1 = u.valToPos(layer.y1[i], ys, true);
        if (!Number.isFinite(px0) || !Number.isFinite(px1) || !Number.isFinite(py0) || !Number.isFinite(py1)) continue;
        const rx = Math.min(px0, px1), ry = Math.min(py0, py1);
        const rw = Math.max(0.5, Math.abs(px1 - px0)), rh = Math.max(0.5, Math.abs(py1 - py0));
        ctx.fillStyle = atColor(layer.color, i);
        ctx.fillRect(rx, ry, rw, rh);
        if ((layer.strokewidth ?? 0) > 0 && layer.strokecolor && layer.strokecolor !== "transparent") {
          ctx.strokeStyle = layer.strokecolor;
          ctx.lineWidth = (layer.strokewidth ?? 0.5) * r;
          ctx.strokeRect(rx, ry, rw, rh);
        }
      }
      return;
    }

    if (layer.kind === "poly") {
      const n = Math.min(layer.x.length, layer.y.length);
      if (n < 3) return;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const px = u.valToPos(layer.x[i], "x", true), py = u.valToPos(layer.y[i], ys, true);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (layer.color && layer.color !== "transparent") { ctx.fillStyle = layer.color; ctx.fill(); }
      if ((layer.strokewidth ?? 0) > 0 && layer.strokecolor && layer.strokecolor !== "transparent") {
        ctx.strokeStyle = layer.strokecolor;
        ctx.lineWidth = (layer.strokewidth ?? 1) * r;
        ctx.stroke();
      }
      return;
    }

    if (layer.kind === "errorbars") {
      const n = Math.min(layer.x.length, layer.y.length, layer.low.length, layer.high.length);
      const halfW = ((layer.whiskerwidth ?? 6) * r) / 2;
      ctx.lineWidth = (layer.linewidth ?? 1.2) * r;
      for (let i = 0; i < n; i++) {
        ctx.strokeStyle = atColor(layer.color, i);
        ctx.beginPath();
        if (layer.direction === "x") {
          const py = u.valToPos(layer.y[i], ys, true);
          const p0 = u.valToPos(layer.x[i] - layer.low[i], "x", true);
          const p1 = u.valToPos(layer.x[i] + layer.high[i], "x", true);
          ctx.moveTo(p0, py); ctx.lineTo(p1, py);
          if (halfW > 0) {
            ctx.moveTo(p0, py - halfW); ctx.lineTo(p0, py + halfW);
            ctx.moveTo(p1, py - halfW); ctx.lineTo(p1, py + halfW);
          }
        } else {
          const px = u.valToPos(layer.x[i], "x", true);
          const p0 = u.valToPos(layer.y[i] - layer.low[i], ys, true);
          const p1 = u.valToPos(layer.y[i] + layer.high[i], ys, true);
          ctx.moveTo(px, p0); ctx.lineTo(px, p1);
          if (halfW > 0) {
            ctx.moveTo(px - halfW, p0); ctx.lineTo(px + halfW, p0);
            ctx.moveTo(px - halfW, p1); ctx.lineTo(px + halfW, p1);
          }
        }
        ctx.stroke();
      }
      return;
    }

    if (layer.kind === "linesegments") {
      const n = Math.min(layer.x.length, layer.y.length);
      ctx.save();
      ctx.lineWidth = (layer.linewidth ?? 1.5) * r;
      ctx.setLineDash(dashPattern(layer.linestyle, layer.linewidth ?? 1.5, r));
      for (let i = 0; i + 1 < n; i += 2) {
        const x0 = u.valToPos(layer.x[i], "x", true), y0 = u.valToPos(layer.y[i], ys, true);
        const x1 = u.valToPos(layer.x[i + 1], "x", true), y1 = u.valToPos(layer.y[i + 1], ys, true);
        if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) continue;
        ctx.strokeStyle = atColor(layer.color, i);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (layer.kind === "hlines" || layer.kind === "vlines") {
      ctx.save();
      ctx.lineWidth = (layer.linewidth ?? 1.5) * r;
      ctx.setLineDash(dashPattern(layer.linestyle, layer.linewidth ?? 1.5, r));
      for (let i = 0; i < layer.values.length; i++) {
        ctx.strokeStyle = atColor(layer.color, i);
        const loF = layer.min[i] ?? 0, hiF = layer.max[i] ?? 1;
        ctx.beginPath();
        if (layer.kind === "hlines") {
          const py = u.valToPos(layer.values[i], ys, true);
          ctx.moveTo(left + loF * width, py);
          ctx.lineTo(left + hiF * width, py);
        } else {
          const px = u.valToPos(layer.values[i], "x", true);
          ctx.moveTo(px, top + (1 - loF) * height);
          ctx.lineTo(px, top + (1 - hiF) * height);
        }
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (layer.kind === "ablines") {
      const xMin = u.scales.x.min ?? 0, xMax = u.scales.x.max ?? 1;
      ctx.save();
      ctx.lineWidth = (layer.linewidth ?? 1.5) * r;
      ctx.setLineDash(dashPattern(layer.linestyle, layer.linewidth ?? 1.5, r));
      const px0 = u.valToPos(xMin, "x", true), px1 = u.valToPos(xMax, "x", true);
      for (let i = 0; i < Math.min(layer.a.length, layer.b.length); i++) {
        ctx.strokeStyle = atColor(layer.color, i);
        ctx.beginPath();
        ctx.moveTo(px0, u.valToPos(layer.a[i] + layer.b[i] * xMin, ys, true));
        ctx.lineTo(px1, u.valToPos(layer.a[i] + layer.b[i] * xMax, ys, true));
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (layer.kind === "stem") {
      const n = Math.min(layer.x.length, layer.y.length, layer.baseline.length);
      if (n > 0 && (layer.trunkwidth ?? 1) > 0) {
        ctx.save();
        ctx.strokeStyle = layer.trunkcolor ?? "#262626";
        ctx.lineWidth = (layer.trunkwidth ?? 1) * r;
        ctx.setLineDash(dashPattern(layer.trunklinestyle, layer.trunkwidth ?? 1, r));
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const px = u.valToPos(layer.x[i], "x", true), pb = u.valToPos(layer.baseline[i], ys, true);
          if (i === 0) ctx.moveTo(px, pb); else ctx.lineTo(px, pb);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.lineWidth = (layer.stemwidth ?? 1.2) * r;
      ctx.setLineDash(dashPattern(layer.stemlinestyle, layer.stemwidth ?? 1.2, r));
      for (let i = 0; i < n; i++) {
        const px = u.valToPos(layer.x[i], "x", true);
        const pb = u.valToPos(layer.baseline[i], ys, true);
        const py = u.valToPos(layer.y[i], ys, true);
        if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pb)) continue;
        ctx.strokeStyle = atColor(layer.stemcolor ?? layer.color, i);
        ctx.beginPath();
        ctx.moveTo(px, pb);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
      ctx.restore();
      const mr = ((layer.markersize ?? 6) * r) / 2;
      for (let i = 0; i < n; i++) {
        const px = u.valToPos(layer.x[i], "x", true), py = u.valToPos(layer.y[i], ys, true);
        if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
        drawMarkerSymbol(ctx, layer.marker || "o", px, py, mr, atColor(layer.color, i), layer.strokecolor ?? "#fff", (layer.strokewidth ?? 1) * r);
      }
      return;
    }

    if (layer.kind === "series" || layer.kind === "multiline") {
      for (const s of layer.series) {
        strokePolyline(ctx, u, layer.x, s.y, ys, s.color, layer.linewidth ?? 1.5, layer.linestyle, r);
        if (layer.marker) {
          const mr = ((layer.markersize ?? 5) * r) / 2;
          for (let i = 0; i < Math.min(layer.x.length, s.y.length); i++) {
            const px = u.valToPos(layer.x[i], "x", true), py = u.valToPos(s.y[i], ys, true);
            if (Number.isFinite(px) && Number.isFinite(py)) drawMarkerSymbol(ctx, layer.marker, px, py, mr, s.color, "#fff", 0.75 * r);
          }
        }
      }
      return;
    }

    if (layer.kind === "lines" || layer.kind === "stairs" || layer.kind === "scatter" || layer.kind === "scatterlines") {
      if (layer.kind !== "scatter") {
        if (layer.colors && layer.colors.length >= layer.x.length) {
          const n = Math.min(layer.x.length, layer.y.length);
          ctx.save();
          ctx.lineWidth = Math.max(0.75, (layer.linewidth ?? 1.5) * r);
          for (let i = 0; i + 1 < n; i++) {
            const x0 = u.valToPos(layer.x[i], "x", true), y0 = u.valToPos(layer.y[i], ys, true);
            const x1 = u.valToPos(layer.x[i + 1], "x", true), y1 = u.valToPos(layer.y[i + 1], ys, true);
            if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) continue;
            ctx.strokeStyle = layer.colors[i] ?? layer.color ?? "#0072BD";
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
          }
          ctx.restore();
        } else {
          strokePolyline(ctx, u, layer.x, layer.y, ys, layer.color ?? "#0072BD", layer.linewidth ?? 1.5, layer.linestyle, r);
        }
      }
      if (layer.kind === "scatter" || layer.kind === "scatterlines") {
        const n = Math.min(layer.x.length, layer.y.length);
        const marker = layer.marker || "o";
        const sw = (layer.strokewidth ?? 0.5) * r;
        const sc = layer.strokecolor ?? "transparent";
        for (let i = 0; i < n; i++) {
          const px = u.valToPos(layer.x[i], "x", true), py = u.valToPos(layer.y[i], ys, true);
          if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
          const sz = Array.isArray(layer.markersize) ? (layer.markersize[i] ?? 6) : (typeof layer.markersize === "number" ? layer.markersize : 6);
          const fill = atColor(layer.markercolor ?? layer.colors ?? layer.color, i);
          drawMarkerSymbol(ctx, marker, px, py, (sz * r) / 2, fill, sc, sw);
        }
      }
      return;
    }

    if (layer.kind === "text") {
      for (const t of layer.items) {
        const px = u.valToPos(t.x, "x", true) + (t.offset?.[0] ?? 0) * r;
        const py = u.valToPos(t.y, ys, true) - (t.offset?.[1] ?? 0) * r;
        if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
        ctx.save();
        ctx.translate(px, py);
        if (t.rotation) ctx.rotate(-t.rotation);
        ctx.fillStyle = t.color ?? "#262626";
        ctx.font = `${(t.fontsize ?? 11) * r}px Helvetica, Arial, sans-serif`;
        ctx.textAlign = t.halign === "right" ? "right" : t.halign === "center" ? "center" : "left";
        ctx.textBaseline = t.valign === "top" ? "top" : t.valign === "bottom" ? "bottom" : "middle";
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      }
      return;
    }

    if (layer.kind === "annotation") {
      const px0 = u.valToPos(layer.xt, "x", true), py0 = u.valToPos(layer.yt, ys, true);
      const px1 = u.valToPos(layer.x, "x", true), py1 = u.valToPos(layer.y, ys, true);
      if (!Number.isFinite(px0) || !Number.isFinite(py0) || !Number.isFinite(px1) || !Number.isFinite(py1)) return;
      const col = layer.color ?? "#262626";
      ctx.save();
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = (layer.linewidth ?? 1.2) * r;
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.lineTo(px1, py1);
      ctx.stroke();
      const ang = Math.atan2(py1 - py0, px1 - px0);
      const as = (layer.arrowsize ?? 8) * r;
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px1 - as * Math.cos(ang - 0.35), py1 - as * Math.sin(ang - 0.35));
      ctx.lineTo(px1 - as * Math.cos(ang + 0.35), py1 - as * Math.sin(ang + 0.35));
      ctx.closePath();
      ctx.fill();
      if (layer.text) {
        ctx.font = `${(layer.fontsize ?? 11) * r}px Helvetica, Arial, sans-serif`;
        ctx.textBaseline = "middle";
        ctx.textAlign = px0 <= px1 ? "right" : "left";
        ctx.fillText(layer.text, px0 + (px0 <= px1 ? -4 : 4) * r, py0);
      }
      ctx.restore();
    }
  });

  ctx.restore();
}

/** Find finite `[xMin, xMax, yMin, yMax]` bounds covered by layers (used when axes limits are absent). */
export function layersBounds(layers: readonly Plot2DLayer[], secondaryY = false): { x: [number, number] | null; y: [number, number] | null } {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const eatX = (arr?: NumericArray) => {
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (Number.isFinite(v)) { if (v < x0) x0 = v; if (v > x1) x1 = v; } }
  };
  const eatY = (arr?: NumericArray) => {
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (Number.isFinite(v)) { if (v < y0) y0 = v; if (v > y1) y1 = v; } }
  };
  for (const l of layers) {
    if (l.hidden || !!l.secondaryY !== secondaryY) continue;
    if ("x" in l && "y" in l && l.x && l.y && typeof (l.x as NumericArray).length === "number" && typeof (l.y as NumericArray).length === "number") {
      eatX(l.x as NumericArray);
      eatY(l.y as NumericArray);
    } else if (l.kind === "heatmap" || l.kind === "image") {
      eatX(l.xe); eatY(l.ye);
    } else if (l.kind === "barplot" || l.kind === "hist") {
      eatX(l.x0); eatX(l.x1); eatY(l.y0); eatY(l.y1);
    } else if (l.kind === "band") {
      eatX(l.x); eatY(l.lo); eatY(l.hi);
    } else if (l.kind === "series" || l.kind === "multiline") {
      eatX(l.x);
      for (const s of l.series) eatY(s.y);
    } else if (l.kind === "contour") {
      for (const g of l.groups) {
        for (let i = 0; i + 1 < g.coords.length; i += 2) {
          const xv = g.coords[i], yv = g.coords[i + 1];
          if (Number.isFinite(xv)) { if (xv < x0) x0 = xv; if (xv > x1) x1 = xv; }
          if (Number.isFinite(yv)) { if (yv < y0) y0 = yv; if (yv > y1) y1 = yv; }
        }
      }
    } else if (l.kind === "contourf") {
      for (const b of l.bands) {
        for (const poly of b.polygons) {
          for (let i = 0; i + 1 < poly.length; i += 2) {
            const xv = poly[i], yv = poly[i + 1];
            if (Number.isFinite(xv)) { if (xv < x0) x0 = xv; if (xv > x1) x1 = xv; }
            if (Number.isFinite(yv)) { if (yv < y0) y0 = yv; if (yv > y1) y1 = yv; }
          }
        }
      }
    }
  }
  return {
    x: Number.isFinite(x0) && Number.isFinite(x1) ? [x0, x1] : null,
    y: Number.isFinite(y0) && Number.isFinite(y1) ? [y0, y1] : null,
  };
}

function findCellIndex(edges: NumericArray, v: number): number {
  const n = edges.length - 1;
  if (n <= 0) return -1;
  const asc = edges[n] >= edges[0];
  for (let i = 0; i < n; i++) {
    const a = edges[i], b = edges[i + 1];
    if (asc ? (v >= a && v <= b) : (v <= a && v >= b)) return i;
  }
  return -1;
}

/** Sample hover target: either a heatmap `(x, y, z)` cell or closest finite curve/point sample. */
export function sampleLayersHover(
  layers: readonly Plot2DLayer[],
  hidden: ReadonlySet<number>,
  targetX: number,
  targetY: number,
  xSpan: number,
  ySpan: number,
): { x: number; y: number; z?: number; label?: string; snap: boolean } | null {
  for (let idx = layers.length - 1; idx >= 0; idx--) {
    const l = layers[idx];
    if (l.hidden || hidden.has(idx)) continue;
    if (l.kind === "heatmap") {
      const ix = findCellIndex(l.xe, targetX);
      const iy = findCellIndex(l.ye, targetY);
      if (ix >= 0 && iy >= 0) {
        const z = l.z[iy * l.nx + ix];
        if (Number.isFinite(z)) return { x: targetX, y: targetY, z, label: l.label || undefined, snap: false };
      }
    }
  }
  let best: { x: number; y: number; label?: string; dist: number } | null = null;
  layers.forEach((l, idx) => {
    if (l.hidden || hidden.has(idx)) return;
    if (l.kind === "lines" || l.kind === "stairs" || l.kind === "scatter" || l.kind === "scatterlines" || l.kind === "area" || l.kind === "stem") {
      const hit = nearestSample(l.x, l.y, targetX, targetY, xSpan, ySpan);
      if (hit && (!best || hit.dist < best.dist)) best = { x: hit.x, y: hit.y, label: l.label || undefined, dist: hit.dist };
    } else if (l.kind === "series" || l.kind === "multiline") {
      for (const s of l.series) {
        const hit = nearestSample(l.x, s.y, targetX, targetY, xSpan, ySpan);
        if (hit && (!best || hit.dist < best.dist)) best = { x: hit.x, y: hit.y, label: s.label || l.label || undefined, dist: hit.dist };
      }
    }
  });
  if (best && (best as { dist: number }).dist < 0.08) {
    const b = best as { x: number; y: number; label?: string };
    return { x: b.x, y: b.y, label: b.label, snap: true };
  }
  return null;
}

/** Named X-sampling summary for dual cursors A/B across visible line/scatter/series layers. */
export function sampleLayersAtX(
  layers: readonly Plot2DLayer[],
  hidden: ReadonlySet<number>,
  xA: number,
  xB: number,
): { label: string; color: string; yA: number | null; yB: number | null }[] {
  const out: { label: string; color: string; yA: number | null; yB: number | null }[] = [];
  layers.forEach((l, idx) => {
    if (l.hidden || hidden.has(idx)) return;
    if (l.kind === "lines" || l.kind === "stairs" || l.kind === "scatter" || l.kind === "scatterlines" || l.kind === "area" || l.kind === "stem") {
      const colors = (l as { colors?: string[] }).colors;
      out.push({
        label: l.label || `y${out.length + 1}`,
        color: Array.isArray(colors) ? (colors[0] ?? "#0072BD") : (l.color ?? "#0072BD"),
        yA: sampleSeriesAtX(l.x, l.y, xA),
        yB: sampleSeriesAtX(l.x, l.y, xB),
      });
    } else if (l.kind === "series" || l.kind === "multiline") {
      l.series.forEach((s) => {
        out.push({
          label: s.label || l.label || `y${out.length + 1}`,
          color: s.color,
          yA: sampleSeriesAtX(l.x, s.y, xA),
          yB: sampleSeriesAtX(l.x, s.y, xB),
        });
      });
    }
  });
  return out;
}
