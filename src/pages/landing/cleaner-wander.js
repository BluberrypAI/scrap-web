import * as THREE from 'three';

// Illustration only. No litter objects or actual waste-record state are created.
export function createCleanerWander(actor, meadow, facilities, road) {
  const step = 1, xMin = -22, xMax = 18, zMin = -18, zMax = 20;
  const props = [[-19.1, 12.3, 1.4], [-3.8, 10, 2.1], [-6.2, 12.25, 1.35], [8, 1.7, 1.3], [10, 1, 2.1], [-31, 4, 2.55], [-3, -5, 2.1]];
  const roadSamples = road ? Array.from({ length: 120 }, (_, i) => road.getPointAt(i / 119)) : [];
  function clear(x, z) {
    if (x < xMin || x > xMax || z < zMin || z > zMax) return false;
    if (facilities.some(f => Math.abs(x - f.position.x) < 4.45 && Math.abs(z - f.position.z) < 3.75)) return false;
    if (props.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r + 0.2)) return false;
    return !roadSamples.some(p => Math.hypot(x - p.x, z - p.z) < 1.7);
  }
  function lineClear(a, b) {
    const count = Math.ceil(a.distanceTo(b) / 0.1);
    for (let i = 0; i <= count; i++) {
      const u = count ? i / count : 0;
      if (!clear(THREE.MathUtils.lerp(a.x, b.x, u), THREE.MathUtils.lerp(a.y, b.y, u))) return false;
    }
    return true;
  }
  const nodes = [], lookup = new Map();
  for (let x = xMin; x <= xMax; x += step) for (let z = zMin; z <= zMax; z += step) {
    if (!clear(x, z)) continue;
    const node = { x, z, point: new THREE.Vector2(x, z), neighbors: [] };
    lookup.set(`${x},${z}`, nodes.length); nodes.push(node);
  }
  nodes.forEach(node => {
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const index = lookup.get(`${node.x + dx * step},${node.z + dz * step}`);
      if (index !== undefined && lineClear(node.point, nodes[index].point)) node.neighbors.push(index);
    }
  });
  let seed = 948271;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const position = new THREE.Vector2(-11, 17);
  let path = [], pointIndex = 0, lastTime = null, picking = 0, sector = 0;
  const nearest = p => nodes.reduce((best, n, i) => n.point.distanceToSquared(p) < nodes[best].point.distanceToSquared(p) ? i : best, 0);
  function nextJourney() {
    const start = nearest(position), parents = new Map([[start, -1]]), queue = [start];
    for (let q = 0; q < queue.length; q++) for (const next of nodes[queue[q]].neighbors) {
      if (!parents.has(next)) { parents.set(next, queue[q]); queue.push(next); }
    }
    // Vary the destination throughout the meadow, including behind the factories.
    const zones = [p => p.z < -4, p => p.x > 7, p => p.z > 11, p => p.x < -11];
    const eligible = queue.filter(i => nodes[i].point.distanceTo(position) > 7);
    const zone = zones[sector++ % zones.length];
    const regional = eligible.filter(i => zone(nodes[i]));
    const choices = regional.length ? regional : eligible;
    if (!choices.length) { path = []; picking = 0.01; return; }
    let at = choices[Math.floor(random() * choices.length)];
    const points = [];
    while (at !== -1) { points.unshift(nodes[at].point.clone()); at = parents.get(at); }
    // Keep only visible turns. Never smooth a corner through a building or road.
    path = []; let anchor = position.clone(), i = 0;
    while (i < points.length) {
      let farthest = i;
      while (farthest + 1 < points.length && lineClear(anchor, points[farthest + 1])) farthest++;
      path.push(points[farthest]); anchor = points[farthest]; i = farthest + 1;
    }
    pointIndex = 0;
  }
  nextJourney();
  return {
    update(time) {
      const dt = lastTime === null ? 0 : Math.max(0, Math.min(time - lastTime, 0.1)); lastTime = time;
      let walking = picking === 0, bend = 0;
      if (walking) {
        let budget = dt * 2.15;
        while (pointIndex < path.length && budget > 0) {
          const destination = path[pointIndex], distance = position.distanceTo(destination);
          if (distance < 0.001) { pointIndex++; continue; }
          const yaw = Math.atan2(destination.x - position.x, destination.y - position.y);
          actor.root.rotation.y += Math.atan2(Math.sin(yaw - actor.root.rotation.y), Math.cos(yaw - actor.root.rotation.y)) * Math.min(1, dt * 7);
          const advance = Math.min(distance, budget); position.lerp(destination, advance / distance); budget -= advance;
          if (advance === distance) pointIndex++;
        }
        if (pointIndex >= path.length) { picking = 0.001; walking = false; }
      } else {
        picking += dt;
        bend = Math.sin(Math.min(1, picking / 2.8) * Math.PI);
        if (picking >= 3.2) { picking = 0; nextJourney(); }
      }
      actor.root.position.set(position.x, meadow.heightAt(position.x, position.y) + 0.08 + (walking ? Math.abs(Math.sin(time * 8)) * 0.045 : 0), position.y);
      actor.body.rotation.x = bend * 0.95;
      actor.body.position.y = 0.55 - bend * 0.16;
      actor.legs.forEach((leg, i) => { leg.rotation.x = walking ? Math.sin(time * 8 + i * Math.PI) * 0.43 : -bend * 0.12; });
      actor.arms.forEach((arm, i) => { arm.rotation.x = walking ? Math.sin(time * 8 + i * Math.PI) * 0.32 : -bend * (i ? 1.05 : 0.38); });
    },
  };
}
