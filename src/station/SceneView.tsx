import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Entity, View } from "../protocol.ts";
import { fieldColors, meshGeometry, meshLook, paintField, srgbToLinear } from "./meshes.ts";
import { viewCube } from "../viewCube.ts";
import { viewAxes } from "./viewAxes.ts";

/** A counter that changes with `data-theme`: the scene reads CSS tokens only when it is built. */
function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((value) => value + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return version;
}

/** `look` is what the geometry and material were built from; when it changes, rebuild. */
type World = { scene: THREE.Scene; objects: Map<string, { obj: THREE.Object3D; look: string }> };

/** A text label in the scene (an axis tick); sprites always face the camera. */
export type SceneLabel = { text: string; pos: [number, number, number]; color?: string; size?: number };

export type SceneCameraState = {
  eye: [number, number, number];
  target: [number, number, number];
};

export type ScenePlotPick = {
  point: [number, number, number];
  layerId: string;
};

/** Pre-transformed Y-up scientific plot geometry (surfaces, wireframes, lines, segments, points). */
export type ScenePlotLayer =
  | {
      id: string;
      pickable?: boolean;
      kind: "surface" | "mesh";
      positions: Float32Array;
      indices?: Uint32Array;
      nx?: number;
      ny?: number;
      values?: Float32Array;
      colorrange?: [number, number];
      colormap?: string | readonly (readonly number[])[];
      vertexColors?: Float32Array;
      color?: string;
      alpha?: number;
      shading?: string;
      strokewidth?: number;
      strokecolor?: string;
    }
  | {
      id: string;
      pickable?: boolean;
      kind: "line" | "linesegments";
      positions: Float32Array;
      indices?: Uint32Array;
      vertexColors?: Float32Array;
      color?: string;
      linewidth?: number;
      alpha?: number;
    }
  | {
      id: string;
      pickable?: boolean;
      kind: "points";
      positions: Float32Array;
      vertexColors?: Float32Array;
      color?: string;
      size?: number;
      alpha?: number;
    };

function makeDiscTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 32, 32);
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(16, 16, 13, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function srgbFloatArrayToLinear(rgb: Float32Array): Float32Array {
  const out = new Float32Array(rgb.length);
  for (let i = 0; i < rgb.length; i++) out[i] = srgbToLinear(rgb[i]);
  return out;
}

function surfaceQuadWireframeGeometry(positions: Float32Array, nx: number, ny: number, indices?: Uint32Array): THREE.BufferGeometry {
  const n = nx * ny;
  const valid = new Uint8Array(n);
  if (indices && indices.length > 0) {
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (idx < n) valid[idx] = 1;
    }
  } else {
    valid.fill(1);
  }
  const stride = Math.max(1, Math.floor(Math.max(nx, ny) / 48));
  const segIdx: number[] = [];
  for (let j = 0; j < ny; j += stride) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      if (valid[a] && valid[b]) segIdx.push(a, b);
    }
  }
  for (let i = 0; i < nx; i += stride) {
    for (let j = 0; j < ny - 1; j++) {
      const a = j * nx + i;
      const b = a + nx;
      if (valid[a] && valid[b]) segIdx.push(a, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex(segIdx);
  return geo;
}

function buildPlotObject(layer: ScenePlotLayer, pointTexture: THREE.Texture | null): THREE.Object3D {
  if (layer.kind === "surface" || layer.kind === "mesh") {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(layer.positions, 3));
    if (layer.indices && layer.indices.length > 0) {
      geo.setIndex(new THREE.BufferAttribute(layer.indices, 1));
    }
    geo.computeVertexNormals();
    const alpha = layer.alpha ?? 1;
    let hasVertexColors = false;
    if (layer.values && layer.values.length * 3 === layer.positions.length) {
      geo.setAttribute("color", new THREE.BufferAttribute(fieldColors(layer.values, layer.colorrange, layer.colormap), 3));
      hasVertexColors = true;
    } else if (layer.vertexColors && layer.vertexColors.length === layer.positions.length) {
      geo.setAttribute("color", new THREE.BufferAttribute(srgbFloatArrayToLinear(layer.vertexColors), 3));
      hasVertexColors = true;
    }
    const hasWire = (layer.strokewidth ?? 0) > 0;
    const matOpts: THREE.MeshStandardMaterialParameters & THREE.MeshBasicMaterialParameters = {
      color: hasVertexColors ? 0xffffff : new THREE.Color(layer.color ?? "#0072BD"),
      vertexColors: hasVertexColors,
      side: THREE.DoubleSide,
      transparent: alpha < 0.999,
      opacity: alpha,
      depthWrite: alpha >= 0.999,
      polygonOffset: hasWire,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    };
    const mat =
      layer.shading === "false"
        ? new THREE.MeshBasicMaterial(matOpts)
        : new THREE.MeshStandardMaterial({ ...matOpts, roughness: 0.55, metalness: 0.05 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = alpha < 0.999 ? 5 : 1;
    if (hasWire) {
      const wireGeo =
        layer.kind === "surface" && layer.nx && layer.ny
          ? surfaceQuadWireframeGeometry(layer.positions, layer.nx, layer.ny, layer.indices)
          : new THREE.WireframeGeometry(geo);
      const wire = new THREE.LineSegments(
        wireGeo,
        new THREE.LineBasicMaterial({
          color: new THREE.Color(layer.strokecolor && layer.strokecolor !== "transparent" ? layer.strokecolor : "#262626"),
          transparent: true,
          opacity: 0.45,
        }),
      );
      wire.renderOrder = mesh.renderOrder + 1;
      mesh.add(wire);
    }
    return mesh;
  }

  if (layer.kind === "line" || layer.kind === "linesegments") {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(layer.positions, 3));
    if (layer.indices && layer.indices.length > 0) {
      geo.setIndex(new THREE.BufferAttribute(layer.indices, 1));
    }
    let hasVertexColors = false;
    if (layer.vertexColors && layer.vertexColors.length === layer.positions.length) {
      geo.setAttribute("color", new THREE.BufferAttribute(srgbFloatArrayToLinear(layer.vertexColors), 3));
      hasVertexColors = true;
    }
    const alpha = layer.alpha ?? 1;
    const mat = new THREE.LineBasicMaterial({
      color: hasVertexColors ? 0xffffff : new THREE.Color(layer.color ?? "#0072BD"),
      vertexColors: hasVertexColors,
      transparent: alpha < 0.999,
      opacity: alpha,
    });
    const obj = layer.kind === "linesegments" ? new THREE.LineSegments(geo, mat) : new THREE.Line(geo, mat);
    obj.renderOrder = 3;
    return obj;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(layer.positions, 3));
  let hasVertexColors = false;
  if (layer.vertexColors && layer.vertexColors.length === layer.positions.length) {
    geo.setAttribute("color", new THREE.BufferAttribute(srgbFloatArrayToLinear(layer.vertexColors), 3));
    hasVertexColors = true;
  }
  const alpha = layer.alpha ?? 1;
  const pxScale = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const sizePx = layer.kind === "points" ? (layer.size ?? 6) : 6;
  const mat = new THREE.PointsMaterial({
    size: Math.max(3, sizePx * pxScale),
    sizeAttenuation: false,
    map: pointTexture ?? undefined,
    alphaTest: pointTexture ? 0.15 : 0,
    transparent: true,
    opacity: alpha,
    vertexColors: hasVertexColors,
    color: hasVertexColors ? 0xffffff : new THREE.Color(layer.color ?? "#0072BD"),
  });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = 4;
  return pts;
}

function disposePlotObject(obj: THREE.Object3D) {
  for (const child of obj.children) disposePlotObject(child);
  if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
    obj.geometry.dispose();
    const mat = obj.material as THREE.Material;
    mat.dispose();
  }
}

function textSprite(label: SceneLabel): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const font = "500 28px Helvetica, Arial, sans-serif";
  const measureCtx = canvas.getContext("2d")!;
  measureCtx.font = font;
  const textW = Math.ceil(measureCtx.measureText(label.text).width);
  canvas.width = Math.max(64, textW + 24);
  canvas.height = 56;
  const g = canvas.getContext("2d")!;
  g.fillStyle = label.color ?? "#262626";
  g.font = font;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label.text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const size = label.size ?? 0.055;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
  sprite.scale.set(size * (canvas.width / canvas.height), size, 1);
  sprite.position.set(...label.pos);
  sprite.renderOrder = 30;
  return sprite;
}

