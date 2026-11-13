// An interactive 2D figure: white paper (or theme background), boxed axes, grid, ticks,
// title/labels, interactive legend, Pan / Box-Zoom / Wheel-Zoom / Home reset, live hover crosshair
// + coordinate readout, and draggable dual measurement cursors A/B (with Δx, Δy).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import "./plot.css";
import {
  applyBoxZoom, cursorBind, drawCrosshair, drawXCursors, formatCoord,
  nearXCursor, nearestSample, panXRange, panYRange, sampleSeriesAtX, zoomRangeAround,
} from "../scope/interact.ts";
import { MATLAB_COLORS } from "./colormaps.ts";
import { drawPlotLayers, layersBounds, sampleLayersAtX, sampleLayersHover, type Plot2DLayer } from "./layers2d.ts";
import { niceTicks } from "./ticks.ts";
import { TexText, type Interpreter } from "./TexText.tsx";

export type PlotText = { text: string; interpreter?: Interpreter };

export type PlotSeries = {
  x?: number[];
  y?: number[];
  /** A legend entry, from `DisplayName` or `legend`. */
  label?: string;
  color?: string;
  /** MATLAB `LineStyle`: -, --, :, -. or none (resolved by the kernel). */
  lineStyle?: "solid" | "dashed" | "dotted" | "dashdot" | "none";
  /** MATLAB `LineWidth`, in points. */
  lineWidth?: number;
  /** MATLAB marker name or symbol (o, +, *, ., x, s, d, ^, v, >, <, p, h, _, |). */
  marker?: string;
  /** Marker size in points. */
  markerSize?: number;
  /** A marker fill; absent or "none" is hollow. */
  markerFill?: string;
  /** Numeric scatter marker area (points squared), the third `scatter` argument. */
  area?: number;
  /** A scatter draws points only; a line series may also carry markers. */
  mode?: "line" | "scatter";
  /** A line's point count can be large; scatter can ask for filled points. */
  filled?: boolean;
  /** Plot on the right-hand secondary Y axis. */
  secondaryY?: boolean;
};

export type PlotLegendEntry = {
  label: string;
  line?: { color: string; linestyle?: string; linewidth?: number };
  marker?: { shape: string; color: string; size?: number; strokecolor?: string };
  patch?: { color: string; strokecolor?: string };
};

export type PlotLegend = {
  labels?: string[];
  entries?: PlotLegendEntry[];
  location?: string;
  show?: boolean;
  interpreter?: Interpreter;
};

export type PlotAxes = {
  title?: PlotText;
  subtitle?: PlotText;
  xlabel?: PlotText;
  ylabel?: PlotText;
  ylabel2?: PlotText;
  legend?: PlotLegend;
  xlim?: [number, number];
  ylim?: [number, number];
  y2lim?: [number, number];
  xscale?: "linear" | "log";
  yscale?: "linear" | "log";
  y2scale?: "linear" | "log";
  xreversed?: boolean;
  yreversed?: boolean;
  y2reversed?: boolean;
  ySide?: "left" | "right";
  xticks?: number[];
  yticks?: number[];
  y2ticks?: number[];
  xticklabels?: string[];
  yticklabels?: string[];
  y2ticklabels?: string[];
  grid?: boolean;
  xgrid?: boolean;
  ygrid?: boolean;
  box?: boolean;
  topspine?: boolean;
  bottomspine?: boolean;
  leftspine?: boolean;
  rightspine?: boolean;
  xticksvisible?: boolean;
  yticksvisible?: boolean;
  xticklabelsvisible?: boolean;
  yticklabelsvisible?: boolean;
  background?: string;
  /** on, off, tight, equal, auto… (`axis`). */
  axis?: string;
  interpreter?: Interpreter;
};

export type PlotViewLimits = {
  x?: [number, number] | null;
  y?: [number, number] | null;
  y2?: [number, number] | null;
};

export type PlotViewState = {
  limits: [number, number, number, number];
  y2lim?: [number, number];
  gridVisible: boolean;
  atHome: boolean;
};

export type Plot2DProps = {
  series: PlotSeries[];
  layers?: readonly Plot2DLayer[];
  axes?: PlotAxes;
  /** A figure with no series still draws empty MATLAB axes. */
  title?: string;
  className?: string;
  /** Enable interactive Pan / Box-Zoom / Wheel-Zoom / Hover Readout / A-B Cursors / Home (default true). */
  interactive?: boolean;
  /** Optional external viewport synchronization (e.g. linked axes). */
  viewLimits?: PlotViewLimits | null;
  /** Called on user zoom/pan/home/grid changes. */
  onViewChange?: (view: PlotViewState) => void;
};

const FONT = "11px Helvetica, Arial, sans-serif";
const TICK_FONT = "10px Helvetica, Arial, sans-serif";
const PT = 96 / 72;

const isLog = (scale?: string) => scale === "log";

const isDarkColor = (bg?: string): boolean => {
  if (!bg || bg === "transparent") return false;
  const m = bg.match(/^#([0-9a-f]{6})$/i);
  if (!m) return false;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
};

const resolveColor = (value: string | undefined, fallback: string) => {
  if (!value || value === "none") return value === "none" ? "transparent" : fallback;
  return value;
};

const dashOf = (style?: PlotSeries["lineStyle"] | string, width = 1) => {
  const w = Math.max(1, width);
  switch (style) {
    case "dashed": return [6 * w, 4 * w];
    case "dotted": return [1.5 * w, 3 * w];
    case "dashdot": return [6 * w, 3 * w, 1.5 * w, 3 * w];
    default: return [] as number[];
  }
};

function autoRange(_u: uPlot, min: number, max: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    const d = Math.abs(min) * 0.1 || 1;
    return [min - d, max + d];
  }
  return [min, max];
}

function logRange(_u: uPlot, min: number, max: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) return [1e-6, 1];
  if (min === max) return [min / 10, max * 10];
  return [min / 1.1, max * 1.1];
}

const formatLogTick = (value: number) => {
  const exponent = Math.round(Math.log10(Math.abs(value)));
  return exponent === 0 ? "1" : `10^${exponent}`;
};

function logTicks(min: number, max: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min === max) return [];
  const out: number[] = [];
  for (let e = Math.ceil(Math.log10(min)); e <= Math.floor(Math.log10(max)); e++) out.push(10 ** e);
  return out;
}

const fmtTick = (value: number) => {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e5 || abs < 1e-3)) {
    const exp = Math.floor(Math.log10(abs));
    const mantissa = value / 10 ** exp;
    return `${Number(mantissa.toFixed(2))}e${exp >= 0 ? "+" : ""}${exp}`;
  }
  return String(Number(value.toPrecision(6)));
};

