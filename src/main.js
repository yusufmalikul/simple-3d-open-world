import * as THREE from 'three';
import { createWorld, WORLD } from './world.js';
import { Player } from './player.js';
import { Stats } from './stats.js';

const canvas = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Filmic tone mapping gives warm light a softer, less blown-out rolloff.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

// Warm "late afternoon" palette.
const SKY = 0xa9d6ec;     // soft warm blue
const HORIZON = 0xe8dcc0;  // pale haze near the ground

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
// Fog tinted to the warm horizon so the far edge melts into a hazy distance.
scene.fog = new THREE.Fog(HORIZON, 70, WORLD.size / 2 + 30);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);

// Lighting: warm sky-fill from above, earthy bounce from below.
scene.add(new THREE.HemisphereLight(0xdfeffa, 0x6b5a3a, 0.85));
// Golden-hour sun.
const sun = new THREE.DirectionalLight(0xffe8c2, 1.5);
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

const stats = new Stats();

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.1); // clamp so tab-switches don't jump
  player.update(dt);
  followSun();
  renderer.render(scene, camera);
  stats.update(dt);
  requestAnimationFrame(animate);
}
animate();