const lookOf = (e: Entity) => JSON.stringify([e.shape, e.size, e.color, e.src, e.shape === "mesh" ? meshLook(e) : null, e.wireframe, e.wireframeColor, e.overlay, e.colormap]);

function dispose(obj: THREE.Object3D) {
  for (const child of obj.children) {
    if (child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  }
  if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
    obj.geometry.dispose();
    const material = obj.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
  }
}

function createObject(e: Entity, flat = false): THREE.Object3D {
  // An entity with no colour of its own takes the theme's muted ink.
  const color = new THREE.Color(e.color ?? (getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim() || "#888888"));
  if (e.shape === "line") {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
      color,
      depthTest: !e.overlay,
      depthWrite: !e.overlay,
      transparent: !!e.overlay,
    }));
    if (e.overlay) line.renderOrder = 10;
    return line;
  }
  if (e.shape === "image") {
    const [w, h] = e.size ?? [1, 1];
    const texture = new THREE.TextureLoader().load(e.src ?? "");
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture }));
  }
  if (e.shape === "mesh") {
    const geometry = meshGeometry(e);
    const field = geometry.getAttribute("color") !== undefined;
    const options = {
      color: field ? 0xffffff : color, vertexColors: field, side: THREE.DoubleSide,
      polygonOffset: !!e.wireframe, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    };
    const mesh = new THREE.Mesh(geometry, flat ? new THREE.MeshBasicMaterial(options) : new THREE.MeshStandardMaterial(options));
    if (e.wireframe) {
      const ink = e.wireframeColor ?? (getComputedStyle(document.documentElement).getPropertyValue("--line-ink").trim() || "#111111");
      mesh.add(new THREE.LineSegments(
        new THREE.WireframeGeometry(geometry),
        new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.35 }),
      ));
    }
    return mesh;
  }
  const [a, b, c] = e.size ?? [1, 1, 1];
  const geometry =
    e.shape === "sphere" ? new THREE.SphereGeometry(a, 24, 16)
    : e.shape === "cylinder" ? new THREE.CylinderGeometry(a, a, b, 24) // radius size[0], length size[1] along y
    : new THREE.BoxGeometry(a, b, c);
  return new THREE.Mesh(geometry, flat ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color }));
}

function applyEntity(obj: THREE.Object3D, e: Entity) {
  if (obj instanceof THREE.Line) {
    const attr = obj.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.setXYZ(0, ...e.pos);
    attr.setXYZ(1, ...(e.to ?? e.pos));
    attr.needsUpdate = true;
  } else {
    if (e.shape === "mesh" && obj instanceof THREE.Mesh) paintField(obj.geometry, e);
    obj.position.set(...e.pos);
    obj.rotation.set(...(e.rot ?? [0, 0, 0]));
    obj.scale.set(...(e.scale ?? [1, 1, 1]));
  }
}

/**
 * Renders the backend's scene entities. Knows shapes, not domains. The camera is fixed
 * at mount from `view`, so the parent remounts this component when the view changes.
 */
