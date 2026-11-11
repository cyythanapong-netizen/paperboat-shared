// Generated from protocol/schema/paperboat-0.schema.json by protocol/gen_ts.py.
// Do not edit: change the schema and run `npm run gen:protocol`.

export type VectorComponent = {
  /** The component's label, in vector order. */
  id: string;
  /** The component's unit (m, rad…). */
  unit?: string;
};

export type PortDef = {
  id: string;
  /** signal (a value, the default), step (control in a Step flow), a value's shape (image, points, vector…), or any (any value but a step). A wire joins ports of one type; vector and legacy numbers are compatible. */
  type: string;
  /** Its unit (N, m, rad, m/s…). A wire between two ports with units joins the same unit; a port without one takes any (#4). */
  unit?: string;
  /** A vector's fixed number of values. Absent: any length. */
  dimension?: number;
  /** A vector's ordered component labels and optional per-component units; its length fixes the dimension. */
  components?: VectorComponent[];
  /** A signal port of an elementwise block: it also joins a vector port (the block runs element by element). Absent: false. */
  broadcast?: boolean;
};

/** A setting on a block, or a property of a station object. number and boolean reach the block as numbers (boolean: a checkbox, 1 or 0); text, key (a KeyboardEvent.code, picked by pressing it) and file (a path, relative to the descriptor) as text; enum (one of options, a dropdown) as its name (and to an expression, its index). */
export type ParamDef = {
  id: string;
  type: "number";
  default: number;
  /** Its unit (kg, N/rad…), shown next to the field; a variable bound to it must be in the same unit. */
  unit?: string;
} | {
  id: string;
  type: "boolean";
  default: boolean;
} | {
  id: string;
  type: "text" | "key" | "file" | "variable";
  default: string;
} | {
  id: string;
  type: "enum";
  default: string;
  options: string[];
};

/** ink = --text, muted = --line-strong, signal = --signal (live state only). */
export type Stroke = "ink" | "muted" | "signal" | "electrical" | "translational" | "thermal" | "fluid" | "magnetic" | "rotational";

/** 1, 1.5 or 2 px. */
export type Weight = "thin" | "normal" | "wire";

/** Never red: dashed red means missing only. */
export type Dash = "solid" | "axis" | "dash" | "dot" | "dashdot";

/** none, --text, --surface-raised or --surface-sunken. */
export type Fill = "none" | "ink" | "raised" | "sunken" | "electrical" | "translational" | "thermal" | "fluid" | "magnetic" | "rotational";

/** md = 5px. */
export type Corner = "0" | "sm" | "md";

/** A point in the icon's 0..100 box, multiples of 5. */
export type Pt = [number, number];

/** One icon primitive (§3). Attribute values are tokens, never colours or paths. */
export type Prim = {
  t: "line";
  p: Pt[];
  stroke?: Stroke;
  weight?: Weight;
  dash?: Dash;
  fill?: Fill;
} | {
  t: "poly";
  p: Pt[];
  stroke?: Stroke;
  weight?: Weight;
  dash?: Dash;
  fill?: Fill;
} | {
  t: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  corner?: Corner;
  stroke?: Stroke;
  weight?: Weight;
  dash?: Dash;
  fill?: Fill;
} | {
  t: "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  stroke?: Stroke;
  weight?: Weight;
  dash?: Dash;
  fill?: Fill;
} | {
  t: "arc";
  x: number;
  y: number;
  w: number;
  h: number;
  a0: number;
  a1: number;
  stroke?: Stroke;
  weight?: Weight;
  dash?: Dash;
  fill?: Fill;
} | {
  t: "text";
  x: number;
  y: number;
  /** May hold {param}, filled like the caption value. */
  s: string;
  font?: "sans" | "mono";
  size?: 12 | 12.5 | 13 | 15 | 30;
  stroke?: Stroke;
  weight?: Weight;
  dash?: Dash;
  fill?: Fill;
};

