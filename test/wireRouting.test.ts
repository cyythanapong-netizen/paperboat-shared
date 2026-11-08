import assert from "node:assert/strict";
import { test } from "node:test";
import { dragSegment, orthoPoints, routeWires, simplify, squareUp, type Point } from "../src/wireRouting.ts";

const square = (pts: Point[]) => pts.slice(1).every((q, i) => q[0] === pts[i][0] || q[1] === pts[i][1]);

test("a wire between facing ports runs square, out and across", () => {
  assert.deepEqual(orthoPoints([0, 0], "right", [100, 40], "left"), [[0, 0], [50, 0], [50, 40], [100, 40]]);
  assert.deepEqual(orthoPoints([0, 0], "right", [100, 0], "left"), [[0, 0], [100, 0]]);
});

test("ports facing away cross over between them; mixed sides take one corner", () => {
  const back = orthoPoints([100, 0], "right", [0, 60], "left");
  assert.deepEqual(back, [[100, 0], [116, 0], [116, 30], [-16, 30], [-16, 60], [0, 60]]);
  assert.deepEqual(orthoPoints([0, 0], "bottom", [50, 80], "left"), [[0, 0], [0, 80], [50, 80]]);
  for (const [s, t] of [["top", "top"], ["right", "right"], ["bottom", "top"], ["left", "bottom"]] as const)
    assert.ok(square(orthoPoints([10, 20], s, [90, 70], t)), `${s} to ${t} is square`);
});

test("dragging a middle segment moves it across; one at a port keeps the port end", () => {
  const z: Point[] = [[0, 0], [50, 0], [50, 40], [100, 40]];
  assert.deepEqual(dragSegment(z, 1, [70, 999]), [[0, 0], [70, 0], [70, 40], [100, 40]]);
  const straight: Point[] = [[0, 0], [100, 0]];
  assert.deepEqual(dragSegment(straight, 0, [50, 30]), [[0, 0], [0, 30], [100, 30], [100, 0]]);
  assert.deepEqual(dragSegment(z, 5, [0, 0]), z);
});

test("saved bends square up with ports that moved", () => {
  assert.deepEqual(squareUp([100, 103], [[140, 100], [140, 200]], [200, 197]), [[100, 103], [140, 103], [140, 197], [200, 197]]);
  assert.deepEqual(squareUp([0, 0], [], [10, 10]), [[0, 0], [10, 10]]);
  assert.deepEqual(simplify([[0, 0], [0, 0], [5, 0], [10, 0], [10, 5]]), [[0, 0], [10, 0], [10, 5]]);
});

test("every routed wire is square", () => {
  const routes = routeWires([
    { id: "f", source: "A", target: "B", sx: 100, sy: 100, tx: 300, ty: 50 },
    { id: "s", source: "A", target: "C", sx: 100, sy: 100, tx: 300, ty: 250, step: true },
    { id: "b", source: "C", target: "A", sx: 400, sy: 100, tx: 100, ty: 100 },
  ]);
  for (const r of routes.values()) assert.ok(square(r.points), `${r.id} is square`);
});
