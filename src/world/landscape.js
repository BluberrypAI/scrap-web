/** A small, living, Bliss-inspired landscape. No downloaded assets are used. */
export function createLandscape(THREE, scene) {
  const root = new THREE.Group();
  root.name = 'Bliss meadow';
  scene.add(root);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const keepGeometry = (value) => (geometries.add(value), value);
  const keepMaterial = (value) => (materials.add(value), value);
  const matrix = new THREE.Object3D();
  let seed = 703197;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const gaussian = (x, z, cx, cz, sx, sz) =>
    Math.exp(-(((x - cx) / sx) ** 2) - ((z - cz) / sz) ** 2);
  const smoothstep = (a, b, value) => {
    const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const facilities = [[-16, 8], [-3, 5], [10, -4], [19, -15], [10, 13]];
  const corridors = [
    [[-16, 8], [-3, 5]], [[-3, 5], [10, -4]],
    [[10, -4], [19, -15]], [[-3, 5], [10, 13]],
    [[10, 13], [10, -4]],
  ];
  function rawHeight(x, z) {
    return -0.62
      + 0.42 * Math.sin(x * 0.075 + z * 0.04)
      + 0.30 * Math.cos(z * 0.105 - x * 0.025)
      + 3.5 * gaussian(x, z, -26, -23, 22, 15)
      + 2.5 * gaussian(x, z, 31, -28, 19, 16)
      + 1.5 * gaussian(x, z, -31, 22, 18, 15)
      + 5.4 * gaussian(x, z, -42, -52, 34, 19)
      + 4.7 * gaussian(x, z, 24, -60, 43, 25)
      + 2.4 * gaussian(x, z, 64, -20, 22, 42);
  }
  function heightAt(x, z) {
    let height = rawHeight(x, z);
    for (const [fx, fz] of facilities) {
      const influence = 1 - smoothstep(2.8, 6, Math.hypot(x - fx, z - fz));
      height = THREE.MathUtils.lerp(height, rawHeight(fx, fz), influence);
    }
    // The working meadow remains untouched. Far behind it, let the ground roll
    // away from the default camera, so the skyline is a hill crest rather than
    // the corner of a rectangular plane. All facilities and route corridors
    // sit well inside this transition (backDepth < 12).
    const backDepth = -(x * 0.65 + z * 0.76);
    const screenSide = x * 0.76 - z * 0.65;
    const backdrop = smoothstep(12, 30, backDepth);
    height += backdrop * (4.4 * Math.exp(-(((screenSide + 18) / 42) ** 2))
      - 3.0 * smoothstep(-5, 55, screenSide));
    height -= Math.max(0, backDepth - 38) ** 2 * 0.024;
    height -= Math.max(0, Math.hypot(x, z) - 115) ** 2 * 0.035;
    return height;
  }
  function segmentDistance(x, z, a, b) {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const t = THREE.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1);
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
  }
  function occupied(x, z, padding = 0) {
    return facilities.some(([fx, fz]) => Math.hypot(x - fx, z - fz) < 4.3 + padding)
      || corridors.some(([a, b]) => segmentDistance(x, z, a, b) < 2.7 + padding);
  }
  function transform(mesh, index, x, y, z, sx, sy, sz, rotation = 0) {
    matrix.position.set(x, y, z);
    matrix.rotation.set(0, rotation, 0);
    matrix.scale.set(sx, sy, sz);
    matrix.updateMatrix();
    mesh.setMatrixAt(index, matrix.matrix);
  }
  function instanced(geometry, material, count, shadows = false) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }

  // A circular, gridded meadow has no square far corner. Its remote perimeter
  // drops behind the rolling crest, outside the working area and into the fog.
  const radialSegments = 144;
  const angularSegments = 256;
  const terrainRadius = 180;
  const terrainVertices = [0, 0, 0];
  const terrainUVs = [0.5, 0.5];
  const terrainIndices = [];
  for (let ring = 1; ring <= radialSegments; ring++) {
    const radius = terrainRadius * ring / radialSegments;
    for (let a = 0; a < angularSegments; a++) {
      const angle = a / angularSegments * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      terrainVertices.push(x, 0, z);
      terrainUVs.push(x / 216 + 0.5, z / 180 + 0.5);
      const current = 1 + (ring - 1) * angularSegments + a;
      const next = 1 + (ring - 1) * angularSegments + (a + 1) % angularSegments;
      if (ring === 1) terrainIndices.push(0, next, current);
      else {
        const inner = current - angularSegments;
        const innerNext = next - angularSegments;
        terrainIndices.push(inner, next, current, inner, innerNext, next);
      }
    }
  }
  const terrainGeometry = keepGeometry(new THREE.BufferGeometry());
  terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(terrainVertices, 3));
  terrainGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(terrainUVs, 2));
  terrainGeometry.setIndex(terrainIndices);
  const positions = terrainGeometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const low = new THREE.Color('#2c8118');
  const sunny = new THREE.Color('#7fbc27');
  const far = new THREE.Color('#78a84b');
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const h = heightAt(x, z);
    positions.setY(i, h);
    const broad = 0.48 + Math.sin(x * 0.09 + z * 0.06) * 0.16
      + Math.cos(z * 0.15) * 0.10 + Math.sin(x * 0.29 - z * 0.12) * 0.035;
    color.copy(low).lerp(sunny, THREE.MathUtils.clamp(broad + h * 0.027, 0, 1));
    color.lerp(far, smoothstep(35, 85, Math.hypot(x, z)) * 0.48);
    color.toArray(colors, i * 3);
  }
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeometry.computeVertexNormals();

  let meadowTexture;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#c9d6b9';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 12000; i++) {
        const x = random() * 256;
        const y = random() * 256;
        ctx.strokeStyle = random() > 0.5 ? 'rgba(255,255,210,.13)' : 'rgba(32,74,25,.09)';
        ctx.lineWidth = 0.4 + random() * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + random() * 1.5, y - random() * 3.4);
        ctx.stroke();
      }
      meadowTexture = new THREE.CanvasTexture(canvas);
      meadowTexture.wrapS = meadowTexture.wrapT = THREE.RepeatWrapping;
      meadowTexture.repeat.set(42, 35);
      meadowTexture.colorSpace = THREE.SRGBColorSpace;
      textures.add(meadowTexture);
    }
  }
  const terrainMaterial = keepMaterial(new THREE.MeshStandardMaterial({
    vertexColors: true, ...(meadowTexture ? { map: meadowTexture } : {}), roughness: 1, metalness: 0,
  }));
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.receiveShadow = true;
  root.add(terrain);

  // One instanced draw for all little grass tufts, with inexpensive GPU wind.
  const grassPositions = [];
  for (let b = 0; b < 3; b++) {
    const angle = b * Math.PI / 3;
    const width = 0.04;
    const length = 0.20 + b * 0.035;
    const dx = Math.cos(angle) * width;
    const dz = Math.sin(angle) * width;
    grassPositions.push(-dx, 0, -dz, dx, 0, dz, 0.045 * Math.sin(angle), length, 0.035 * Math.cos(angle));
  }
  const grassGeometry = keepGeometry(new THREE.BufferGeometry());
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3));
  grassGeometry.computeVertexNormals();
  const wind = { value: 0 };
  const grassMaterial = keepMaterial(new THREE.MeshStandardMaterial({
    color: '#ffffff', side: THREE.DoubleSide, roughness: 1,
  }));
  grassMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.meadowTime = wind;
    shader.vertexShader = 'uniform float meadowTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec4 meadowRoot = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float bend = sin(meadowTime * 1.45 + meadowRoot.x * .53 + meadowRoot.z * .31);
      transformed.x += bend * position.y * .24;
      transformed.z += cos(meadowTime + meadowRoot.x * .29) * position.y * .10;
    `);
  };
  const grassCount = 4600;
  const grass = instanced(grassGeometry, grassMaterial, grassCount);
  const bladeColor = new THREE.Color();
  for (let i = 0; i < grassCount; i++) {
    let x, z;
    do {
      x = (random() - 0.5) * 86;
      z = (random() - 0.5) * 66;
    } while (occupied(x, z, 0.25));
    const scale = 0.6 + random() * 1.35;
    transform(grass, i, x, heightAt(x, z) + 0.025, z, scale, scale, scale, random() * Math.PI * 2);
    bladeColor.setHSL(0.21 + random() * 0.045, 0.50 + random() * 0.20, 0.38 + random() * 0.17);
    grass.setColorAt(i, bladeColor);
  }

  // Leave the Bliss-like hillside open; keep a few trees at the side edges.
  const treePoints = [];
  for (let attempt = 0; attempt < 2000 && treePoints.length < 12; attempt++) {
    const x = (random() - 0.5) * 76;
    const z = (random() - 0.5) * 57;
    const screenSide = x * 0.76 - z * 0.65;
    const backDepth = -(x * 0.65 + z * 0.76);
    if (Math.abs(screenSide) < 29 || backDepth > 9) continue;
    if (occupied(x, z, 1.8) || (Math.abs(x) < 23 && z > -19 && z < 18)) continue;
    if (treePoints.some((p) => Math.hypot(p.x - x, p.z - z) < 3.2)) continue;
    treePoints.push({ x, z, scale: 0.68 + random() * 0.32, phase: random() * Math.PI * 2 });
  }
  const trunkGeometry = keepGeometry(new THREE.CylinderGeometry(0.12, 0.20, 1.6, 7));
  const trunkMaterial = keepMaterial(new THREE.MeshStandardMaterial({ color: '#95734b', roughness: 1 }));
  const crownGeometry = keepGeometry(new THREE.SphereGeometry(1, 11, 8));
  const crownMaterial = keepMaterial(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }));
  const trunks = instanced(trunkGeometry, trunkMaterial, treePoints.length, true);
  const crowns = instanced(crownGeometry, crownMaterial, treePoints.length * 3, true);
  const crownColor = new THREE.Color();
  treePoints.forEach((p, i) => {
    const y = heightAt(p.x, p.z);
    transform(trunks, i, p.x, y + p.scale * 0.76, p.z, p.scale, p.scale, p.scale);
    [[-0.43, 1.85, 0.10, 0.87], [0.39, 2.04, 0, 0.91], [0.02, 2.66, -0.05, 0.82]].forEach(([dx, dy, dz, size], j) => {
      transform(crowns, i * 3 + j, p.x + dx * p.scale, y + dy * p.scale, p.z + dz * p.scale,
        size * p.scale, size * p.scale * 1.13, size * p.scale);
      crownColor.setHSL(0.25 + random() * 0.035, 0.60 + random() * 0.12, 0.22 + random() * 0.08);
      crowns.setColorAt(i * 3 + j, crownColor);
    });
  });

  const shrubGeometry = keepGeometry(new THREE.SphereGeometry(1, 8, 6));
  const shrubMaterial = keepMaterial(new THREE.MeshStandardMaterial({ color: '#65a437', roughness: 1 }));
  const shrubs = instanced(shrubGeometry, shrubMaterial, 22, true);
  for (let i = 0; i < 22; i++) {
    let x, z;
    do { x = (random() - 0.5) * 76; z = (random() - 0.5) * 58; }
    while (occupied(x, z, 0.8) || Math.abs(x * 0.76 - z * 0.65) < 24 || -(x * 0.65 + z * 0.76) > 14);
    const s = 0.3 + random() * 0.43;
    transform(shrubs, i, x, heightAt(x, z) + s * 0.35, z, s * 1.35, s * 0.85, s);
  }

  // Tiny daisies catch the sun in patches instead of becoming a uniform grid.
  const flowerShape = new THREE.Shape();
  for (let i = 0; i <= 60; i++) {
    const angle = i / 60 * Math.PI * 2;
    const radius = 0.085 + 0.034 * Math.cos(angle * 5);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) flowerShape.moveTo(x, y); else flowerShape.lineTo(x, y);
  }
  const flowerGeometry = keepGeometry(new THREE.ShapeGeometry(flowerShape, 8));
  flowerGeometry.rotateX(-Math.PI / 2);
  const flowerMaterial = keepMaterial(new THREE.MeshStandardMaterial({ color: '#fff8dc', side: THREE.DoubleSide, roughness: 0.95 }));
  const pollenGeometry = keepGeometry(new THREE.SphereGeometry(0.031, 5, 4));
  const pollenMaterial = keepMaterial(new THREE.MeshStandardMaterial({ color: '#f9c84d', roughness: 0.8 }));
  const flowers = instanced(flowerGeometry, flowerMaterial, 260);
  const pollen = instanced(pollenGeometry, pollenMaterial, 260);
  const patches = [[-21, 15], [-11, -6], [0, 16], [20, 5], [25, -20], [-25, -17], [2, -19]];
  for (let i = 0; i < 260; i++) {
    const patch = patches[i % patches.length];
    let x, z;
    let attempts = 0;
    do {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * 5;
      x = patch[0] + Math.cos(angle) * distance;
      z = patch[1] + Math.sin(angle) * distance;
    } while (occupied(x, z, 0.2) && ++attempts < 50);
    const h = heightAt(x, z) + 0.17 + random() * 0.08;
    const s = 0.65 + random() * 0.9;
    transform(flowers, i, x, h, z, s, s, s, random() * Math.PI * 2);
    transform(pollen, i, x, h + 0.008, z, s, s * 0.55, s);
    if (i % 13 === 0) flowers.setColorAt(i, new THREE.Color('#aeb9f9'));
    else flowers.setColorAt(i, new THREE.Color('#fff9de'));
  }

  // Puffy, slow-moving clouds live behind the working area and never hide nodes.
  const cloudGeometry = keepGeometry(new THREE.SphereGeometry(1, 12, 8));
  const cloudMaterial = keepMaterial(new THREE.MeshStandardMaterial({
    color: '#ffffff', roughness: 1, emissive: '#e5f1ff', emissiveIntensity: 0.12,
  }));
  const cloudPuffs = [];
  const cloudGroups = [
    [-44, 9, -37, 1.5], [-19, 11, -54, 1.8], [8, 9, -47, 1.4],
    [37, 12, -53, 2.0], [-61, 12, -7, 1.8], [61, 11, -24, 1.5],
  ];
  cloudGroups.forEach(([x, y, z, scale], group) => {
    [[-2.2, 0, 0, 1.9], [-0.5, 0.7, 0.2, 2.2], [1.2, 0.3, 0, 1.9], [2.7, -0.1, 0.1, 1.3], [0.2, -0.5, 0.5, 2.2]].forEach(([dx, dy, dz, size]) => {
      cloudPuffs.push({ x: x + dx * scale, y: y + dy * scale, z: z + dz * scale,
        sx: size * scale, sy: size * scale * 0.55, sz: size * scale * 0.72, group });
    });
  });
  const clouds = instanced(cloudGeometry, cloudMaterial, cloudPuffs.length);
  clouds.receiveShadow = false;
  cloudPuffs.forEach((p, i) => transform(clouds, i, p.x, p.y, p.z, p.sx, p.sy, p.sz));

  // Small distant windmills add an unobtrusive, continuous sign of life.
  const windmills = [];
  const ivory = keepMaterial(new THREE.MeshStandardMaterial({ color: '#f9f5e8', roughness: 0.7 }));
  const poleGeometry = keepGeometry(new THREE.CylinderGeometry(0.065, 0.18, 5.3, 10));
  const hubGeometry = keepGeometry(new THREE.SphereGeometry(0.18, 9, 7));
  const bladeGeometry = keepGeometry(new THREE.BoxGeometry(0.13, 2.4, 0.055));
  [[32, -29]].forEach(([x, z], index) => {
    const y = heightAt(x, z);
    const mast = new THREE.Mesh(poleGeometry, ivory);
    mast.position.set(x, y + 2.65, z);
    mast.castShadow = true;
    root.add(mast);
    const rotor = new THREE.Group();
    rotor.position.set(x, y + 5.2, z + 0.18);
    const hub = new THREE.Mesh(hubGeometry, ivory);
    rotor.add(hub);
    for (let b = 0; b < 3; b++) {
      const arm = new THREE.Group();
      arm.rotation.z = b * Math.PI * 2 / 3;
      const blade = new THREE.Mesh(bladeGeometry, ivory);
      blade.position.y = 1.15;
      blade.rotation.z = -0.10;
      blade.castShadow = true;
      arm.add(blade);
      rotor.add(arm);
    }
    root.add(rotor);
    windmills.push({ rotor, phase: index * 1.4 });
  });

  const wingGeometry = keepGeometry(new THREE.SphereGeometry(1, 5, 4));
  const wingMaterial = keepMaterial(new THREE.MeshStandardMaterial({
    color: '#ffdf83', roughness: 0.8, emissive: '#ffd685', emissiveIntensity: 0.10,
  }));
  const butterflies = [];
  for (let i = 0; i < 11; i++) {
    const patch = patches[i % patches.length];
    butterflies.push({ x: patch[0], z: patch[1], phase: random() * Math.PI * 2, speed: 0.35 + random() * 0.25 });
  }
  const wings = instanced(wingGeometry, wingMaterial, butterflies.length * 2);
  wings.receiveShadow = false;
  const updateButterflies = (elapsed) => {
    butterflies.forEach((b, i) => {
      const t = elapsed * b.speed + b.phase;
      const x = b.x + Math.sin(t) * 2.0;
      const z = b.z + Math.cos(t * 0.81) * 1.5;
      const y = heightAt(x, z) + 0.85 + Math.sin(t * 2) * 0.22;
      for (let side = 0; side < 2; side++) {
        matrix.position.set(x + (side ? 1 : -1) * 0.065, y, z);
        matrix.rotation.set(0, -t, (side ? 1 : -1) * Math.sin(elapsed * 12 + b.phase) * 0.75);
        matrix.scale.set(0.12, 0.025, 0.08);
        matrix.updateMatrix();
        wings.setMatrixAt(i * 2 + side, matrix.matrix);
      }
    });
    wings.instanceMatrix.needsUpdate = true;
  };
  updateButterflies(0);
  // Animated instances must not keep a bounding sphere from their first position.
  wings.frustumCulled = false;
  clouds.frustumCulled = false;

  let disposed = false;
  return {
    heightAt,
    update(elapsedSeconds, deltaSeconds) {
      if (disposed) return;
      const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
      // Absolute-time movement remains consistent after background-tab throttling.
      wind.value = elapsed;
      cloudPuffs.forEach((p, i) => {
        const drift = Math.sin(elapsed * 0.012 + p.group) * 1.2 + elapsed * 0.012;
        transform(clouds, i, p.x + drift % 14, p.y + Math.sin(elapsed * 0.09 + p.group) * 0.10, p.z, p.sx, p.sy, p.sz);
      });
      clouds.instanceMatrix.needsUpdate = true;
      windmills.forEach(({ rotor, phase }) => { rotor.rotation.z = phase - elapsed * 0.32; });
      updateButterflies(elapsed);
      // Keep the optional delta argument in the public interface for the scene loop.
      void deltaSeconds;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(root);
      root.traverse((object) => { if (object.isInstancedMesh) object.dispose(); });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      root.clear();
    },
  };
}
