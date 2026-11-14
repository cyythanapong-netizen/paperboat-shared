import assert from "node:assert/strict";
import { test } from "node:test";
import { polynomial } from "../src/poly.ts";

test("coefficients read as a polynomial, highest power first", () => {
  assert.equal(polynomial("1 2 1"), "s² + 2s + 1");
  assert.equal(polynomial("1"), "1");
  assert.equal(polynomial("1 1"), "s + 1");
  assert.equal(polynomial("2, 0, -3.5"), "2s² − 3.5");
  assert.equal(polynomial("-1 0 0 0 0 0 0 0 0 0 0 4", "z"), "−z¹¹ + 4");
  assert.equal(polynomial("0 0"), "0");
  assert.equal(polynomial("a b"), "a b");
});
