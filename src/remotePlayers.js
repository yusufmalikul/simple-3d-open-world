import * as THREE from 'three';
import { heightAt, WORLD } from './world.js';

// Manages the avatars of all *other* connected players: spawn/despawn, smooth
// movement toward the latest networked position, and a floating name label.

function makeNameSprite(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Outline for legibility against any background.
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.strokeText(name, 128, 32);
  ctx.fillStyle = '#fff';
  ctx.fillText(name, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(4, 1, 1);
  sprite.position.y = 2.6;
  return sprite;
}

function makeAvatar(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 0.9, 4, 8),
    new THREE.MeshLambertMaterial({ color, flatShading: true }),
  );
  body.position.y = 0.85;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xffcc99, flatShading: true }),
  );
  head.position.y = 1.7;
  head.castShadow = true;
  g.add(body, head);
  return g;
}

export class RemotePlayers {
  constructor(scene) {
    this.scene = scene;
    this.players = new Map(); // id -> { group, target:{x,z,facing} }
  }

  spawn({ id, name, x, z, facing, color }) {
    if (this.players.has(id)) return;
    const group = makeAvatar(color ?? 0x888888);
    group.add(makeNameSprite(name ?? `Guest-${id}`));
    group.position.set(x, heightAt(x, z), z);
    group.rotation.y = facing ?? 0;
    this.scene.add(group);
    this.players.set(id, { group, target: { x, z, facing: facing ?? 0 } });
  }

  setTarget({ id, x, z, facing }) {
    const p = this.players.get(id);
    if (p) p.target = { x, z, facing };
  }

  remove(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.scene.remove(p.group);
    this.players.delete(id);
  }

  // Smoothly ease each avatar toward its last networked target so 12Hz updates
  // look continuous.
  update(dt) {
    const k = Math.min(1, dt * 10); // lerp factor
    for (const { group, target } of this.players.values()) {
      group.position.x += (target.x - group.position.x) * k;
      group.position.z += (target.z - group.position.z) * k;
      group.position.y = Math.max(heightAt(group.position.x, group.position.z), WORLD.waterLevel);

      // Shortest-path angle lerp for smooth turning.
      let d = target.facing - group.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      group.rotation.y += d * k;
    }
  }
}