export type IconPort = {
  id: string;
  /** Key into the catalog's connectors. */
  class: string;
  side: "left" | "right" | "top" | "bottom";
  /** 0..100 along the edge, a multiple of 5. */
  at: number;
  /** a/b or p/n side, never state. */
  variant?: "hollow" | "filled";
  /** Param id holding n (the vector port model). */
  array?: string;
  /** Param id; the port exists while it is truthy. */
  if?: string;
};

/** A block's custom look: 1x1 (64x56), 2x1 or 1x2 plates only. */
export type IconDef = {
  w?: 1 | 2;
  h?: 1 | 2;
  g: Prim[];
  ports?: IconPort[];
};

export type ConnectorDef = {
  /** expandable is reserved, not drawn yet. */
  kind: "acausal" | "input" | "output" | "expandable";
  handle: "square" | "diamond" | "ring2" | "triangle" | "circle";
  /** The look the variant swaps to. */
  alt?: "hollow" | "filled";
  size: 8 | 10 | 12;
  weight: 1.2 | 1.8 | 2;
  /** Thermal wires are dashed grey, not red. */
  dash?: "solid" | "dashed";
  /** The connector's own fill, when a user-defined class gives one (#43). */
  color?: string;
  potential?: {
    id: string;
    unit: string;
  }[];
  flow?: {
    id: string;
    unit: string;
  }[];
  stream?: {
    id: string;
    unit: string;
  }[];
};

/** Connector classes the blocks' icon ports refer to (§4), by Modelica class short name. */
export type Connectors = Record<string, ConnectorDef>;

/** What a sheet is (#9): a Signal flow (values flow one way), a Step flow (control passes along step wires), a State flow (transitions between states) or a Model flow (acausal physical connections). */
export type FlowType = "signal" | "step" | "state" | "model";

export type BlockDef = {
  type: string;
  label: string;
  /** source pushes into the domain, probe reads it, function computes, monitor shows a value on the Dashboard. */
  kind: "source" | "probe" | "function" | "monitor";
  inputs: PortDef[];
  outputs: PortDef[];
  params: ParamDef[];
  /** Palette group: the domain for its own blocks, else the toolkit package. */
  group?: string;
  /** Spawned by a station object (same id): not in the palette, no params, removed with it. */
  linked?: boolean;
  /** A monitor's instrument on the Dashboard: graph (default), display (the latest value) or image. */
  instrument?: string;
  /** How the UI draws the block: a hint, so a UI without it (or a block without it) draws the normal card. */
  view?: {
    /** Draw a small plate: a glyph, bare port dots (names on hover), the name and main value in a caption below. */
    compact?: boolean;
    /** The plate's glyph: a curve name (gain, plus, step, clamp, const) or a few characters drawn as text (&, ≥1, ¬). */
    glyph?: string;
    /** The caption's value, an expression of the block's params: {k}, {min}…{max}. */
    value?: string;
    /** Additive icon definition (§3); absent means plain plate. */
    icon?: IconDef;
  };
  /** A magic block's forms; its inputs and outputs are the first's, and its form param (an enum) picks one. */
  forms?: Form[];
  /** The id of a text param that decides the inputs: one per sign character in it (+ adds, - or − subtracts; at most 26; none reads as ++), ids a, b, c… of the first input's type. Sum's signs. A param called names gives one input per name instead (Mux), see outputs_from. */
  ports_from?: string;
  /** The id of a text param whose expression's free names are the inputs: one per identifier in it (other than pi, e and built-in functions, in order of first appearance), of the first input's type. f(t)'s f. */
  inputs_from?: string;
  /** The id of a text param of names (split on spaces and commas: "x v theta") that are the outputs, ids in that order; the first vector input gets one component per name, units by position from a `units` param. Demux's names. (ports_from "names" does the same for the inputs: Mux.) */
  outputs_from?: string;
  /** It works element by element: its signal ports take vectors too (they are marked broadcast), scalars broadcast, and with any vector in, its outputs are vectors of that length, one instance per element. Absent: false. */
  elementwise?: boolean;
  /** false: its outputs this step don't depend on its inputs this step (an integrator, a delay), so a feedback loop may pass through it. Absent: true. */
  feedthrough?: boolean;
  /** One line in plain words: what it does. Shown on its card in the block browser. Optional. */
  description?: string;
  /** The flow types it works in (#9): the palette offers it only on a sheet of one of these, and the engine refuses it on another. Absent: every flow type. */
  flows?: FlowType[];
};

