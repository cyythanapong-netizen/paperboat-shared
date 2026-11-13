// Shared plot primitives. The Scope is the live instrument; Plot2D/HeatFigure are the MATLAB
// figure; the Station owns the 3D stage, with these colour maps and colour bar.
export { Scope, scopeWidget, findTrigger, spectrum, stats, toCsv, valueAt } from "../scope/index.ts";
export type { ScopeMode, TimeSpanMode, ScopeTool, DrawStyle, Trigger, ScopeSettings } from "../scope/index.ts";
export type { ScopeChannel, ScopeSamples, TapPort } from "../scope/index.ts";
export { Sparkline } from "./Sparkline.tsx";
export type { SparklineProps } from "./Sparkline.tsx";
export { Heatmap } from "./Heatmap.tsx";
export type { HeatmapProps } from "./Heatmap.tsx";
export { Scatter } from "./Scatter.tsx";
export type { ScatterProps } from "./Scatter.tsx";
export { Plot2D } from "./Plot2D.tsx";
export type { Plot2DProps, PlotAxes, PlotSeries, PlotLegend, PlotLegendEntry, PlotText, PlotViewLimits, PlotViewState } from "./Plot2D.tsx";
export { drawMarkerSymbol, drawPlotLayers, layersBounds, sampleLayersAtX, sampleLayersHover } from "./layers2d.ts";
export type { NumericArray, Plot2DLayer, Plot2DLayerBase } from "./layers2d.ts";
export { HeatFigure } from "./HeatFigure.tsx";
export type { HeatFigureProps } from "./HeatFigure.tsx";
export { Colorbar } from "./Colorbar.tsx";
export type { ColorbarProps } from "./Colorbar.tsx";
export { TexText, texParts, texToMath } from "./TexText.tsx";
export type { Interpreter, TexTextProps } from "./TexText.tsx";
export { MATLAB_COLORS, colormapCss, colormapStops, rgbHex, sampleColormap } from "./colormaps.ts";
export { formatTick, niceTicks } from "./ticks.ts";
export { formatCoord } from "../scope/interact.ts";
