import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createLandscape } from '../../features/treatment/world/landscape.js';
import { createFacility, createTruck } from '../../features/treatment/world/facilities.js';
import { createWorkshopLife } from './workshop-life.js';
import { createCompassSculpture } from './compass-sculpture.js';
import { addFactoryDetails } from './factory-details.js';
import { createBerryFigure } from './berry-figure.js';

// An illustrative world only: no waste records, facility decisions or engine calls.
export function MeadowShowcase({ onBerryClick }) {
  const hostRef = useRef(null), engineRef = useRef(null), berryBubbleRef = useRef(null);
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => {
    let engine, active = true;
    try {
      engine = createMeadow(hostRef.current, berryBubbleRef.current, onBerryClick, () => {
        if (active) setReady(true);
      });
      engineRef.current = engine;
    }
    catch { setFailed(true); }
    return () => { active = false; engine?.dispose(); engineRef.current = null; };
  }, [onBerryClick]);
  return <>
    <div className="meadow-world" ref={hostRef} tabIndex={0} role="group" aria-label="공장 위쪽 초원에서 베리가 인사합니다. 베리를 누르면 SCRAP 주요 화면을 볼 수 있습니다. 드래그로 회전하는 SCRAP 조형물, 문서 확인·PP 세척·파쇄 공장과 작업 중인 에이전트들이 보입니다.">
      <button className="berry-world-bubble" ref={berryBubbleRef} type="button" onClick={onBerryClick} aria-label="베리에게 SCRAP 화면 안내 받기">저를 눌러보세요</button>
    </div>
    {!ready && <div className="meadow-loading">{failed ? '이 브라우저에서는 3D 장면을 표시할 수 없어요. 상단 메뉴에서 서비스를 이용해 주세요.' : '작은 세상을 펼치는 중…'}</div>}
  </>;
}

