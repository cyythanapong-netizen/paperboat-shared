// A small orientation triad in the scene's bottom-left corner, like the view cube: the same
// renderer draws it in a viewport, and its camera copies the scene camera's orientation, so the
// x, y and z arrows turn with the view. Shared by the Station and the MX surface chart.
import * as THREE from "three";

const SIZE = 84;
const MARGIN = 10;

function label(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d")!;
  g.fillStyle = color;
  g.font = "600 34px ui-monospace, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 32, 35);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(0.5, 0.5, 1);
  return sprite;
}

export function viewAxes(
  host: HTMLElement,
  renderer: THREE.WebGLRenderer,
  getCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera | (() => THREE.PerspectiveCamera | THREE.OrthographicCamera),
  _token: (name: string, fallback: string) => string,
) {
  const getCam = () => (typeof getCamera === "function" ? getCamera() : getCamera);
  const scene = new THREE.Scene();
  // Engineering axes: x red, y green, z blue, in every theme.
  const colors = { x: "#e5484d", y: "#30a46c", z: "#3e63dd" };
  const axes: { arrow: THREE.ArrowHelper; sprite: THREE.Sprite }[] = [
    { dir: [1, 0, 0], name: "x" },
    { dir: [0, 1, 0], name: "y" },
    { dir: [0, 0, 1], name: "z" },
  ].map(({ dir, name }) => {
    const v = new THREE.Vector3(...dir);
    const color = colors[name as keyof typeof colors];
    const arrow = new THREE.ArrowHelper(v, new THREE.Vector3(), 1, new THREE.Color(color), 0.18, 0.12);
    const sprite = label(name, color);
    sprite.position.copy(v.clone().multiplyScalar(1.3));
    scene.add(arrow, sprite);
    return { arrow, sprite };
  });

  // The triad uses the scene camera's own projection, so it foreshortens like the graph:
  // perspective follows the scene's fov, and an isometric scene gets the orthographic triad.
  const makeCamera = (perspective: boolean) =>
    perspective
      ? new THREE.PerspectiveCamera(45, 1, 0.1, 20)
      : new THREE.OrthographicCamera(-1.55, 1.55, 1.55, -1.55, 0.1, 20);
  let camera = makeCamera(true);
  const overlay = document.createElement("div");
  overlay.className = "view-axes";
  overlay.style.cssText = `position:absolute;left:${MARGIN}px;bottom:${MARGIN}px;width:${SIZE}px;height:${SIZE}px;pointer-events:none;`;
  host.append(overlay);

  return {
    /** Draw the triad over the scene just rendered, `width` x `height` px. */
    draw(width: number, height: number) {
      const sceneCamera = getCam();
      const perspective = sceneCamera instanceof THREE.PerspectiveCamera;
      if (perspective !== (camera instanceof THREE.PerspectiveCamera)) camera = makeCamera(perspective);
      camera.quaternion.copy(sceneCamera.quaternion);
      if (camera instanceof THREE.PerspectiveCamera && sceneCamera instanceof THREE.PerspectiveCamera) {
        camera.fov = sceneCamera.fov;
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        const distance = 1.6 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        camera.position.set(0, 0, distance).applyQuaternion(sceneCamera.quaternion);
      } else {
        camera.position.set(0, 0, 5).applyQuaternion(sceneCamera.quaternion);
      }
      renderer.setViewport(MARGIN, MARGIN, SIZE, SIZE);
      renderer.setScissor(MARGIN, MARGIN, SIZE, SIZE);
      renderer.setScissorTest(true);
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
    },
    dispose() {
      overlay.remove();
      for (const { arrow, sprite } of axes) {
        arrow.line.geometry.dispose();
        (arrow.line.material as THREE.Material).dispose();
        arrow.cone.geometry.dispose();
        (arrow.cone.material as THREE.Material).dispose();
        sprite.material.map?.dispose();
        sprite.material.dispose();
        scene.remove(arrow, sprite);
      }
    },
  };
}
