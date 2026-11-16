#!/usr/bin/env node
// S-01 network spike: static web server for the host and phone pages. THROWAWAY CODE.
//
// Serves ./public, answers /info (LAN addresses, for the join link) and proxies the
// WebSocket path /sig to the signalling server, so a phone needs only one address and one
// HTTPS tunnel covers both.
//
// Usage: node web-server.mjs [--port 4550] [--signal-port 4551] [--lan]
//   Listens on 127.0.0.1 unless --lan is given (needed for real phones on the Wi-Fi).

import { createServer } from 'node:http';
import { connect } from 'node:net';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PORT = Number(argValue('--port', '4550'));
const SIGNAL_PORT = Number(argValue('--signal-port', '4551'));
const LAN = args.includes('--lan');
const BIND = LAN ? '0.0.0.0' : '127.0.0.1';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'public');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
};

function lanAddresses() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  }
  return out;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/info') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ lan: LAN ? lanAddresses() : [], port: PORT }));
    return;
  }
  const path = url.pathname === '/' ? '/host.html' : url.pathname;
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) return void res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});

// Raw TCP pass-through of the WebSocket upgrade to the signalling server.
server.on('upgrade', (req, socket, head) => {
  if (!(req.url ?? '').startsWith('/sig')) return socket.destroy();
  const upstream = connect(SIGNAL_PORT, '127.0.0.1', () => {
    let raw = `${req.method} ${req.url} HTTP/1.1\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    }
    upstream.write(raw + '\r\n');
    if (head.length) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });
  upstream.setNoDelay(true);
  socket.setNoDelay(true);
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(PORT, BIND, () => {
  console.log(`[web] listening on ${BIND}:${PORT}`);
  if (LAN) for (const a of lanAddresses()) console.log(`[web] host page: http://${a}:${PORT}/host.html`);
});
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    server.closeAllConnections();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
}
