// Axis ticks the way MATLAB chooses them: 1, 2 or 5 times a power of ten, about `count` of them.
export function niceTicks(min: number, max: number, count = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const raw = (hi - lo) / Math.max(1, count - 1);
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  const step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
  const first = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = first; v <= hi + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12)));
  }
  return out;
}

/** A compact MATLAB-like tick label. */
export function formatTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e5 || abs < 1e-3)) {
    const exp = Math.floor(Math.log10(abs));
    return `${Number((value / 10 ** exp).toPrecision(4))}e${exp >= 0 ? "+" : ""}${exp}`;
  }
  return String(Number(value.toPrecision(6)));
}
