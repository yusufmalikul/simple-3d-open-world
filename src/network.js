// Thin client wrapper around the game WebSocket. Connects, sends move/chat,
// and dispatches incoming server messages to registered handlers.

// In dev the Vite page is on :5173 and the server on :8080. In production set
// VITE_SERVER_URL (e.g. wss://your-app.onrender.com) at build time.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  `ws://${location.hostname}:8080`;

export class Network {
  constructor() {
    this.id = null;
    this.color = null;
    this.handlers = {};   // type -> fn(msg)
    this.connected = false;
    this._pendingName = null;
    this._moveTimer = 0;
  }

  on(type, fn) { this.handlers[type] = fn; return this; }

  connect(name) {
    this._pendingName = name;
    this.ws = new WebSocket(SERVER_URL);

    this.ws.addEventListener('open', () => {
      this.connected = true;
    });

    this.ws.addEventListener('message', (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      // Capture our own id/color from the welcome, then announce our name.
      if (msg.type === 'welcome') {
        this.id = msg.id;
        this.color = msg.color;
        this._send({ type: 'join', name: this._pendingName });
      }
      this.handlers[msg.type]?.(msg);
    });

    this.ws.addEventListener('close', () => {
      this.connected = false;
      this.handlers.disconnect?.();
    });

    this.ws.addEventListener('error', () => {
      this.handlers.error?.();
    });
  }

  _send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // Throttle position updates to ~12/sec regardless of frame rate.
  sendMove(x, z, facing, dt) {
    if (!this.connected) return;
    this._moveTimer += dt;
    if (this._moveTimer < 1 / 12) return;
    this._moveTimer = 0;
    this._send({
      type: 'move',
      x: +x.toFixed(2), z: +z.toFixed(2), facing: +facing.toFixed(3),
    });
  }

  sendChat(text) {
    this._send({ type: 'chat', text });
  }
}
