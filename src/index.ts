// @paperboat/shared
// Pure components, layout engines, and protocol types shared across Paperboat packages.

export * from "./protocol.ts";
export * from "./flowTypes.ts";
export * from "./commands.ts";
export * from "./bindings.ts";
export * from "./storage.ts";
export {
  type Size,
  CELLS,
  SIZES,
  SIZE_LABEL,
  DEFAULT_COLUMNS,
  defaultSize,
  type Monitor,
  type DecoKind,
  type Placed as PlacedLayout,
  type PlacedDeco,
  type Arranged,
  autoOrder,
  arrange, arrange as arrangeLayout,
  rowsOf,
  layoutOf,
  setSettings,
  moveInstrument,
  resizeInstrument,
  moveToTab,
  addDecoration,
  moveDecoration,
  resizeDecoration,
  editDecoration,
  removeDecoration,
  addTab,
  renameTab,
  tabIsEmpty,
  removeTab,
  freshTabName,
  type TextPart,
  formatText,
  renameInText,
  inlineInText,
  textUsing,
  mapTexts,
  loadSaved,
  save, save as saveLayout,
} from "./dashboardLayout.ts";
export {
  wireMismatch,
  portLabel,
  portHint,
  type Side as PortSide,
  SIDES,
  type Placed as PlacedPort,
  placePorts, type Placed,

  movePort,
  resetPort,
  parseSigns,
  parsePlaceholders,
  signOf,
  parseInputs,
  parseNames,
  inForm,
  connectError, signalEnd, iconEnd, hasIconPorts, placeIconPorts, connectorHint, netWireType,
  type WireEnd, type PlacedIconPort,
} from "./ports.ts";
export {
  type Side as WireSide,
  type Point as WirePoint,
  type RouteInput,
  type Obstacle,
  type WireRoute,
  backWireLaneOffset,
  backWireExitDistance,
  roundedPolyline,
  simplify as simplifyWire,
  orthoPoints,
  squareUp,
  dragSegment,
  middleOf as middleOfWire,
  routeWires,
} from "./wireRouting.ts";
export * from "./graphLayout.ts";
export * from "./undo.ts";
export * from "./clipboard.ts";
export * from "./icon.ts";