/** A station object type: a thing on the Station page whose props are edited only there. */
export type ObjectDef = {
  type: string;
  label: string;
  role: "body" | "joint";
  group?: string;
  props: ParamDef[];
  /** Slots naming other station objects (a spring's a and b). */
  links: string[];
  /** The linked block type it spawns on the Flow page, if any. */
  block?: string;
  /** One line in plain words: what it does. Shown on its card in the block browser. Optional. */
  description?: string;
};

/** One shape on the Station's scene. shape: box, sphere (size[0] = radius), cylinder (size[0] = radius, size[1] = length along y), line (pos to `to`), image (a size[0] x size[1] picture facing +z, from src) or mesh (triangles from vertices and indices, coloured by an optional field: values). */
export type Entity = {
  id: string;
  shape: "box" | "sphere" | "cylinder" | "line" | "image" | "mesh";
  pos: Vec3;
  size?: Vec3;
  /** Radians, applied in x, y, z order. */
  rot?: Vec3;
  /** Factors on top of size. */
  scale?: Vec3;
  to?: Vec3;
  color?: string;
  /** An image's picture: a URL or a data: URL. */
  src?: string;
  /** A mesh's vertices: x, y, z each, in the entity's own frame (pos, rot and scale place it). Shape [n, 3], f32. */
  vertices?: NumberArray;
  /** A mesh's triangles: three vertex indices each, counter-clockwise seen from the front. Shape [m, 3], u32 (or i32, u8). */
  indices?: NumberArray;
  /** A field over a mesh, one number per vertex (a pressure, a stress), that the UI colours over range. Shape [n]. */
  values?: NumberArray;
  /** The values that take the low and high ends of the colour scale; absent: the field's own min and max. */
  range?: [number, number];
};

/** Camera hint sent with a scene. 2d: orthographic, looking down -z at center, height units tall. */
export type View = {
  mode: "3d";
  /** Show the floor grid (default true). The user can switch it on or off on the Station page, and that choice wins. */
  grid?: boolean;
  /** The height (y) of the floor grid (default 0): below a model that hangs from the origin. */
  floor?: number;
  /** Where the camera opens, and where Home on the view cube returns it. Default: eye [2, 4, 8], looking at [0, 0, 0]. */
  camera?: {
    /** The camera's position. */
    eye: [number, number, number];
    /** The point it looks at and orbits (default [0, 0, 0]). */
    target?: [number, number, number];
    /** Vertical field of view in degrees (default 50). */
    fov?: number;
  };
} | {
  mode: "2d";
  center: [number, number];
  height: number;
};

export type Graph = {
  /** The sheet's flow type (#9): each block must work in it (inside a story, a Signal flow). Absent: not chosen; nothing is checked, and the UI takes a Step flow if a block has step ports, else a Signal flow. */
  flow?: FlowType;
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups?: GraphGroup[];
};

export type StationObject = {
  id: string;
  type: string;
  props?: Record<string, ParamValue>;
  /** Link slot to the id of the station object filling it. */
  links?: Record<string, string>;
  /** Where it sits in the Station's graph view. */
  pos?: [number, number];
};

export type Station = {
  objects: StationObject[];
};

/** One optional external toolkit from toolkits.toml and its status on this machine. */
export type ToolkitStatus = {
  name: string;
  repo: string;
  description?: string;
  /** Whether engine/toolkit/<name>/toolkit.toml is installed. */
  installed: boolean;
  /** Whether the current backend requires this toolkit. */
  required?: boolean;
  /** Currently installed release tag or 'dev'/'unknown'. */
  version?: string;
  /** Available release versions from the remote repository, newest first. */
  versions?: string[];
  /** Suggested default release version to install. */
  default?: string;
  /** Ships with the engine (always installed). */
  builtin?: boolean;
  /** Block types this toolkit provides (from toolkits.toml), so a flow with missing blocks can name the toolkit to install. */
  blocks?: string[];
  /** Set while an operation is running for this toolkit. */
  busy?: "installing" | "updating" | "uninstalling";
};

