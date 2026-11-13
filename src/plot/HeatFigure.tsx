// `imagesc` as a MATLAB figure: the field on white paper, ticks on both axes, an optional grid
// and a colour bar. The field itself is the shared Heatmap canvas; this adds the axes chrome.
import { useMemo } from "react";
import "./plot.css";
import { Heatmap } from "./Heatmap.tsx";
import { colormapCss } from "./colormaps.ts";
import { formatTick, niceTicks } from "./ticks.ts";
import { TexText, type Interpreter } from "./TexText.tsx";
import type { PlotText } from "./Plot2D.tsx";

export type HeatFigureProps = {
  values: readonly (readonly number[])[];
  /** The x/y centres, as `imagesc(x, y, C)` gives them; 1..n when omitted. */
  x?: number[];
  y?: number[];
  range?: [number, number];
  colormap?: string | readonly (readonly number[])[];
  title?: PlotText;
  xlabel?: PlotText;
  ylabel?: PlotText;
  interpreter?: Interpreter;
  colorbar?: boolean;
  grid?: boolean;
  box?: boolean;
  axis?: string;
};

export function HeatFigure({ values, x, y, range, colormap, title, xlabel, ylabel, interpreter = "tex", colorbar = false, grid = false, box = true, axis = "on" }: HeatFigureProps) {
  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  const xs = x?.length ? x : Array.from({ length: cols }, (_, i) => i + 1);
  const ys = y?.length ? y : Array.from({ length: rows }, (_, j) => j + 1);
  const x0 = xs[0], x1 = xs[xs.length - 1] ?? x0 + 1;
  const y0 = ys[0], y1 = ys[ys.length - 1] ?? y0 + 1;
  const xTicks = useMemo(() => niceTicks(Math.min(x0, x1), Math.max(x0, x1), 6), [x0, x1]);
  const yTicks = useMemo(() => niceTicks(Math.min(y0, y1), Math.max(y0, y1), 6), [y0, y1]);
  const domain = useMemo<[number, number]>(() => {
    if (range && range[1] > range[0]) return range;
    let lo = Infinity, hi = -Infinity;
    for (const row of values) for (const v of row) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1];
    return lo === hi ? [lo, lo + 1] : [lo, hi];
  }, [values, range]);
  const cTicks = useMemo(() => niceTicks(domain[0], domain[1], 5), [domain]);
  const fracX = (v: number) => (x1 === x0 ? 0.5 : (v - Math.min(x0, x1)) / Math.abs(x1 - x0));
  const fracY = (v: number) => (y1 === y0 ? 0.5 : (v - Math.min(y0, y1)) / Math.abs(y1 - y0));
  const axisOff = axis === "off";

  return (
    <div className="pb-heatfigure">
      {title?.text ? <TexText as="div" className="pb-plot2d-title" text={title.text} interpreter={title.interpreter ?? interpreter} /> : null}
      <div className="pb-plot2d-main">
        {ylabel?.text && !axisOff ? <TexText as="div" className="pb-plot2d-ylabel" text={ylabel.text} interpreter={ylabel.interpreter ?? interpreter} /> : null}
        <div className={`pb-heatfigure-plot${colorbar ? " with-colorbar" : ""}`}>
          <div className={`pb-heatfigure-canvas${box && !axisOff ? " box" : ""}`}>
            <Heatmap values={values} range={domain} colormap={colormap} />
            {grid && xTicks.map((v) => (
              <span key={`gx${v}`} className="pb-heatfigure-grid x" style={{ left: `${fracX(v) * 100}%` }} />
            ))}
            {grid && yTicks.map((v) => (
              <span key={`gy${v}`} className="pb-heatfigure-grid y" style={{ top: `${fracY(v) * 100}%` }} />
            ))}
          </div>
          {!axisOff && xTicks.map((v) => (
            <span key={`x${v}`} className="pb-heatfigure-xtick" style={{ left: `${fracX(v) * 100}%` }}>{formatTick(v)}</span>
          ))}
          {!axisOff && yTicks.map((v) => (
            <span key={`y${v}`} className="pb-heatfigure-ytick" style={{ top: `${fracY(v) * 100}%` }}>{formatTick(v)}</span>
          ))}
          {colorbar ? (
            <div className="pb-heatfigure-colorbar" aria-label="colour bar">
              <span className="pb-heatfigure-gradient" style={{ background: colormapCss(colormap) }} />
              {cTicks.map((v) => (
                <span key={`c${v}`} className="pb-heatfigure-ctick" style={{ top: `${(1 - (v - domain[0]) / (domain[1] - domain[0])) * 100}%` }}>{formatTick(v)}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {xlabel?.text && !axisOff ? <TexText as="div" className="pb-plot2d-xlabel" text={xlabel.text} interpreter={xlabel.interpreter ?? interpreter} /> : null}
    </div>
  );
}
