import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createLandscape } from '../../features/treatment/world/landscape.js';
import { createFacility, createTruck } from '../../features/treatment/world/facilities.js';
import { addFactoryDetails } from '../landing/factory-details.js';

const sites = [[-16, 8], [-3, 5], [10, -4], [19, -15]];
const accents = [0x3d8bd6, 0xe6ad3a, 0x72ae65];
const activeAccent = 0x8650c4;

export default function WasteJourneyScene({ journey }) {
  const hostRef = useRef(null);
  const labelsRef = useRef([]);
  const [failed, setFailed] = useState(false);
  const { facilities, phase, activeIndex, activeSegmentIndex } = journey;
  // Recreate only when the actual route/state changes, not on parent renders.
  const routeKey = JSON.stringify(facilities);

  useEffect(() => {
    const host = hostRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setFailed(true);
      return undefined;
    }
    const route = JSON.parse(routeKey);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8ac4f4);
    scene.fog = new THREE.FogExp2(0xb7d9ee, .006);
    const camera = new THREE.PerspectiveCamera(39, 1, .1, 250);
    const positions = route.map((_, index) => sites[index] || [19 + (index - 3) * 12, -15 - (index - 3) * 8]);
    const target = new THREE.Vector3(0, 3, 0);
    if (positions.length) {
      const first = positions[0];
      const last = positions.at(-1);
      target.set((first[0] + last[0]) / 2, 3, (first[1] + last[1]) / 2);
    }
    camera.position.copy(target).add(new THREE.Vector3(25, 21, 41));
    camera.lookAt(target);
    scene.add(new THREE.HemisphereLight(0xf2faff, 0x587537, 1.35));
    const sunlight = new THREE.DirectionalLight(0xfff0d8, 2.7);
    sunlight.position.set(-16, 32, 18);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    Object.assign(sunlight.shadow.camera, { left: -38, right: 38, top: 32, bottom: -32, far: 100 });
    sunlight.shadow.normalBias = .025;
    scene.add(sunlight);
    const landscape = createLandscape(THREE, scene, { lightweight: true, mobile: true, cloudLayout: 'clear-copy' });
    const buildingScale = phase === 'processing' || phase === 'transporting' ? 1.45 : 1.25;
    let colorIndex = 0;
    const buildings = route.map((stop, index) => {
      const building = createFacility(THREE, stop.kind, index === activeIndex ? activeAccent : accents[colorIndex++ % accents.length]);
      if (['source', 'sorting', 'recycling'].includes(stop.kind)) addFactoryDetails(building, stop.kind);
      if (stop.unconfirmed) {
        const fadedMaterials = new Set();
        building.traverse((object) => {
          object.castShadow = false;
          const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
          materials.forEach((material) => fadedMaterials.add(material));
        });
        fadedMaterials.forEach((material) => {
          material.transparent = true;
          material.opacity = .24;
          material.depthWrite = false;
        });
      }
      building.scale.setScalar(buildingScale);
      const [x, z] = positions[index];
      building.position.set(x, landscape.heightAt(x, z) + .05, z);
      scene.add(building);
      return building;
    });
    const roads = [];
    for (let index = 1; index < buildings.length; index++) {
      const from = buildings[index - 1].position;
      const to = buildings[index].position;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(from.x + 2.8 * buildingScale, 0, from.z + 1.8 * buildingScale),
        new THREE.Vector3((from.x + to.x) / 2, 0, (from.z + to.z) / 2 + 3.5),
        new THREE.Vector3(to.x - 2.8 * buildingScale, 0, to.z + 1.8 * buildingScale),
      ]);
      roads.push(curve);
      const vertices = [];
      const indices = [];
      for (let segment = 0; segment <= 60; segment++) {
        const point = curve.getPointAt(segment / 60);
        const tangent = curve.getTangentAt(segment / 60);
        for (const side of [-1, 1]) {
          const x = point.x - tangent.z * .85 * side;
          const z = point.z + tangent.x * .85 * side;
          vertices.push(x, landscape.heightAt(x, z) + .12, z);
        }
        if (segment < 60) {
          const start = segment * 2;
          indices.push(start, start + 2, start + 1, start + 1, start + 2, start + 3);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const road = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x536066, roughness: 1, side: THREE.DoubleSide }));
      road.receiveShadow = true;
      scene.add(road);
      for (let dash = .05; dash < 1; dash += .1) {
        const point = curve.getPointAt(dash);
        const tangent = curve.getTangentAt(dash);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(.08, .025, .5), new THREE.MeshStandardMaterial({ color: 0xf1eee3 }));
        stripe.position.set(point.x, landscape.heightAt(point.x, point.z) + .15, point.z);
        stripe.rotation.y = Math.atan2(tangent.x, tangent.z);
        scene.add(stripe);
      }
    }
    const moving = phase === 'transporting';
    const processing = phase === 'processing';
    const leg = roads[activeSegmentIndex];
    const truck = moving && leg ? createTruck(THREE, activeAccent) : null;
    if (truck) {
      truck.scale.setScalar(1.5);
      scene.add(truck);
    }
    const activeBuilding = buildings[activeIndex];
    const smoke = [];
    if (processing && activeBuilding) {
      const chimney = activeBuilding.userData.kind === 'sorting'
        ? new THREE.Vector3(1.02, 3.05, -1.1) : new THREE.Vector3(.95, 4.75, -.9);
      for (let index = 0; index < 8; index++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(.58, 12, 8),
          new THREE.MeshStandardMaterial({ color: 0xc6c3ce, transparent: true, opacity: .85, depthWrite: false }));
        scene.add(puff);
        smoke.push({ puff, origin: activeBuilding.position.clone().addScaledVector(chimney, buildingScale), phase: index / 8 });
      }
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function draw(time = 0) {
      const seconds = reducedMotion.matches ? 2 : time / 1000;
      if (truck) {
        const progress = (seconds * .065) % 1;
        const point = leg.getPointAt(progress);
        const tangent = leg.getTangentAt(progress);
        truck.position.set(point.x, landscape.heightAt(point.x, point.z) + .18, point.z);
        truck.rotation.y = Math.atan2(tangent.x, tangent.z);
      }
      smoke.forEach(({ puff, origin, phase }) => {
        const age = (seconds * .25 + phase) % 1;
        puff.position.copy(origin).add(new THREE.Vector3(age * 2, age * 5, 0));
        puff.scale.setScalar(1 + age * 2.1);
        puff.material.opacity = Math.pow(1 - age, .65) * .88;
      });
      renderer.render(scene, camera);
    }
    function resize() {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      const distance = Math.max(.6, route.length * .27);
      const widthFit = Math.max(1, 1 / camera.aspect);
      camera.position.copy(target).add(new THREE.Vector3(25, 21, 41).multiplyScalar(distance * widthFit));
      camera.lookAt(target);
      // Place the factories in the upper part of the card, above Berry's guide.
      camera.setViewOffset(width, height, 0, height * .12, width, height);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      buildings.forEach((building, index) => {
        const point = building.position.clone().add(new THREE.Vector3(0, .2, 3.2).multiplyScalar(buildingScale)).project(camera);
        const label = labelsRef.current[index];
        if (label) {
          label.style.left = `${(point.x + 1) * 50}%`;
          label.style.top = `${(1 - point.y) * 50}%`;
        }
      });
      draw();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    if (truck || smoke.length) renderer.setAnimationLoop(draw);
    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      landscape.dispose();
      const geometries = new Set();
      const materials = new Set();
      scene.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          const values = Array.isArray(object.material) ? object.material : [object.material];
          values.forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      sunlight.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [routeKey, phase, activeIndex, activeSegmentIndex]);

  return <div className="waste-journey-world" ref={hostRef}>
    {failed && <span className="waste-journey-loading">3D 풍경을 표시할 수 없어요.</span>}
    {!failed && facilities.map((facility, index) => <span
      className={`waste-journey-facility${index === activeIndex ? ' is-active' : ''}`} key={`${facility.facility_key}-${index}`}
      ref={(node) => { labelsRef.current[index] = node; }}
    >{facility.mapLabel || facility.label}</span>)}
  </div>;
}
