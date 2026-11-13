// The 3D view cube shared by Paperboat's Station and Squero Studio's 3D view: `@paperboat/shared/viewCube`
// (its own entry, so apps without three never load it). Styles: `.view-cube-home` in plates.css.

import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Side of the cube's corner of the scene, and its distance from the edges, in px. */
const SIZE = 96;
const MARGIN = 8;
const HOME = 26; // the Home key's size
const COMPACT_IDLE = 44;
const COMPACT_HOVER = 84;
const COMPACT_MARGIN = 6;
const COMPACT_HOME = 20;
const COMPACT_IDLE_ALPHA = 0.28;
const THIRD = 1 / 3;

export type ViewCubeOptions = {
  /** Compact 3D plot mode: smaller & semi-transparent at rest, expanding & brightening on hover. */
  compact?: boolean;
};

/**
 * A view cube in the scene's top-right corner, as in a CAD tool: it shows the camera's
 * orientation. Click a face, an edge or a corner to turn the camera to look from there,
 * drag it to orbit, Home puts the camera back as it was at mount. The cube is a small
 * scene drawn by the same renderer; a transparent overlay takes the pointer, so the
 * scene's own controls never see it. Call `draw` after rendering the scene, `dispose`
 * on unmount.
 */
export function viewCube(
  host: HTMLElement,
  renderer: THREE.WebGLRenderer,
  getCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera | (() => THREE.PerspectiveCamera | THREE.OrthographicCamera),
  controls: OrbitControls,
  token: (name: string, fallback: string) => string,
  options?: ViewCubeOptions,
) {
  const compact = Boolean(options?.compact);
  const margin = compact ? COMPACT_MARGIN : MARGIN;
  const homeSize = compact ? COMPACT_HOME : HOME;
  const idleSize = compact ? COMPACT_IDLE : SIZE;
  const hoverSize = compact ? COMPACT_HOVER : SIZE;
  const idleAlpha = compact ? COMPACT_IDLE_ALPHA : 1;

  const getCam = () => (typeof getCamera === "function" ? getCamera() : getCamera);
  const home = { position: getCam().position.clone(), target: controls.target.clone() };

  // The cube is a wireframe: faint faces for picking, ink edges, and the x/y/z axes on the
  // negative vertex. It turns with the scene camera, so the face shown is the view you are on.
  const scene = new THREE.Scene();
  const faceMat = new THREE.MeshBasicMaterial({
    color: token("--line-ink", "#111111"),
    transparent: true,
    opacity: compact ? 0.015 : 0.03,
    depthWrite: false,
  });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), faceMat);
  const edgeMat = new THREE.LineBasicMaterial({
    color: token("--text-muted", "#8a8a84"),
    transparent: compact,
    opacity: idleAlpha,
  });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), edgeMat);

  const label = (text: string, color: string): THREE.Sprite => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const g = canvas.getContext("2d")!;
    g.fillStyle = color;
    g.font = "600 30px ui-monospace, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 32, 34);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: idleAlpha, depthTest: false }),
    );
    sprite.scale.set(0.28, 0.28, 1);
    return sprite;
  };
  const origin = new THREE.Vector3(-0.5, -0.5, -0.5);
  const axisSpecs = [
    { dir: [1, 0, 0], name: "x", color: "#e5484d" },
    { dir: [0, 1, 0], name: "y", color: "#30a46c" },
    { dir: [0, 0, 1], name: "z", color: "#3e63dd" },
  ];
  const shaftLen = 0.90;
  const headLen = 0.16;
  const shaftGeom = new THREE.CylinderGeometry(0.022, 0.022, shaftLen, 12);
  const headGeom = new THREE.ConeGeometry(0.056, headLen, 12);
  const up = new THREE.Vector3(0, 1, 0);
  const axes = axisSpecs.map(({ dir, name, color }) => {
    const v = new THREE.Vector3(...dir);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      depthTest: false,
      ...(compact ? { transparent: true, opacity: idleAlpha } : {}),
    });
    const arrow = new THREE.Group();
    arrow.position.copy(origin);
    arrow.quaternion.setFromUnitVectors(up, v);
    const shaft = new THREE.Mesh(shaftGeom, mat);
    shaft.position.set(0, shaftLen / 2, 0);
    shaft.renderOrder = 2;
    const cone = new THREE.Mesh(headGeom, mat);
    cone.position.set(0, shaftLen + headLen / 2, 0);
    cone.renderOrder = 2;
    arrow.add(shaft, cone);
    const sprite = label(name, color);
    sprite.position.copy(origin).add(v.clone().multiplyScalar(1.18));
    scene.add(arrow, sprite);
    return { mat, sprite };
  });
  // Where a click would turn the camera: the third of the cube it is over.
  const mark = new THREE.Mesh(
    new THREE.BoxGeometry(THIRD * 1.04, THIRD * 1.04, THIRD * 1.04),
    new THREE.MeshBasicMaterial({ color: token("--signal", "#ff6a2b"), transparent: true, opacity: 0.55, depthTest: false }),
  );
  mark.visible = false;
  mark.renderOrder = 1;
  scene.add(cube, edges, mark);
  const eyeDist = compact ? 4.8 : 4;
  const eye = new THREE.PerspectiveCamera(30, 1, 0.1, 10);

  // The overlay over the cube's corner, and the Home key under it.
  const overlay = document.createElement("div");
  overlay.className = `view-cube${compact ? " compact" : ""}`;
  overlay.style.cssText = `position:absolute;top:${margin}px;right:${margin}px;width:${idleSize}px;height:${idleSize}px;touch-action:none;`;
  const homeKey = document.createElement("button");
  // A round key with a house, centred under the cube; greyed while the view is already home.
  homeKey.className = `key small view-cube-home at-home${compact ? " compact" : ""}`;
  homeKey.setAttribute("aria-label", "Home");
  homeKey.title = "Home: back to the opening view";
  homeKey.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 7.5L8 3l5.5 4.5M4 6.5V13h3V9.5h2V13h3V6.5"/></svg>';
  homeKey.style.cssText = `position:absolute;top:${margin + idleSize + 4}px;right:${margin + (idleSize - homeSize) / 2}px;${compact ? `opacity:${idleAlpha};` : ""}`;
  host.append(overlay, homeKey);

  // Turning the camera: the offset from the target eases to a new direction.
  let anim: { t0: number; from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 } | null = null;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DURATION = 260;
  const goTo = (position: THREE.Vector3, target: THREE.Vector3) => {
    const from = getCam().position.clone().sub(controls.target);
    const to = position.clone().sub(target);
    if (reduced()) {
      controls.target.copy(target);
      getCam().position.copy(position);
      controls.update();
      return;
    }
    anim = { t0: performance.now(), from, to, fromTarget: controls.target.clone(), toTarget: target.clone() };
  };
  const lookFrom = (dir: THREE.Vector3) => {
    const d = dir.clone().normalize();
    if (Math.abs(d.y) > 0.99) d.z += 0.001; // straight down or up: keep a heading
    const dist = getCam().position.distanceTo(controls.target);
    goTo(controls.target.clone().add(d.normalize().multiplyScalar(dist)), controls.target.clone());
  };
  const step = () => {
    if (!anim) return;
    const p = Math.min((performance.now() - anim.t0) / DURATION, 1);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const q = new THREE.Quaternion().setFromUnitVectors(anim.from.clone().normalize(), anim.to.clone().normalize());
    const turn = new THREE.Quaternion().slerp(q, e);
    const length = THREE.MathUtils.lerp(anim.from.length(), anim.to.length(), e);
    const offset = anim.from.clone().normalize().applyQuaternion(turn).multiplyScalar(length);
    controls.target.lerpVectors(anim.fromTarget, anim.toTarget, e);
    getCam().position.copy(controls.target).add(offset);
    controls.update();
    if (p === 1) anim = null;
  };

  // Which face, edge or corner is under the pointer: its direction from the cube's centre.
  const ray = new THREE.Raycaster();
  const direction = (e: PointerEvent): THREE.Vector3 | null => {
    const r = overlay.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)), eye);
    const hit = ray.intersectObject(cube)[0];
    if (!hit) return null;
    const side = (v: number) => (Math.abs(v) < THIRD / 2 ? 0 : Math.sign(v));
    return new THREE.Vector3(side(hit.point.x), side(hit.point.y), side(hit.point.z));
  };

  let press: { x: number; y: number; moved: boolean } | null = null;
  let overCube = false;
  let overHome = false;
  let hovered = false;
  let leaveTimer: number | null = null;
  let curSize = idleSize;
  let curAlpha = idleAlpha;
  let appliedSz = -1;
  let appliedAlpha = -1;

  const setHovered = () => {
    if (leaveTimer !== null) {
      window.clearTimeout(leaveTimer);
      leaveTimer = null;
    }
    const next = overCube || overHome || Boolean(press);
    if (next) {
      hovered = true;
    } else {
      leaveTimer = window.setTimeout(() => {
        leaveTimer = null;
        if (!overCube && !overHome && !press) hovered = false;
      }, 80);
    }
  };

  overlay.addEventListener("pointerenter", () => {
    overCube = true;
    setHovered();
  });
  overlay.addEventListener("pointermove", (e) => {
    overCube = true;
    setHovered();
    if (press) {
      const dx = e.clientX - press.x;
      const dy = e.clientY - press.y;
      if (!press.moved && Math.hypot(dx, dy) < 4) return;
      if (!press.moved) anim = null;
      press = { x: e.clientX, y: e.clientY, moved: true };
      const offset = getCam().position.clone().sub(controls.target);
      const s = new THREE.Spherical().setFromVector3(offset);
      s.theta -= dx * 0.012;
      s.phi = THREE.MathUtils.clamp(s.phi - dy * 0.012, 0.01, Math.PI - 0.01);
      getCam().position.copy(controls.target).add(offset.setFromSpherical(s));
      controls.update();
      return;
    }
    const d = direction(e);
    mark.visible = !!d;
    if (d) mark.position.copy(d).multiplyScalar(THIRD);
    overlay.style.cursor = d ? "pointer" : "";
  });
  overlay.addEventListener("pointerdown", (e) => {
    overlay.setPointerCapture(e.pointerId);
    press = { x: e.clientX, y: e.clientY, moved: false };
    setHovered();
  });
  overlay.addEventListener("pointerup", (e) => {
    const was = press;
    press = null;
    setHovered();
    if (overlay.hasPointerCapture(e.pointerId)) overlay.releasePointerCapture(e.pointerId);
    if (was && !was.moved) {
      const d = direction(e);
      if (d) lookFrom(d);
    }
  });
  overlay.addEventListener("pointerleave", () => {
    overCube = false;
    setHovered();
    if (!press) mark.visible = false;
  });
  homeKey.addEventListener("pointerenter", () => {
    overHome = true;
    setHovered();
  });
  homeKey.addEventListener("pointerleave", () => {
    overHome = false;
    setHovered();
  });
  homeKey.addEventListener("click", () => goTo(home.position, home.target));

  return {
    /** Draw the cube over the scene just rendered, `width` x `height` px. */
    draw(width: number, height: number) {
      step();
      // Keep the compact cube strictly contained inside small plots, shrinking & dimming when idle.
      const maxFit = compact ? Math.max(28, Math.floor(Math.min(width, height) * 0.42)) : hoverSize;
      const targetSz = Math.min(hovered ? hoverSize : idleSize, maxFit);
      const targetAlpha = hovered ? 1 : idleAlpha;
      const rate = reduced() ? 1 : 0.22;
      curSize = Math.abs(targetSz - curSize) < 0.25 ? targetSz : curSize + (targetSz - curSize) * rate;
      curAlpha = Math.abs(targetAlpha - curAlpha) < 0.01 ? targetAlpha : curAlpha + (targetAlpha - curAlpha) * rate;

      const sz = Math.round(curSize);
      if (sz !== appliedSz) {
        appliedSz = sz;
        overlay.style.width = `${sz}px`;
        overlay.style.height = `${sz}px`;
        homeKey.style.top = `${margin + sz + 4}px`;
        homeKey.style.right = `${margin + Math.round((sz - homeSize) / 2)}px`;
      }
      if (compact && Math.abs(curAlpha - appliedAlpha) > 0.005) {
        appliedAlpha = curAlpha;
        edgeMat.opacity = curAlpha;
        faceMat.opacity = 0.015 + (0.06 - 0.015) * ((curAlpha - idleAlpha) / Math.max(1 - idleAlpha, 1e-4));
        for (const { mat, sprite } of axes) {
          mat.opacity = curAlpha;
          sprite.material.opacity = curAlpha;
        }
        homeKey.style.opacity = curAlpha.toFixed(2);
      }

      const atHome = getCam().position.distanceToSquared(home.position) < 1e-6 && controls.target.distanceToSquared(home.target) < 1e-6;
      if (atHome !== homeKey.classList.contains("at-home")) homeKey.classList.toggle("at-home", atHome);
      // The cube's camera looks at it from where the scene's camera looks at its target.
      eye.quaternion.copy(getCam().quaternion);
      eye.position.set(0, 0, eyeDist).applyQuaternion(getCam().quaternion);
      const x = Math.max(margin, width - sz - margin);
      const y = Math.max(margin, height - sz - margin); // from the bottom edge
      renderer.setViewport(x, y, sz, sz);
      renderer.setScissor(x, y, sz, sz);
      renderer.setScissorTest(true);
      renderer.clearDepth();
      renderer.render(scene, eye);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
    },
    dispose() {
      if (leaveTimer !== null) window.clearTimeout(leaveTimer);
      overlay.remove();
      homeKey.remove();
      cube.geometry.dispose();
      (cube.material as THREE.Material).dispose();
      edges.geometry.dispose();
      (edges.material as THREE.Material).dispose();
      shaftGeom.dispose();
      headGeom.dispose();
      for (const { mat, sprite } of axes) {
        mat.dispose();
        sprite.material.map?.dispose();
        sprite.material.dispose();
      }
      mark.geometry.dispose();
      (mark.material as THREE.Material).dispose();
    },
  };
}
