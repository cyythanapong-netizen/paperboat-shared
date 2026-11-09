import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { scopeWidget, widgets } from "../src/widgets.ts";

test("every widget is marked once, with a stable id and a version", () => {
  assert.deepEqual(widgets.map((w) => w.id), [...new Set(widgets.map((w) => w.id))]);
  for (const w of widgets) {
    assert.match(w.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(Number.isInteger(w.version) && w.version >= 1, `${w.id} version`);
    assert.ok(w.title.length > 0, `${w.id} title`);
    assert.ok(w.description.length > 0, `${w.id} description`);
    assert.ok(w.tags.length > 0, `${w.id} tags`);
  }
  assert.equal(scopeWidget.id, "scope");
});

test("the Scope root says which widget it is", () => {
  const source = fs.readFileSync(new URL("../src/scope/Scope.tsx", import.meta.url), "utf8");
  assert.match(source, /data-widget=\{scopeWidget\.id\}/);
  assert.match(source, /data-widget-version=\{scopeWidget\.version\}/);
});