export type GraphNode = {
  id: string;
  type: string;
  params?: Record<string, ParamValue>;
  /** Its place on the Flow canvas; backends ignore it. */
  pos?: [number, number];
  ports?: PortSides;
  rotation?: 0 | 90 | 180 | 270;
  mirror?: boolean;
  /** Whether the block is commented out or bypassed. */
  commented?: boolean;
  /** Comment mode: out (omitted from execution) or through (bypassed). */
  comment_mode?: "out" | "through";
  /** User notes or documentation for this block. */
  comment?: string;
};

export type GraphEdge = {
  /** [node, port] */
  from: [string, string];
  /** [node, port] */
  to: [string, string];
  /** The wire's bends on the canvas, [x, y] each, from the source end to the target end; a wire without them is routed automatically. Saved in a project; backends ignore it. */
  points?: [number, number][];
};

/** How one instrument draws, kept in the Board layout (it changes during a run without a graph edit and saves with the project). The shape is the instrument's own, defined by the toolkit that provides it; the engine and the app only carry it. */
export type InstrumentSettings = Record<string, unknown>;

/** The Dashboard's grid: where each monitor block's instrument sits and how big it is, plus decorations (sections, separators, labels) and tabs. A backend ships one as its default (the descriptor's [dashboard]); an instrument not listed falls in where the automatic order puts it, and a block that does not exist is ignored. Decorations and tabs belong to the layout, not the flow: the Flow canvas still decides which instruments exist. */
export type DashboardLayout = {
  /** Grid columns; the UI fits fewer on a narrow screen. */
  columns?: number;
  instruments?: ({
    /** The monitor block's id. */
    block: string;
    /** compact: a readout card (1x1 cells); normal: a plot or picture to read at a glance (2x1); large: one to study (2x2); xlarge: one to fill the page with (3x3). Absent: the kind's default (display compact, graph normal, image large). */
    size?: "compact" | "normal" | "large" | "xlarge";
    /** Top-left cell: [column, row]. */
    at?: [number, number];
    /** The tab it is on (one of `tabs`); absent: the first. */
    tab?: string;
    settings?: InstrumentSettings;
  })[];
  /** Pages of the Dashboard, each with its own grid. A tab strip shows when there are two or more. Absent: one page. */
  tabs?: string[];
  /** Things that are not instruments. section: a titled frame round a group of cells (takes no cells; `at` and `span` [w, h]). hline / vline: a separator on a grid line, in the gap, along `span` columns (hline, from the top of `at`'s row) or rows (vline, down the left of `at`'s column); takes no cells. label: text that takes cells like an instrument (`span` [w, h], default [2, 1]); a section's title and a label's text may hold `{block}` or `{block:.2f}`, which show that monitor's latest value (`{{` and `}}` are braces). console: the Console's lines, in a frame that takes cells (`span` [w, h], default [4, 3]); it has no text. station: a read-only view of the Station (the 3D scene), in a frame that takes cells (`span` [w, h], default [4, 3]); it has no text and no editing. */
  decorations?: ({
    kind: "section" | "hline" | "vline" | "label" | "console" | "station" | "controls";
    /** A section's title, or a label's text. `{name}` shows the monitor block's latest value (else the variable's value), `{block:.2f}` with that many decimals; `{{` and `}}` are literal braces. */
    text?: string;
    /** Top-left cell: [column, row]. */
    at: [number, number];
    /** A separator's length in cells (a whole number); a section's, label's or console's size [columns, rows]. */
    span?: number | [number, number];
    /** A label's look: heading (default) or note. */
    style?: "heading" | "note";
    /** The tab it is on (one of `tabs`); absent: the first. */
    tab?: string;
  })[];
};

