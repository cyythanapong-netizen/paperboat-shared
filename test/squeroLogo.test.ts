import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STEM_M,
  SQUERO_LOGO_VIEWBOX,
  WATER_DOTS,
  WATER_Y,
  DOT_SIZE,
  RIPPLE_LIFT,
  TAG_GEOMETRY,
  logoWidth,
} from "../src/squero/logo.ts";

test("squero logo: geometry strictly derives from module m = 13 (squero#42)", () => {
  const m = STEM_M;
  assert.equal(m, 13, "stem width m is 13px at font-size 100");

  // Water: 5 square dots of 1.5m, dot size = 19.5
  assert.equal(DOT_SIZE, 1.5 * m, "dot size is 1.5m");
  assert.equal(WATER_DOTS.length, 5, "5 water dots spread under 'squero'");

  // Clearance: lift = 0.67 * dot = 13.065; clearance gap = lift + 0.5m = 19.565
  // q descender = 16, so dot tops sit at 16 + 19.565 = 35.565
  const lift = RIPPLE_LIFT;
  assert.ok(Math.abs(lift - 0.67 * DOT_SIZE) < 1e-6, "ripple lift is 0.67 * dot");
  const gap = lift + 0.5 * m;
  const qDescender = 16;
  assert.ok(Math.abs(WATER_Y - (qDescender + gap)) < 1e-6, "water dots sit at descender(q) + lift + 0.5m");

  // Dot never touches q at top of ripple
  const crestY = WATER_Y - lift;
  assert.ok(crestY > qDescender, "at ripple crest, dot stays below q descender");
  assert.ok(Math.abs((crestY - qDescender) - 0.5 * m) < 1e-6, "clearance at crest is exactly 0.5m");
});

test("squero logo: the [om] tag follows 'squero' at one word space, ink 3m after the 'o'", () => {
  // Geist 600 "squero": advance 333, right ink 329; Geist Mono 600 "[": left bearing 12, "]" right ink 228.
  assert.equal(TAG_GEOMETRY.x, 333 + 24, "one word space after squero");
  assert.ok(Math.abs(TAG_GEOMETRY.x + 12 - 329 - 3 * STEM_M) <= 1, "[ ink sits 3m after the o ink");
  assert.equal(SQUERO_LOGO_VIEWBOX.width, TAG_GEOMETRY.x + 228, "viewBox ends at the ] ink");

  // Block: top of "[" to the bottom of the water.
  assert.equal(SQUERO_LOGO_VIEWBOX.y, -75);
  assert.ok(Math.abs(SQUERO_LOGO_VIEWBOX.y + SQUERO_LOGO_VIEWBOX.height - (WATER_Y + DOT_SIZE)) < 1e-9);

  assert.equal(logoWidth(20), (20 * 585) / SQUERO_LOGO_VIEWBOX.height, "width calculation preserves aspect ratio");
});
