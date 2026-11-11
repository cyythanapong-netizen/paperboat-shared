// A sparkline: a small, axis-free trace for a card, a gutter or a glance. The Scope is the
// full instrument; this is the shared minimum every app can draw without pulling uPlot.
export type SparklineProps = {
  values: readonly number[];
  width?: number;
  height?: number;
  color?: string;
  /** Draw a faint fill under the line. */
  fill?: boolean;
  className?: string;
  label?: string;
};

export function Sparkline({ values, width = 120, height = 32, color = "var(--signal)", fill = false, className, label }: SparklineProps) {
  if (values.length === 0) return <svg className={className} width={width} height={height} role="img" aria-label={label ?? "sparkline"} />;
  let lo = Infinity, hi = -Infinity;
  for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1;
  const pad = 1;
  const points = values.map((v, i) => {
    const x = pad + (i / Math.max(1, values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - lo) / span) * (height - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return (
    <svg className={className} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? "sparkline"}>
      {fill && <polygon points={`${pad},${height - pad} ${points} ${width - pad},${height - pad}`} fill={color} opacity={0.14} />}
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
