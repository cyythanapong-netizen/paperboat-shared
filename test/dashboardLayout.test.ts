import assert from "node:assert/strict";
import { test } from "node:test";
import { arrange, layoutOf, setSettings } from "../src/dashboardLayout.ts";

test("an instrument's settings live in the layout and survive arrange → layoutOf", () => {
  const monitors = { sc: { kind: "x", size: "large" as const, x: 0, y: 0 }, g: { kind: "y", x: 0, y: 100 } };
  const a = arrange(monitors, undefined, 6);
  assert.equal(a.instruments.find((p) => p.block === "sc")?.size, "large"); // the size its toolkit asked for
  assert.equal(a.instruments.find((p) => p.block === "g")?.size, "normal");
  const saved = setSettings(a, "sc", { mode: "xy", trigger: { source: "a", level: 0.5 } });
  const again = layoutOf(arrange(monitors, saved, 6));
  assert.deepEqual(again.instruments?.find((i) => i.block === "sc")?.settings, { mode: "xy", trigger: { source: "a", level: 0.5 } });
  assert.equal(layoutOf(arrange(monitors, setSettings(arrange(monitors, saved, 6), "sc", {}), 6)).instruments?.find((i) => i.block === "sc")?.settings, undefined);
});

test("a layout saved before settings were generic still opens: its `scope` table is the settings", () => {
  const monitors = { sc: { kind: "x", x: 0, y: 0 } };
  const old = { instruments: [{ block: "sc", scope: { window: 2 } }] } as never;
  assert.deepEqual(layoutOf(arrange(monitors, old, 6)).instruments?.[0].settings, { window: 2 });
});

test("the automatic order follows the `order` each instrument's toolkit gave it", () => {
  const monitors = { plot: { kind: "p", x: 0, y: 0 }, readout: { kind: "r", order: 0, x: 500, y: 0 } };
  assert.deepEqual(arrange(monitors, undefined, 6).instruments.map((p) => p.block), ["readout", "plot"]);
});
