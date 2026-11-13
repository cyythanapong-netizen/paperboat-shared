import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STEM_M,
  SQUERO_LOGO_VIEWBOX,
  WATER_DOTS,
  WATER_Y,
  DOT_SIZE,
  RIPPLE_LIFT,
  BADGE_GEOMETRY,
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

  // Badge (B3 Mono): square ink tile with radius 1m, height matching the wordmark block
  assert.equal(BADGE_GEOMETRY.radius, 1 * m, "badge radius is 1m");
  assert.equal(BADGE_GEOMETRY.size, SQUERO_LOGO_VIEWBOX.height, "badge is as tall as wordmark block");

  // Badge sits 3m after studio
  const sx = 358.2;
  const stuR = 286.9;
  assert.ok(Math.abs(BADGE_GEOMETRY.x - (sx + stuR + 3 * m)) < 1e-4, "badge is set 3m after studio");

  // Logo width scales with height
  assert.equal(logoWidth(20), (20 * 811.2) / 127.1, "width calculation preserves aspect ratio");
});
