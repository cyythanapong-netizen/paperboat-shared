import assert from "node:assert/strict";
import test from "node:test";
import { dismissOnEscape, dismissOnPress, type DismissLayer } from "../src/dismiss.ts";

const target = (id: string) => ({ id }) as unknown as EventTarget;
const inside = (...ids: string[]) => (t: EventTarget | null) => ids.includes((t as unknown as { id: string })?.id);

const layer = (id: string, contains: DismissLayer["contains"], extra: Partial<DismissLayer> = {}): DismissLayer => ({
  contains,
  outside: true,
  escape: true,
  close: () => undefined,
  ...(extra as Omit<DismissLayer, "contains">),
});

test("dismissOnPress closes every layer above the surface that was pressed", () => {
  const parent = layer("parent", inside("parent"));
  const child = layer("child", inside("child"));
  const other = layer("other", inside("other"));
  // Pressing the parent's background closes the child and any layer above it, not the parent.
  assert.deepEqual(dismissOnPress([parent, child, other], target("parent")), [2, 1]);
});

test("dismissOnPress leaves the surface under the press and everything below it open", () => {
  const parent = layer("parent", inside("parent"));
  const child = layer("child", inside("child"));
  assert.deepEqual(dismissOnPress([parent, child], target("child")), []);
  assert.deepEqual(dismissOnPress([parent, child], target("elsewhere")), [1, 0]);
});

test("dismissOnPress leaves a toggle's own surface to the toggle", () => {
  const popover = layer("popover", inside("popover"), { trigger: inside("toggle") });
  const under = layer("under", inside("under"));
  assert.deepEqual(dismissOnPress([under, popover], target("toggle")), []);
});

test("a layer that opts out of outside dismissal shields the layers under it", () => {
  const alert = layer("alert", inside("alert"), { outside: false });
  const under = layer("under", inside("under"));
  assert.deepEqual(dismissOnPress([under, alert], target("elsewhere")), []);
});

test("Escape closes only the top layer, and stops at one that opts out", () => {
  const under = layer("under", inside("under"));
  const top = layer("top", inside("top"));
  assert.equal(dismissOnEscape([under, top]), 1);
  assert.equal(dismissOnEscape([under, layer("quiet", inside("quiet"), { escape: false })]), undefined);
  assert.equal(dismissOnEscape([]), undefined);
});
