import * as THREE from 'three';
import { heightAt, resolveCollision } from './world.js';

// A simple low-poly character (capsule body + sphere head) plus third-person
// movement and a camera that orbits behind it.
export class Player {
  constructor(camera) {
    this.camera = camera;

    // Visible avatar.
    this.mesh = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3366cc, flatShading: true });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99, flatShading: true });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.9, 4, 8), bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), headMat);
    head.position.y = 1.7;
    head.castShadow = true;
    this.mesh.add(body, head);

    // State.
    this.position = new THREE.Vector3(0, heightAt(0, 0), 0);
    this.facing = 0;        // body yaw (radians)
    this.camYaw = 0;        // camera orbit angle around player
    this.camPitch = 0.35;   // camera tilt
    this.camDist = 7;

    this.keys = new Set();
    this._bindInput();
  }

  _bindInput() {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    // Drag to look. Pointer events cover mouse + touch.
    let dragging = false;
    let lastX = 0, lastY = 0;
    const canvas = document.getElementById('app');
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.camYaw -= (e.clientX - lastX) * 0.005;
      this.camPitch = THREE.MathUtils.clamp(
        this.camPitch - (e.clientY - lastY) * 0.005, 0.15, 1.2,
      );
      lastX = e.clientX; lastY = e.clientY;
    });
  }

  update(dt) {
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = (sprint ? 12 : 6) * dt;

    // Movement is relative to where the camera is looking.
    let forward = 0, strafe = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;

    if (forward !== 0 || strafe !== 0) {
      // Camera-forward direction projected onto the ground plane.
      const sin = Math.sin(this.camYaw);
      const cos = Math.cos(this.camYaw);
      let dx = forward * sin - strafe * cos;
      let dz = forward * cos + strafe * sin;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;

      this.position.x += dx * speed;
      this.position.z += dz * speed;
      this.facing = Math.atan2(dx, dz);

      // Push back out of any tree/rock we walked into.
      const fixed = resolveCollision(this.position.x, this.position.z, 0.5);
      this.position.x = fixed.x;
      this.position.z = fixed.z;
    }

    // Stick to the terrain surface.
    this.position.y = heightAt(this.position.x, this.position.z);

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facing;

    this._updateCamera();
  }

  _updateCamera() {
    // Orbit the camera behind/above the player and look at the head.
    const horiz = Math.cos(this.camPitch) * this.camDist;
    const offX = Math.sin(this.camYaw) * horiz;
    const offZ = Math.cos(this.camYaw) * horiz;
    const offY = Math.sin(this.camPitch) * this.camDist + 1.5;

    const camX = this.position.x - offX;
    const camZ = this.position.z - offZ;
    // Never let the camera dip below the ground it's hovering over.
    const groundClearance = heightAt(camX, camZ) + 1;
    const camY = Math.max(this.position.y + offY, groundClearance);

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(
      this.position.x, this.position.y + 1.4, this.position.z,
    );
  }
}
