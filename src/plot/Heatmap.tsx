// The shared heatmap: `imagesc`/`imshow` values as a viridis field, drawn on the app's screen.
// It is a shared plot primitive so a Studio never carries its own chart renderer.
import { useEffect, useMemo, useRef } from "react";
import "./plot.css";
import { sampleColormap } from "./colormaps.ts";

export type HeatmapProps = {
  /** Row-major values; the first row is the top of the image. */
  values: readonly (readonly number[])[];
  /** The colour domain; the data's min/max when omitted. */
  range?: readonly [number, number];
  /** A MATLAB colour map name (parula, jet, hot, gray, …) or an n × 3 matrix; viridis when omitted. */
  colormap?: string | readonly (readonly number[])[];
};

const viridis = (t: number) => `hsl(${250 - t * 190}, ${60 + t * 20}%, ${20 + t * 45}%)`;

export function Heatmap({ values, range, colormap }: HeatmapProps) {
  const host = useRef<HTMLCanvasElement>(null);
  const domain = useMemo<[number, number]>(() => {
    if (range) return [range[0], range[1]];
    let lo = Infinity, hi = -Infinity;
    for (const row of values) for (const v of row) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1];
    return lo === hi ? [lo, lo + 1] : [lo, hi];
  }, [values, range]);

  useEffect(() => {
    const canvas = host.current;
    if (!canvas) return;
    const draw = () => {
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (width < 1 || height < 1) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const g = canvas.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rows = values.length;
      const cols = values[0]?.length ?? 0;
      if (!rows || !cols) return;
      const [lo, hi] = domain;
      const span = hi - lo || 1;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const t = Math.min(1, Math.max(0, (values[j][i] - lo) / span));
          g.fillStyle = colormap ? `rgb(${sampleColormap(colormap, t).map(Math.round).join(" ")})` : viridis(t);
          g.fillRect((i * width) / cols, (j * height) / rows, width / cols + 1, height / rows + 1);
        }
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [values, domain, colormap]);

  return <canvas ref={host} className="pb-heatmap" aria-label="heatmap" />;
}