/** A group of blocks. subsystem: a block you open to see its insides, like a Simulink subsystem; its ports are the wires crossing its edge. story: a subsystem that runs as one step of a Step flow (ports in -> next): its blocks once per clock step for params.seconds (0: once), fresh each time if params.reset. visual: a frame that tidies the canvas only. Groups nest (parent); the graph's wires stay flat, block to block, so backends treat a subsystem or a frame as if it weren't there. */
export type GraphGroup = {
  id: string;
  kind: "visual" | "subsystem" | "story";
  label?: string;
  /** Its blocks (not the groups in it: those name it as their parent). */
  nodes: string[];
  /** The group it is in (a subsystem, story or frame); absent: the top level. */
  parent?: string;
  collapsed?: boolean;
  /** Its top-left on the whole canvas; backends ignore it. */
  pos?: [number, number];
  params?: {
    /** How long the story runs when a path arrives (0: once). */
    seconds?: number;
    /** Its blocks start afresh each time a path arrives (a story in a loop starts over). */
    reset?: boolean;
  };
  /** Where a subsystem's or story's ports sit on its block (ids are node::port, or in and next). Backends ignore it. */
  ports?: PortSides;
  /** Ports a subsystem or story shows as a block even where no wire crosses its edge yet, in order. Backends ignore it. */
  expose?: ({
    side: "in" | "out";
    /** [node, port] inside the group: an input for side in, an output for side out. */
    to: [string, string];
  })[];
  /** Story outputs that read as unwired after its path leaves. */
  release?: [string, string][];
};

export type Vec3 = [number, number, number];

/** A param's value: a number, true / false (a boolean param), or text (text, key and file params). Or a reference (#36): {"var": name} takes a variable's value; {"expr": formula} (number and boolean params) a formula over variables. The backend resolves references before it makes blocks and objects. */
export type ParamValue = number | boolean | string | {
  /** A variable's name. */
  var: string;
} | {
  /** A formula over number and boolean variables: + - * / ^ %, comparisons, && || ?:, sqrt, sin, min, clamp… */
  expr: string;
};

export type RunStatus = "done" | "failed" | "cancelled";

/** What a run says about a block. A Step flow sends running (a path arrived) and done (it left); a run-once sends every block queued (waiting its turn in this run) before the first runs, then running and done, or cached for a block whose outputs it reused from an earlier run (never running); any run sends failed for the block at fault. */
export type NodeState = "queued" | "running" | "done" | "cached" | "failed";

/** What a monitor says about what it watches (a Lamp): ok, warn (near its limit) or trip (past it). */
export type MonitorState = "ok" | "warn" | "trip";

/** One shape of a frame, in the frame's coordinates (y up). line: open, through p; poly: closed, through p; circle: at p[0], radius r; text: s at p[0]. Styles are view.icon tokens (stroke ink by default, fill none), never colours. */
export type FrameShape = {
  t: "line" | "poly" | "circle" | "text";
  p: [number, number][];
  /** A circle's radius. */
  r?: number;
  /** A text's text. */
  s?: string;
  stroke?: "ink" | "muted" | "signal" | "danger";
  fill?: "none" | "ink" | "raised" | "sunken" | "signal";
};

/** A small field image: w × h values row by row from the top (null: no value, such as a wall), drawn over the frame's view on a sequential scale from min to max (absent: the values' own range). At most 65536 cells. */
export type FrameField = {
  w: number;
  h: number;
  v: (number | null)[];
  min?: number;
  max?: number;
};

/** How the Station page shows the station: the built-in scene, a graph of station objects, or the backend's own page (web; page is its path on the backend's port). */
export type StationView = {
  view: "scene" | "graph" | "web";
  page?: string;
  /** Whether the Station page is offered (default true). False hides it in every view mode; the user can still show it from View. */
  visible?: boolean;
};

