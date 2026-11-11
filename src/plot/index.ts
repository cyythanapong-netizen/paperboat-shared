// Shared plot primitives. The Scope is the study instrument; the Sparkline is the glance.
// The 3D stage (Stage3D, Surface3D, Axes3D, ColorBar) is the pb#312 work and lands here too.
export { Scope, scopeWidget, findTrigger, spectrum, stats, toCsv, valueAt } from "../scope/index.ts";
export type { ScopeMode, TimeSpanMode, ScopeTool, DrawStyle, Trigger, ScopeSettings } from "../scope/index.ts";
export type { ScopeChannel, ScopeSamples, TapPort } from "../scope/index.ts";
export { Sparkline } from "./Sparkline.tsx";
export type { SparklineProps } from "./Sparkline.tsx";
export { Heatmap } from "./Heatmap.tsx";
export type { HeatmapProps } from "./Heatmap.tsx";
export { Scatter } from "./Scatter.tsx";
export type { ScatterProps } from "./Scatter.tsx";
