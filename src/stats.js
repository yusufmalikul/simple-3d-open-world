// Lightweight performance HUD: FPS and frame time.
// Real CPU usage isn't exposed to web pages by any browser, so frame time is
// the practical stand-in — if it climbs above ~16ms you're not hitting 60fps.

export class Stats {
  constructor() {
    const style = document.createElement('style');
    style.textContent = `
      #stats {
        position: fixed; top: 8px; left: 8px; z-index: 10;
        font: 12px/1.45 ui-monospace, Menlo, Consolas, monospace;
        color: #b6ff8c; background: rgba(0,0,0,.45);
        padding: 6px 9px; border-radius: 6px; white-space: pre;
        pointer-events: none; user-select: none;
      }
      /* On mobile, center it up top so it can't collide with the chat (left)
         or the fullscreen button (right). */
      @media (max-width: 900px), (pointer: coarse) {
        #stats {
          left: 50%; transform: translateX(-50%);
          font-size: 11px; padding: 4px 8px;
        }
      }
    `;
    document.head.appendChild(style);

    const el = document.createElement('div');
    el.id = 'stats';
    document.body.appendChild(el);
    this.el = el;

    this.frames = 0;
    this.acc = 0;            // accumulated time since last readout
    this.fps = 0;
    this.frameMs = 0;
  }

  // Call once per rendered frame with the frame delta in seconds.
  update(dt) {
    this.frames++;
    this.acc += dt;

    // Refresh the display ~3x per second so the numbers are readable.
    if (this.acc >= 0.33) {
      this.fps = Math.round(this.frames / this.acc);
      this.frameMs = (this.acc / this.frames) * 1000;
      this.frames = 0;
      this.acc = 0;
      this._render();
    }
  }

  _render() {
    this.el.textContent =
      `FPS   ${this.fps}\nFrame ${this.frameMs.toFixed(1)} ms`;
  }
}
