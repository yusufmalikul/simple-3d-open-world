import * as THREE from 'three';
import { createWorld, WORLD } from './world.js';
import { Player } from './player.js';

const canvas = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
// Fog hides the far edge of the world and cheaply adds depth.
scene.fog = new THREE.Fog(0x87ceeb, 60, WORLD.size / 2);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);

// Lighting: soft ambient + a sun that casts shadows.
scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x4a6b3a, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(60, 100, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const s = 120;
sun.shadow.camera.left = -s;
sun.shadow.camera.right = s;
sun.shadow.camera.top = s;
sun.shadow.camera.bottom = -s;
sun.shadow.camera.far = 300;
scene.add(sun);
scene.add(sun.target);

scene.add(createWorld());

const player = new Player(camera);
scene.add(player.mesh);

// Keep the shadow frustum following the player so shadows stay crisp nearby.
function followSun() {
  sun.position.set(player.position.x + 60, 100, player.position.z + 40);
  sun.target.position.copy(player.position);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.1); // clamp so tab-switches don't jump
  player.update(dt);
  followSun();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
