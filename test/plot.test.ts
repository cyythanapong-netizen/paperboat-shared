import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatCoord,
  panXRange,
  panYRange,
  zoomRangeAround,
  sampleSeriesAtX,
  nearestSample,
} from "../src/scope/interact.ts";
import { colormapStops, sampleColormap } from "../src/plot/colormaps.ts";
import { layersBounds, sampleLayersAtX, sampleLayersHover, type Plot2DLayer } from "../src/plot/layers2d.ts";
import { fieldColors } from "../src/station/meshes.ts";

test("scope interact helpers pan, zoom, and sample linear & log axes", () => {
  assert.equal(formatCoord(null), "–");
  assert.equal(formatCoord(12345), "1.23e+4");
  assert.equal(formatCoord(0.25, 2), "0.25");

  // Panning right (positive dxPx) moves data window left cleanly
  assert.deepEqual(panXRange(0, 10, 50, 100), [-5, 5]);
  // Reversed X axis flips pan sign
  assert.deepEqual(panXRange(0, 10, 50, 100, { reverse: true }), [5, 15]);
  // Log X axis preserves geometric span ratio
  const [lx0, lx1] = panXRange(1, 100, 50, 100, { log: true });
  assert.ok(Math.abs(lx1 / lx0 - 100) < 1e-9);
  assert.ok(Math.abs(lx0 - 0.1) < 1e-9);

  // Panning down (positive dyPx) moves Y window down in normal coords
  assert.deepEqual(panYRange(0, 10, 20, 100), [2, 12]);
  assert.deepEqual(panYRange(0, 10, 20, 100, { reverse: true }), [-2, 8]);

  // Zoom around cursor anchor keeps anchor invariant
  const [zx0, zx1] = zoomRangeAround(0, 10, 2, 0.5);
  assert.deepEqual([zx0, zx1], [1, 6]);
  const [lzx0, lzx1] = zoomRangeAround(1, 100, 10, 0.5, true);
  assert.ok(Math.abs(lzx0 * lzx1 - 100) < 1e-9);

  // Series sampling & nearest neighbor
  assert.equal(sampleSeriesAtX([0, 1, 2], [0, 10, 20], 0.5), 5);
  assert.equal(sampleSeriesAtX([2, 0, 1], [20, 0, 10], 0.9), 10);
  const near = nearestSample([0, 1, 2], [0, 5, 1], 1.02, 4.95, 2, 5);
  assert.equal(near?.index, 1);
});

test("colormaps resolve SqueroPlot names, _r reversals, and Float32Array fieldColors", () => {
  const viridis = colormapStops("viridis");
  const viridisR = colormapStops("viridis_r");
  assert.deepEqual(viridisR[0], viridis[viridis.length - 1]);
  assert.deepEqual(viridisR[viridisR.length - 1], viridis[0]);
  assert.ok(colormapStops("plasma").length >= 4);
  assert.ok(colormapStops("coolwarm").length >= 4);
  assert.deepEqual(sampleColormap([[1, 0, 0], [0, 0, 1]], 0), [255, 0, 0]);
  assert.deepEqual(sampleColormap([[1, 0, 0], [0, 0, 1]], 1), [0, 0, 255]);

  const colors = fieldColors(new Float32Array([0, 0.5, 1]), [0, 1], "inferno");
  assert.equal(colors.length, 9);
  assert.ok(colors[0] < colors[6]); // magma/inferno goes from dark to bright
});

test("layers2d computes bounds and hover/cursor readouts across inline and typed arrays", () => {
  const layers: Plot2DLayer[] = [
    { kind: "lines", label: "sig", x: [0, 1, 2], y: [-1, 3, 1], color: "#0072BD" },
    {
      kind: "heatmap",
      label: "temp",
      xe: new Float32Array([0, 1, 2]),
      ye: new Float32Array([0, 2, 4]),
      nx: 2,
      ny: 2,
      z: new Float32Array([10, 20, 30, 40]),
      colormap: "viridis",
    },
    { kind: "lines", label: "off", hidden: true, x: [-100, 100], y: [-100, 100] },
  ];
  const bounds = layersBounds(layers);
  assert.deepEqual(bounds.x, [0, 2]);
  assert.deepEqual(bounds.y, [-1, 4]);

  const sampled = sampleLayersAtX(layers, new Set(), 0.5, 1.5);
  assert.equal(sampled.length, 1);
  assert.equal(sampled[0].label, "sig");
  assert.equal(sampled[0].yA, 1);
  assert.equal(sampled[0].yB, 2);

  const hmHit = sampleLayersHover(layers, new Set(), 1.5, 3.0, 2, 5);
  assert.equal(hmHit?.z, 40);
  assert.equal(hmHit?.snap, false);

  const curveHit = sampleLayersHover(layers, new Set([1]), 1.0, 3.0, 2, 5);
  assert.equal(curveHit?.label, "sig");
  assert.equal(curveHit?.y, 3);
  assert.equal(curveHit?.snap, true);
});
