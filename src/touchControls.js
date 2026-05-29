// On-screen controls for touch devices: a left-thumb virtual joystick (move)
// and a right-side sprint button. Camera-look is handled by player.js, which
// ignores any touch that started on an element marked [data-control].

const isTouch = () =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

export class TouchControls {
  constructor() {
    this.enabled = isTouch();
    this.move = { forward: 0, strafe: 0 };
    this.sprint = false;
    if (this.enabled) this._build();
  }

  getMove() { return this.move; }
  isSprinting() { return this.sprint; }

  _build() {
    // --- Joystick (bottom-left) --------------------------------------------
    const base = document.createElement('div');
    base.dataset.control = 'joystick';
    base.style.cssText = `
      position: fixed; left: 28px; bottom: 28px; z-index: 30;
      width: 130px; height: 130px; border-radius: 50%;
      background: rgba(255,255,255,.14);
      border: 2px solid rgba(255,255,255,.35);
      touch-action: none; user-select: none;
    `;
    const knob = document.createElement('div');
    knob.dataset.control = 'joystick';
    knob.style.cssText = `
      position: absolute; left: 50%; top: 50%;
      width: 60px; height: 60px; margin: -30px 0 0 -30px;
      border-radius: 50%; background: rgba(255,255,255,.55);
      pointer-events: none;
    `;
    base.appendChild(knob);
    document.body.appendChild(base);

    const RADIUS = 50; // max knob travel in px
    let stickId = null;
    let cx = 0, cy = 0;

    const setKnob = (dx, dy) => {
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const reset = () => {
      stickId = null;
      this.move.forward = 0;
      this.move.strafe = 0;
      setKnob(0, 0);
    };

    base.addEventListener('pointerdown', (e) => {
      stickId = e.pointerId;
      const r = base.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      base.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    base.addEventListener('pointermove', (e) => {
      if (e.pointerId !== stickId) return;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > RADIUS) { dx = (dx / dist) * RADIUS; dy = (dy / dist) * RADIUS; }
      setKnob(dx, dy);
      // Up on screen = forward; right = strafe right.
      this.move.forward = -dy / RADIUS;
      this.move.strafe = dx / RADIUS;
    });
    const up = (e) => { if (e.pointerId === stickId) reset(); };
    base.addEventListener('pointerup', up);
    base.addEventListener('pointercancel', up);

    // --- Sprint button (bottom-right) --------------------------------------
    const sprintBtn = document.createElement('div');
    sprintBtn.dataset.control = 'sprint';
    sprintBtn.textContent = '▶▶';
    sprintBtn.style.cssText = `
      position: fixed; right: 32px; bottom: 44px; z-index: 30;
      width: 84px; height: 84px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font: 22px/1 system-ui, sans-serif; color: #fff;
      background: rgba(255,255,255,.18);
      border: 2px solid rgba(255,255,255,.35);
      touch-action: none; user-select: none;
    `;
    document.body.appendChild(sprintBtn);
    const setSprint = (on) => {
      this.sprint = on;
      sprintBtn.style.background = on ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.18)';
    };
    sprintBtn.addEventListener('pointerdown', (e) => { setSprint(true); e.preventDefault(); });
    sprintBtn.addEventListener('pointerup', () => setSprint(false));
    sprintBtn.addEventListener('pointercancel', () => setSprint(false));
  }
}
