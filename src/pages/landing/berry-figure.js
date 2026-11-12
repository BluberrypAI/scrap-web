import * as THREE from 'three';

// Berry's existing round blueberry silhouette, leaf, forehead patch and waving hand.
export function createBerryFigure() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = 1.45;
  const blue = new THREE.MeshStandardMaterial({color:0x6264d5,roughness:0.55,metalness:0});
  const navy = new THREE.MeshStandardMaterial({color:0x25265e,roughness:0.6});
  const leafMaterial = new THREE.MeshStandardMaterial({color:0x68bd72,roughness:0.62,side:THREE.DoubleSide});
  const white = new THREE.MeshStandardMaterial({color:0xfffdf2,roughness:0.5});
  function ellipsoid(parent, material, position, scale) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1,32,24),material);
    mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function tube(parent, points, radius, material=blue) {
    const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve,20,radius,10,false),material); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  ellipsoid(body,blue,[0,0,0],[0.96,1.08,0.68]);
  ellipsoid(body,navy,[0.03,0.72,0.50],[0.29,0.29,0.07]);
  const eyes = [-1,1].map(side=> {
    const eye = ellipsoid(body,navy,[side*0.29,0.1,0.645],[0.085,0.125,0.055]);
    ellipsoid(eye,white,[-0.16,0.4,0.84],[0.20,0.16,0.17]); return eye;
  });
  tube(body,[[-0.18,-0.13,0.675],[-0.1,-0.2,0.7],[0.03,-0.22,0.7],[0.17,-0.15,0.675]],0.028,navy);
  const leafShape = new THREE.Shape(); leafShape.moveTo(0,0);
  leafShape.bezierCurveTo(0.08,0.36,0.40,0.46,0.66,0.40);
  leafShape.bezierCurveTo(0.53,0.09,0.24,-0.05,0,0);
  const leaf = new THREE.Mesh(new THREE.ExtrudeGeometry(leafShape,{depth:0.045,bevelEnabled:true,bevelThickness:0.018,bevelSize:0.018,bevelSegments:3,curveSegments:16}),leafMaterial);
  leaf.position.set(0.22,0.93,0.02); leaf.rotation.set(-0.15,0.1,-0.08); leaf.castShadow = true; body.add(leaf);
  tube(body,[[0.20,0.98,0.04],[0.38,1.1,0.06]],0.035,leafMaterial);
  tube(body,[[-0.76,-0.28,0],[-1.03,-0.55,0.03],[-1.11,-0.74,0.08]],0.105);
  ellipsoid(body,blue,[-1.1,-0.73,0.08],[0.15,0.19,0.13]);
  const wave = new THREE.Group(); wave.position.set(0.77,-0.20,0); body.add(wave);
  tube(wave,[[0,0,0],[0.28,0.12,0.02],[0.5,0.38,0.03]],0.105);
  ellipsoid(wave,blue,[0.56,0.40,0.03],[0.23,0.15,0.14]);
  tube(wave,[[0.43,0.42,0.03],[0.48,0.67,0.03]],0.075);
  tube(wave,[[0.6,0.44,0.04],[0.82,0.51,0.04]],0.075);
  const bubbleAnchor = new THREE.Object3D();
  bubbleAnchor.position.set(0.62,0.78,0.04); wave.add(bubbleAnchor);
  for (const side of [-1,1]) {
    tube(root,[[side*0.34,0.57,0],[side*0.38,0.18,0.05]],0.11);
    ellipsoid(root,blue,[side*0.43,0.13,0.16],[0.28,0.14,0.34]);
  }
  root.scale.setScalar(1.76);
  return {root, bubbleAnchor, update(time) {
    body.scale.y = 1 + Math.sin(time*1.6)*0.012;
    body.rotation.z = Math.sin(time*0.9)*0.02;
    wave.rotation.z = 0.06 + Math.sin(time*2.1)*0.10;
    const blink = time%5.4; eyes.forEach(eye=>{eye.scale.y = blink>5.16 ? 0.025 : 0.125;});
  }};
}