/** A changed entity in scene.patch: its id and what changed. */
export type EntityPatch = {
  id: string;
  shape?: "box" | "sphere" | "cylinder" | "line" | "image" | "mesh";
  pos?: Vec3;
  size?: Vec3;
  /** Radians, applied in x, y, z order. */
  rot?: Vec3;
  /** Factors on top of size. */
  scale?: Vec3;
  to?: Vec3;
  color?: string;
  /** An image's picture: a URL or a data: URL. */
  src?: string;
  /** A mesh's vertices: x, y, z each, in the entity's own frame (pos, rot and scale place it). Shape [n, 3], f32. */
  vertices?: NumberArray;
  /** A mesh's triangles: three vertex indices each, counter-clockwise seen from the front. Shape [m, 3], u32 (or i32, u8). */
  indices?: NumberArray;
  /** A field over a mesh, one number per vertex (a pressure, a stress), that the UI colours over range. Shape [n]. */
  values?: NumberArray;
  /** The values that take the low and high ends of the colour scale; absent: the field's own min and max. */
  range?: [number, number];
};

/** One form of a magic block: the ports it has in that form (signal: computes; step: branches on a Step flow's path). The block's form param picks one. */
export type Form = {
  name: string;
  inputs: PortDef[];
  outputs: PortDef[];
};

/** How a run goes. The backend's defaults come in hello.run; graph.run may override any of them except mode. */
export type RunSettings = {
  /** clock: every step for duration (and every Step flow); once: a Signal flow evaluated a single time. */
  mode?: "clock" | "once";
  /** Run length, s (0: run indefinitely until cancelled or stopped; a Step flow: its limit). */
  duration?: number;
  /** Clock step, s. */
  dt?: number;
  /** Times real time (1: as the clock goes; 0: as fast as it can). */
  speed?: number;
  /** The run's solver: what a block or station object whose own solver is auto integrates with. cvode and ida (implicit, for stiff systems) need an engine built with SUNDIALS. */
  solver?: "rk4" | "rk45" | "rk2" | "euler" | "discrete" | "cvode" | "ida";
  /** The solvers this engine has (solve::names()), the default first. In hello.run only: the UI offers these and hides the rest. */
  solvers?: string[];
  /** The run's solver options (#196); each left out keeps the backend's. */
  solver_options?: {
    /** Relative tolerance (rk45, cvode, ida). */
    rtol?: number;
    /** Absolute tolerance (rk45, cvode, ida). */
    atol?: number;
    /** Smallest sub-step, s, before rk45, cvode or ida gives up (0: automatic). */
    min_step?: number;
    /** Largest rk45, cvode or ida sub-step, s (0: the clock step). */
    max_step?: number;
    /** rk45, cvode or ida sub-steps in one clock step before it gives up. */
    max_steps?: number;
    /** Fixed sub-steps per clock step (rk4, rk2, euler). */
    sub_steps?: number;
  };
};

/** A named, typed value (#36), used by reference in block params and station props. Exactly one of value and expr. */
export type Variable = {
  /** Letters, digits and _; not t, pi, e or a function's name. */
  name: string;
  type: "number" | "boolean" | "enum" | "text" | "file";
  /** Of its type: a number, true / false, or text (enum: one of options). */
  value?: number | boolean | string;
  /** A number or boolean variable's formula over other variables, instead of a value. */
  expr?: string;
  /** A number's unit (m, N, rad…). */
  unit?: string;
  min?: number;
  max?: number;
  /** How much one nudge in the UI changes it. */
  step?: number;
  /** A whole number. */
  whole?: boolean;
  /** An enum's choices. */
  options?: string[];
  /** One line: what it's for. */
  note?: string;
  /** Where it's listed (Cart-pole, Controller…). */
  group?: string;
  /** Also a control on the Dashboard (a Controls tile), for operators. */
  exposed?: boolean;
  /** Also a control in the run dock. */
  dock?: boolean;
  /** A number or boolean (not a formula) that can change during a run: the blocks bound to it take the new value live if they can. */
  tunable?: boolean;
};

/** The variables of a backend (its defaults) or the user's. */
export type Variables = Variable[];

