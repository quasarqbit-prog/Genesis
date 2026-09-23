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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {number} cropBlend 0 = full body, 1 = feet cropped
 */
function fitCamera(
  camera,
  object,
  canvas,
  { yOffset = 0, xOffset = 0, cropBlend = 0, mode = "button" } = {}
) {
  object.position.set(0, 0, 0);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  object.position.x += xOffset;
  object.position.y += yOffset;

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const aspect = canvas.width / Math.max(canvas.height, 1);
  const fov = camera.fov * (Math.PI / 180);
  const baseDist = maxDim / (2 * Math.tan(fov / 2));

  if (mode === "button") {
    // Head fully visible; only feet clipped by frame overflow
    let dist = baseDist * 0.9;
    if (aspect < 1) dist *= 0.95;
    object.position.y -= size.y * 0.04;
    camera.position.set(0, dist * 0.05, dist * 0.98);
    camera.lookAt(0, -size.y * 0.02, 0);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 20;
  } else if (mode === "install") {
    let dist = baseDist * 1.22;
    if (aspect < 1) dist *= 1.05;
    camera.position.set(0, dist * 0.06, dist * 1.02);
    camera.lookAt(0, size.y * 0.02, 0);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 20;
  } else {
    // Anketa: blend cropped ↔ full body
    const t = Math.max(0, Math.min(1, cropBlend));
    let distCrop = baseDist * 0.78;
    let distFull = baseDist * 1.08;
    if (aspect < 1) {
      distCrop /= aspect;
      distFull /= aspect;
    }
    const dist = lerp(distFull, distCrop, t);
    object.position.y -= size.y * lerp(0, 0.06, t);
    camera.position.set(
      0,
      dist * lerp(0.05, 0.12, t),
      dist * lerp(1.0, 0.88, t)
    );
    camera.lookAt(0, size.y * lerp(0.02, 0.14, t), 0);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 20;
  }
  camera.updateProjectionMatrix();
}

export function stopOrdersPreview(canvas) {
  const prev = previews.get(canvas);
  if (prev) {
    prev.stop();
    previews.delete(canvas);
  }
}

/**
 * Preview modes:
 * - button: crop feet, look toward cursor (type cards СКИН/МОДЕЛЬ)
 * - anketa: crop feet, expand on hover via setCropFeet, look toward cursor
 * - install: full body, LMB-drag rotates, no cursor look
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   objUrl: string,
 *   textureUrl: string,
 *   yaw?: number,
 *   yOffset?: number,
 *   xOffset?: number,
 *   cropFeet?: boolean,
 *   mode?: 'button' | 'anketa' | 'install',
 *   lookHost?: Element | null,
 * }} opts
 */
export async function mountOrdersPreview(canvas, opts) {
  if (!canvas || !opts?.objUrl || !opts?.textureUrl) return null;

  const prev = previews.get(canvas);
  if (prev) {
    prev.stop();
    previews.delete(canvas);
  }

  const mode =
    opts.mode === "install" || opts.mode === "anketa" || opts.mode === "button"
      ? opts.mode
      : opts.cropFeet
        ? "anketa"
        : "button";

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

  const baseYaw = Number.isFinite(opts.yaw) ? Number(opts.yaw) : Math.PI;
  const yOffset = Number.isFinite(opts.yOffset) ? Number(opts.yOffset) : 0;
  const xOffset = Number.isFinite(opts.xOffset) ? Number(opts.xOffset) : 0;
  let cropFeet =
    opts.cropFeet != null ? Boolean(opts.cropFeet) : mode !== "install";
  let cropBlend = cropFeet ? 1 : 0;
  let cropTarget = cropBlend;
  root.rotation.y = baseYaw;

  const applyFit = (blend = cropBlend) => {
    fitCamera(camera, root, canvas, {
      yOffset,
      xOffset,
      cropBlend: blend,
      mode,
    });
  };
  applyFit();

  const host =
    opts.lookHost ||
    canvas.closest(".orders-type-card") ||
    canvas.closest(".orders-preview-card") ||
    canvas.closest(".studio-tile") ||
    canvas.parentElement ||
    canvas;

  let hovering = false;
  let pointerX = 0;
  let pointerY = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  let targetYaw = 0;
  let targetPitch = 0;
  let idlePhase = 0;
  let dragging = false;
  let lastDragX = 0;

  const onEnter = () => {
    hovering = true;
  };
  const onLeave = () => {
    hovering = false;
    dragging = false;
  };
  const onMove = (e) => {
    if (mode === "install") {
      if (!dragging) return;
      const dx = e.clientX - lastDragX;
      lastDragX = e.clientX;
      lookYaw += dx * 0.012;
      return;
    }
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    hovering = true;
  };
  const onDown = (e) => {
    if (mode !== "install") return;
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    lastDragX = e.clientX;
    hovering = true;
    try {
      host.setPointerCapture?.(e.pointerId);
    } catch (_) {
      /* ignore */
    }
    e.preventDefault();
  };
  const onUp = (e) => {
    if (mode !== "install") return;
    dragging = false;
    try {
      host.releasePointerCapture?.(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  };

  host.addEventListener("pointerenter", onEnter);
  host.addEventListener("pointerleave", onLeave);
  host.addEventListener("pointermove", onMove);
  if (mode === "install") {
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.style.touchAction = "none";
    host.style.cursor = "grab";
  }

  let alive = true;
  let frame = 0;
  const tick = () => {
    if (!alive) return;
    frame = requestAnimationFrame(tick);

    if (mode === "anketa" && Math.abs(cropBlend - cropTarget) > 0.0008) {
      cropBlend += (cropTarget - cropBlend) * 0.14;
      if (Math.abs(cropBlend - cropTarget) < 0.002) cropBlend = cropTarget;
      applyFit(cropBlend);
    }

    if (mode === "install") {
      lookPitch += (0 - lookPitch) * 0.12;
      root.rotation.y = baseYaw + lookYaw;
      root.rotation.x = lookPitch;
      if (host.style) host.style.cursor = dragging ? "grabbing" : "grab";
    } else if (hovering) {
      targetYaw = -pointerX * 0.85;
      targetPitch = Math.max(-0.35, Math.min(0.4, -pointerY * 0.55));
      lookYaw += (targetYaw - lookYaw) * 0.12;
      lookPitch += (targetPitch - lookPitch) * 0.12;
      root.rotation.y = baseYaw + lookYaw;
      root.rotation.x = lookPitch;
    } else {
      idlePhase += 0.016;
      targetYaw = Math.sin(idlePhase * 0.7) * 0.22;
      targetPitch = 0;
      lookYaw += (targetYaw - lookYaw) * 0.12;
      lookPitch += (targetPitch - lookPitch) * 0.12;
      root.rotation.y = baseYaw + lookYaw;
      root.rotation.x = lookPitch;
    }

    renderer.render(scene, camera);
  };
  tick();

  const handle = {
    mode,
    setCropFeet(next) {
      const value = Boolean(next);
      cropFeet = value;
      cropTarget = value ? 1 : 0;
      if (mode !== "anketa") {
        cropBlend = cropTarget;
        applyFit(cropBlend);
      }
    },
    stop() {
      alive = false;
      cancelAnimationFrame(frame);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
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
