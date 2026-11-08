import test from "node:test";
import assert from "node:assert/strict";
import { rotateIcon, rotateSideCW, rotateSideCCW, flipSideX, flipSideY, rotatePlacement, flipPlacement } from "../src/geometry.ts";
import type { IconDef } from "../src/protocol.ts";

test("geometry: rotateSideCW and CCW cycle port sides correctly", () => {
  assert.equal(rotateSideCW("left"), "top");
  assert.equal(rotateSideCW("top"), "right");
  assert.equal(rotateSideCW("right"), "bottom");
  assert.equal(rotateSideCW("bottom"), "left");

  assert.equal(rotateSideCCW("left"), "bottom");
  assert.equal(rotateSideCCW("bottom"), "right");
  assert.equal(rotateSideCCW("right"), "top");
  assert.equal(rotateSideCCW("top"), "left");

  assert.equal(rotateSideCW("left", 180), "right");
  assert.equal(rotateSideCW("top", 180), "bottom");
});

test("geometry: flipSideX and flipSideY mirror correctly", () => {
  assert.equal(flipSideX("left"), "right");
  assert.equal(flipSideX("right"), "left");
  assert.equal(flipSideX("top"), "top");
  assert.equal(flipSideX("bottom"), "bottom");

  assert.equal(flipSideY("top"), "bottom");
  assert.equal(flipSideY("bottom"), "top");
  assert.equal(flipSideY("left"), "left");
  assert.equal(flipSideY("right"), "right");
});

test("geometry: rotateIcon rotates graphics and ports", () => {
  const icon: IconDef = {
    g: [{ t: "line", p: [[0, 50], [100, 50]] }],
    ports: [
      { id: "p", side: "left", at: 50 },
      { id: "n", side: "right", at: 50 },
    ],
  };

  // 90° anticlockwise: horizontal line becomes vertical
  const rot90 = rotateIcon(icon, { rotation: 90 });
  assert.deepEqual(rot90.g, [{ t: "line", p: [[50, 100], [50, 0]] }]);
  assert.equal(rot90.ports?.[0].side, "bottom");
  assert.equal(rot90.ports?.[1].side, "top");

  // Mirror: horizontal flip swaps left and right ports
  const mirrored = rotateIcon(icon, { mirror: true });
  assert.equal(mirrored.ports?.[0].side, "right");
  assert.equal(mirrored.ports?.[1].side, "left");

  // Horizontal flip + 180° rotation equals vertical flip (ports move top/bottom if they were on top/bottom)
  const verticalIcon: IconDef = {
    g: [{ t: "line", p: [[50, 0], [50, 100]] }],
    ports: [
      { id: "top_p", side: "top", at: 50 },
      { id: "bot_n", side: "bottom", at: 50 },
    ],
  };
  const vertFlipped = rotateIcon(verticalIcon, { mirror: true, rotation: 180 });
  assert.equal(vertFlipped.ports?.[0].side, "bottom");
  assert.equal(vertFlipped.ports?.[1].side, "top");
});

test("geometry: rotatePlacement and flipPlacement maintain D4 symmetry group consistency", () => {
  // Rotate CW cycles 0 -> 270 -> 180 -> 90 -> 0 (in Modelica CCW deg)
  assert.deepEqual(rotatePlacement({ rotation: 0 }, true), { rotation: 270, mirror: false });
  assert.deepEqual(rotatePlacement({ rotation: 270 }, true), { rotation: 180, mirror: false });
  assert.deepEqual(rotatePlacement({ rotation: 180 }, true), { rotation: 90, mirror: false });
  assert.deepEqual(rotatePlacement({ rotation: 90 }, true), { rotation: 0, mirror: false });

  // Rotate CCW cycles 0 -> 90 -> 180 -> 270 -> 0
  assert.deepEqual(rotatePlacement({ rotation: 0 }, false), { rotation: 90, mirror: false });
  assert.deepEqual(rotatePlacement({ rotation: 90 }, false), { rotation: 180, mirror: false });

  // Flip horizontal (axis x)
  assert.deepEqual(flipPlacement({ rotation: 0, mirror: false }, "x"), { rotation: 0, mirror: true });
  assert.deepEqual(flipPlacement({ rotation: 180, mirror: false }, "x"), { rotation: 180, mirror: true });
  assert.deepEqual(flipPlacement({ rotation: 90, mirror: false }, "x"), { rotation: 270, mirror: true });
  assert.deepEqual(flipPlacement({ rotation: 270, mirror: false }, "x"), { rotation: 90, mirror: true });

  // Flip vertical (axis y)
  assert.deepEqual(flipPlacement({ rotation: 0, mirror: false }, "y"), { rotation: 180, mirror: true });
  assert.deepEqual(flipPlacement({ rotation: 180, mirror: false }, "y"), { rotation: 0, mirror: true });
  assert.deepEqual(flipPlacement({ rotation: 90, mirror: false }, "y"), { rotation: 90, mirror: true });
  assert.deepEqual(flipPlacement({ rotation: 270, mirror: false }, "y"), { rotation: 270, mirror: true });
});

