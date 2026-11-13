// A MATLAB / SqueroPlot colour bar: vertical or horizontal gradient with ticks and label.
import "./plot.css";
import { colormapCss } from "./colormaps.ts";
import { formatTick, niceTicks } from "./ticks.ts";
import { TexText, type Interpreter } from "./TexText.tsx";

export type ColorbarProps = {
  range: [number, number];
  colormap?: string | readonly (readonly number[])[];
  ticks?: number[];
  ticklabels?: readonly string[];
  label?: string;
  vertical?: boolean;
  interpreter?: Interpreter;
};

export function Colorbar({ range, colormap, ticks, ticklabels, label, vertical = true, interpreter = "tex" }: ColorbarProps) {
  const [lo, hi] = range[1] > range[0] ? range : [range[0], range[0] + 1];
  const values = ticks?.length ? ticks : niceTicks(lo, hi, 5);
  const tickStrings = values.map((v, idx) => ticklabels?.[idx] ?? formatTick(v));
  const maxTickChars = tickStrings.reduce((m, s) => Math.max(m, s.length), 1);
  const plainLabel = label ? label.replace(/[$\\{}^_]/g, "") : "";
  const autoWidth = vertical
    ? Math.max(26, Math.min(72, Math.max(15 + Math.ceil(maxTickChars * 5.4) + 2, Math.ceil(plainLabel.length * 5.4) + 3)))
    : undefined;
  const bg = colormapCss(colormap);
  const gradient = vertical ? bg : bg.replace("to top,", "to right,");
  return (
    <div
      className={`pb-colorbar${vertical ? "" : " horiz"}`}
      style={autoWidth !== undefined ? { width: `${autoWidth}px` } : undefined}
      aria-label={label ?? "colour bar"}
    >
      {label ? <TexText className="pb-colorbar-label" text={label} interpreter={interpreter} /> : null}
      <span className="pb-colorbar-gradient" style={{ background: gradient }} />
      {values.map((value, idx) => {
        const frac = (value - lo) / (hi - lo);
        const pos = vertical ? { top: `${(1 - frac) * 100}%` } : { left: `${frac * 100}%` };
        return (
          <span key={`${idx}-${value}`} className="pb-colorbar-tick" style={pos}>
            {tickStrings[idx]}
          </span>
        );
      })}
    </div>
  );
}
