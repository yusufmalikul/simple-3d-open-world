import * as THREE from 'three';
import { fractalNoise, rand2 } from './noise.js';

// --- World tuning knobs -----------------------------------------------------
export const WORLD = {
  size: 400,        // ground plane is size x size (centred on origin)
  segments: 200,    // terrain resolution; higher = smoother but heavier
  hillHeight: 14,   // max vertical displacement of hills
  noiseScale: 0.012,// lower = bigger, gentler hills
  treeCount: 600,   // how many trees to scatter
  seed: 1337,
};

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

  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.4, 5);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b, flatShading: true });
  const leafGeo = new THREE.ConeGeometry(2.2, 5, 6);
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

    const scale = 0.7 + rand2(attempt, attempt, WORLD.seed + 21) * 0.8;

    dummy.position.set(x, y + 1.2 * scale, z);
    dummy.rotation.y = rx * Math.PI * 2;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);

    dummy.position.set(x, y + 3.4 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    leaves.setMatrixAt(placed, dummy.matrix);

    placed++;
  }

  trunks.count = placed;
  leaves.count = placed;
  group.add(trunks, leaves);
  return group;
}

// Assemble the full scene world and return it for adding to the scene.
export function createWorld() {
  const world = new THREE.Group();
  world.add(buildTerrain());
  world.add(buildTrees());
  return world;
}
