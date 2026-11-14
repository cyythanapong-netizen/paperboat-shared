// The TOML the Studios' config file needs, and no more: [tables] and [dotted.tables], bare keys,
// and strings ("basic" or 'literal'), numbers and true/false. Anything else is an error naming its
// line, so a hand edit that goes past the subset is told so instead of being half read.
// patchToml rewrites single values in place, keeping the user's comments and layout.

export type TomlValue = string | number | boolean;
export type TomlTable = { [key: string]: TomlValue | TomlTable };

const BARE = /^[A-Za-z0-9_-]+$/;
const NUMBER = /^[+-]?\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d+)?$/;
const ESCAPES: Record<string, string> = { b: "\b", t: "\t", n: "\n", f: "\f", r: "\r", '"': '"', "\\": "\\" };

/** The value at the start of `s`, and where it ends. Throws on anything outside the subset. */
function value(s: string): [TomlValue, number] {
  if (s[0] === "'") {
    const end = s.indexOf("'", 1);
    if (end < 0) throw new Error("unclosed string");
    return [s.slice(1, end), end + 1];
  }
  if (s[0] === '"') {
    let out = "";
    for (let i = 1; i < s.length; i++) {
      const c = s[i];
      if (c === '"') return [out, i + 1];
      if (c !== "\\") { out += c; continue; }
      const e = s[++i];
      if (e === "u" || e === "U") {
        const n = e === "u" ? 4 : 8;
        const hex = s.slice(i + 1, i + 1 + n);
        if (!/^[0-9A-Fa-f]+$/.test(hex) || hex.length !== n) throw new Error("bad \\u escape");
        out += String.fromCodePoint(parseInt(hex, 16));
        i += n;
      } else if (e in ESCAPES) out += ESCAPES[e];
      else throw new Error(`bad escape \\${e ?? ""}`);
    }
    throw new Error("unclosed string");
  }
  const token = /^[^\s#]*/.exec(s)![0];
  if (token === "true" || token === "false") return [token === "true", token.length];
  if (NUMBER.test(token)) return [Number(token.replace(/_/g, "")), token.length];
  throw new Error(token ? `unsupported value ${token}: use a "string", a number or true/false` : "missing value");
}

const restIsComment = (s: string) => /^\s*(#.*)?$/.test(s);

/** The table of `text`; throws `line N: …` on the first thing outside the subset. */
export function parseToml(text: string): TomlTable {
  const root: TomlTable = {};
  let table = root;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    try {
      if (!line || line.startsWith("#")) return;
      if (line.startsWith("[[")) throw new Error("arrays of tables are not supported");
      const head = /^\[([^\]]*)\]\s*(#.*)?$/.exec(line);
      if (head) {
        table = root;
        for (const part of head[1].split(".").map((p) => p.trim())) {
          if (!BARE.test(part)) throw new Error(`bad table name [${head[1]}]`);
          const next = table[part] ?? (table[part] = {});
          if (typeof next !== "object") throw new Error(`${part} is already a value`);
          table = next;
        }
        return;
      }
      const kv = /^([A-Za-z0-9_-]+)\s*=\s*(.*)$/.exec(line);
      if (!kv) throw new Error("expected key = value or [table]");
      const [v, end] = value(kv[2]);
      if (!restIsComment(kv[2].slice(end))) throw new Error(`unexpected ${kv[2].slice(end).trim()}`);
      if (kv[1] in table) throw new Error(`${kv[1]} is set twice`);
      table[kv[1]] = v;
    } catch (e) {
      throw new Error(`line ${i + 1}: ${(e as Error).message}`);
    }
  });
  return root;
}

export const formatToml = (v: TomlValue) => (typeof v === "string" ? JSON.stringify(v) : String(v));

/** `text` with each of `values` set in `[table]`: in place where the key is, else added to the table (made if missing). */
export function patchToml(text: string, table: string, values: Record<string, TomlValue>): string {
  const lines = text.split("\n");
  const isHead = (l: string) => /^\s*\[/.test(l);
  let head = lines.findIndex((l) => new RegExp(`^\\s*\\[\\s*${table.replace(/\./g, "\\s*\\.\\s*")}\\s*\\]`).test(l));
  if (head < 0) {
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    lines.push(...(lines.length ? [""] : []), `[${table}]`, "");
    head = lines.length - 2;
  }
  let end = lines.findIndex((l, i) => i > head && isHead(l));
  if (end < 0) end = lines.length;
  for (const [key, v] of Object.entries(values)) {
    const at = lines.findIndex((l, i) => i > head && i < end && new RegExp(`^\\s*${key}\\s*=`).test(l));
    if (at >= 0) {
      const m = /^(\s*[A-Za-z0-9_-]+\s*=\s*)(.*)$/.exec(lines[at])!;
      let tail = "";
      try { tail = m[2].slice(value(m[2])[1]); } catch { /* an unreadable value is replaced whole */ }
      lines[at] = m[1] + formatToml(v) + tail;
    } else {
      let last = end - 1;
      while (last > head && lines[last].trim() === "") last--;
      lines.splice(last + 1, 0, `${key} = ${formatToml(v)}`);
      end++;
    }
  }
  return lines.join("\n");
}
