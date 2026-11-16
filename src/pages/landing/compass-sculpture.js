import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import outline from './compass-outline.json';

// Restore the original rainbow artwork and reflective 3D finish.
export async function createCompassSculpture(renderer) {
  const texture = await new THREE.TextureLoader().loadAsync(outline.source);
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04); room.dispose(); pmrem.dispose();
  const logo = new THREE.Group();
  const face = new THREE.MeshPhysicalMaterial({ map: texture, color: 0xdddddd, metalness: 0.35, roughness: 0.28,
    clearcoat: 1, clearcoatRoughness: 0.09, iridescence: 0.35, iridescenceIOR: 1.3,
    iridescenceThicknessRange: [180, 380], envMap: environment.texture, envMapIntensity: 0.7, alphaTest: 0.1 });
  const edge = new THREE.MeshPhysicalMaterial({ color: 0x659cad, metalness: 0.9, roughness: 0.2,
    clearcoat: 1, iridescence: 1, iridescenceThicknessRange: [120, 430], envMap: environment.texture, envMapIntensity: 1.3 });
  const scale = 5.7 / outline.height;
  const pathFrom = (points, Path) => {
    const path = new Path();
    points.forEach(([px, py], i) => {
      const x = (px - outline.width / 2) * scale, y = (outline.height / 2 - py) * scale;
      if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
    });
    path.closePath(); return path;
  };
  for (const part of outline.parts) {
    const shape = pathFrom(part.outline, THREE.Shape);
    shape.holes = part.holes.map(hole => pathFrom(hole, THREE.Path));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.36, steps: 1, bevelEnabled: true, bevelThickness: 0.065, bevelSize: 0.032, bevelSegments: 4, curveSegments: 12 });
    geometry.translate(0, 0, -0.18);
    const positions = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      uv.setXY(i, positions.getX(i) / (scale * outline.width) + 0.5, positions.getY(i) / (scale * outline.height) + 0.5);
    }
    uv.needsUpdate = true;
    logo.add(new THREE.Mesh(geometry, [face, edge]));
  }

  logo.scale.setScalar(1.18);
  const bounds = new THREE.Box3().setFromObject(logo);
  // The original artwork is off-center within its PNG; ground its actual outline.
  logo.position.y = -bounds.min.y + 0.32;
  logo.position.x = -(bounds.min.x + bounds.max.x) / 2;
  logo.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
  const root = new THREE.Group(); root.add(logo);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.85, 0.30, 64), new THREE.MeshStandardMaterial({color:0xe8eee2, roughness:0.6}));
  plinth.position.y = 0.15; plinth.castShadow = true; plinth.receiveShadow = true; root.add(plinth);
  return { root, dispose() {
    root.traverse(object => { object.geometry?.dispose(); });
    face.dispose(); edge.dispose(); plinth.material.dispose(); texture.dispose(); environment.dispose();
  } };
}