function createMeadow(host, berryBubble, onBerryClick, onFirstFrame) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x8ac4f4); scene.fog = new THREE.FogExp2(0xb7d9ee, 0.006);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 240), target = new THREE.Vector3(-3, 5, 2);
  camera.position.set(25, 21, 41); camera.lookAt(target);
  scene.add(new THREE.HemisphereLight(0xf2faff, 0x587537, 1.35));
  const fill = new THREE.DirectionalLight(0xc5ddf5, 0.4); fill.position.set(24, 14, -12); scene.add(fill);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.7); sun.position.set(-16, 32, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 32, bottom: -32, far: 100 }); sun.shadow.normalBias = 0.025; sun.shadow.bias = -0.00008; scene.add(sun);
  const meadow = createLandscape(THREE, scene, {
    mobile: window.innerWidth < 700,
    cloudLayout: 'clear-copy',
    lightweight: true,
  });
  const positions = [[-16, 8], [-3, 5], [10, -4]];
  const facilities = positions.map(([x, z], i) => {
    const facility = createFacility(THREE, ['source', 'sorting', 'recycling'][i], [0x3d8bd6, 0xe6ad3a, 0x72ae65][i]);
    addFactoryDetails(facility, ['source', 'sorting', 'recycling'][i]);
    facility.scale.setScalar(1.24);
    facility.position.set(x, meadow.heightAt(x, z) + 0.05, z); scene.add(facility); return facility;
  });
  // Shared centerline keeps both journeys connected across the yellow apron.
  const layout = new THREE.CatmullRomCurve3([
    [-12.7, 10.2], [-10.4, 10.5], [-7.4, 8.7], [-5.8, 8.2],
    [-3, 8.2], [0.3, 8.2], [2.8, 6.4], [4.8, 2.7], [6.7, -1.5],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  function roadHeight(x, z) {
    let y = meadow.heightAt(x, z) + 0.10;
    facilities.forEach(f => {
      const dx = Math.max(0, Math.abs(x - f.position.x) - 3.5);
      const dz = Math.max(0, Math.abs(z - f.position.z) - 2.8);
      const blend = 1 - THREE.MathUtils.smoothstep(Math.hypot(dx, dz), 0, 1.6);
      y = THREE.MathUtils.lerp(y, Math.max(y, f.position.y + 0.27), blend);
    });
    return y;
  }
  function ribbon(start, end, halfWidth, material, lift = 0) {
    const vertices = [], indices = [], segments = Math.max(2, Math.ceil((end - start) * 240));
    for (let i = 0; i <= segments; i++) {
      const u = THREE.MathUtils.lerp(start, end, i / segments);
      const p = layout.getPointAt(u), tangent = layout.getTangentAt(u);
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(halfWidth);
      for (const sign of [-1, 1]) {
        const x = p.x + side.x * sign, z = p.z + side.z * sign;
        vertices.push(x, roadHeight(x, z) + lift, z);
      }
      if (i < segments) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; scene.add(mesh);
  }
  ribbon(0, 1, 0.87, new THREE.MeshStandardMaterial({ color: 0xb9bdb3, roughness: 1 }));
  ribbon(0, 1, 0.76, new THREE.MeshStandardMaterial({ color: 0x465158, roughness: 1 }), 0.018);
  const stripe = new THREE.MeshStandardMaterial({ color: 0xf1eee3, roughness: 1 });
  for (let u = 0.025; u < 0.98; u += 0.052) ribbon(u, Math.min(u + 0.022, 1), 0.035, stripe, 0.03);
  const middle = Array.from({ length: 401 }, (_, i) => ({ u: i / 400, distance: layout.getPointAt(i / 400).distanceTo(new THREE.Vector3(-3, 0, 8.2)) }))
    .reduce((best, item) => item.distance < best.distance ? item : best).u;
  const roads = [[0, middle], [middle, 1]].map(([start, end]) => ({
    getPointAt(u) { const p = layout.getPointAt(THREE.MathUtils.lerp(start, end, u)); p.y = roadHeight(p.x, p.z) + 0.018; return p; },
    getTangentAt(u) { return layout.getTangentAt(THREE.MathUtils.lerp(start, end, u)); },
  }));
  const trucks = roads.map((curve, i) => {
    const truck = createTruck(THREE, [0x00a4ef, 0x77b638][i]);
    truck.scale.setScalar(1.12); scene.add(truck);
    const materials = new Set();
    truck.traverse(object => { if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => { material.transparent = true; materials.add(material); }); });
    return { truck, curve, materials };
  });
  const workshops = createWorkshopLife(scene, meadow, facilities, makeRobot, layout);
  const berry = createBerryFigure();
  // Keep Berry above and to the right of the factory row, clear of the headline.
  berry.root.position.set(-4, meadow.heightAt(-4, -18) + 0.07, -18);
  berry.root.rotation.y = Math.atan2(camera.position.x + 4, camera.position.z + 18);
  scene.add(berry.root);
  const berryAnchor = new THREE.Vector3();
  let sculpture = null, disposed = false, cancelSculptureLoad = null;
  const sculpturePosition = new THREE.Vector3(-31, meadow.heightAt(-31, 4) + 0.07, 4);
  const sculptureYaw = Math.atan2(camera.position.x - sculpturePosition.x, camera.position.z - sculpturePosition.z);
  const loadSculpture = () => {
    cancelSculptureLoad = null;
    if (disposed) return;
    createCompassSculpture(renderer).then(model => {
      if (disposed) { model.dispose(); return; }
      sculpture = model; model.root.position.copy(sculpturePosition); model.root.rotation.y = sculptureYaw; scene.add(model.root);
    }).catch(error => { if (!disposed) console.error('SCRAP sculpture could not load', error); });
  };
  const scheduleSculpture = () => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(loadSculpture, { timeout: 1200 });
      cancelSculptureLoad = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(loadSculpture, 250);
      cancelSculptureLoad = () => window.clearTimeout(id);
    }
  };
  const raycaster = new THREE.Raycaster();
  let pointerInside = false, dragging = false, dragLastX = 0, dragAngle = 0, berryPress = null;
  const birds = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const shape = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.3, 0, 0), new THREE.Vector3(0, -0.12, 0), new THREE.Vector3(0.3, 0, 0)]);
    const bird = new THREE.Line(shape, new THREE.LineBasicMaterial({ color: 0x426276 })); bird.position.set(i * 1.1, (i % 2) * 0.6, i * 0.8); birds.add(bird);
  }
  scene.add(birds);
  const pointer = new THREE.Vector2(), reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches, visible = true, elapsed = 0, last = performance.now(), frame = 0, firstFrame = false;
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1);
    // Fit the entire factory row in narrower windows without cropping the ends.
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(37 / 2)) * Math.max(1, 1.45 / camera.aspect)));
    camera.setViewOffset(width, height, width < 650 ? 0 : -width * 0.045, 0, width, height);
    camera.updateProjectionMatrix();
    const compact = width < 650;
    const x = compact ? -10 : -4, z = compact ? -15 : -18;
    berry.root.position.set(x, meadow.heightAt(x, z) + 0.07, z);
    berry.root.rotation.y = Math.atan2(camera.position.x - berry.root.position.x, camera.position.z - berry.root.position.z);
  }
  const observer = new ResizeObserver(resize); observer.observe(host); observer.observe(host.parentElement.querySelector('.landing-copy')); resize();
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); visibility.observe(host);
  const updatePointer = event => { const rect = host.getBoundingClientRect(); pointerInside = true; pointer.set((event.clientX - rect.left) / rect.width - 0.5, (event.clientY - rect.top) / rect.height - 0.5); };
  const hitLogo = () => {
    if (!sculpture || !pointerInside) return false;
    raycaster.setFromCamera(new THREE.Vector2(pointer.x * 2, -pointer.y * 2), camera);
    return raycaster.intersectObject(sculpture.root, true).length > 0;
  };
  const hitBerry = () => {
    if (!pointerInside) return false;
    raycaster.setFromCamera(new THREE.Vector2(pointer.x * 2, -pointer.y * 2), camera);
    return raycaster.intersectObject(berry.root, true).length > 0;
  };
  const move = event => {
    updatePointer(event);
    if (dragging) { dragAngle += (event.clientX - dragLastX) * 0.015; dragLastX = event.clientX; }
    host.style.cursor = dragging ? 'grabbing' : hitLogo() ? 'grab' : hitBerry() ? 'pointer' : 'default';
  };
  const down = event => {
    updatePointer(event);
    if (hitBerry()) {
      event.preventDefault(); berryPress = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      host.setPointerCapture(event.pointerId); host.focus({preventScroll:true}); return;
    }
    if (!hitLogo()) return;
    event.preventDefault(); dragging = true; dragLastX = event.clientX; host.setPointerCapture(event.pointerId); host.focus({preventScroll:true}); host.style.cursor = 'grabbing';
  };
  const up = event => {
    if (berryPress && berryPress.pointerId === event.pointerId) {
      updatePointer(event);
      const clicked = Math.hypot(event.clientX - berryPress.x, event.clientY - berryPress.y) < 8 && hitBerry();
      berryPress = null;
      if (clicked) onBerryClick?.();
    }
    dragging = false;
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
    host.style.cursor = hitLogo() ? 'grab' : hitBerry() ? 'pointer' : 'default';
  };
  const key = event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); dragAngle += event.key === 'ArrowLeft' ? -0.25 : 0.25; }
    if (event.key === 'Escape') dragAngle = 0;
  };
  const leave = () => { if (!dragging) { pointerInside = false; pointer.set(0, 0); host.style.cursor = 'default'; } };
  host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave);
  host.addEventListener('pointerdown', down); host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up); host.addEventListener('keydown', key);
  function animate(now) {
    frame = requestAnimationFrame(animate);
    // A first RAF timestamp can precede initialization during a heavy frame.
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05)); last = now;
    if (!visible || document.hidden) return;
    if (!paused) elapsed += dt;
    const activeDelta = paused ? 0 : dt;
    meadow.update(elapsed, activeDelta); facilities.forEach(f => f.userData.animate?.(elapsed, activeDelta));
    trucks.forEach(({ truck, curve, materials }, i) => {
      const phase = ((elapsed + i * 5) % 16) / 16;
      const u = Math.min(1, Math.max(0, (phase - 0.06) / 0.84));
      const point = curve.getPointAt(u), tangent = curve.getTangentAt(u);
      truck.position.copy(point); truck.position.y += 0.025; truck.rotation.y = Math.atan2(tangent.x, tangent.z);
      const opacity = Math.min(1, phase / 0.06, (1 - phase) / 0.08);
      materials.forEach(material => { material.opacity = opacity; });
      truck.userData.animate?.(elapsed, activeDelta);
    });
    workshops.update(elapsed);
    berry.update(elapsed);
    if (sculpture) {
      sculpture.root.rotation.y = THREE.MathUtils.lerp(sculpture.root.rotation.y, sculptureYaw + dragAngle, reducedMotion.matches ? 1 : 0.16);
      host.dataset.logoRotation = sculpture.root.rotation.y.toFixed(3);
    }
    birds.position.set(Math.sin(elapsed * 0.045) * 18, 12, -22); birds.rotation.y = Math.sin(elapsed * 0.045) * 0.2;
    birds.children.forEach((bird, i) => { bird.scale.y = 0.7 + Math.sin(elapsed * 4 + i) * 0.3; });
    const motion = !paused && !dragging && !reducedMotion.matches;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, 25 + (motion ? pointer.x * 1.8 : 0), 0.025);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 21 + (motion ? pointer.y * 0.8 : 0), 0.025);
    camera.lookAt(target); renderer.render(scene, camera);
    if (!firstFrame) { firstFrame = true; onFirstFrame?.(); scheduleSculpture(); }
    berry.bubbleAnchor.getWorldPosition(berryAnchor); berryAnchor.y += 0.18; berryAnchor.project(camera);
    const bx = (berryAnchor.x * 0.5 + 0.5) * host.clientWidth;
    const by = (-berryAnchor.y * 0.5 + 0.5) * host.clientHeight;
    const halfBubble = berryBubble.offsetWidth / 2;
    berryBubble.style.left = `${THREE.MathUtils.clamp(bx + (host.clientWidth < 650 ? 36 : 64), halfBubble + 12, host.clientWidth - halfBubble - 12)}px`;
    berryBubble.style.top = `${THREE.MathUtils.clamp(by - 8, berryBubble.offsetHeight + 12, host.clientHeight - 12)}px`;
    berryBubble.style.visibility = berryAnchor.z < 1 ? 'visible' : 'hidden';
  }
  frame = requestAnimationFrame(animate);
  return { dispose() {
    disposed = true;
    cancelSculptureLoad?.();
    if (sculpture) { scene.remove(sculpture.root); sculpture.dispose(); }
    cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect(); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); host.removeEventListener('pointerdown', down); host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', up); host.removeEventListener('keydown', key); workshops.dispose(); meadow.dispose();
    const geometries = new Set(), materials = new Set(); scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
  } };
}