function tickGutterWidth(
  ticks?: readonly number[],
  labels?: readonly string[],
  lim?: readonly [number, number],
  fallback = 38,
): number {
  const samples = labels?.length ? labels : ticks?.length ? ticks.map(fmtTick) : lim ? [fmtTick(lim[0]), fmtTick(lim[1])] : [];
  if (!samples.length) return fallback;
  const maxLen = samples.reduce((m, s) => Math.max(m, s.length), 1);
  return Math.max(28, Math.min(48, Math.ceil(maxLen * 5.5) + 15));
}

function markerPaths(marker: string, sizePx: number, fill: string) {
  const shape = marker === "square" ? "s" : marker === "diamond" ? "d" : marker === "pentagram" ? "p"
    : marker === "hexagram" ? "h" : marker === "none" ? "" : marker;
  return (u: uPlot, seriesIdx: number): uPlot.Series.Points.Paths | null => {
    const [xs, ys] = u.data[seriesIdx] as unknown as [number[], number[]];
    if (!xs?.length) return null;
    const scale = u.series[seriesIdx]?.scale ?? "y";
    const strokePath = new Path2D();
    const fillPath = new Path2D();
    const r = Math.max(1, sizePx / 2);
    const polygon = (x: number, y: number, n: number, rotation: number) => {
      const path = new Path2D();
      for (let k = 0; k < n; k++) {
        const a = rotation + (k * 2 * Math.PI) / n;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (k) path.lineTo(px, py); else path.moveTo(px, py);
      }
      path.closePath();
      return path;
    };
    for (let i = 0; i < xs.length; i++) {
      const x = u.valToPos(xs[i], "x", true);
      const y = u.valToPos(ys[i], scale, true);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (shape === "o" || shape === "") {
        const p = new Path2D();
        p.arc(x, y, r, 0, Math.PI * 2);
        p.closePath();
        fillPath.addPath(p);
        strokePath.addPath(p);
      } else if (shape === "+") {
        strokePath.moveTo(x - r, y); strokePath.lineTo(x + r, y);
        strokePath.moveTo(x, y - r); strokePath.lineTo(x, y + r);
      } else if (shape === "x") {
        strokePath.moveTo(x - r, y - r); strokePath.lineTo(x + r, y + r);
        strokePath.moveTo(x + r, y - r); strokePath.lineTo(x - r, y + r);
      } else if (shape === "*") {
        strokePath.moveTo(x - r, y); strokePath.lineTo(x + r, y);
        strokePath.moveTo(x - r * 0.5, y - r * 0.87); strokePath.lineTo(x + r * 0.5, y + r * 0.87);
        strokePath.moveTo(x - r * 0.5, y + r * 0.87); strokePath.lineTo(x + r * 0.5, y - r * 0.87);
      } else if (shape === ".") {
        const p = new Path2D();
        p.arc(x, y, Math.max(1, r * 0.45), 0, Math.PI * 2);
        p.closePath();
        fillPath.addPath(p);
        strokePath.addPath(p);
      } else if (shape === "_") {
        strokePath.moveTo(x - r, y); strokePath.lineTo(x + r, y);
      } else if (shape === "|") {
        strokePath.moveTo(x, y - r); strokePath.lineTo(x, y + r);
      } else if (shape === "s") {
        const p = new Path2D();
        p.rect(x - r, y - r, r * 2, r * 2);
        fillPath.addPath(p); strokePath.addPath(p);
      } else if (shape === "d") {
        const p = polygon(x, y, 4, -Math.PI / 2);
        fillPath.addPath(p); strokePath.addPath(p);
      } else if (shape === "^") {
        const p = polygon(x, y, 3, -Math.PI / 2);
        fillPath.addPath(p); strokePath.addPath(p);
      } else if (shape === "v") {
        const p = polygon(x, y, 3, Math.PI / 2);
        fillPath.addPath(p); strokePath.addPath(p);
      } else if (shape === ">") {
        const p = polygon(x, y, 3, 0);
        fillPath.addPath(p); strokePath.addPath(p);
      } else if (shape === "<") {
        const p = polygon(x, y, 3, Math.PI);
        fillPath.addPath(p); strokePath.addPath(p);
      } else if (shape === "p") {
        const p = polygon(x, y, 5, -Math.PI / 2);
        fillPath.addPath(p); strokePath.addPath(p);
      } else if (shape === "h") {
        const p = polygon(x, y, 6, -Math.PI / 2);
        fillPath.addPath(p); strokePath.addPath(p);
      }
    }
    return { stroke: strokePath, fill: fill === "transparent" ? null : fillPath, flags: 0 };
  };
}

const LEGEND_CLASS: Record<string, string> = {
  northeast: "ne", northwest: "nw", southeast: "se", southwest: "sw",
  north: "n", south: "s", east: "e", west: "w", best: "ne", outside: "ne",
  rt: "ne", lt: "nw", rb: "se", lb: "sw", ct: "n", cb: "s", rc: "e", lc: "w",
};

type HoverReadout = {
  dataX: number;
  dataY: number;
  y2?: number;
  z?: number;
  snapX?: number;
  snapY?: number;
  label?: string;
};

type ViewLimitsRef = { x: [number, number] | null; y: [number, number] | null; y2: [number, number] | null };

