#!/usr/bin/env node
// S-01 network spike: signalling server. THROWAWAY CODE, never imported by the product.
//
// It only introduces devices (NET-002): it hands out a room code, forwards WebRTC offers,
// answers and ICE candidates between one host and up to 8 phones, and enforces the 8-phone
// limit. It carries no gameplay: anything that is not an SDP or a candidate is refused.
//
// No npm dependencies: a minimal WebSocket server written on node:http (text frames only,
// no fragmentation, no extensions), which is all a browser sends for small JSON messages.
//
// Usage: node signal-server.mjs [--port 4551] [--lan]
//   Listens on 127.0.0.1 unless --lan is given. Phones never talk to this port directly:
//   the web server proxies /sig to it, so one port (and one tunnel) is enough.

import { createServer } from 'node:http';
import { createHash, randomInt } from 'node:crypto';

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(argValue('--port', '4551'));
const BIND = args.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
const MAX_PHONES = 8;
const MAX_MESSAGE_BYTES = 16 * 1024;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O: they read as 1 and 0

/** @type {Map<string, {host: any, phones: Map<string, any>, members: Set<string>, nextId: number}>} */
const rooms = new Map();
const counters = { rooms: 0, joins: 0, refusedFull: 0, refusedNoRoom: 0, forwarded: 0, refusedPayload: 0 };

function newCode() {
  for (;;) {
    let code = '';
    for (let i = 0; i < 4; i++) code += CODE_LETTERS[randomInt(CODE_LETTERS.length)];
    if (!rooms.has(code)) return code;
  }
}

// ---- minimal WebSocket ---------------------------------------------------------------

function encodeFrame(opcode, payload) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function makeConnection(socket) {
  const conn = {
    socket,
    open: true,
    onmessage: (_text) => {},
    onclose: () => {},
    send(obj) {
      if (conn.open) socket.write(encodeFrame(1, Buffer.from(JSON.stringify(obj))));
    },
    close() {
      if (!conn.open) return;
      conn.open = false;
      try {
        socket.write(encodeFrame(8, Buffer.alloc(0)));
      } catch {
        /* already gone */
      }
      socket.end();
      conn.onclose();
    },
  };
  let buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      if (buffer.length < 2) return;
      const opcode = buffer[0] & 0x0f;
      const masked = (buffer[1] & 0x80) !== 0;
      let len = buffer[1] & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (buffer.length < 4) return;
        len = buffer.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (buffer.length < 10) return;
        len = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }
      if (len > MAX_MESSAGE_BYTES || !masked) return conn.close();
      if (buffer.length < offset + 4 + len) return;
      const mask = buffer.subarray(offset, offset + 4);
      const payload = Buffer.from(buffer.subarray(offset + 4, offset + 4 + len));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      buffer = buffer.subarray(offset + 4 + len);
      if (opcode === 8) return conn.close();
      if (opcode === 9) socket.write(encodeFrame(10, payload));
      else if (opcode === 1) conn.onmessage(payload.toString('utf8'));
    }
  });
  const gone = () => {
    if (!conn.open) return;
    conn.open = false;
    conn.onclose();
  };
  socket.on('close', gone);
  socket.on('error', gone);
  return conn;
}

// ---- rooms ---------------------------------------------------------------------------

/** Only SDP descriptions and ICE candidates pass. Nothing else is forwarded. */
function isSignalPayload(data) {
  if (!data || typeof data !== 'object') return false;
  const keys = Object.keys(data);
  if (keys.length !== 1) return false;
  if (keys[0] === 'sdp') return typeof data.sdp === 'object' && typeof data.sdp.sdp === 'string';
  if (keys[0] === 'candidate') return typeof data.candidate === 'object';
  return false;
}

function attachHost(conn) {
  const code = newCode();
  const room = { host: conn, phones: new Map(), members: new Set(), nextId: 1 };
  rooms.set(code, room);
  counters.rooms++;
  conn.send({ t: 'room', code, maxPhones: MAX_PHONES });
  conn.onmessage = (text) => {
    let msg;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (msg.t === 'signal' && typeof msg.to === 'string') {
      if (!isSignalPayload(msg.data)) return void counters.refusedPayload++;
      const phone = room.phones.get(msg.to);
      if (phone) {
        phone.send({ t: 'signal', data: msg.data });
        counters.forwarded++;
      }
    } else if (msg.t === 'drop' && typeof msg.id === 'string') {
      // The host says this phone's link is gone: free its place.
      room.members.delete(msg.id);
      room.phones.get(msg.id)?.close();
      room.phones.delete(msg.id);
    }
  };
  conn.onclose = () => {
    rooms.delete(code);
    for (const phone of room.phones.values()) phone.close();
  };
}

function attachPhone(conn, code) {
  const room = rooms.get(code);
  if (!room) {
    counters.refusedNoRoom++;
    conn.send({ t: 'error', reason: 'no-room' });
    return conn.close();
  }
  if (room.members.size >= MAX_PHONES) {
    counters.refusedFull++;
    conn.send({ t: 'error', reason: 'full' });
    return conn.close();
  }
  const id = `p${room.nextId++}`;
  room.members.add(id);
  room.phones.set(id, conn);
  counters.joins++;
  conn.send({ t: 'joined', id });
  room.host.send({ t: 'peer', id });
  conn.onmessage = (text) => {
    let msg;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (msg.t !== 'signal') return;
    if (!isSignalPayload(msg.data)) return void counters.refusedPayload++;
    room.host.send({ t: 'signal', from: id, data: msg.data });
    counters.forwarded++;
  };
  // The phone closes this socket once its data channels are open; its place in the room
  // stays taken until the host reports the link gone ("drop").
  conn.onclose = () => {
    room.phones.delete(id);
    if (room.host.open) room.host.send({ t: 'socket-closed', id });
  };
}

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, counters }));
    return;
  }
  res.writeHead(404).end();
});

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const key = req.headers['sec-websocket-key'];
  if (url.pathname !== '/sig' || typeof key !== 'string') return socket.destroy();
  const accept = createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  socket.setNoDelay(true);
  const conn = makeConnection(socket);
  if (url.searchParams.get('role') === 'host') attachHost(conn);
  else attachPhone(conn, (url.searchParams.get('room') ?? '').toUpperCase());
});

server.listen(PORT, BIND, () => console.log(`[signal] listening on ${BIND}:${PORT}`));
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    for (const room of rooms.values()) room.host.socket.destroy();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
}
