// Thin client wrapper around the game WebSocket. Connects, sends move/chat,
// and dispatches incoming server messages to registered handlers.

// Where to find the multiplayer server.
//  - If VITE_SERVER_URL is set at build time, always use it (e.g. a deployed
//    wss:// server).
//  - Otherwise, only auto-default to the local dev server when the page is
//    served over plain http (i.e. local development). On an https host (like
//    GitHub Pages) with no server configured, we run single-player: a browser
//    can't open an insecure ws:// from an https page anyway.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (location.protocol === 'http:' ? `ws://${location.hostname}:8080` : null);

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
    // No server configured (e.g. static single-player host) — run solo.
    if (!SERVER_URL) {
      this.handlers.solo?.();
      return;
    }
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
