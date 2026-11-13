// MATLAB text conversion, without React: the `tex` interpreter's subscripts, superscripts and
// Greek commands, and the `latex` interpreter's `$…$` maths. TexText renders these parts.
import katex from "katex";

export type Interpreter = "tex" | "latex" | "none";

const TEX = /[\\_^{}]/;
const MATH = /[\\_^]/;

const escapeText = (s: string) =>
  s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");

/** Read `{…}` with nesting, starting at `i` (which must be `{`); returns the group and its end. */
function group(s: string, i: number): [string, number] {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}" && --depth === 0) return [s.slice(i, j + 1), j + 1];
  }
  return [s.slice(i), s.length];
}

/** Read the argument after a command: a group, a bracket group or one character/command. */
function argument(s: string, i: number): [string, number] {
  if (s[i] === "{") return group(s, i);
  if (s[i] === "[") {
    const end = s.indexOf("]", i);
    return end < 0 ? [s.slice(i), s.length] : [s.slice(i, end + 1), end + 1];
  }
  if (s[i] === "\\") {
    let j = i + 1;
    while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
    return [s.slice(i, j || i + 1), Math.max(j, i + 1)];
  }
  return [s[i] ?? "", i + 1];
}

/**
 * MATLAB's `tex` interpreter as KaTeX maths. Words become `\text{…}` so they keep the axes
 * font; commands, scripts and groups stay maths. `{\bf bold}` becomes `\mathbf{bold}`.
 */
export function texToMath(source: string): string {
  const styleCommand = (style: string) => (style === "bf" ? "mathbf" : style === "rm" ? "mathrm" : "mathit");
  let s = source
    .replace(/\\fontname\s*\{[^}]*\}/g, "")
    .replace(/\{\\(bf|it|rm|sl)\s+([^{}]*)\}/g, (_m, style: string, body: string) => `\\${styleCommand(style)}{${body}}`)
    .replace(/\\(bf|it|rm|sl)\s*\{([^{}]*)\}/g, (_m, style: string, body: string) => `\\${styleCommand(style)}{${body}}`);
  let out = "";
  let plain = "";
  const flush = () => {
    if (!plain) return;
    out += `\\text{${escapeText(plain)}}`;
    plain = "";
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      flush();
      let j = i + 1;
      if (j < s.length && /[A-Za-z]/.test(s[j])) {
        while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
        const name = s.slice(i + 1, j);
        // \frac, \sqrt, \color, \overline and friends take one or two arguments.
        const takes = /^(frac|dfrac|tfrac|binom|sqrt|color|textcolor|overline|underline|hat|bar|vec|dot|ddot|tilde|mathrm|mathbf|mathit|operatorname)$/.test(name) ? 3 : 1;
        let token = `\\${name}`;
        for (let n = 0; n < takes && (s[j] === "{" || s[j] === "["); n++) {
          const [arg, end] = argument(s, j);
          token += arg;
          j = end;
        }
        out += token;
        i = j;
        continue;
      }
      // \, \; \! \\ and the other symbol commands.
      out += s.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (c === "_" || c === "^") {
      flush();
      out += c;
      const [arg, end] = argument(s, i + 1);
      out += arg;
      i = end;
      continue;
    }
    if (c === "{" || c === "}") {
      flush();
      out += c;
      i++;
      continue;
    }
    plain += c;
    i++;
  }
  flush();
  return out;
}

/** `latex`: split `$…$` from prose. Without dollars, a maths-looking string is maths. */
function latexParts(source: string): Array<{ text: string; math: boolean }> {
  const parts: Array<{ text: string; math: boolean }> = [];
  let rest = source;
  while (rest) {
    const open = rest.indexOf("$");
    if (open < 0) break;
    const close = rest.indexOf("$", open + 1);
    if (close < 0) break;
    if (open > 0) parts.push({ text: rest.slice(0, open), math: false });
    parts.push({ text: rest.slice(open + 1, close), math: true });
    rest = rest.slice(close + 1);
  }
  if (rest) parts.push({ text: rest, math: false });
  return parts;
}

const katexHtml = (math: string) => {
  try {
    return katex.renderToString(math, {
      throwOnError: false,
      strict: false,
      output: "html",
      trust: false,
      errorColor: "#cc0000",
    });
  } catch {
    return "";
  }
};

/** The parts of a MATLAB string, each either plain or KaTeX HTML. */
export function texParts(text: string, interpreter: Interpreter = "tex"): Array<{ text: string; html?: string }> {
  if (!text) return [];
  if (interpreter === "none") return [{ text }];
  if (interpreter === "latex") {
    const parts = latexParts(text);
    if (parts.some((p) => p.math)) return parts.map((p) => (p.math ? { text: p.text, html: katexHtml(p.text) } : { text: p.text }));
    return MATH.test(text) ? [{ text, html: katexHtml(texToMath(text)) }] : [{ text }];
  }
  return TEX.test(text) ? [{ text, html: katexHtml(texToMath(text)) }] : [{ text }];
}
