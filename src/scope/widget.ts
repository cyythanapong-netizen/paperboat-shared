import type { WidgetMeta } from "../widget.ts";

/** The Scope's mark: the Board's "scope" instrument and Studio's Simulate pane are the same widget. */
export const scopeWidget: WidgetMeta = {
  id: "scope",
  version: 1,
  title: "Scope",
  description: "Several channels over time, with xy and fft modes, triggers, cursors and CSV/PNG export.",
  tags: ["instrument", "time-series", "xy", "fft"],
  settingsVersion: 1,
};