export function Plot2D({ series, layers = [], axes, title, className, interactive = true, viewLimits, onViewChange }: Plot2DProps) {
  const host = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);
  const heatmapCache = useRef(new WeakMap<object, HTMLCanvasElement>());

  const [tool, setTool] = useState<"pan" | "zoom">("pan");
  const [cursors, setCursors] = useState<[number, number] | null>(null);
  const [gridVisible, setGridVisible] = useState<boolean>(() => Boolean(axes?.grid ?? (axes?.xgrid || axes?.ygrid)));
  const [atHome, setAtHome] = useState(true);
  const [hover, setHover] = useState<HoverReadout | null>(null);
  const [pinned, setPinned] = useState<HoverReadout | null>(null);
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(() => new Set());

  const initialGrid = Boolean(axes?.grid ?? (axes?.xgrid || axes?.ygrid));
  useEffect(() => {
    setGridVisible(initialGrid);
    gridVisibleRef.current = initialGrid;
    plot.current?.redraw(false);
  }, [initialGrid]);

  const bgColor = axes?.background && axes.background !== "transparent" ? axes.background : "#ffffff";
  const dark = isDarkColor(bgColor);
  const ink = dark ? "#e5e7eb" : "#262626";
  const gridColor = dark ? "rgba(255, 255, 255, 0.14)" : "#e5e5e5";

  const visible = useMemo(
    () => (series ?? []).filter(
      (s): s is PlotSeries & { x: number[]; y: number[] } =>
        Array.isArray(s.x) && Array.isArray(s.y) && s.x.length > 0 && s.x.length === s.y.length,
    ),
    [series],
  );
  const interpreter = axes?.interpreter ?? "tex";
  const legendLabels = axes?.legend?.labels;
  const labels = useMemo(
    () => visible.map((s, i) => legendLabels?.[i]?.trim() || s.label?.trim() || ""),
    [visible, legendLabels],
  );
  const legendEntries = axes?.legend?.entries;
  const showLegend = Boolean(
    legendEntries?.length ||
    (axes?.legend?.show !== false && (axes?.legend?.show === true || labels.some(Boolean) || layers.some((l) => l.label)) &&
      (visible.length > 0 || layers.length > 0) && (labels.some(Boolean) || Boolean(legendLabels?.length) || layers.some((l) => Boolean(l.label)))),
  );
  const legendAt = LEGEND_CLASS[(axes?.legend?.location ?? "northeast").toLowerCase()] ?? "ne";
  const titleText = axes?.title?.text ?? title ?? "";
  const subtitleText = axes?.subtitle?.text ?? "";

  const input = useMemo(() => {
    const xLog = isLog(axes?.xscale);
    const yLog = isLog(axes?.yscale);
    const y2Log = isLog(axes?.y2scale);
    return visible.map((s, index) => {
      const x: number[] = [], y: number[] = [];
      const sec = !!s.secondaryY;
      for (let i = 0; i < s.x.length; i++) {
        const xv = s.x[i], yv = s.y[i];
        if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
        if (xLog && xv <= 0) continue;
        if ((sec ? y2Log : yLog) && yv <= 0) continue;
        x.push(xv); y.push(yv);
      }
      return { ...s, x, y, label: labels[index] };
    });
  }, [visible, labels, axes?.xscale, axes?.yscale, axes?.y2scale]);

  const hasY2 = useMemo(
    () => Boolean(axes?.y2lim || axes?.ylabel2?.text || input.some((s) => s.secondaryY) || layers.some((l) => l.secondaryY)),
    [axes?.y2lim, axes?.ylabel2, input, layers],
  );
  const layerBounds1 = useMemo(() => layersBounds(layers, false), [layers]);
  const layerBounds2 = useMemo(() => layersBounds(layers, true), [layers]);

  const viewRef = useRef<ViewLimitsRef>({ x: null, y: null, y2: null });
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const gridVisibleRef = useRef(gridVisible);
  gridVisibleRef.current = gridVisible;
  const cursorsRef = useRef(cursors);
  cursorsRef.current = cursors;
  const hoverRef = useRef(hover);
  hoverRef.current = hover;
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;
  const hiddenLayers = useMemo(() => {
    const out = new Set<number>();
    layers.forEach((l, i) => {
      if (hiddenSet.has(`l:${i}`) || (l.label && hiddenSet.has(`lbl:${l.label}`))) out.add(i);
    });
    return out;
  }, [layers, hiddenSet]);
  const hiddenSeriesRef = useRef<Set<number>>(new Set());
  const hiddenLayersRef = useRef<Set<number>>(new Set());
  hiddenSeriesRef.current = useMemo(() => {
    const out = new Set<number>();
    input.forEach((s, i) => {
      if (hiddenSet.has(`s:${i}`) || (s.label && hiddenSet.has(`lbl:${s.label}`))) out.add(i);
    });
    return out;
  }, [input, hiddenSet]);
  hiddenLayersRef.current = hiddenLayers;
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;

  const baseBounds = () => {
    const u = plot.current;
    const x = axes?.xlim ?? layerBounds1.x ?? [u?.scales.x.min ?? 0, u?.scales.x.max ?? 1];
    const y = axes?.ylim ?? layerBounds1.y ?? [u?.scales.y.min ?? 0, u?.scales.y.max ?? 1];
    const y2 = axes?.y2lim ?? layerBounds2.y ?? undefined;
    return { x, y, y2 };
  };

  const emitView = (nextGrid = gridVisibleRef.current) => {
    const u = plot.current;
    const b = baseBounds();
    const x = viewRef.current.x ?? (u && Number.isFinite(u.scales.x.min) && Number.isFinite(u.scales.x.max) ? [u.scales.x.min!, u.scales.x.max!] : b.x);
    const y = viewRef.current.y ?? (u && Number.isFinite(u.scales.y.min) && Number.isFinite(u.scales.y.max) ? [u.scales.y.min!, u.scales.y.max!] : b.y);
    const y2 = viewRef.current.y2 ?? (u && hasY2 && Number.isFinite(u.scales.y2?.min) && Number.isFinite(u.scales.y2?.max) ? [u.scales.y2.min!, u.scales.y2.max!] : b.y2);
    const homeNow = viewRef.current.x === null && viewRef.current.y === null && viewRef.current.y2 === null;
    setAtHome(homeNow);
    onViewChangeRef.current?.({
      limits: [x[0], x[1], y[0], y[1]],
      ...(y2 ? { y2lim: [y2[0], y2[1]] } : {}),
      gridVisible: nextGrid,
      atHome: homeNow,
    });
  };

  const resetHome = () => {
    viewRef.current = { x: null, y: null, y2: null };
    setAtHome(true);
    setPinned(null);
    pinnedRef.current = null;
    plot.current?.redraw(true);
    emitView();
  };
  const resetHomeRef = useRef(resetHome);
  resetHomeRef.current = resetHome;

  // Reset local viewport when switching to a genuinely different plot specification.
  const specSignature = useMemo(
    () => JSON.stringify([axes?.xlim, axes?.ylim, axes?.y2lim, axes?.xscale, axes?.yscale, input.length, layers.length, axes?.title?.text]),
    [axes?.xlim, axes?.ylim, axes?.y2lim, axes?.xscale, axes?.yscale, input.length, layers.length, axes?.title?.text],
  );
  useEffect(() => {
    viewRef.current = { x: null, y: null, y2: null };
    setAtHome(true);
    setCursors(null);
    setHover(null);
    setPinned(null);
    setHiddenSet(new Set());
  }, [specSignature]);

  // Apply external linked-axis updates without bouncing notifications back.
  useEffect(() => {
    if (!viewLimits) return;
    let changed = false;
    if (viewLimits.x !== undefined) { viewRef.current.x = viewLimits.x; changed = true; }
    if (viewLimits.y !== undefined) { viewRef.current.y = viewLimits.y; changed = true; }
    if (viewLimits.y2 !== undefined) { viewRef.current.y2 = viewLimits.y2; changed = true; }
    if (changed) {
      setAtHome(viewRef.current.x === null && viewRef.current.y === null && viewRef.current.y2 === null);
      plot.current?.redraw(true);
    }
  }, [viewLimits]);

  const shape = JSON.stringify([
    input.map((s) => [s.mode, s.color, s.lineStyle, s.lineWidth, s.marker, s.markerSize, s.markerFill, s.area, s.filled, s.label, s.secondaryY]),
    layers.length, axes?.xlim, axes?.ylim, axes?.y2lim, axes?.xscale, axes?.yscale, axes?.y2scale,
    axes?.xreversed, axes?.yreversed, axes?.y2reversed, axes?.ySide,
    axes?.box, axes?.topspine, axes?.bottomspine, axes?.leftspine, axes?.rightspine,
    axes?.axis, axes?.xticks, axes?.yticks, axes?.y2ticks, axes?.xticklabels, axes?.yticklabels, axes?.y2ticklabels,
    axes?.xticksvisible, axes?.yticksvisible, axes?.xticklabelsvisible, axes?.yticklabelsvisible,
    bgColor, interactive, hasY2,
  ]);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const tables: uPlot.AlignedData[] = input.map((s) => [s.x.slice(), s.y.slice()] as unknown as uPlot.AlignedData);
    const data: uPlot.AlignedData = tables.length === 0 ? [[]] : tables.length === 1 ? tables[0] : uPlot.join(tables);
    const axisOff = axes?.axis === "off";
    const xLog = isLog(axes?.xscale);
    const yLog = isLog(axes?.yscale);
    const y2Log = isLog(axes?.y2scale);
    const box = !axisOff && axes?.box !== false;
    const primSide: 1 | 3 = axes?.ySide === "right" ? 1 : 3;

    const makeAxis = (scale: string, side: 0 | 1 | 2 | 3, showTicks: boolean, showLabels: boolean, yGutter = 38): uPlot.Axis => ({
      scale,
      side,
      stroke: ink,
      font: TICK_FONT,
      labelFont: FONT,
      gap: 4,
      size: showLabels ? (side === 2 ? 24 : yGutter) : 10,
      ticks: showTicks ? { show: true, stroke: ink, width: 1, size: 5 } : { show: false },
      values: showLabels ? (_u, splits) => splits.map(fmtTick) : () => [],
      grid: {
        show: true,
        stroke: () => (gridVisibleRef.current ? gridColor : "transparent"),
        width: 1,
      },
    });

    const yGutter = tickGutterWidth(axes?.yticks, axes?.yticklabels, axes?.ylim);
    const xAxis = makeAxis("x", 2, axes?.xticksvisible !== false, axes?.xticklabelsvisible !== false);
    const yAxis = makeAxis("y", primSide, axes?.yticksvisible !== false, axes?.yticklabelsvisible !== false, yGutter);
    xAxis.splits = (_u, _idx, smin, smax) => {
      if (viewRef.current.x === null && axes?.xticks?.length) return axes.xticks;
      return xLog ? logTicks(smin, smax) : niceTicks(smin, smax, 8);
    };
    xAxis.values = axes?.xticklabelsvisible === false
      ? () => []
      : (_u, splits) => {
          if (viewRef.current.x === null && axes?.xticks?.length && axes.xticklabels?.length) {
            return splits.map((v) => axes.xticklabels![axes.xticks!.indexOf(v)] ?? fmtTick(v));
          }
          return splits.map(xLog ? formatLogTick : fmtTick);
        };
    yAxis.splits = (_u, _idx, smin, smax) => {
      if (viewRef.current.y === null && axes?.yticks?.length) return axes.yticks;
      return yLog ? logTicks(smin, smax) : niceTicks(smin, smax, 8);
    };
    yAxis.values = axes?.yticklabelsvisible === false
      ? () => []
      : (_u, splits) => {
          if (viewRef.current.y === null && axes?.yticks?.length && axes.yticklabels?.length) {
            return splits.map((v) => axes.yticklabels![axes.yticks!.indexOf(v)] ?? fmtTick(v));
          }
          return splits.map(yLog ? formatLogTick : fmtTick);
        };

    const allAxes: uPlot.Axis[] = [xAxis, yAxis];
    if (hasY2) {
      const y2Gutter = tickGutterWidth(axes?.y2ticks, axes?.y2ticklabels, axes?.y2lim);
      const y2Axis = makeAxis("y2", primSide === 3 ? 1 : 3, true, true, y2Gutter);
      y2Axis.grid = { show: false };
      y2Axis.splits = (_u, _idx, smin, smax) => {
        if (viewRef.current.y2 === null && axes?.y2ticks?.length) return axes.y2ticks;
        return y2Log ? logTicks(smin, smax) : niceTicks(smin, smax, 8);
      };
      y2Axis.values = (_u, splits) => {
        if (viewRef.current.y2 === null && axes?.y2ticks?.length && axes.y2ticklabels?.length) {
          return splits.map((v) => axes.y2ticklabels![axes.y2ticks!.indexOf(v)] ?? fmtTick(v));
        }
        return splits.map(y2Log ? formatLogTick : fmtTick);
      };
      allAxes.push(y2Axis);
    }

    const resolveScaleRange = (
      override: () => [number, number] | null,
      fixed: [number, number] | undefined,
      layerLim: [number, number] | null,
      log: boolean,
    ): uPlot.Scale.Range => (u, min, max) => {
      const ov = override();
      if (ov && Number.isFinite(ov[0]) && Number.isFinite(ov[1])) return ov;
      if (fixed && fixed.length === 2 && Number.isFinite(fixed[0]) && Number.isFinite(fixed[1])) return fixed;
      if (layerLim && Number.isFinite(layerLim[0]) && Number.isFinite(layerLim[1])) {
        if (Number.isFinite(min) && Number.isFinite(max) && tables.length > 0) {
          return log ? logRange(u, Math.min(min, layerLim[0]), Math.max(max, layerLim[1])) : autoRange(u, Math.min(min, layerLim[0]), Math.max(max, layerLim[1]));
        }
        return autoRange(u, layerLim[0], layerLim[1]);
      }
      return log ? logRange(u, min, max) : autoRange(u, min, max);
    };

    const scales: uPlot.Scales = {
      x: {
        time: false,
        dir: axes?.xreversed ? -1 : 1,
        ...(xLog ? { distr: 3, log: 10 } : {}),
        range: resolveScaleRange(() => viewRef.current.x, axes?.xlim, layerBounds1.x, xLog),
      },
      y: {
        time: false,
        dir: axes?.yreversed ? -1 : 1,
        ...(yLog ? { distr: 3, log: 10 } : {}),
        range: resolveScaleRange(() => viewRef.current.y, axes?.ylim, layerBounds1.y, yLog),
      },
    };
    if (hasY2) {
      scales.y2 = {
        time: false,
        dir: axes?.y2reversed ? -1 : 1,
        ...(y2Log ? { distr: 3, log: 10 } : {}),
        range: resolveScaleRange(() => viewRef.current.y2, axes?.y2lim, layerBounds2.y, y2Log),
      };
    }

    const uSeries: uPlot.Series[] = [{}];
    input.forEach((s, index) => {
      const color = resolveColor(s.color, MATLAB_COLORS[index % MATLAB_COLORS.length]);
      const lw = Math.max(0.75, (s.lineWidth ?? 0.5) * PT);
      const scatter = s.mode === "scatter";
      const marker = s.marker === "none" ? "" : s.marker ?? (scatter ? "o" : "");
      const markerPx = Math.max(1, (scatter ? Math.sqrt(s.area ?? 36) : (s.markerSize ?? 6)) * PT);
      const face = scatter && s.filled !== false ? resolveColor(s.markerFill, color) : resolveColor(s.markerFill, "transparent");
      const custom = marker && marker !== "o";
      uSeries.push({
        show: !hiddenSeriesRef.current.has(index),
        label: s.label,
        scale: s.secondaryY ? "y2" : "y",
        stroke: color,
        width: scatter ? 0 : lw,
        dash: scatter || s.lineStyle === "none" ? undefined : dashOf(s.lineStyle, lw),
        spanGaps: true,
        paths: scatter || s.lineStyle === "none" ? () => null : uPlot.paths.linear!(),
        points: marker ? {
          show: true,
          size: markerPx,
          width: Math.max(0.5, lw * 0.75),
          stroke: color,
          fill: face,
          ...(custom ? { paths: markerPaths(marker, markerPx, face) } : {}),
        } : { show: false },
      });
    });

    const opts: uPlot.Options = {
      width: Math.max(1, el.clientWidth),
      height: Math.max(1, el.clientHeight),
      pxAlign: 0,
      legend: { show: false },
      padding: [8, hasY2 ? 6 : 7, 0, 0],
      scales,
      axes: axisOff ? [] : allAxes,
      series: uSeries,
      select: { show: interactive, left: 0, top: 0, width: 0, height: 0 },
      cursor: interactive ? cursorBind(() => toolRef.current === "zoom", () => resetHomeRef.current()) : { show: false },
      hooks: {
        setSelect: interactive ? [
          (u) => {
            const boxZoom = applyBoxZoom(u, hasY2 ? ["y", "y2"] : ["y"]);
            if (boxZoom?.y.y) {
              viewRef.current.x = boxZoom.x;
              viewRef.current.y = boxZoom.y.y;
              if (hasY2 && boxZoom.y.y2) viewRef.current.y2 = boxZoom.y.y2;
              u.redraw(true);
              emitView();
            }
          },
        ] : [],
        draw: [
          (u: uPlot) => {
            const dpr = devicePixelRatio || 1;
            drawPlotLayers(u, layersRef.current, hiddenLayersRef.current, xLog, yLog, heatmapCache.current, dpr);
            if (!axisOff && box) {
              const { left, top, width, height } = u.bbox;
              const { ctx } = u;
              ctx.save();
              ctx.strokeStyle = ink;
              ctx.lineWidth = Math.max(1, dpr * 0.85);
              ctx.beginPath();
              if (axes?.topspine !== false) { ctx.moveTo(left, top + 0.5); ctx.lineTo(left + width, top + 0.5); }
              if (axes?.rightspine !== false && !hasY2) { ctx.moveTo(left + width - 0.5, top); ctx.lineTo(left + width - 0.5, top + height); }
              if (axes?.bottomspine === true) { ctx.moveTo(left, top + height - 0.5); ctx.lineTo(left + width, top + height - 0.5); }
              if (axes?.leftspine === true) { ctx.moveTo(left + 0.5, top); ctx.lineTo(left + 0.5, top + height); }
              ctx.stroke();
              ctx.restore();
            }
            if (cursorsRef.current) {
              drawXCursors(u.ctx, u, cursorsRef.current, { labels: ["A", "B"], ink: "#ff6a2b", screenBg: bgColor, r: dpr });
            }
            const hv = hoverRef.current;
            if (hv) {
              const cx = hv.snapX ?? hv.dataX;
              const cy = hv.snapY ?? hv.dataY;
              drawCrosshair(u.ctx, u, cx, cy, { color: dark ? "rgba(255,255,255,0.35)" : "rgba(38,38,38,0.35)", r: dpr });
              if (hv.snapX !== undefined && hv.snapY !== undefined) {
                const px = u.valToPos(hv.snapX, "x", true);
                const py = u.valToPos(hv.snapY, "y", true);
                if (Number.isFinite(px) && Number.isFinite(py)) {
                  const { ctx } = u;
                  ctx.save();
                  ctx.beginPath();
                  ctx.arc(px, py, 4.5 * dpr, 0, Math.PI * 2);
                  ctx.fillStyle = "#ff6a2b";
                  ctx.fill();
                  ctx.strokeStyle = bgColor;
                  ctx.lineWidth = 1.5 * dpr;
                  ctx.stroke();
                  ctx.restore();
                }
              }
            }
            const pin = pinnedRef.current;
            if (pin) {
              const pinX = pin.snapX ?? pin.dataX;
              const pinY = pin.snapY ?? pin.dataY;
              drawCrosshair(u.ctx, u, pinX, pinY, { color: "rgba(255, 106, 43, 0.45)", r: dpr });
              const px = u.valToPos(pinX, "x", true);
              const py = u.valToPos(pinY, "y", true);
              if (Number.isFinite(px) && Number.isFinite(py)) {
                const { ctx } = u;
                ctx.save();
                ctx.beginPath();
                ctx.arc(px, py, 5 * dpr, 0, Math.PI * 2);
                ctx.fillStyle = "#ff6a2b";
                ctx.fill();
                ctx.strokeStyle = bgColor;
                ctx.lineWidth = 1.75 * dpr;
                ctx.stroke();

                const xStr = formatCoord(pinX);
                const yStr = formatCoord(pinY);
                const labelText = pin.z !== undefined
                  ? `x=${xStr}  y=${yStr}  z=${formatCoord(pin.z)}`
                  : `x=${xStr}  y=${yStr}`;
                ctx.font = `500 ${10 * dpr}px "Geist Mono", ui-monospace, monospace`;
                const padX = 5 * dpr;
                const boxH = 16 * dpr;
                const boxW = ctx.measureText(labelText).width + padX * 2;
                const pLeft = u.bbox.left;
                const pTop = u.bbox.top;
                const pRight = pLeft + u.bbox.width;
                const pBottom = pTop + u.bbox.height;
                let bx = px + 8 * dpr;
                if (bx + boxW > pRight - 4 * dpr) bx = px - boxW - 8 * dpr;
                bx = Math.max(pLeft + 4 * dpr, Math.min(pRight - boxW - 4 * dpr, bx));
                let by = py - boxH - 6 * dpr;
                if (by < pTop + 4 * dpr) by = py + 8 * dpr;
                by = Math.max(pTop + 4 * dpr, Math.min(pBottom - boxH - 4 * dpr, by));
                ctx.fillStyle = dark ? "rgba(24, 24, 27, 0.9)" : "rgba(255, 255, 255, 0.92)";
                ctx.strokeStyle = "#ff6a2b";
                ctx.lineWidth = Math.max(1, dpr);
                ctx.beginPath();
                if (typeof ctx.roundRect === "function") ctx.roundRect(bx, by, boxW, boxH, 3 * dpr);
                else ctx.rect(bx, by, boxW, boxH);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = dark ? "#f4f4f5" : "#18181b";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(labelText, bx + padX, by + boxH / 2);
                ctx.restore();
              }
            }
          },
        ],
      },
    };
    const u = new uPlot(opts, data, el);
    plot.current = u;
    const observer = new ResizeObserver(() => u.setSize({ width: Math.max(1, el.clientWidth), height: Math.max(1, el.clientHeight) }));
    observer.observe(el);
    return () => {
      observer.disconnect();
      u.destroy();
      plot.current = null;
    };
  }, [shape]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pointer & wheel interaction handlers (Pan, Cursor A/B drag, Hover crosshair & snap, Wheel Zoom).
  const dragRef = useRef<null | {
    kind: "pan" | "cursor";
    i?: number;
    x0: number;
    y0: number;
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    y2min?: number;
    y2max?: number;
  }>(null);

  const clickStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const localPoint = (e: { clientX: number; clientY: number }) => {
    const u = plot.current!;
    const r = u.over.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  };

  const sampleAtPoint = (u: uPlot, p: { x: number; y: number }): HoverReadout | null => {
    const dataX = u.posToVal(p.x, "x");
    const dataY = u.posToVal(p.y, "y");
    if (!Number.isFinite(dataX) || !Number.isFinite(dataY)) return null;
    const y2 = hasY2 ? u.posToVal(p.y, "y2") : undefined;
    const xSpan = Math.abs((u.scales.x.max ?? 1) - (u.scales.x.min ?? 0)) || 1;
    const ySpan = Math.abs((u.scales.y.max ?? 1) - (u.scales.y.min ?? 0)) || 1;

    let snapX: number | undefined, snapY: number | undefined, z: number | undefined, label: string | undefined;
    let bestDist = 0.08;
    input.forEach((s, idx) => {
      if (hiddenSeriesRef.current.has(idx) || s.secondaryY) return;
      const hit = nearestSample(s.x, s.y, dataX, dataY, xSpan, ySpan);
      if (hit && hit.dist < bestDist) {
        bestDist = hit.dist;
        snapX = hit.x; snapY = hit.y; label = s.label || undefined;
      }
    });
    const layerHit = sampleLayersHover(layersRef.current, hiddenLayersRef.current, dataX, dataY, xSpan, ySpan);
    if (layerHit) {
      if (layerHit.z !== undefined) {
        z = layerHit.z; label = layerHit.label;
      } else if (layerHit.snap && (snapX === undefined)) {
        snapX = layerHit.x; snapY = layerHit.y; label = layerHit.label;
      }
    }
    return { dataX, dataY, y2, z, snapX, snapY, label };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    const u = plot.current;
    if (!interactive || !u || e.button !== 0 || e.ctrlKey || e.metaKey || !(e.target as Element).closest(".u-over")) return;
    const p = localPoint(e);
    const xmin = u.scales.x.min ?? 0, xmax = u.scales.x.max ?? 1;
    const ymin = u.scales.y.min ?? 0, ymax = u.scales.y.max ?? 1;
    const y2min = hasY2 ? (u.scales.y2?.min ?? 0) : undefined;
    const y2max = hasY2 ? (u.scales.y2?.max ?? 1) : undefined;
    const hitCursor = nearXCursor(u, cursorsRef.current, p.x);
    if (hitCursor >= 0) {
      clickStartRef.current = null;
      dragRef.current = { kind: "cursor", i: hitCursor, x0: p.x, y0: p.y, xmin, xmax, ymin, ymax };
    } else if (toolRef.current === "zoom") {
      clickStartRef.current = p.x >= 0 && p.y >= 0 && p.x <= p.w && p.y <= p.h
        ? { x: p.x, y: p.y, moved: false }
        : null;
      return; // uPlot's select box draws the zoom rectangle
    } else {
      clickStartRef.current = p.x >= 0 && p.y >= 0 && p.x <= p.w && p.y <= p.h
        ? { x: p.x, y: p.y, moved: false }
        : null;
      dragRef.current = { kind: "pan", x0: p.x, y0: p.y, xmin, xmax, ymin, ymax, y2min, y2max };
    }
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const u = plot.current;
    if (!interactive || !u) return;
    const d = dragRef.current;
    const over = u.over;
    if (!over) return;
    const r = over.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };

    if (clickStartRef.current && !clickStartRef.current.moved) {
      if (Math.hypot(p.x - clickStartRef.current.x, p.y - clickStartRef.current.y) > 4) {
        clickStartRef.current.moved = true;
      }
    }

    if (d?.kind === "pan" && (!clickStartRef.current || clickStartRef.current.moved)) {
      viewRef.current.x = panXRange(d.xmin, d.xmax, p.x - d.x0, p.w, { log: isLog(axes?.xscale), reverse: axes?.xreversed });
      viewRef.current.y = panYRange(d.ymin, d.ymax, p.y - d.y0, p.h, { log: isLog(axes?.yscale), reverse: axes?.yreversed });
      if (hasY2 && d.y2min !== undefined && d.y2max !== undefined) {
        viewRef.current.y2 = panYRange(d.y2min, d.y2max, p.y - d.y0, p.h, { log: isLog(axes?.y2scale), reverse: axes?.y2reversed });
      }
      u.redraw(true);
      emitView();
      return;
    }
    if (d?.kind === "cursor" && cursorsRef.current) {
      const next: [number, number] = [...cursorsRef.current];
      next[d.i!] = u.posToVal(p.x, "x");
      setCursors(next);
      u.redraw(false);
      return;
    }
    if (p.x < 0 || p.y < 0 || p.x > p.w || p.y > p.h) {
      if (hoverRef.current) { hoverRef.current = null; setHover(null); u.redraw(false); }
      return;
    }
    const nextHover = sampleAtPoint(u, p);
    hoverRef.current = nextHover;
    setHover(nextHover);
    u.redraw(false);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    dragRef.current = null;
    const cs = clickStartRef.current;
    clickStartRef.current = null;
    if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    }
    const u = plot.current;
    if (e.type !== "pointerup" || !interactive || !u || !cs || cs.moved) return;
    const p = localPoint(e);
    if (p.x < 0 || p.y < 0 || p.x > p.w || p.y > p.h) return;
    const nextPin = sampleAtPoint(u, p);
    if (!nextPin) return;
    pinnedRef.current = nextPin;
    setPinned(nextPin);
    hoverRef.current = nextPin;
    setHover(nextPin);
    u.redraw(false);
  };

  useEffect(() => {
    const el = host.current;
    if (!interactive || !el) return;
    const onWheel = (e: WheelEvent) => {
      const u = plot.current;
      if (!u) return;
      e.preventDefault();
      const p = localPoint(e);
      const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
      const [xmin, xmax] = [u.scales.x.min ?? 0, u.scales.x.max ?? 1];
      const [ymin, ymax] = [u.scales.y.min ?? 0, u.scales.y.max ?? 1];
      if (!e.shiftKey) {
        viewRef.current.x = zoomRangeAround(xmin, xmax, u.posToVal(p.x, "x"), factor, isLog(axes?.xscale));
      }
      if (!e.altKey) {
        viewRef.current.y = zoomRangeAround(ymin, ymax, u.posToVal(p.y, "y"), factor, isLog(axes?.yscale));
        if (hasY2) {
          const [y2min, y2max] = [u.scales.y2?.min ?? 0, u.scales.y2?.max ?? 1];
          viewRef.current.y2 = zoomRangeAround(y2min, y2max, u.posToVal(p.y, "y2"), factor, isLog(axes?.y2scale));
        }
      }
      u.redraw(true);
      emitView();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive, axes?.xscale, axes?.yscale, axes?.y2scale, hasY2]);

  const toggleCursors = () => {
    const u = plot.current;
    if (cursors || !u) {
      setCursors(null);
      cursorsRef.current = null;
      u?.redraw(false);
      return;
    }
    const a = u.scales.x.min ?? 0, b = u.scales.x.max ?? 1;
    const next: [number, number] = [a + (b - a) / 3, a + (2 * (b - a)) / 3];
    setCursors(next);
    cursorsRef.current = next;
    u.redraw(false);
  };

  const toggleGrid = () => {
    const next = !gridVisible;
    setGridVisible(next);
    gridVisibleRef.current = next;
    plot.current?.redraw(false);
    emitView(next);
  };

  const toggleVisibility = (key: string, seriesIdx?: number) => {
    setHiddenSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      const u = plot.current;
      if (u && seriesIdx !== undefined && seriesIdx < input.length) {
        u.setSeries(seriesIdx + 1, { show: !next.has(key) });
      }
      if (seriesIdx === undefined && key.startsWith("l:")) {
        const li = Number(key.slice(2));
        const nextLayers = new Set(hiddenLayersRef.current);
        if (next.has(key)) nextLayers.add(li); else nextLayers.delete(li);
        hiddenLayersRef.current = nextLayers;
      } else if (key.startsWith("lbl:")) {
        const lbl = key.slice(4);
        const nextLayers = new Set(hiddenLayersRef.current);
        layersRef.current.forEach((l, li) => {
          if (l.label === lbl) { if (next.has(key)) nextLayers.add(li); else nextLayers.delete(li); }
        });
        hiddenLayersRef.current = nextLayers;
      }
      u?.redraw(false);
      return next;
    });
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (!interactive) return;
    const k = e.key.toLowerCase();
    if (k === "z") setTool((t) => (t === "zoom" ? "pan" : "zoom"));
    else if (k === "c") toggleCursors();
    else if (k === "g") toggleGrid();
    else if (k === "a" || e.key === "Home") resetHome();
    else if (e.key === "Escape") {
      if (tool === "zoom") setTool("pan");
      else if (pinnedRef.current) { setPinned(null); pinnedRef.current = null; plot.current?.redraw(false); }
      else return;
    }
    else return;
    e.preventDefault();
  };

  // Build A/B cursor delta readout values across native series and generalized layers.
  const cursorSamples = useMemo(() => {
    if (!cursors) return [];
    const [xA, xB] = cursors;
    const fromSeries = input.map((s, idx) => ({
      label: s.label || `y${idx + 1}`,
      color: resolveColor(s.color, MATLAB_COLORS[idx % MATLAB_COLORS.length]),
      hidden: hiddenSet.has(`s:${idx}`),
      yA: sampleSeriesAtX(s.x, s.y, xA),
      yB: sampleSeriesAtX(s.x, s.y, xB),
    })).filter((s) => !s.hidden);
    const fromLayers = sampleLayersAtX(layers, hiddenLayers, xA, xB);
    return [...fromSeries, ...fromLayers].slice(0, 4);
  }, [cursors, input, layers, hiddenSet, hiddenLayers]);

  return (
    <div
      className={`pb-plot2d${className ? ` ${className}` : ""}`}
      style={{ background: bgColor, color: ink }}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={onKeyDown}
    >
      {titleText ? (
        <TexText as="div" className="pb-plot2d-title" text={titleText} interpreter={axes?.title?.interpreter ?? interpreter} />
      ) : null}
      {subtitleText ? (
        <TexText as="div" className="pb-plot2d-xlabel" text={subtitleText} interpreter={axes?.subtitle?.interpreter ?? interpreter} />
      ) : null}
      <div className="pb-plot2d-main">
        {axes?.ylabel?.text && axes?.axis !== "off" && axes?.ySide !== "right" ? (
          <TexText as="div" className="pb-plot2d-ylabel" text={axes.ylabel.text} interpreter={axes.ylabel.interpreter ?? interpreter} />
        ) : null}
        <div
          className={`pb-plot2d-plot${tool === "zoom" ? " tool-zoom" : ""}`}
          ref={host}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => {
            if (hoverRef.current) { hoverRef.current = null; setHover(null); plot.current?.redraw(false); }
          }}
        />
        {axes?.ylabel?.text && axes?.axis !== "off" && axes?.ySide === "right" ? (
          <TexText as="div" className="pb-plot2d-ylabel2" text={axes.ylabel.text} interpreter={axes.ylabel.interpreter ?? interpreter} />
        ) : null}
        {axes?.ylabel2?.text && axes?.axis !== "off" ? (
          <TexText as="div" className="pb-plot2d-ylabel2" text={axes.ylabel2.text} interpreter={axes.ylabel2.interpreter ?? interpreter} />
        ) : null}
        {showLegend ? (
          <div className={`pb-plot2d-legend ${legendAt}${interactive ? " interactive" : ""}`} role="list">
            {legendEntries?.length
              ? legendEntries.map((entry, idx) => {
                  const k = `lbl:${entry.label}`;
                  return (
                  <button
                    key={idx}
                    type="button"
                    role="listitem"
                    className={`pb-plot2d-legend-btn${hiddenSet.has(k) ? " off" : ""}`}
                    onClick={() => toggleVisibility(k)}
                  >
                    <svg width="20" height="10" aria-hidden>
                      {entry.patch ? (
                        <rect x="2" y="2" width="16" height="6" fill={entry.patch.color} stroke={entry.patch.strokecolor} />
                      ) : null}
                      {entry.line ? (
                        <line
                          x1="1" y1="5" x2="19" y2="5"
                          stroke={entry.line.color}
                          strokeWidth={Math.max(1, entry.line.linewidth ?? 1.5)}
                          strokeDasharray={dashOf(entry.line.linestyle, 1).join(" ") || undefined}
                        />
                      ) : null}
                      {entry.marker ? (
                        <circle cx="10" cy="5" r="2.6" fill={entry.marker.color} stroke={entry.marker.strokecolor ?? entry.marker.color} />
                      ) : null}
                    </svg>
                    <TexText text={entry.label} interpreter={axes?.legend?.interpreter ?? interpreter} />
                  </button>
                  );
                })
              : [
                  ...input.map((s, idx) => (s.label ? { key: `s:${idx}`, sIdx: idx, label: s.label, color: resolveColor(s.color, MATLAB_COLORS[idx % MATLAB_COLORS.length]), scatter: s.mode === "scatter", lw: s.lineWidth, ls: s.lineStyle, marker: s.marker, filled: s.filled } : null)),
                  ...layers.map((l, idx) => (l.label ? { key: `l:${idx}`, sIdx: undefined, label: l.label, color: ("color" in l && typeof l.color === "string" ? l.color : MATLAB_COLORS[idx % MATLAB_COLORS.length]), scatter: l.kind === "scatter", lw: ("linewidth" in l ? l.linewidth : 1.5), ls: ("linestyle" in l ? l.linestyle : "solid"), marker: ("marker" in l ? l.marker : undefined), filled: true } : null)),
                ]
                  .filter((item): item is NonNullable<typeof item> => item !== null)
                  .map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        role="listitem"
                        className={`pb-plot2d-legend-btn${hiddenSet.has(item.key) ? " off" : ""}`}
                        onClick={() => toggleVisibility(item.key, item.sIdx)}
                      >
                        <svg width="22" height="10" aria-hidden>
                          {!item.scatter && (
                            <line
                              x1="1" y1="5" x2="21" y2="5"
                              stroke={item.color}
                              strokeWidth={Math.max(1, (item.lw ?? 0.5) * PT)}
                              strokeDasharray={dashOf(item.ls, 1).join(" ") || undefined}
                            />
                          )}
                          {item.marker && <circle cx="11" cy="5" r="2.6" fill={item.scatter && item.filled !== false ? item.color : "#fff"} stroke={item.color} />}
                        </svg>
                        <TexText text={item.label} interpreter={axes?.legend?.interpreter ?? interpreter} />
                      </button>
                    ))}
          </div>
        ) : null}
      </div>
      {axes?.xlabel?.text && axes?.axis !== "off" ? (
        <TexText as="div" className="pb-plot2d-xlabel" text={axes.xlabel.text} interpreter={axes.xlabel.interpreter ?? interpreter} />
      ) : null}
      {interactive && (
        <div className="pb-plot2d-foot">
          <div className="pb-plot2d-tools" onPointerDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`pb-plot2d-btn${tool === "pan" ? " on" : ""}`}
              title="Pan (drag)"
              onClick={() => setTool("pan")}
            >
              pan
            </button>
            <button
              type="button"
              className={`pb-plot2d-btn${tool === "zoom" ? " on" : ""}`}
              title="Box Zoom (drag rectangle, or Ctrl+drag) [Z]"
              onClick={() => setTool((t) => (t === "zoom" ? "pan" : "zoom"))}
            >
              zoom
            </button>
            <button
              type="button"
              className={`pb-plot2d-btn${cursors ? " on" : ""}`}
              title="Dual measurement cursors A / B [C]"
              onClick={toggleCursors}
            >
              A/B
            </button>
            <button
              type="button"
              className={`pb-plot2d-btn${gridVisible ? " on" : ""}`}
              title="Toggle grid [G]"
              onClick={toggleGrid}
            >
              grid
            </button>
            <button
              type="button"
              className={`pb-plot2d-btn${!atHome ? " home-dirty" : ""}`}
              title="Reset to scripted view (double-click) [A]"
              aria-label="Home view"
              onClick={resetHome}
            >
              ⌂
            </button>
          </div>
          <div className={`pb-plot2d-readout${cursors ? " cursors" : ""}${pinned ? " pinned" : ""}`}>
            {cursors ? (
              <>
                <span>A x={formatCoord(cursors[0])}</span>
                <span>B x={formatCoord(cursors[1])}</span>
                <span>Δx={formatCoord(cursors[1] - cursors[0])}</span>
                {Math.abs(cursors[1] - cursors[0]) > 1e-12 && (
                  <span>1/Δx={formatCoord(1 / (cursors[1] - cursors[0]))}</span>
                )}
                {cursorSamples.map((s, i) => (
                  <span key={i} className="chip">
                    <i className="swatch" style={{ background: s.color }} />
                    {s.label}: {s.yA !== null && s.yB !== null ? `${formatCoord(s.yA)} → ${formatCoord(s.yB)} (Δ ${s.yB - s.yA >= 0 ? "+" : ""}${formatCoord(s.yB - s.yA)})` : "–"}
                  </span>
                ))}
              </>
            ) : (pinned || hover) ? (() => {
              const r = pinned ?? hover!;
              return (
                <>
                  {pinned ? <i className="pb-plot2d-pin-dot" aria-hidden /> : null}
                  {r.label ? <b>{r.label}</b> : null}
                  <span>x={formatCoord(r.snapX ?? r.dataX)}</span>
                  <span>y={formatCoord(r.snapY ?? r.dataY)}</span>
                  {r.y2 !== undefined && <span>y2={formatCoord(r.y2)}</span>}
                  {r.z !== undefined && <span>z={formatCoord(r.z)}</span>}
                  {pinned ? (
                    <button
                      type="button"
                      className="pb-plot2d-pin-clear"
                      title="Clear pinned point [Esc]"
                      aria-label="Clear pinned point"
                      onClick={() => { setPinned(null); pinnedRef.current = null; plot.current?.redraw(false); }}
                    >
                      ×
                    </button>
                  ) : null}
                </>
              );
            })() : (
              <span className="pb-plot2d-help-tag" aria-label="Plot controls help">?</span>
            )}
          </div>
          <div className="pb-plot2d-help" role="note">
            drag pan · wheel zoom · ctrl+drag box · click pin · dblclick home
          </div>
        </div>
      )}
    </div>
  );
}
