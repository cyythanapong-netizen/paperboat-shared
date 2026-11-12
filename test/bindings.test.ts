import assert from "node:assert/strict";
import { test } from "node:test";
import { fits, inlineLive, matrixLiteral } from "../src/bindings.ts";
import type { ParamDef, Variable } from "../src/protocol.ts";

test("matrixLiteral turns JSON rows into MATLAB-style text and keeps a literal", () => {
  assert.equal(matrixLiteral([[1, 2], [3, 4]]), "1 2; 3 4");
  assert.equal(matrixLiteral("[[1,2],[3,4]]"), "1 2; 3 4");
  assert.equal(matrixLiteral([1, 2, 3]), "1 2 3");
  assert.equal(matrixLiteral("1 0; 0 1"), "1 0; 0 1");
});

const A: Variable = { name: "A", type: "matrix", value: "1 2; 3 4", source: "mx" };
const k: Variable = { name: "k", type: "number", value: 2, source: "mx" };

test("a live matrix fits a text param, not a number or a file", () => {
  assert.equal(fits(A, { id: "values", type: "text" } as ParamDef), true);
  assert.equal(fits(A, { id: "gain", type: "number" } as ParamDef), false);
  assert.equal(fits(A, { id: "path", type: "file" } as ParamDef), false);
});

test("inlineLive replaces live references with values and leaves the rest", () => {
  const out = inlineLive({ values: { var: "A" }, gain: { var: "k" }, f: { expr: "2 * k" }, own: { var: "m" }, n: 3 }, [A, k]);
  assert.deepEqual(out, { values: "1 2; 3 4", gain: 2, f: { expr: "2 * (2)" }, own: { var: "m" }, n: 3 });
});

test("inlineLive refuses a matrix MX could not send, with its reason", () => {
  const big: Variable = { name: "B", type: "matrix", source: "mx", note: "512 × 512: too large to share live" };
  assert.throws(() => inlineLive({ values: { var: "B" } }, [big]), /B: 512 × 512: too large/);
});