// Original Agora character proportions, white face panel and smile.
function makeRobot(color) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = 0.55;
  const shell = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const darker = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.65), roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x243b47, roughness: 0.65 });
  const add = (parent, geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  function rounded(w, h, d, radius) {
    const x = -w / 2, y = -h / 2, r = Math.min(radius, w / 2, h / 2), shape = new THREE.Shape();
    shape.moveTo(x + r, y); shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, d - r), steps: 1, bevelEnabled: true, bevelThickness: r / 2, bevelSize: r / 2, bevelSegments: 3, curveSegments: 4 });
    geometry.translate(0, 0, -(d - r) / 2); return geometry;
  }
  add(body, rounded(0.70, 0.64, 0.50, 0.15), shell, 0, 0.30, 0);
  add(body, new THREE.CircleGeometry(0.09, 16), white, 0, 0.37, 0.271);
  const head = new THREE.Group(); head.position.y = 0.91; body.add(head);
  add(head, rounded(0.90, 0.76, 0.71, 0.19), shell, 0, 0, 0);
  add(head, rounded(0.69, 0.43, 0.035, 0.11), white, 0, -0.035, 0.367);
  for (const x of [-0.16, 0.16]) {
    const eye = add(head, new THREE.SphereGeometry(0.055, 10, 8), dark, x, -0.017, 0.47);
    eye.scale.set(0.82, 1.35, 0.50);
  }
  const smile = add(head, new THREE.TorusGeometry(0.072, 0.012, 6, 12, Math.PI * 0.85), dark, 0, -0.125, 0.48);
  smile.rotation.z = Math.PI * 1.08;
  add(head, new THREE.CylinderGeometry(0.023, 0.023, 0.18, 8), dark, 0, 0.47, 0);
  add(head, new THREE.SphereGeometry(0.07, 10, 8), shell, 0, 0.58, 0);
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.46, 0.49, 0); body.add(pivot);
    add(pivot, new THREE.CapsuleGeometry(0.11, 0.32, 3, 8), shell, 0, -0.18, 0);
    add(pivot, new THREE.SphereGeometry(0.13, 12, 8), white, 0, -0.43, 0);
    pivot.rotation.z = side * 0.10; return pivot;
  });
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.20, 0.5, 0); root.add(pivot);
    add(pivot, new THREE.CapsuleGeometry(0.11, 0.32, 3, 8), darker, 0, -0.15, 0);
    add(pivot, rounded(0.28, 0.16, 0.40, 0.06), dark, 0, -0.37, 0.065); return pivot;
  });
  return { root, body, arms, legs };
}
