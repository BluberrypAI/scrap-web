// Procedural toy-scale facilities. All assets are local geometry; no textures or timers.
export function createFacility(THREE, kind = 'source', accentHex = 0x2587f5) {
  const root = new THREE.Group();
  const palette = {
    white: material(THREE, 0xf7faf8), wall: material(THREE, 0xe1e9e7),
    accent: material(THREE, accentHex), dark: material(THREE, 0x17344c),
    glass: material(THREE, 0x9fdded, 0.22, 0.12), metal: material(THREE, 0xb4c5c8, 0.34, 0.35),
    concrete: material(THREE, 0xc6d1c4), pale: material(THREE, 0xe9f1e5),
    green: material(THREE, 0x5bb26c), yellow: material(THREE, 0xffcf58),
    blue: material(THREE, 0x438be2), red: material(THREE, 0xf18a76),
    wood: material(THREE, 0xb99564), rubber: material(THREE, 0x34404a),
  };
  const rounded = (w, h, d, m, x, y, z, radius = 0.08) => {
    const mesh = shadow(new THREE.Mesh(roundBox(THREE, w, h, d, radius), m));
    mesh.position.set(x, y, z); root.add(mesh); return mesh;
  };
  const box = (w, h, d, m, x, y, z) => {
    const mesh = shadow(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
    mesh.position.set(x, y, z); root.add(mesh); return mesh;
  };
  const cyl = (rt, rb, h, m, x, y, z, segments = 20) => {
    const mesh = shadow(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), m));
    mesh.position.set(x, y, z); root.add(mesh); return mesh;
  };
  const pipe = (points, radius = 0.1, m = palette.metal) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = shadow(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 8, false), m));
    root.add(mesh); return mesh;
  };
  const windows = (positions, w = 0.4, h = 0.48, d = 0.035) => instances(THREE, root,
    new THREE.BoxGeometry(w, h, d), palette.glass, positions);
  const animate = [];

  // A soft-edged concrete apron anchors the pop animation to the grass.
  rounded(5.65, 0.16, 4.5, palette.concrete, 0, 0.08, 0, 0.14);
  rounded(5.25, 0.06, 4.12, palette.pale, 0, 0.18, 0, 0.09);

  if (kind === 'source') {
    rounded(4.3, 2.5, 2.75, palette.white, 0, 1.49, -0.43, 0.1);
    box(4.31, 0.18, 2.77, palette.wall, 0, 0.42, -0.43);
    // A single sawtooth roof silhouette, rather than a plain box factory.
    const roof = new THREE.Shape();
    roof.moveTo(-2.19, 2.73); roof.lineTo(-2.19, 3.07);
    for (let i = 0; i < 3; i++) {
      const x = -2.19 + i * 1.46;
      roof.lineTo(x + 1.17, 3.8); roof.lineTo(x + 1.17, 3.07); roof.lineTo(x + 1.46, 3.07);
    }
    roof.lineTo(2.19, 2.73); roof.closePath();
    const roofMesh = shadow(new THREE.Mesh(new THREE.ExtrudeGeometry(roof,
      { depth: 2.88, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.035, bevelThickness: 0.035 }), palette.accent));
    roofMesh.position.z = -1.87; root.add(roofMesh);
    windows([[-1.45, 2.06, 0.965], [-0.85, 2.06, 0.965], [-0.25, 2.06, 0.965]], 0.44, 0.55);
    rounded(1.22, 1.43, 0.11, palette.dark, 1.15, 1.0, 0.99, 0.035);
    instances(THREE, root, new THREE.BoxGeometry(1.05, 0.04, 0.035), palette.metal,
      [0.5, 0.73, 0.96, 1.19, 1.42].map(y => [1.15, y, 1.065]));
    rounded(1.55, 0.14, 0.45, palette.accent, 1.15, 1.85, 1.12, 0.04);
    box(1.6, 0.2, 0.72, palette.wall, 1.15, 0.32, 1.4);
    cyl(0.25, 0.3, 1.8, palette.white, -1.62, 3.04, -1.4);
    cyl(0.31, 0.31, 0.12, palette.accent, -1.62, 3.98, -1.4);
    for (const x of [-1.55, -0.85]) {
      rounded(0.55, 0.5, 0.58, x < -1 ? palette.blue : palette.yellow, x, 0.5, 1.28, 0.045);
      box(0.6, 0.06, 0.62, palette.dark, x, 0.78, 1.28);
    }
  } else if (kind === 'sorting') {
    rounded(3.65, 1.9, 2.25, palette.white, -0.25, 1.19, -0.8, 0.1);
    rounded(3.9, 0.21, 2.5, palette.accent, -0.25, 2.25, -0.8, 0.1);
    windows([[-1.3, 1.66, 0.34], [-0.73, 1.66, 0.34], [-0.16, 1.66, 0.34]], 0.43, 0.36);
    rounded(0.75, 1.25, 0.06, palette.dark, 1.03, 0.92, 0.35, 0.03);
    // Three sorting hoppers visibly distinguish the facility from the others.
    for (let i = 0; i < 3; i++) {
      const x = -1.55 + i * 1.05;
      const m = [palette.blue, palette.yellow, palette.green][i];
      rounded(0.8, 0.62, 0.73, m, x, 0.59, 1.38, 0.07);
      rounded(0.67, 0.05, 0.57, palette.dark, x, 0.93, 1.38, 0.045);
      rounded(0.35, 0.15, 0.03, palette.white, x, 0.61, 1.76, 0.025);
    }
    rounded(4.25, 0.16, 0.59, palette.dark, 0.05, 1.0, 0.68, 0.06);
    instances(THREE, root, new THREE.BoxGeometry(0.055, 0.025, 0.49), palette.metal,
      Array.from({ length: 14 }, (_, i) => [-1.93 + i * 0.3, 1.09, 0.68]));
    instances(THREE, root, new THREE.BoxGeometry(0.09, 0.74, 0.09), palette.metal,
      [-1.7, 1.6].flatMap(x => [[x, 0.62, 0.49], [x, 0.62, 0.87]]));
    const parcels = new THREE.Group(); root.add(parcels);
    const pieces = [];
    for (let i = 0; i < 4; i++) {
      const mesh = shadow(new THREE.Mesh(roundBox(THREE, 0.25, 0.2, 0.24, 0.035),
        [palette.blue, palette.green, palette.yellow, palette.white][i]));
      mesh.position.set(-1.5 + i * 0.9, 1.2, 0.68); parcels.add(mesh); pieces.push(mesh);
    }
    animate.push(t => pieces.forEach((p, i) => { p.position.x = ((t * 0.32 + i * 0.92) % 3.7) - 1.85; }));
    cyl(0.32, 0.4, 0.5, palette.metal, 1.02, 2.64, -1.1);
    rounded(0.5, 0.09, 0.5, palette.accent, 1.02, 2.94, -1.1, 0.08);
  } else if (kind === 'recycling') {
    rounded(2.65, 2.1, 2.65, palette.white, -1.13, 1.29, -0.48, 0.1);
    rounded(2.82, 0.2, 2.8, palette.accent, -1.13, 2.43, -0.48, 0.1);
    windows([[-1.84, 1.78, 0.87], [-1.18, 1.78, 0.87], [-0.52, 1.78, 0.87]], 0.48, 0.4);
    for (const [x, z, h] of [[0.95, -0.9, 3.6], [2.03, -0.72, 2.95]]) {
      cyl(0.45, 0.45, h, palette.white, x, 0.4 + h / 2, z, 24);
      cyl(0.47, 0.47, 0.2, palette.accent, x, h + 0.42, z, 24);
      cyl(0.46, 0.46, 0.08, palette.metal, x, 1.03, z, 24);
      cyl(0.46, 0.46, 0.08, palette.metal, x, h - 0.2, z, 24);
      cyl(0.1, 0.1, 0.25, palette.metal, x, h + 0.63, z, 12);
    }
    pipe([[-0.04, 2.05, -0.7], [0.38, 2.05, -0.7], [0.42, 2.6, -0.86], [0.9, 2.66, -0.9]], 0.11);
    pipe([[0.95, 0.65, -0.9], [0.95, 0.58, 0.3], [1.75, 0.58, 0.65], [1.75, 1.2, 0.65]], 0.12, palette.accent);
    rounded(1.25, 0.6, 1.1, palette.wall, -1.05, 0.54, 1.13, 0.07);
    const reel = new THREE.Group(); reel.position.set(-1.05, 1.18, 1.45); root.add(reel);
    const ring = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.085, 8, 24), palette.accent));
    reel.add(ring);
    for (let i = 0; i < 3; i++) {
      const spoke = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.055, 0.06), palette.white));
      spoke.rotation.z = i * Math.PI / 3; reel.add(spoke);
    }
    const hub = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 16), palette.metal));
    hub.rotation.x = Math.PI / 2; reel.add(hub);
    animate.push(t => { reel.rotation.z = -t * 0.45; });
    rounded(0.8, 0.57, 0.8, palette.green, 1.8, 0.55, 1.38, 0.06);
    box(0.82, 0.08, 0.82, palette.white, 1.8, 0.87, 1.38);
  } else if (kind === 'manufacturing') {
    rounded(4.35, 2.25, 2.85, palette.white, 0, 1.37, -0.4, 0.1);
    rounded(4.58, 0.22, 3.08, palette.accent, 0, 2.62, -0.4, 0.12);
    rounded(1.15, 1.45, 0.07, palette.dark, 1.15, 1.0, 1.06, 0.035);
    instances(THREE, root, new THREE.BoxGeometry(1.01, 0.035, 0.035), palette.metal,
      [0.45, 0.7, 0.95, 1.2, 1.45].map(y => [1.15, y, 1.11]));
    windows([[-1.55, 1.68, 1.05], [-0.95, 1.68, 1.05], [-0.35, 1.68, 1.05]], 0.43, 0.5);
    // Solar modules, with a light frame and dark cells in one instanced draw each.
    const panels = new THREE.Group(); panels.rotation.x = -0.13; panels.position.set(0, 2.82, -0.5); root.add(panels);
    const panelPositions = [-1.46, -0.48, 0.5, 1.48].flatMap(x => [[x, 0, -0.55], [x, 0, 0.55]]);
    instances(THREE, panels, new THREE.BoxGeometry(0.87, 0.07, 0.9), palette.metal, panelPositions);
    instances(THREE, panels, new THREE.BoxGeometry(0.77, 0.025, 0.8), palette.dark,
      panelPositions.map(([x, y, z]) => [x, y + 0.05, z]));
    for (const x of [-1.6, -0.6]) {
      rounded(0.83, 0.13, 0.8, palette.wood, x, 0.32, 1.45, 0.025);
      rounded(0.7, 0.61, 0.68, palette.wall, x, 0.68, 1.45, 0.05);
      box(0.08, 0.64, 0.7, palette.accent, x, 0.69, 1.45);
      box(0.72, 0.64, 0.07, palette.accent, x, 0.69, 1.45);
    }
    rounded(1.3, 0.15, 0.5, palette.accent, 1.15, 1.84, 1.18, 0.04);
  } else {
    // A distinct, green, modular alternate-route research facility.
    rounded(3.0, 1.8, 2.5, palette.white, -0.8, 1.14, -0.45, 0.1);
    rounded(3.2, 0.24, 2.7, palette.green, -0.8, 2.18, -0.45, 0.12);
    windows([[-1.7, 1.5, 0.83], [-1.1, 1.5, 0.83], [-0.5, 1.5, 0.83]], 0.44, 0.5);
    rounded(0.63, 1.27, 0.08, palette.accent, 0.2, 0.92, 0.84, 0.035);
    cyl(0.73, 0.73, 1.9, palette.white, 1.65, 1.2, -0.55, 24);
    cyl(0.77, 0.77, 0.15, palette.green, 1.65, 2.2, -0.55, 24);
    const dome = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.73, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), palette.green));
    dome.position.set(1.65, 2.27, -0.55); root.add(dome);
    pipe([[0.55, 1.5, -0.5], [0.85, 1.5, -0.5], [0.95, 2.4, -0.55], [1.65, 2.55, -0.55]], 0.09);
    for (const x of [-1.6, -0.65, 0.3]) {
      rounded(0.65, 0.53, 0.65, palette.green, x, 0.52, 1.48, 0.08);
      rounded(0.69, 0.07, 0.69, palette.white, x, 0.82, 1.48, 0.03);
    }
  }

  // Small landmark pennant gives each popped facility a lively silhouette.
  cyl(0.026, 0.026, 1.32, palette.metal, 2.36, 0.88, 1.62, 8);
  const flag = shadow(new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.29, 4, 1),
    new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.7, side: THREE.DoubleSide })));
  flag.position.set(2.62, 1.38, 1.62); root.add(flag);
  const positions = flag.geometry.attributes.position;
  const initial = Array.from(positions.array);
  animate.push(t => {
    for (let i = 0; i < positions.count; i++) {
      const x = initial[i * 3];
      positions.setZ(i, Math.sin(t * 3.2 + x * 8) * (x + 0.26) * 0.1);
    }
    positions.needsUpdate = true;
  });
  root.userData.animate = (elapsed, dt) => animate.forEach(fn => fn(elapsed, dt));
  root.userData.kind = kind;
  return root;
}

