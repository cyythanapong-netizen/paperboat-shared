import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { iconNodes } from "../src/icon.ts";

// The Modelica importer's goldens (copied from paperboat engine/tests/data/modelica): each must render, whole.
const dir = new URL("./fixtures/modelica/", import.meta.url);
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".icon.json")) : [];
test("importer goldens render", { skip: files.length === 0 && "no *.icon.json goldens" }, () => {
  for (const f of files) {
    const json = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    assert.ok(iconNodes(json.icon ?? json, f), f);
  }
});
