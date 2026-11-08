import assert from "node:assert/strict";
import { test } from "node:test";
import { connectError, connectorHint, hasIconPorts, iconEnd, inForm, netWireType, placeIconPorts, placePorts, signalEnd } from "../src/ports.ts";
import type { BlockDef, IconDef } from "../src/protocol.ts";
import { connectors, Ground, Inertia, Resistor } from "./fixtures/icons.ts";

const end = (icon: IconDef, id: string) => iconEnd(icon.ports!.find((p) => p.id === id)!, connectors)!;

test("ports sit on their side and at, on every plate size", () => {
  for (const icon of [Resistor, Ground, Inertia]) {
    for (const p of placeIconPorts(icon, {})) {
      assert.equal(p.at, p.port.at);
      assert.equal(p.at % 5, 0);
    }
  }
  assert.deepEqual(placeIconPorts(Resistor, {}).map((p) => [p.port.id, p.port.side]), [["p", "left"], ["n", "right"]]);
  assert.equal(placeIconPorts(Ground, {})[0].port.side, "top");
});

test("validity: acausal joins the same class family, with words", () => {
  assert.equal(connectError(end(Resistor, "p"), end(Resistor, "n")), null); // Pin <-> Pin
  assert.equal(connectError(end(Ground, "p"), end(Resistor, "n")), null);
  assert.equal(connectError(end(Inertia, "flange_a"), end(Inertia, "flange_b")), null);
  const refused = connectError(end(Resistor, "p"), end(Inertia, "flange_a"));
  assert.match(refused ?? "", /PositivePin.*Flange_a/);
  assert.ok(connectError(end(Resistor, "p"), signalEnd("in")), "acausal to a signal port");
});

test("validity: causal goes output to input only", () => {
  const out = { kind: "output", cls: "RealOutput" } as const;
  const inp = { kind: "input", cls: "RealInput" } as const;
  assert.equal(connectError(out, inp), null);
  assert.equal(connectError(signalEnd("out"), signalEnd("in")), null);
  assert.match(connectError(inp, inp) ?? "", /input.*input/);
  assert.match(connectError(out, out) ?? "", /output.*output/);
  assert.equal(connectError(out, end(Resistor, "n")), "an output joins only an input");
  assert.equal(connectError(signalEnd("out"), end(Resistor, "n")), "an output joins only an input");
  assert.equal(connectError({ ...inp, inside: true }, inp), null, "a composite's inside connector connects through");
  assert.ok(connectError({ kind: "expandable", cls: "X" }, inp));
});

test("an if port is hidden when false, the rest re-spread, and it stays listed for its wires", () => {
  const icon: IconDef = {
    g: [],
    ports: [
      { id: "a", class: "Pin", side: "left", at: 25 },
      { id: "b", class: "Pin", side: "left", at: 50, if: "useB" },
      { id: "c", class: "Pin", side: "left", at: 75 },
    ],
  };
  const on = placeIconPorts(icon, { useB: true });
  assert.deepEqual(on.map((p) => [p.at, p.hidden]), [[25, false], [50, false], [75, false]]);
  const off = placeIconPorts(icon, { useB: false });
  assert.deepEqual(off.map((p) => p.hidden), [false, true, false]);
  assert.ok(Math.abs(off[0].at - 100 / 3) < 1e-9 && Math.abs(off[2].at - 200 / 3) < 1e-9);
  assert.equal(off[1].port.id, "b", "still there, so its wires can stay as missing");
});

test("an array port is one port with a count badge, the vector port model", () => {
  const icon: IconDef = { g: [], ports: [{ id: "p", class: "Pin", side: "left", at: 50, array: "n" }] };
  const [p] = placeIconPorts(icon, { n: 3 });
  assert.equal(p.count, 3);
  assert.equal(placeIconPorts(icon, {}).length, 1);
  assert.equal(placeIconPorts(icon, {})[0].count, undefined);
});

test("wire look follows the connector class; thermal is dashed, never red", () => {
  assert.equal(netWireType(connectors.Pin), "net-12");
  assert.equal(netWireType(connectors.Flange_a), "net-18");
  assert.equal(netWireType(connectors.HeatPort_a), "net-12d");
  assert.equal(netWireType(connectors.RealInput), "signal");
  assert.match(connectorHint("p", { ...connectors.Pin, potential: [{ id: "v", unit: "V" }], flow: [{ id: "i", unit: "A" }] }), /^p\npotential: v \(V\)\nflow: i \(A\)$/);
});

test("inForm with ports_from inputs allows 1 input port (pb#189)", () => {
  const scopeDef: BlockDef = {
    type: "scope",
    label: "Scope",
    kind: "monitor",
    inputs: [{ id: "a", type: "any" }, { id: "b", type: "any" }],
    outputs: [],
    params: [{ id: "inputs", type: "number", default: 2 }],
    ports_from: "inputs",
  };
  const resolved1 = inForm(scopeDef, { inputs: 1 });
  assert.deepEqual(resolved1.inputs.map((p) => p.id), ["a"]);
  const resolved3 = inForm(scopeDef, { inputs: 3 });
  assert.deepEqual(resolved3.inputs.map((p) => p.id), ["a", "b", "c"]);
});

test("hasIconPorts distinguishes icons with connector ports from curve icons without ports (pb#195)", () => {
  assert.equal(hasIconPorts(Resistor), true);
  assert.equal(hasIconPorts(Ground), true);
  assert.equal(hasIconPorts(Inertia), true);
  const curveIcon: IconDef = {
    g: [{ p: [[20, 50], [80, 50]], stroke: "ink", t: "line", weight: "normal" }],
  };
  assert.equal(hasIconPorts(curveIcon), false);
  assert.equal(hasIconPorts({ g: [], ports: [] }), false);
  assert.equal(hasIconPorts(undefined), false);
});

test("placePorts respects custom PortSides for rotated and flipped compact blocks", () => {
  const blockDef: BlockDef = {
    type: "number",
    label: "Number",
    kind: "function",
    inputs: [{ id: "in", type: "signal" }],
    outputs: [{ id: "out", type: "signal" }],
    params: [],
  };

  // Default placement
  const defPlacement = placePorts(blockDef, undefined);
  assert.deepEqual(defPlacement.left.map((e) => e.port.id), ["in"]);
  assert.deepEqual(defPlacement.right.map((e) => e.port.id), ["out"]);
  assert.deepEqual(defPlacement.top, []);
  assert.deepEqual(defPlacement.bottom, []);

  // Flipped horizontal (left and right swapped)
  const flippedH = placePorts(blockDef, { right: ["in"], left: ["out"] });
  assert.deepEqual(flippedH.left.map((e) => e.port.id), ["out"]);
  assert.deepEqual(flippedH.right.map((e) => e.port.id), ["in"]);

  // Rotated 90° CW (left -> top, right -> bottom)
  const rotatedCW = placePorts(blockDef, { top: ["in"], bottom: ["out"] });
  assert.deepEqual(rotatedCW.top.map((e) => e.port.id), ["in"]);
  assert.deepEqual(rotatedCW.bottom.map((e) => e.port.id), ["out"]);
  assert.deepEqual(rotatedCW.left, []);
  assert.deepEqual(rotatedCW.right, []);
});