export function createTruck(THREE, colorHex = 0x2789ed) {
  const root = new THREE.Group();
  const color = material(THREE, colorHex), white = material(THREE, 0xf6faf8);
  const glass = material(THREE, 0x8bc9e3, 0.2, 0.18), dark = material(THREE, 0x263d4a);
  const steel = material(THREE, 0xc6d1d1, 0.3, 0.4), rubber = material(THREE, 0x2f363d);
  const lights = new THREE.MeshStandardMaterial({ color: 0xfff0ba, emissive: 0xffcd67, emissiveIntensity: 0.15 });
  const add = (geo, mat, x, y, z) => {
    const mesh = shadow(new THREE.Mesh(geo, mat)); mesh.position.set(x, y, z); root.add(mesh); return mesh;
  };
  // Front points +Z. Compact dimensions are ~0.85 x 1.7 including mirrors.
  add(roundBox(THREE, 0.74, 0.16, 1.53, 0.035), dark, 0, 0.22, -0.04);
  add(roundBox(THREE, 0.78, 0.65, 0.99, 0.055), white, 0, 0.61, -0.29);
  add(roundBox(THREE, 0.8, 0.1, 1.02, 0.035), color, 0, 0.98, -0.29);
  add(roundBox(THREE, 0.75, 0.58, 0.55, 0.08), color, 0, 0.55, 0.52);
  add(roundBox(THREE, 0.62, 0.22, 0.025, 0.03), glass, 0, 0.7, 0.808);
  const sideGlass = new THREE.BoxGeometry(0.025, 0.21, 0.34);
  add(sideGlass, glass, -0.39, 0.7, 0.53); add(sideGlass, glass, 0.39, 0.7, 0.53);
  add(new THREE.BoxGeometry(0.62, 0.08, 0.04), steel, 0, 0.32, 0.83);
  add(new THREE.BoxGeometry(0.32, 0.09, 0.025), dark, 0, 0.44, 0.825);
  instances(THREE, root, new THREE.BoxGeometry(0.13, 0.08, 0.035), lights,
    [[-0.25, 0.46, 0.83], [0.25, 0.46, 0.83]]);
  instances(THREE, root, new THREE.BoxGeometry(0.035, 0.1, 0.12), dark,
    [[-0.44, 0.66, 0.71], [0.44, 0.66, 0.71]]);
  // A clean accent stripe and the rear loading door.
  instances(THREE, root, new THREE.BoxGeometry(0.02, 0.12, 0.87), color,
    [[-0.4, 0.65, -0.29], [0.4, 0.65, -0.29]]);
  add(new THREE.BoxGeometry(0.64, 0.51, 0.025), steel, 0, 0.61, -0.805);
  const wheels = [];
  for (const x of [-0.41, 0.41]) {
    for (const z of [-0.57, -0.22, 0.54]) {
      const wheel = new THREE.Group(); wheel.position.set(x, 0.2, z);
      const tire = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 12), rubber));
      tire.rotation.z = Math.PI / 2; wheel.add(tire);
      const hub = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.125, 12), steel));
      hub.rotation.z = Math.PI / 2; wheel.add(hub); root.add(wheel); wheels.push(wheel);
    }
  }
  root.userData.wheels = wheels;
  root.userData.animate = (_t, dt = 0.016) => wheels.forEach(w => { w.rotation.x += dt * 4; });
  return root;
}

