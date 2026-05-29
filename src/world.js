import * as THREE from 'three';
import { fractalNoise, rand2 } from './noise.js';

// --- World tuning knobs -----------------------------------------------------
export const WORLD = {
  size: 400,        // ground plane is size x size (centred on origin)
  segments: 200,    // terrain resolution; higher = smoother but heavier
  hillHeight: 14,   // max vertical displacement of hills
  noiseScale: 0.012,// lower = bigger, gentler hills
  treeCount: 600,   // how many trees to scatter
  rockCount: 120,   // how many rocks to scatter
  seed: 1337,
};

// Solid obstacles the player can't walk through. Each is a circle on the ground
// plane: { x, z, radius }. Filled in as trees/rocks are placed.
const colliders = [];

// Push (x, z) out of any obstacle it overlaps and return the corrected
// position. Player is treated as a small circle of `playerRadius`.
export function resolveCollision(x, z, playerRadius = 0.4) {
  for (const c of colliders) {
    const dx = x - c.x;
    const dz = z - c.z;
    const min = c.radius + playerRadius;
    const distSq = dx * dx + dz * dz;
    if (distSq < min * min && distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const push = (min - dist) / dist;
      x += dx * push;
      z += dz * push;
    }
  }
  return { x, z };
}

// Sample terrain height at any world (x, z). Shared by the mesh builder AND the
// player, so the player walks exactly on the visible ground.
export function heightAt(x, z) {
  const n = fractalNoise(x * WORLD.noiseScale, z * WORLD.noiseScale, WORLD.seed);
  return n * WORLD.hillHeight;
}

// Build the displaced ground mesh with flat (low-poly) shading.
function buildTerrain() {
  const geo = new THREE.PlaneGeometry(
    WORLD.size, WORLD.size, WORLD.segments, WORLD.segments,
  );
  geo.rotateX(-Math.PI / 2); // lay flat (plane is XY by default)

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ color: 0x5a8f3c, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// One reusable low-poly tree geometry (trunk + cone foliage), instanced many
// times so 600 trees cost almost nothing.
function buildTrees() {
  const group = new THREE.Group();

  // Tall conifer proportions so the forest towers over the ~2-unit player.
  const TRUNK_H = 7;   // trunk height
  const CONE_H = 13;   // foliage cone height
  const trunkGeo = new THREE.CylinderGeometry(0.45, 0.7, TRUNK_H, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b, flatShading: true });
  const leafGeo = new THREE.ConeGeometry(3.4, CONE_H, 7);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f6d34, flatShading: true });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, WORLD.treeCount);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, WORLD.treeCount);
  trunks.castShadow = true;
  leaves.castShadow = true;

  const dummy = new THREE.Object3D();
  const half = WORLD.size / 2 - 5;
  let placed = 0;
  let attempt = 0;

  while (placed < WORLD.treeCount && attempt < WORLD.treeCount * 4) {
    attempt++;
    // Deterministic scatter so the forest is identical every load.
    const rx = rand2(attempt, 0, WORLD.seed + 7);
    const rz = rand2(0, attempt, WORLD.seed + 13);
    const x = (rx * 2 - 1) * half;
    const z = (rz * 2 - 1) * half;
    const y = heightAt(x, z);

    // Keep trees off the steep peaks so they look planted, not floating.
    if (y > WORLD.hillHeight * 0.7) continue;

    const scale = 0.85 + rand2(attempt, attempt, WORLD.seed + 21) * 0.6;

    // Trunk center sits at half its height; cone center sits atop the trunk.
    dummy.position.set(x, y + (TRUNK_H / 2) * scale, z);
    dummy.rotation.y = rx * Math.PI * 2;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);

    dummy.position.set(x, y + (TRUNK_H + CONE_H / 2) * scale, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    leaves.setMatrixAt(placed, dummy.matrix);

    // Collide against the trunk (a little wider than the visible base).
    colliders.push({ x, z, radius: 0.7 * scale + 0.2 });

    placed++;
  }

  trunks.count = placed;
  leaves.count = placed;
  group.add(trunks, leaves);
  return group;
}

// Scattered low-poly boulders, instanced like the trees. Each gets a collider.
function buildRocks() {
  // Icosahedron with no subdivisions = chunky faceted boulder.
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x8a8d91, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, WORLD.rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const half = WORLD.size / 2 - 5;
  let placed = 0;
  let attempt = 0;

  while (placed < WORLD.rockCount && attempt < WORLD.rockCount * 6) {
    attempt++;
    // Use different seed offsets than trees so rocks don't sit on trunks.
    const rx = rand2(attempt, 0, WORLD.seed + 41);
    const rz = rand2(0, attempt, WORLD.seed + 53);
    const x = (rx * 2 - 1) * half;
    const z = (rz * 2 - 1) * half;
    const y = heightAt(x, z);

    const size = 1.2 + rand2(attempt, attempt, WORLD.seed + 61) * 2.5;

    // Squash slightly and rotate randomly so each boulder looks distinct.
    dummy.position.set(x, y + size * 0.35, z);
    dummy.rotation.set(rx * 6.28, rz * 6.28, rx * rz * 6.28);
    dummy.scale.set(size, size * (0.6 + rz * 0.3), size);
    dummy.updateMatrix();
    rocks.setMatrixAt(placed, dummy.matrix);

    colliders.push({ x, z, radius: size * 0.7 });
    placed++;
  }

  rocks.count = placed;
  return rocks;
}

// Assemble the full scene world and return it for adding to the scene.
export function createWorld() {
  const world = new THREE.Group();
  world.add(buildTerrain());
  world.add(buildTrees());
  world.add(buildRocks());
  return world;
}
