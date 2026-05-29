// Tiny authoritative-ish WebSocket server for the open-world game.
// Tracks connected players, relays movement, and broadcasts chat.
//
// Run locally:  npm run server   (listens on ws://localhost:8080)
// Deploy: any Node host that allows WebSockets (Render, Fly, Railway). It reads
// PORT from the environment so those platforms work out of the box.

import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

// id -> { ws, name, x, z, facing, color }
const players = new Map();
let nextId = 1;

// A few distinct avatar body colors handed out round-robin so players differ.
const COLORS = [0x3366cc, 0xcc4444, 0x44aa55, 0xcc8833, 0x9b59b6, 0x16a0a0];

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

// Send to everyone except optionally one socket.
function broadcast(msg, exceptId = null) {
  const data = JSON.stringify(msg);
  for (const [id, p] of players) {
    if (id !== exceptId && p.ws.readyState === p.ws.OPEN) p.ws.send(data);
  }
}

wss.on('connection', (ws) => {
  const id = nextId++;
  const player = {
    ws,
    name: `Guest-${id}`,
    x: 0, z: 0, facing: 0,
    color: COLORS[id % COLORS.length],
  };
  players.set(id, player);

  // 1) Tell the newcomer their id + color, and the roster of everyone already here.
  send(ws, {
    type: 'welcome',
    id,
    color: player.color,
    players: [...players]
      .filter(([pid]) => pid !== id)
      .map(([pid, p]) => ({ id: pid, name: p.name, x: p.x, z: p.z, facing: p.facing, color: p.color })),
  });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'join': {
        // Player announced their chosen name → tell everyone they arrived.
        player.name = String(msg.name || player.name).slice(0, 20);
        broadcast({
          type: 'spawn',
          id, name: player.name, x: player.x, z: player.z,
          facing: player.facing, color: player.color,
        }, id);
        broadcast({ type: 'system', text: `${player.name} joined` }, id);
        break;
      }
      case 'move': {
        player.x = msg.x; player.z = msg.z; player.facing = msg.facing;
        broadcast({ type: 'move', id, x: msg.x, z: msg.z, facing: msg.facing }, id);
        break;
      }
      case 'chat': {
        const text = String(msg.text || '').slice(0, 200);
        if (text.trim()) {
          broadcast({ type: 'chat', id, name: player.name, text });
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    players.delete(id);
    broadcast({ type: 'leave', id });
    broadcast({ type: 'system', text: `${player.name} left` });
  });
});

console.log(`Game server listening on ws://localhost:${PORT}`);