export function createDiscoveryBurst(THREE, colorHex = 0xa3e75e) {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex,
    emissiveIntensity: 0.3, roughness: 0.5, transparent: true, opacity: 0.8 });
  const geo = new THREE.OctahedronGeometry(0.07);
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(geo, mat); const a = i * Math.PI * 2 / 12;
    m.position.set(Math.cos(a) * 1.5, 0.2 + (i % 3) * 0.2, Math.sin(a) * 1.5);
    m.userData.angle = a; root.add(m);
  }
  root.userData.animate = t => root.children.forEach((m, i) => {
    m.position.y = 0.3 + ((t * 0.8 + i * 0.11) % 1) * 2.5;
    m.rotation.y = t + i;
  });
  return root;
}

function material(THREE, color, roughness = 0.65, metalness = 0.04) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function shadow(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

function instances(THREE, parent, geometry, mat, positions) {
  const mesh = shadow(new THREE.InstancedMesh(geometry, mat, positions.length));
  const matrix = new THREE.Matrix4();
  positions.forEach(([x, y, z], i) => { matrix.makeTranslation(x, y, z); mesh.setMatrixAt(i, matrix); });
  mesh.instanceMatrix.needsUpdate = true; parent.add(mesh); return mesh;
}

function roundBox(THREE, w, h, d, radius = 0.06) {
  const r = Math.min(radius, w / 4, h / 4, d / 4);
  const x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y); shape.lineTo(x + ww - r, y);
  shape.quadraticCurveTo(x + ww, y, x + ww, y + r);
  shape.lineTo(x + ww, y + hh - r); shape.quadraticCurveTo(x + ww, y + hh, x + ww - r, y + hh);
  shape.lineTo(x + r, y + hh); shape.quadraticCurveTo(x, y + hh, x, y + hh - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const geometry = new THREE.ExtrudeGeometry(shape,
    { depth: Math.max(d - 2 * r, 0.001), bevelEnabled: true, bevelSegments: 2,
      bevelSize: r, bevelThickness: r, curveSegments: 3, steps: 1 });
  geometry.translate(0, 0, -(d - 2 * r) / 2);
  geometry.computeVertexNormals();
  return geometry;
}
