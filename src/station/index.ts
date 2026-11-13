// The Station view's 3D stage: backend scene entities rendered with three.js, shared by the
// Paperboat web app and any Studio that shows a Station. The camera is fixed at mount from
// `view`; the parent remounts when the view changes.
export { SceneView } from "./SceneView.tsx";
export type { SceneLabel, ScenePlotLayer, ScenePlotPick, SceneCameraState } from "./SceneView.tsx";
export { viewAxes } from "./viewAxes.ts";
export { fieldColors, meshGeometry, meshLook, paintField, srgbToLinear } from "./meshes.ts";
