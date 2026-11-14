import assert from "node:assert/strict";
import { test } from "node:test";
import { parseToml, patchToml } from "../src/toml.ts";

const file = `# settings
[editor]
theme = "ink"  # a # in a comment
font_size = 12
wrap = true

[themes.mine]
base = 'ink'
keyword = "#ff9e64" # orange
`;

test("parses the subset: tables, dotted tables, strings with #, numbers, booleans", () => {
  assert.deepEqual(parseToml(file), {
    editor: { theme: "ink", font_size: 12, wrap: true },
    themes: { mine: { base: "ink", keyword: "#ff9e64" } },
  });
  assert.deepEqual(parseToml('a = "q\\"\\u00e9" \nb = -1_000.5e1'), { a: 'q"é', b: -10005 });
});

test("names the line of anything outside the subset", () => {
  assert.throws(() => parseToml("[editor]\nfonts = [1, 2]"), /line 2: unsupported value \[1,/);
  assert.throws(() => parseToml('a = "open'), /line 1: unclosed string/);
  assert.throws(() => parseToml("a = 1\na = 2"), /line 2: a is set twice/);
  assert.throws(() => parseToml("a = 1 2"), /line 1: unexpected 2/);
});

test("patches values in place, keeping comments, and adds missing keys and tables", () => {
  const out = patchToml(file, "editor", { theme: "paper", lint: false });
  assert.match(out, /^theme = "paper"  # a # in a comment$/m);
  assert.match(out, /^wrap = true\nlint = false\n\n\[themes\.mine\]/m);
  assert.deepEqual(parseToml(patchToml("", "editor", { wrap: false })), { editor: { wrap: false } });
  assert.match(patchToml("x = 1\n", "editor", { wrap: false }), /^x = 1\n\n\[editor\]\nwrap = false\n$/);
});
