import * as THREE from 'three';
import { createCleanerWander } from './cleaner-wander.js';

// A deterministic illustration, independent of real waste cards and transport records.
export function createWorkshopLife(scene, meadow, facilities, makeRobot, road) {
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08 });
  const white = mat(0xf9fcf3), steel = mat(0xa7bec5), dark = mat(0x294957), blue = mat(0x32b4e5), mint = mat(0x65b789), yellow = mat(0xffc547), paper = mat(0xfffbee);
  function mesh(parent, geo, material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (parent, w, h, d, material, x, y, z) => mesh(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  const cylinder = (parent, r, h, material, x, y, z) => mesh(parent, new THREE.CylinderGeometry(r, r, h, 16), material, x, y, z);
  function place(x, z) { const g = new THREE.Group(); g.position.set(x, meadow.heightAt(x, z) + 0.08, z); scene.add(g); return g; }
  // Additional loading details, vents, packaged PP and access ladders.
  facilities.forEach((facility, i) => {
    for (let j = 0; j < 4; j++) {
      box(facility, 0.55, 0.09, 0.65, steel, -2.1 + j * 0.57, 0.3, 2.25);
      box(facility, 0.43, 0.43 + (j % 2) * 0.18, 0.52, j % 2 ? white : mint, -2.1 + j * 0.57, 0.57, 2.25);
      box(facility, 0.04, 0.48, 0.54, blue, -2.1 + j * 0.57, 0.57, 2.25);
    }
    const ladderX = i === 2 ? 2.55 : -2.25;
    for (const dx of [-0.16, 0.16]) cylinder(facility, 0.025, 2.2, steel, ladderX + dx, 1.38, -0.2);
    for (let j = 0; j < 8; j++) box(facility, 0.35, 0.025, 0.035, steel, ladderX, 0.43 + j * 0.26, -0.2);
    for (let j = 0; j < 5; j++) box(facility, 0.15, 0.025, 0.42, j % 2 ? dark : yellow, 1.2 + j * 0.16, 0.23, 2.13);
    if (i === 1) {
      for (const x of [-1.1, 0.0]) { box(facility, 0.65, 0.25, 0.6, steel, x, 2.5, -1.0); for (let k = 0; k < 4; k++) box(facility, 0.5, 0.02, 0.025, dark, x, 2.64, -1.2 + k * 0.12); }
    }
  });
  function actor(color, x, z, yaw) {
    const a = makeRobot(color); a.root.scale.setScalar(1.28); a.root.position.set(x, meadow.heightAt(x, z) + 0.08, z); a.root.rotation.y = yaw; scene.add(a.root); return a;
  }
  const clerk = actor(0xf35325, -19.1, 12.3, 0.5);
  const washer = actor(0x81bc06, -5.5, 10.5, 0.95);
  const shredder = actor(0x05a6f0, 8.0, 1.7, 0.95);
  const cleaner = actor(0xffba08, -11, 17, 0.8);

  // A: hold a real clipboard, follow the rows with a pen, tick them in order.
  const clipboard = new THREE.Group(); clipboard.position.set(-0.06, 0.48, 0.63); clipboard.rotation.x = -0.18; clerk.body.add(clipboard);
  box(clipboard, 0.68, 0.88, 0.06, dark, 0, 0, 0);
  box(clipboard, 0.59, 0.76, 0.015, paper, 0, -0.015, 0.043);
  box(clipboard, 0.25, 0.1, 0.045, steel, 0, 0.42, 0.055);
  const ticks = [];
  for (let i = 0; i < 3; i++) {
    const y = 0.20 - i * 0.21;
    box(clipboard, 0.28, 0.022, 0.016, steel, 0.075, y, 0.057);
    const tick = new THREE.Group(); tick.position.set(-0.18, y, 0.065); clipboard.add(tick);
    const first = box(tick, 0.035, 0.09, 0.018, mint, -0.025, -0.012, 0); first.rotation.z = 0.7;
    const second = box(tick, 0.035, 0.15, 0.018, mint, 0.035, 0.015, 0); second.rotation.z = -0.6; ticks.push(tick);
  }
  const pen = cylinder(clerk.arms[1], 0.025, 0.42, blue, 0, -0.47, 0.10); pen.rotation.z = -0.4;
  clerk.arms[0].rotation.x = -1.15;

  // B: a shallow wash bath, a spray arch, floating PP pieces and foam.
  const bath = place(-3.8, 10.0);
  box(bath, 2.2, 0.16, 1.5, steel, 0, 0.32, 0);
  for (const x of [-1.03, 1.03]) box(bath, 0.13, 0.78, 1.5, white, x, 0.72, 0);
  for (const z of [-0.69, 0.69]) box(bath, 2.2, 0.78, 0.12, white, 0, 0.72, z);
  box(bath, 1.94, 0.06, 1.22, new THREE.MeshPhysicalMaterial({ color: 0x4bc9ea, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.78, clearcoat: 1 }), 0, 0.88, 0);
  for (const x of [-0.92, 0.92]) cylinder(bath, 0.05, 1.25, steel, x, 1.45, -0.48);
  box(bath, 1.94, 0.1, 0.1, steel, 0, 2.08, -0.48);
  const washPieces = Array.from({ length: 7 }, (_, i) => { const p = box(bath, 0.20, 0.07, 0.17, i % 2 ? white : blue, -0.7 + (i % 4) * 0.42, 0.95, -0.27 + Math.floor(i / 4) * 0.49); p.rotation.y = i; return p; });
  const droplets = Array.from({ length: 18 }, (_, i) => mesh(bath, new THREE.SphereGeometry(0.035, 6, 6), blue, -0.7 + (i % 6) * 0.28, 1.2, -0.48));
  const foam = Array.from({ length: 9 }, (_, i) => mesh(bath, new THREE.SphereGeometry(0.06 + (i % 3) * 0.02, 8, 6), white, -0.8 + (i % 5) * 0.35, 0.98, 0.3 * Math.sin(i * 4)));
  // Monitor the wash cycle from a small control console instead of scrubbing air.
  const consoleStand = place(-5.3, 12.6);
  cylinder(consoleStand, 0.07, 0.83, steel, 0, 0.43, 0);
  box(consoleStand, 0.66, 0.4, 0.20, white, 0, 1.03, 0);
  box(consoleStand, 0.36, 0.2, 0.03, dark, -0.07, 1.05, 0.12);
  const washLamp = mesh(consoleStand, new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshStandardMaterial({color:0x85dba0,emissive:0x39af6c,emissiveIntensity:0.6}), 0.21, 1.06, 0.13);
  washer.root.position.set(-6.2, meadow.heightAt(-6.2, 12.25) + 0.08, 12.25);
  washer.root.rotation.y = 1.05;

  // C: rotating cutters, feedstock disappearing into the hopper, flakes at the outlet.
  const machine = place(10.0, 1.0);
  box(machine, 1.7, 0.85, 1.35, mint, 0, 0.68, 0);
  box(machine, 1.4, 0.5, 0.025, dark, 0, 0.80, 0.69);
  const hopper = mesh(machine, new THREE.CylinderGeometry(1.0, 0.55, 0.7, 4, 1, true), steel, 0, 1.45, 0); hopper.rotation.y = Math.PI / 4; steel.side = THREE.DoubleSide;
  const cutters = [-1, 1].map(side => {
    const rotor = new THREE.Group(); rotor.position.set(side * 0.3, 1.17, 0); machine.add(rotor);
    const shaft = cylinder(rotor, 0.18, 0.85, dark, 0, 0, 0); shaft.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) { const tooth = box(rotor, 0.48, 0.09, 0.08, steel, 0, 0, -0.36 + i * 0.18); tooth.rotation.z = i * 0.9; } return rotor;
  });
  const chute = box(machine, 1, 0.08, 0.9, steel, 0, 0.41, 0.95); chute.rotation.x = 0.25;
  box(machine, 1.4, 0.12, 0.9, white, 0, 0.12, 1.55);
  for (const x of [-0.68, 0.68]) box(machine, 0.08, 0.3, 0.9, white, x, 0.25, 1.55);
  const feed = box(machine, 0.36, 0.18, 0.3, blue, -0.55, 2.0, 0);
  const flakes = Array.from({ length: 22 }, (_, i) => box(machine, 0.08, 0.05, 0.1, i % 3 ? blue : white, 0, 0.5, 1.0));
  const held = box(shredder.arms[1], 0.25, 0.15, 0.24, blue, 0, -0.47, 0.1);

  const wandering = createCleanerWander(cleaner, meadow, facilities, road);
  return {
    update(t) {
      const checkPhase = (t % 9) / 9;
      clerk.body.rotation.x = 0.035 * Math.sin(t * 1.8);
      clerk.arms[1].rotation.x = -1.05 + Math.sin(t * 5) * 0.15; clerk.arms[1].rotation.z = -0.25 + Math.cos(t * 2.5) * 0.10;
      ticks.forEach((tick, i) => { tick.visible = checkPhase > (i + 1) * 0.21; });
      // A subtle nod and occasional reach toward the controls.
      const inspect = Math.max(0, Math.sin((t % 10) / 10 * Math.PI * 2));
      washer.body.rotation.x = inspect * 0.055;
      washer.arms[0].rotation.x = -0.08;
      washer.arms[1].rotation.x = -0.15 - inspect * 0.8;
      washLamp.material.emissiveIntensity = 0.35 + 0.3 * Math.sin(t * 2) ** 2;
      washPieces.forEach((piece, i) => { piece.position.y = 0.97 + Math.sin(t * 2.1 + i) * 0.035; piece.rotation.y = t * 0.2 + i; });
      droplets.forEach((drop, i) => { drop.position.y = 1.98 - ((t * 1.8 + i * 0.13) % 1) * 0.98; });
      foam.forEach((bubble, i) => { bubble.scale.setScalar(0.8 + Math.sin(t * 2 + i) * 0.2); });
      const shredPhase = (t % 5) / 5;
      shredder.arms[1].rotation.x = -0.9 - Math.sin(shredPhase * Math.PI) * 0.9;
      shredder.arms[0].rotation.x = -0.7; shredder.body.rotation.x = 0.05 + Math.sin(t) * 0.045;
      held.visible = shredPhase < 0.5;
      feed.visible = shredPhase >= 0.5 && shredPhase < 0.8;
      feed.position.set(-0.5 + (shredPhase - 0.5) * 1.7, 2.15 - (shredPhase - 0.5) * 3.2, 0);
      cutters.forEach((cutter, i) => { cutter.rotation.z = t * (i ? 4 : -4); });
      flakes.forEach((flake, i) => {
        const p = (t * 0.65 + i / flakes.length) % 1;
        flake.position.set(Math.sin(i * 17.3) * 0.47, p < 0.55 ? 0.55 - p * 0.65 : 0.2, 0.9 + Math.min(p / 0.55, 1) * 0.8);
        flake.rotation.set(i + t, i * 2, t * 0.6);
      });
      wandering.update(t);
    },
    dispose() {},
  };
}