/** Where a block's ports sit on the Flow canvas: the port ids on each side, in order. A port not listed keeps its place (inputs on the left, outputs on the right, after the listed ones). Backends ignore it. */
export type PortSides = {
  left?: string[];
  right?: string[];
  top?: string[];
  bottom?: string[];
};

/** A project file (#82): everything a user made, as one JSON file (name.ppj). It is not a protocol message; the UI writes and reads it. flow, station, variables and dashboard are the shapes the protocol already uses. A block whose type the opening backend lacks stays as a lost block, params and wires kept. */
export type Project = {
  /** The project format version. Opening refuses a newer one and says so. */
  paperboat: 0;
  /** The engine the project was made on (hello.engine). Opening it on another backend warns first. */
  backend: string;
  /** The Flow canvas, groups included; every node has its place (pos). */
  flow: Graph;
  station?: Station;
  /** The user's variables: the list the Variables sheet shows. */
  variables?: Variables;
  /** The user's Dashboard arrangement, if they made one. */
  dashboard?: DashboardLayout;
  /** Only the run settings the user changed from the backend's defaults. */
  run?: RunSettings;
  /** Optional UI preferences and restrictions saved with the project (#104). */
  ui?: {
    /** Lock down parts of the UI behind an optional passcode (#104). */
    lock?: {
      /** When true, lock the Board's Arrange button and command. */
      arrange?: boolean;
      /** Allowed page ids ('station', 'flow', 'dashboard'). */
      pages?: string[];
      /** Allowed view mode ids ('navigator', 'commander', 'lookout'). */
      modes?: string[];
      /** Salted hash of the unlock passcode. */
      passcode?: {
        algo: string;
        salt: string;
        hash: string;
      };
    };
  };
};

/** Binary frames (#18): an array's element type, little-endian. f32, f64: IEEE floats; i32, u32: 32-bit integers; u8: bytes. */
export type DType = "f32" | "f64" | "i32" | "u32" | "u8";

/** Binary frames (#18): where a message has a typed array, a client that asked for binary frames gets this in its place. The frame whose descriptor has this id came over the same WebSocket right before the message. */
export type BinaryRef = {
  /** The binary frame's id (its descriptor's id), unique on this connection. */
  binary: string;
};

/** Binary frames (#18): a typed array. JSON numbers, flat and row-major, for a client without binary frames; a BinaryRef for one with them. */
export type NumberArray = number[] | BinaryRef;

/** Binary frames (#18): the JSON descriptor inside a binary frame (protocol/README.md, Binary frames): which array it is and how to read its payload. */
export type BinaryFrameDescriptor = {
  /** What the BinaryRef in the next text message names. */
  id: string;
  dtype: DType;
  /** The array's dimensions, row-major; the payload holds their product of elements. */
  shape: number[];
  /** Where the reference sits in that message, as a JSON pointer (/entities/0/vertices); for logs and tools. */
  path?: string;
  /** How the payload is packed; absent means none, the only one in layout 1. A decoder refuses one it doesn't know. */
  compression?: "none";
};

