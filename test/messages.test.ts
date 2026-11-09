import assert from "node:assert/strict";
import { test } from "node:test";
import { messageCounts, messageSource, visibleMessages, type Message } from "../src/messages.ts";

const messages: Message[] = [
  { level: "error", text: "Revolute2 not found", file: "DoublePendulum.mo", line: 18, column: 5 },
  { level: "warning", text: "body2.m has no value", file: "DoublePendulum.mo", line: 24 },
  { level: "warning", text: "frame_a is not connected" },
  { level: "info", text: "Check completed" },
];

test("a source location is file:line:column, and only the parts omc gave", () => {
  assert.equal(messageSource(messages[0]), "DoublePendulum.mo:18:5");
  assert.equal(messageSource(messages[1]), "DoublePendulum.mo:24");
  assert.equal(messageSource(messages[2]), "");
  assert.equal(messageSource({ level: "info", text: "x", file: "M.mo" }), "M.mo");
});

test("filters keep the level and all keeps the order", () => {
  assert.deepEqual(visibleMessages(messages, "all"), messages);
  assert.deepEqual(visibleMessages(messages, "error"), [messages[0]]);
  assert.deepEqual(visibleMessages(messages, "warning"), [messages[1], messages[2]]);
});

test("counts are the words a tab shows", () => {
  assert.deepEqual(messageCounts(messages), { error: 1, warning: 2, info: 1 });
  assert.deepEqual(messageCounts([]), { error: 0, warning: 0, info: 0 });
});
