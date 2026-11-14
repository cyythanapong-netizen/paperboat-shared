// Coefficients as a polynomial, for a block's caption or icon text (`{den:poly}`): "1 2 1" in s is
// "s² + 2s + 1". Highest power first, as a transfer function's num and den are written.
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => (n === 1 ? "" : String(n).replace(/\d/g, (d) => SUP[+d]));
const num = (v: number) => String(+v.toFixed(4));

/** `text` (numbers split by spaces or commas) as a polynomial in `x`; the text itself when it isn't numbers. */
export function polynomial(text: string, x = "s"): string {
  const cs = text.trim().split(/[\s,]+/).map(Number);
  if (!text.trim() || cs.some((c) => !Number.isFinite(c))) return text;
  const terms: string[] = [];
  cs.forEach((c, i) => {
    const power = cs.length - 1 - i;
    if (c === 0) return;
    const mag = Math.abs(c);
    const coeff = power > 0 && mag === 1 ? "" : num(mag);
    const term = power === 0 ? num(mag) : `${coeff}${x}${sup(power)}`;
    terms.push(terms.length ? `${c < 0 ? "−" : "+"} ${term}` : `${c < 0 ? "−" : ""}${term}`);
  });
  return terms.length ? terms.join(" ") : "0";
}
