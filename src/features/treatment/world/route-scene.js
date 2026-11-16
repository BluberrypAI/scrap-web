import * as THREE from 'three';
import { createFacility, createTruck } from './facilities.js';
import { createLandscape } from './landscape.js';
import { isActiveFacility, routeSegmentPairs } from './route-geometry.js';

const desktopPositions = [[-14, 1], [-5, -2], [5, 0], [14, -3]];
const mobilePositions = [[0, 12], [-1, 4], [1, -4], [0, -12]];

function marker(label, active = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = active ? '#d7b4ff' : '#ffffff';
  context.beginPath();
  context.arc(64, 64, 54, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = active ? '#5e29a7' : '#c6b5e9';
  context.lineWidth = active ? 8 : 5;
  context.stroke();
  context.fillStyle = active ? '#4c168e' : '#6546aa';
  context.font = '500 66px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 64, 69);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(1.75, 1.75, 1);
  return sprite;
}

export function mountRouteScene(host, { stops, planned, activeStopIndex, activeSegmentIndex }) {
  const count = Math.min(stops.length, 3);
  const mobile = host.clientWidth < 700;
  const positions = mobile ? mobilePositions : desktopPositions;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x79b8f0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x79b8f0);
  scene.fog = new THREE.FogExp2(0xa4ccef, 0.008);
  const camera = mobile
    ? new THREE.OrthographicCamera(-16, 16, 12, -12, 0.1, 250)
    : new THREE.PerspectiveCamera(36, 1, 0.1, 250);
  camera.position.set(0, mobile ? 22 : 10, mobile ? 30 : 24);
  camera.lookAt(0, 0.5, mobile ? 0 : -2);
  scene.add(new THREE.HemisphereLight(0xf0f7ff, 0x527c38, 2.2));
  const sun = new THREE.DirectionalLight(0xffefd6, 2.4);
  sun.position.set(-8, 22, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 18, bottom: -18, far: 70 });
  scene.add(sun);

  const meadow = createLandscape(THREE, scene, { routeView: true, mobile });

  const allPositions = positions.slice(0, count + 1);
  const facilities = allPositions.map(([x, z], index) => {
    const active = isActiveFacility(index, { planned, activeStopIndex, activeSegmentIndex });
    const facility = createFacility(THREE, index === 0 ? 'source' : stops[index - 1]?.kind || 'recycling',
      active ? 0x7c3fc6 : index === 0 ? 0x6f8dc8 : planned ? 0xa9a0bd : 0x7dadd1);
    facility.scale.setScalar(0.74);
    facility.position.set(x, meadow.heightAt(x, z), z);
    if (active) {
      const tinted = new Set();
      const lavender = new THREE.Color(0xc4a6ef);
      facility.traverse((part) => {
        const material = part.material;
        if (!part.isMesh || !material?.color || tinted.has(material)) return;
        tinted.add(material);
        const color = material.color;
        if (color.r > 0.72 && color.g > 0.72 && color.b > 0.72) color.lerp(lavender, 0.48);
      });
    }
    if (planned && index > 0) facility.traverse((part) => {
      if (!part.isMesh) return;
      part.material.transparent = true;
      part.material.opacity = 0.55;
      part.material.depthWrite = false;
      part.castShadow = false;
    });
    scene.add(facility);
    const badge = marker(index === 0 ? 'S'
      : index === count && stops[index - 1]?.kind === 'manufacturing' ? 'D' : String(index), active);
    if (planned && index > 0) badge.material.opacity = 0.65;
    badge.position.set(0, 6.5, 0);
    if (!mobile) {
      const badgeHeight = facility.position.y + 6.5 * facility.scale.y;
      const distance = camera.position.distanceTo(new THREE.Vector3(x, badgeHeight, z));
      badge.scale.setScalar(1.75 * distance / 30);
    }
    facility.add(badge);
    return facility;
  });

  const curves = routeSegmentPairs(count).map(([from, to], index) => {
    const [x1, z1] = allPositions[from];
    const [x2, z2] = allPositions[to];
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 11 }, (_, point) => {
      const t = point / 10;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t + Math.sin(Math.PI * t) * (index % 2 ? -0.8 : 0.8);
      return new THREE.Vector3(x, meadow.heightAt(x, z) + 0.18, z);
    }));
    const road = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.095, 7),
      new THREE.MeshStandardMaterial({ color: planned ? 0xbfb7cf : 0x9076bc,
        roughness: 0.75, transparent: true, opacity: planned ? 0.72 : 0.95 }));
    scene.add(road);
    if (index === activeSegmentIndex) {
      const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.19, 7),
        new THREE.MeshBasicMaterial({ color: 0x9ad659, transparent: true, opacity: 0.4 }));
      scene.add(glow);
    }
    return curve;
  });

  const smoke = [];
  if (activeStopIndex >= 0 && facilities[activeStopIndex + 1]) {
    const [x, z] = allPositions[activeStopIndex + 1];
    const baseY = meadow.heightAt(x, z);
    for (let i = 0; i < 5; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xb8a7d7, transparent: true, opacity: 0.28, depthWrite: false }));
      puff.position.set(x + 1.05, baseY + 3.4 + i * 0.5, z - 0.6);
      puff.userData.baseY = baseY;
      scene.add(puff);
      smoke.push(puff);
    }
  }

  const truck = activeSegmentIndex >= 0 && curves[activeSegmentIndex]
    ? createTruck(THREE, 0x7352b7) : null;
  if (truck) {
    truck.scale.setScalar(0.9);
    truck.position.copy(curves[activeSegmentIndex].getPoint(0.35));
    truck.position.y += 0.18;
    scene.add(truck);
  }

  const observer = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    if (mobile) {
      const halfWidth = 16;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfWidth / aspect;
      camera.bottom = -halfWidth / aspect;
    } else camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.render(scene, camera);
  });
  observer.observe(host);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame;
  function draw(time) {
    const seconds = time / 1000;
    meadow.update(seconds);
    facilities.forEach((facility) => facility.userData.animate?.(seconds, 0.016));
    smoke.forEach((puff, index) => {
      const drift = (seconds * 0.45 + index * 0.21) % 1;
      puff.position.y = puff.userData.baseY + 3.4 + drift * 2.5;
      puff.position.x += Math.sin(seconds + index) * 0.0008;
      puff.scale.setScalar(0.7 + drift * 0.8);
      puff.material.opacity = 0.3 * (1 - drift);
    });
    if (truck) {
      const progress = (seconds * 0.16) % 1;
      const curve = curves[activeSegmentIndex];
      truck.position.copy(curve.getPoint(progress));
      truck.position.y += 0.18;
      const tangent = curve.getTangent(progress);
      truck.rotation.y = Math.atan2(tangent.x, tangent.z);
      truck.userData.animate?.(seconds, 0.016);
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  if (!reduced) frame = requestAnimationFrame(draw);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    meadow.dispose();
    scene.traverse((item) => {
      item.geometry?.dispose();
      item.material?.map?.dispose();
      item.material?.dispose();
    });
    sun.shadow.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
