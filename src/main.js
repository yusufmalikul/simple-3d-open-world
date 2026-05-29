import * as THREE from 'three';
import { createWorld, updateWater, WORLD } from './world.js';
import { Player } from './player.js';
import { Stats } from './stats.js';
import { Network } from './network.js';
import { RemotePlayers } from './remotePlayers.js';
import { Chat } from './chat.js';
import { TouchControls } from './touchControls.js';
import { createFullscreenButton } from './fullscreen.js';

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

// On-screen controls for touch devices (no-op on desktop).
const touch = new TouchControls();
if (touch.enabled) player.touch = touch;

createFullscreenButton();

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

// --- Multiplayer ------------------------------------------------------------
const remotes = new RemotePlayers(scene);
const net = new Network();
const chat = new Chat((text) => net.sendChat(text));

net
  .on('welcome', (m) => {
    // Adopt our server-assigned color, then spawn everyone already online.
    player.bodyMat.color.set(m.color);
    m.players.forEach((p) => remotes.spawn(p));
    chat.system('Connected. Press Enter to chat.');
  })
  .on('spawn', (m) => remotes.spawn(m))
  .on('move', (m) => remotes.setTarget(m))
  .on('leave', (m) => remotes.remove(m.id))
  .on('chat', (m) => chat.message(m.name, m.text))
  .on('system', (m) => chat.system(m.text))
  .on('disconnect', () => chat.system('Disconnected from server.'))
  .on('error', () => chat.system('Could not reach server — playing solo.'));

// Ask for a name, then connect. Falls back to a guest name.
const name = (window.prompt('Enter your name:', '') || '').trim().slice(0, 20)
  || `Guest-${Math.floor(Math.random() * 1000)}`;
net.connect(name);

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.1); // clamp so tab-switches don't jump

  player.frozen = chat.isTyping();
  player.update(dt);
  net.sendMove(player.position.x, player.position.z, player.facing, dt);
  remotes.update(dt);

  updateWater(clock.elapsedTime);
  followSun();
  renderer.render(scene, camera);
  stats.update(dt);
  requestAnimationFrame(animate);
}
animate();
