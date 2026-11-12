import * as THREE from 'three';

// Home-only details; the shared treatment-map facility models stay unchanged.
export function addFactoryDetails(facility, kind) {
  const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.03 });
  const ivory = material(0xf2f4e9), trim = material(0xa5b8b8), recess = material(0x466573);
  const glass = material(0x76afc2), pipeMaterial = material(0x91aaac), dark = material(0x314c59);
  function mesh(geometry, mat, x, y, z) {
    const part = new THREE.Mesh(geometry, mat); part.position.set(x, y, z);
    part.castShadow = true; part.receiveShadow = true; facility.add(part); return part;
  }
  const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const pipe = (points, radius = 0.055) => {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(path, 22, radius, 8, false), pipeMaterial, 0, 0, 0);
  };
  function windowFrame(x, y, z, w, h, side = false) {
    const frame = new THREE.Group(); frame.position.set(x, y, z); if (side) frame.rotation.y = Math.PI / 2;
    facility.add(frame);
    const add = (width, height, depth, mat, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
      m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; frame.add(m);
    };
    add(w + 0.13, h + 0.13, 0.055, recess, 0, 0, 0);
    add(w, h, 0.065, glass, 0, 0, 0.025);
    for (const sign of [-1, 1]) {
      add(0.045, h + 0.13, 0.1, ivory, sign * (w / 2 + 0.035), 0, 0.03);
      add(w + 0.13, 0.045, 0.1, ivory, 0, sign * (h / 2 + 0.035), 0.03);
    }
    add(0.025, h, 0.08, ivory, 0, 0, 0.045);
    add(w + 0.2, 0.065, 0.19, trim, 0, -h / 2 - 0.09, 0.07);
  }
  if (kind === 'source') {
    [-1.45, -0.85, -0.25].forEach(x => windowFrame(x, 2.06, 0.99, 0.44, 0.55));
    [-1.35, -0.6, 0.15].forEach(z => windowFrame(2.16, 1.9, z, 0.43, 0.48, true));
    box(0.08, 0.11, 2.76, trim, 2.17, 0.6, -0.43);
    for (const z of [-1.75, 0.87]) box(0.09, 2.23, 0.08, ivory, 2.18, 1.55, z);
    pipe([[2.27, 2.65, -1.45], [2.35, 2.6, -1.45], [2.35, 0.6, -1.45], [2.55, 0.35, -1.45]], 0.065);
    box(0.55, 0.65, 0.15, trim, 2.24, 1.0, -0.25).rotation.y = Math.PI / 2;
    // Recessed loading-door jambs and safety lamps.
    for (const x of [0.49, 1.81]) box(0.09, 1.48, 0.12, trim, x, 1.02, 1.04);
    box(1.4, 0.07, 0.10, recess, 1.15, 1.72, 1.06);
  } else if (kind === 'sorting') {
    [-1.3, -0.73, -0.16].forEach(x => windowFrame(x, 1.66, 0.37, 0.43, 0.36));
    [-1.5, -0.7].forEach(z => windowFrame(1.59, 1.5, z, 0.42, 0.43, true));
    box(3.8, 0.09, 0.08, recess, -0.25, 2.12, 0.36);
    box(0.08, 0.09, 2.35, recess, 1.6, 2.12, -0.8);
    // Lightweight roof rails with joints and an additional duct run.
    for (const x of [-2.1, -0.85, 0.4, 1.5]) {
      pipe([[x, 2.36, -1.94], [x, 2.77, -1.94]], 0.025);
    }
    pipe([[-2.1, 2.77, -1.94], [1.5, 2.77, -1.94]], 0.028);
    pipe([[1.5, 2.77, -1.94], [1.5, 2.77, 0.3]], 0.028);
    pipe([[1.5, 2.36, 0.3], [1.5, 2.77, 0.3]], 0.025);
    pipe([[-1.3, 2.42, -1.0], [-1.3, 2.65, -0.45], [0.5, 2.65, -0.45]], 0.09);
    box(0.18, 0.38, 0.32, dark, 2.05, 0.84, 0.68);
  } else {
    [-1.84, -1.18, -0.52].forEach(x => windowFrame(x, 1.78, 0.9, 0.48, 0.4));
    box(2.72, 0.10, 0.09, recess, -1.13, 2.30, 0.9);
    box(0.08, 0.12, 2.65, trim, 0.23, 0.55, -0.48);
    for (const [x, z, h] of [[0.95, -0.9, 3.6], [2.03, -0.72, 2.95]]) {
      for (const y of [0.65, 1.65, h - 0.45]) {
        const ring = mesh(new THREE.TorusGeometry(0.46, 0.035, 8, 24), trim, x, y, z); ring.rotation.x = Math.PI / 2;
      }
      for (const dx of [-0.18, 0.18]) pipe([[x + dx, 0.5, z + 0.48], [x + dx, h + 0.3, z + 0.48]], 0.018);
      for (let y = 0.7; y < h + 0.2; y += 0.25) pipe([[x - 0.18, y, z + 0.48], [x + 0.18, y, z + 0.48]], 0.018);
      const gauge = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16), ivory, x, 1.4, z + 0.49); gauge.rotation.x = Math.PI / 2;
      box(0.015, 0.12, 0.02, dark, x, 1.42, z + 0.53).rotation.z = -0.5;
    }
  }
  // Dock bollards and concrete expansion joints give the apron a grounded edge.
  for (const x of [2.58, -2.58]) {
    mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.38, 10), trim, x, 0.42, 1.9);
  }
  for (const x of [-1.3, 0, 1.3]) box(0.012, 0.004, 0.45, trim, x, 0.214, -1.8);
}
