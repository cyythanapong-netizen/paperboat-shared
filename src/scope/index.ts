// The Scope: Paperboat's study instrument, shared so the Dashboard and Squero Studio show the
// same one (time / xy / fft, trigger, cursors, zoom, freeze, draw styles, CSV and PNG export).
export { Scope } from "./Scope.tsx";
export { scopeWidget } from "./widget.ts";
export type { ScopeMode, TimeSpanMode, ScopeTool, DrawStyle, Trigger, ScopeSettings } from "./Scope.tsx";
export type { ScopeChannel, ScopeSamples, TapPort } from "./types.ts";
export { findTrigger, spectrum, stats, toCsv, valueAt } from "./math.ts";