export function SceneView({
  entities,
  view,
  grid,
  projection = "persp",
  axes = false,
  cube: cubeMode = "normal",
  floorGrid: showFloorGrid = true,
  background,
  labels,
  plots,
  pickedPoint,
  onCameraChange,
  onPlotPick,
}: {
  entities: Record<string, Entity>;
  view: View;
  grid: boolean;
  projection?: "persp" | "iso";
  axes?: boolean;
  /** Compact mode shrinks & dims the CAD view cube until hovered (used by 3D plots). */
  cube?: "normal" | "compact";
  /** Show the Station floor GridHelper in 3D mode (defaults to true). */
  floorGrid?: boolean;
  /** Override the theme's scene background, e.g. white paper for a chart. */
  background?: string;
  labels?: readonly SceneLabel[];
  plots?: readonly ScenePlotLayer[];
  pickedPoint?: readonly [number, number, number] | null;
  onCameraChange?: (cam: SceneCameraState) => void;
  onPlotPick?: (pick: ScenePlotPick | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const themeVersion = useThemeVersion();
  const world = useRef<World | null>(null);
  const labelGroup = useRef<THREE.Group | null>(null);
  const plotGroup = useRef<THREE.Group | null>(null);
  const pickDotRef = useRef<THREE.Mesh | null>(null);
  const pointTexture = useRef<THREE.CanvasTexture | null>(null);
  const onCameraChangeRef = useRef(onCameraChange);
  onCameraChangeRef.current = onCameraChange;
  const onPlotPickRef = useRef(onPlotPick);
  onPlotPickRef.current = onPlotPick;
  // The floor grid (3D only) shows or hides without rebuilding the view.
  const floorGrid = useRef<THREE.GridHelper | null>(null);
  const showGrid = useRef(grid);
  const switchProjection = useRef<((proj: "persp" | "iso") => void) | null>(null);
  useEffect(() => {
    showGrid.current = grid;
    if (floorGrid.current) floorGrid.current.visible = grid;
  }, [grid]);

  useEffect(() => {
    switchProjection.current?.(projection);
  }, [projection]);

  useEffect(() => {
    const el = host.current!;
    // preserveDrawingBuffer keeps the frame readable for PNG/SVG/PDF/EPS export.
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    // The theme's colours (tokens.css); the view is rebuilt when the theme changes.
    const css = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    scene.background = new THREE.Color(background ?? token("--scene-bg", "#e3e3df"));
    // Light is white in both themes: it is physics, not theme.
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(3, 5, 4);
    scene.add(new THREE.AmbientLight(0xffffff, 1.25), keyLight);
    pointTexture.current = makeDiscTexture();

    let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    let fit: (aspect: number) => void;
    if (view.mode === "2d") {
      const [cx, cy] = view.center;
      const ortho = new THREE.OrthographicCamera();
      ortho.position.set(cx, cy, 10);
      fit = (aspect) => {
        const h = view.height / 2;
        Object.assign(ortho, { left: -h * aspect, right: h * aspect, top: h, bottom: -h, near: 0.1, far: 100 });
      };
      camera = ortho;
    } else {
      const gridColor = token("--scene-grid", "#a9a9a3");
      if (showFloorGrid) {
        const floor = new THREE.GridHelper(10, 10, gridColor, gridColor);
        floor.visible = showGrid.current;
        floor.position.y = view.floor ?? 0;
        floorGrid.current = floor;
        scene.add(floor);
      } else {
        floorGrid.current = null;
      }
      // The backend may say where the camera opens (and so where Home returns): view.camera.
      const cam = view.camera;
      const fov = cam?.fov ?? 50;
      const eyePos = cam?.eye ?? [2, 4, 8];
      const targetPos = cam?.target ?? [0, 0, 0];
      const initialDist = new THREE.Vector3(...eyePos).distanceTo(new THREE.Vector3(...targetPos));
      const initialH = Math.max(0.1, initialDist * Math.tan((fov * Math.PI) / 360));

      const persp = new THREE.PerspectiveCamera(fov, 1, 0.05, 1000);
      persp.position.set(...eyePos);

      const ortho = new THREE.OrthographicCamera(-initialH, initialH, initialH, -initialH, 0.05, 1000);
      ortho.position.set(...eyePos);

      camera = projection === "iso" ? ortho : persp;

      fit = (aspect) => {
        persp.aspect = aspect;
        persp.updateProjectionMatrix();
        const curDist = controls ? camera.position.distanceTo(controls.target) : initialDist;
        const curH = Math.max(0.1, curDist * Math.tan((fov * Math.PI) / 360));
        ortho.left = -curH * aspect;
        ortho.right = curH * aspect;
        ortho.top = curH;
        ortho.bottom = -curH;
        ortho.updateProjectionMatrix();
      };
    }
    const controls = new OrbitControls(camera, renderer.domElement);
    if (view.mode === "2d") {
      controls.target.set(view.center[0], view.center[1], 0);
      controls.enableRotate = false;
    } else if (view.camera?.target) {
      controls.target.set(...view.camera.target);
    }
    controls.update(); // look at the target before the view cube takes it as home
    world.current = { scene, objects: new Map() };

    let lastCam: SceneCameraState = {
      eye: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
    };
    const emitCamera = () => {
      const cb = onCameraChangeRef.current;
      if (!cb) return;
      const e = camera.position;
      const t = controls.target;
      const same =
        Math.abs(e.x - lastCam.eye[0]) < 1e-5 &&
        Math.abs(e.y - lastCam.eye[1]) < 1e-5 &&
        Math.abs(e.z - lastCam.eye[2]) < 1e-5 &&
        Math.abs(t.x - lastCam.target[0]) < 1e-5 &&
        Math.abs(t.y - lastCam.target[1]) < 1e-5 &&
        Math.abs(t.z - lastCam.target[2]) < 1e-5;
      if (same) return;
      lastCam = { eye: [e.x, e.y, e.z], target: [t.x, t.y, t.z] };
      cb(lastCam);
    };
    controls.addEventListener("change", emitCamera);

    if (view.mode === "3d") {
      switchProjection.current = (proj) => {
        const aspect = el.clientWidth / Math.max(el.clientHeight, 1);
        const fov = view.camera?.fov ?? 50;
        const curDist = camera.position.distanceTo(controls.target);
        const curH = Math.max(0.1, curDist * Math.tan((fov * Math.PI) / 360));
        if (proj === "iso" && camera instanceof THREE.PerspectiveCamera) {
          const ortho = new THREE.OrthographicCamera(-curH * aspect, curH * aspect, curH, -curH, 0.05, 1000);
          ortho.position.copy(camera.position);
          ortho.quaternion.copy(camera.quaternion);
          ortho.zoom = 1;
          ortho.updateProjectionMatrix();
          camera = ortho;
          controls.object = ortho;
          controls.update();
        } else if (proj === "persp" && camera instanceof THREE.OrthographicCamera) {
          const persp = new THREE.PerspectiveCamera(fov, aspect, 0.05, 1000);
          const offset = camera.position.clone().sub(controls.target).divideScalar(Math.max(camera.zoom, 1e-4));
          persp.position.copy(controls.target).add(offset);
          persp.quaternion.copy(camera.quaternion);
          persp.updateProjectionMatrix();
          camera = persp;
          controls.object = persp;
          controls.update();
        }
      };
    }

    // 3D only: the view cube in the corner and the orientation triad (hidden in 2D views).
    const cube = view.mode === "3d"
      ? viewCube(el, renderer, () => camera, controls, token, { compact: cubeMode === "compact" })
      : null;
    const triad = view.mode === "3d" && axes ? viewAxes(el, renderer, () => camera, token) : null;
    renderer.autoClear = false;

    const pickDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff6a2b, depthTest: false }),
    );
    pickDot.renderOrder = 25;
    pickDot.visible = Boolean(pickedPoint);
    if (pickedPoint) pickDot.position.set(pickedPoint[0], pickedPoint[1], pickedPoint[2]);
    scene.add(pickDot);
    pickDotRef.current = pickDot;

    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.06;
    raycaster.params.Points.threshold = 0.06;
    const ndc = new THREE.Vector2();
    let clickDown: { x: number; y: number } | null = null;
    const onCanvasPointerDown = (e: PointerEvent) => {
      clickDown = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
    };
    const onCanvasPointerCancel = () => {
      clickDown = null;
    };
    const onCanvasPointerUp = (e: PointerEvent) => {
      const start = clickDown;
      clickDown = null;
      if (e.button !== 0 || !start || !plotGroup.current) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4) return;
      if (!onPlotPickRef.current && pickedPoint === undefined) return;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const targets = plotGroup.current.children.filter((c) => c.userData.pickable !== false);
      const hits = raycaster.intersectObjects(targets, true).filter(
        (h) => !(h.object instanceof THREE.LineSegments && h.object.parent instanceof THREE.Mesh),
      );
      const hit = hits[0];
      if (!hit) {
        pickDot.visible = false;
        onPlotPickRef.current?.(null);
        return;
      }
      let root: THREE.Object3D | null = hit.object;
      while (root && root.parent !== plotGroup.current) root = root.parent;
      const layerId = String(root?.userData.plotId ?? "");
      pickDot.position.copy(hit.point);
      pickDot.visible = true;
      onPlotPickRef.current?.({ point: [hit.point.x, hit.point.y, hit.point.z], layerId });
    };
    renderer.domElement.addEventListener("pointerdown", onCanvasPointerDown);
    renderer.domElement.addEventListener("pointerup", onCanvasPointerUp);
    renderer.domElement.addEventListener("pointercancel", onCanvasPointerCancel);

    const resize = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      fit(el.clientWidth / Math.max(el.clientHeight, 1));
      camera.updateProjectionMatrix();
    });
    resize.observe(el);
    renderer.setAnimationLoop(() => {
      controls.update();
      if (pickDot.visible) {
        const s = camera instanceof THREE.OrthographicCamera
          ? Math.max(0.35, Math.min(2.5, 1 / Math.max(camera.zoom, 0.2)))
          : Math.max(0.35, Math.min(2.5, camera.position.distanceTo(controls.target) / 3.8));
        pickDot.scale.setScalar(s);
      }
      renderer.clear();
      renderer.render(scene, camera);
      cube?.draw(el.clientWidth, el.clientHeight);
      triad?.draw(el.clientWidth, el.clientHeight);
    });

    return () => {
      switchProjection.current = null;
      controls.removeEventListener("change", emitCamera);
      renderer.domElement.removeEventListener("pointerdown", onCanvasPointerDown);
      renderer.domElement.removeEventListener("pointerup", onCanvasPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onCanvasPointerCancel);
      renderer.setAnimationLoop(null);
      resize.disconnect();
      cube?.dispose();
      triad?.dispose();
      controls.dispose();
      pickDot.geometry.dispose();
      (pickDot.material as THREE.Material).dispose();
      pickDotRef.current = null;
      if (plotGroup.current) {
        for (const child of [...plotGroup.current.children]) disposePlotObject(child);
        plotGroup.current = null;
      }
      pointTexture.current?.dispose();
      pointTexture.current = null;
      renderer.dispose();
      el.removeChild(renderer.domElement);
      world.current = null;
      labelGroup.current = null;
      floorGrid.current = null;
    };
  }, [themeVersion, background, showFloorGrid]); // eslint-disable-line react-hooks/exhaustive-deps -- view is read once per build

  useEffect(() => {
    const w = world.current;
    if (!w) return;
    for (const [id, { obj, look }] of w.objects) {
      const e = entities[id];
      if (!e || lookOf(e) !== look) {
        w.scene.remove(obj);
        dispose(obj);
        w.objects.delete(id);
      }
    }
    for (const e of Object.values(entities)) {
      let entry = w.objects.get(e.id);
      if (!entry) {
        entry = { obj: createObject(e, view.mode === "2d"), look: lookOf(e) };
        w.objects.set(e.id, entry);
        w.scene.add(entry.obj);
      }
      applyEntity(entry.obj, e);
    }
  }, [entities, themeVersion]);

  useEffect(() => {
    const scene = world.current?.scene;
    if (!scene) return;
    let group = plotGroup.current;
    if (!group) {
      group = new THREE.Group();
      plotGroup.current = group;
      scene.add(group);
    }
    for (const child of [...group.children]) {
      group.remove(child);
      disposePlotObject(child);
    }
    for (const layer of plots ?? []) {
      const obj = buildPlotObject(layer, pointTexture.current);
      obj.userData.plotId = layer.id;
      obj.userData.pickable = layer.pickable !== false;
      group.add(obj);
    }
  }, [plots, themeVersion, background, showFloorGrid]);

  useEffect(() => {
    const dot = pickDotRef.current;
    if (!dot) return;
    if (pickedPoint) {
      dot.position.set(pickedPoint[0], pickedPoint[1], pickedPoint[2]);
      dot.visible = true;
    } else if (pickedPoint === null) {
      dot.visible = false;
    }
  }, [pickedPoint]);

  useEffect(() => {
    const scene = world.current?.scene;
    if (!scene) return;
    let group = labelGroup.current;
    if (!group) {
      group = new THREE.Group();
      labelGroup.current = group;
      scene.add(group);
    }
    for (const child of [...group.children]) {
      const sprite = child as THREE.Sprite;
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      (sprite.material as THREE.Material).dispose();
      group.remove(sprite);
    }
    for (const label of labels ?? []) group.add(textSprite(label));
  }, [labels, themeVersion, background, showFloorGrid]);

  return <div className="scene" ref={host} />;
}
