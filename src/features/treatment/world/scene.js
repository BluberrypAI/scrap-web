import * as THREE from 'three';
import { createFacility } from './facilities.js';
import { createLandscape } from './landscape.js';

const slots = [[4, -3], [-1, -12], [12, 1], [7, -16], [18, -8]];

export function mountScene(host, { count, done }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x79b8f0);
  scene.fog = new THREE.FogExp2(0xa4ccef, 0.008);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 250);
  camera.position.set(22, 19, 33);
  camera.lookAt(-4, 0.5, -1);
  scene.add(new THREE.HemisphereLight(0xf0f7ff, 0x527c38, 2.2));
  const sun = new THREE.DirectionalLight(0xffefd6, 2.4);
  sun.position.set(-15, 32, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 28, bottom: -28, far: 85 });
  sun.shadow.normalBias = 0.035;
  scene.add(sun);

  const meadow = createLandscape(THREE, scene);
  const source = createFacility(THREE, 'source', 0x327dd6);
  source.position.set(-10, meadow.heightAt(-10, 3), 3);
  scene.add(source);
  const destinations = slots.slice(0, count).map(([targetX, targetZ], index) => {
    const destination = createFacility(THREE, 'recycling', done ? 0x62a436 : 0x169bce);
    destination.position.set(targetX, meadow.heightAt(targetX, targetZ), targetZ);
    scene.add(destination);
    const badge = document.createElement('canvas');
    badge.width = badge.height = 64;
    const context = badge.getContext('2d');
    context.fillStyle = '#fff';
    context.beginPath();
    context.arc(32, 32, 27, 0, 2 * Math.PI);
    context.fill();
    context.fillStyle = '#176fa0';
    context.font = 'bold 38px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(index + 1, 32, 33);
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(badge) }));
    marker.position.set(0, 5.1, 0);
    marker.scale.set(1.7, 1.7, 1.7);
    destination.add(marker);
    const path = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      const x = -10 + (targetX + 10) * t;
      const z = 3 + (targetZ - 3) * t + Math.sin(Math.PI * t) * 1.8;
      return new THREE.Vector3(x, meadow.heightAt(x, z) + 0.04, z);
    }));
    const road = new THREE.Mesh(new THREE.TubeGeometry(path, 32, 0.16, 6),
      new THREE.MeshStandardMaterial({ color: 0xe6dca9 }));
    scene.add(road);
    return destination;
  });

  const observer = new ResizeObserver(() => {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = width < 600 ? 48 : 40;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  });
  observer.observe(host);
  const start = performance.now();
  let frame;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(now) {
    const elapsed = (now - start) / 1000;
    meadow.update(elapsed);
    source.userData.animate(elapsed, 0.016);
    destinations.forEach((destination, index) => {
      destination.scale.setScalar(THREE.MathUtils.smoothstep(elapsed - index * 0.12, 0, 0.45));
      destination.userData.animate(elapsed, 0.016);
    });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  if (!reduceMotion) frame = requestAnimationFrame(draw);
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    meadow.dispose();
    scene.traverse((object) => {
      if (!object.isSprite) object.geometry?.dispose();
      object.material?.map?.dispose();
      object.material?.dispose();
      if (object.isInstancedMesh) object.dispose();
    });
    sun.shadow.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
