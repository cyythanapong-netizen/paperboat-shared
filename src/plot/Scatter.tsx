// A shared scatter plot on the Scope's uPlot backend: x/y points, the same axes and grid, no
// line. It lives here so a Studio never draws its own chart canvas.
import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "./plot.css";

export type ScatterProps = {
  points: readonly (readonly [number, number])[];
  color?: string;
};

export function Scatter({ points, color = "var(--signal, #ff5a1f)" }: ScatterProps) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const css = getComputedStyle(el);
    const ink = css.getPropertyValue("--text-on-screen-muted").trim() || "#8a8a84";
    const font = `11px ${css.getPropertyValue("--font-mono").trim() || "monospace"}`;
    const grid = { stroke: css.getPropertyValue("--grid-line").trim() || "#333", width: 1, dash: [2, 4] };
    const axis = { stroke: ink, font, grid, ticks: { show: false } };
    const plot = new uPlot({
      width: el.clientWidth || 320,
      height: el.clientHeight || 200,
      legend: { show: false },
      padding: [8, 14, 0, 0],
      scales: { x: { time: false }, y: { time: false } },
      axes: [axis, axis],
      series: [
        {},
        { stroke: color, width: 0, paths: () => null, points: { show: true, size: 4, width: 0, fill: color, stroke: color } },
      ],
      cursor: { show: false },
    }, [points.map(([x]) => x), points.map(([, y]) => y)], el);
    const observer = new ResizeObserver(() => plot.setSize({ width: el.clientWidth, height: el.clientHeight }));
    observer.observe(el);
    return () => { observer.disconnect(); plot.destroy(); };
  }, [points, color]);

  return <div className="pb-scatter" ref={host} aria-label="scatter plot" />;
}
