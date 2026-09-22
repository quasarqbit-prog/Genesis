import * as THREE from "./vendor/three/three.module.min.js";
import { OBJLoader } from "./vendor/three/addons/loaders/OBJLoader.js";

const cache = new Map();
const previews = new WeakMap();

async function loadObj(url) {
  if (cache.has(url)) return cache.get(url).clone();
  const loader = new OBJLoader();
  const obj = await loader.loadAsync(url);
  cache.set(url, obj);
  return obj.clone();
}

function disposeObject(root) {
  root.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
}

function fitCamera(camera, object, canvas) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const aspect = canvas.width / Math.max(canvas.height, 1);
  const fov = camera.fov * (Math.PI / 180);
  // Closer framing so the model fills most of the preview frame
  let dist = (maxDim / (2 * Math.tan(fov / 2))) * 0.92;
  if (aspect < 1) dist *= 0.92;

  camera.position.set(dist * 0.28, dist * 0.08, dist * 0.88);
  camera.near = Math.max(0.01, dist / 100);
  camera.far = dist * 20;
  camera.lookAt(0, size.y * 0.05, 0);
  camera.updateProjectionMatrix();
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ objUrl: string, textureUrl: string }} opts
 */
export async function mountOrdersPreview(canvas, opts) {
  if (!canvas || !opts?.objUrl || !opts?.textureUrl) return null;

  const prev = previews.get(canvas);
  if (prev) {
    prev.stop();
    previews.delete(canvas);
  }

  const width = canvas.width || 96;
  const height = canvas.height || 128;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, width / height, 0.05, 50);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x443355, 1.15);
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(2.2, 3.4, 2.8);
  scene.add(hemi, key);

  const texLoader = new THREE.TextureLoader();
  const texture = await texLoader.loadAsync(opts.textureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.flipY = true;

  const material = new THREE.MeshLambertMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });

  const root = await loadObj(opts.objUrl);
  root.traverse((child) => {
    if (child.isMesh) {
      child.material = material;
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  scene.add(root);
  fitCamera(camera, root, canvas);

  const host = canvas.closest(".orders-type-card") || canvas.parentElement || canvas;
  let hovering = false;
  let pointerX = 0;
  let pointerY = 0;
  let targetYaw = 0;
  let targetPitch = 0;
  let idlePhase = 0;

  const onEnter = () => {
    hovering = true;
  };
  const onLeave = () => {
    hovering = false;
  };
  const onMove = (e) => {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    hovering = true;
  };

  host.addEventListener("pointerenter", onEnter);
  host.addEventListener("pointerleave", onLeave);
  host.addEventListener("pointermove", onMove);

  let alive = true;
  let frame = 0;
  const tick = () => {
    if (!alive) return;
    frame = requestAnimationFrame(tick);

    if (hovering) {
      targetYaw = pointerX * 0.85;
      targetPitch = Math.max(-0.35, Math.min(0.4, -pointerY * 0.55));
    } else {
      idlePhase += 0.016;
      targetYaw = Math.sin(idlePhase * 0.7) * 0.22;
      targetPitch = 0;
    }

    root.rotation.y += (targetYaw - root.rotation.y) * 0.12;
    root.rotation.x += (targetPitch - root.rotation.x) * 0.12;
    renderer.render(scene, camera);
  };
  tick();

  const handle = {
    stop() {
      alive = false;
      cancelAnimationFrame(frame);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointermove", onMove);
      scene.remove(root);
      disposeObject(root);
      material.dispose();
      texture.dispose();
      renderer.dispose();
    },
  };
  previews.set(canvas, handle);
  return handle;
}