/** Every message a backend sends. */
export type ServerMsg =
  | {
    type: "hello";
    protocol: "paperboat/0";
    engine: string;
    /** The Paperboat build that serves this backend (PAPERBOAT_VERSION). Absent: an older backend. */
    version?: string;
    station?: StationView;
    run?: RunSettings;
    /** Available optional toolkits and their installed status on this machine. */
    toolkits?: ToolkitStatus[];
    /** The binary frame layout this backend sends to this connection (1), present only when the client asked with ?binary=1 in its WebSocket URL: typed arrays come as binary frames and BinaryRef references. Absent: every array is JSON numbers. */
    binary?: number;
    /** The flow types this backend offers (#9): what a sheet may be. Absent (an older backend): a Signal flow, and a Step flow if a block has step ports. */
    flows?: FlowType[];
  }
  | {
    type: "catalog";
    blocks: BlockDef[];
    objects?: ObjectDef[];
    connectors?: Connectors;
    dashboard?: DashboardLayout;
  }
  | {
    type: "scene";
    entities: Entity[];
    view?: View;
  }
  | {
    type: "scene.patch";
    entities: EntityPatch[];
  }
  | {
    type: "graph.load";
    graph: Graph;
  }
  | {
    type: "station.load";
    station: Station;
  }
  | {
    type: "variables.load";
    variables: Variables;
  }
  | {
    type: "project.load";
    name?: string;
    project: Project;
  }
  | {
    type: "variables.values";
    /** Each variable's resolved value, by name. */
    values: Record<string, number | boolean | string>;
    error?: string;
    at?: string;
  }
  | {
    type: "variables.patch";
    /** The variables that changed, by name, with their new values. */
    values: Record<string, number | boolean | string>;
  }
  | {
    type: "run.started";
    run: string;
  }
  | {
    type: "run.progress";
    run: string;
    fraction: number;
  }
  | {
    type: "run.finished";
    run: string;
    status: RunStatus;
  }
  | {
    type: "run.speed";
    /** Times real time (1: as the clock goes; 0: as fast as it can), as RunSettings.speed. */
    speed: number;
    /** The run that took it (backend → UI only). */
    run?: string;
  }
  | {
    type: "signal";
    node: string;
    t: number;
    /** The latest scalar or text sample, or a whole numeric vector: on a Display, and on a Graph in a clock run (one trace per component). */
    v: number | string | number[];
    /** Labels and units for a vector sample, in vector order. */
    components?: VectorComponent[];
    /** The monitor's input this sample came in by, for one with several (a scope's a, b…). Absent: in. */
    port?: string;
  }
  | {
    type: "node.state";
    node: string;
    state: NodeState;
  }
  | {
    type: "node.progress";
    node: string;
    fraction: number;
  }
  | {
    type: "metric";
    node: string;
    /** The series' name, one of the block's own. */
    series: string;
    /** The block's x (an iteration), or the series' next index (0, 1, 2…) when it gave none. */
    x: number;
    y: number;
    /** y's unit. */
    unit?: string;
  }
  | {
    type: "monitor.state";
    node: string;
    state: MonitorState;
    /** When it changed: the run clock (as a signal's t), for a marker on the scope. */
    t: number;
    /** The value that changed it (tripped it). */
    v?: number;
    /** The input it is about, for a monitor of several. Absent: in. */
    port?: string;
  }
  | {
    type: "frame";
    node: string;
    /** The run clock when it was drawn. */
    t: number;
    /** The area shown, [xmin, ymin, xmax, ymax], y up. Absent: what fits the shapes. */
    view?: [number, number, number, number];
    shapes?: FrameShape[];
    field?: FrameField;
  }
  | {
    type: "log";
    level: "info" | "warn" | "error";
    text: string;
    node?: string;
  }
  | {
    type: "toolkits.status";
    toolkits: ToolkitStatus[];
  };

/** Every message the UI sends. */
export type ClientMsg =
  | {
    type: "graph.run";
    graph: Graph;
    station?: Station;
    settings?: RunSettings;
    /** The variables the graph's and station's references use; absent: the last ones set. */
    variables?: Variables;
  }
  | {
    type: "station.set";
    station: Station;
  }
  | {
    type: "variables.set";
    variables: Variables;
  }
  | {
    type: "run.cancel";
  }
  | {
    type: "run.speed";
    /** Times real time (1: as the clock goes; 0: as fast as it can), as RunSettings.speed. */
    speed: number;
    /** The run that took it (backend → UI only). */
    run?: string;
  }
  | {
    type: "input";
    key: string;
    down: boolean;
  }
  | {
    type: "backend.restart";
  }
  | {
    type: "toolkit.install";
    name: string;
    /** Release tag (e.g. 0.1.0) or 'dev' for main branch. Absent: latest release or dev. */
    version?: string;
  }
  | {
    type: "toolkit.versions";
    name: string;
  }
  | {
    type: "toolkit.update";
    name: string;
  }
  | {
    type: "toolkit.uninstall";
    name: string;
  };
