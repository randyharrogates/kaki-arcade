// S-01 network spike: host page. THROWAWAY CODE, never imported by the product.
import {
  MSG_INPUT, MSG_PONG, PLAYER_COLOURS, decodeInput, decodePong, encodePing,
  iceConfig, inheritedParams, signalUrl, summarise,
} from './common.js';

const MAX_PHONES = 8;
const STEP_MS = 1000 / 60; // fixed simulation step
const ARENA_W = 1000;
const ARENA_H = 618;
const SPEED = 240; // arena units per second at full stick
const TRAIL = 40;
const OFFSET_WINDOW = 16;

const $ = (id) => document.getElementById(id);
const canvas = $('arena');
const ctx = canvas.getContext('2d');

/** @type {Map<string, any>} */
const peers = new Map();
let roomCode = '';
let ws;

// ---- signalling ------------------------------------------------------------------------

function sig(msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

async function showJoinUrl() {
  let origin = location.origin;
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    try {
      const info = await (await fetch('/info')).json();
      if (info.lan[0]) origin = `http://${info.lan[0]}:${info.port}`;
    } catch { /* keep the page's own origin */ }
  }
  const params = inheritedParams();
  params.set('room', roomCode);
  $('joinurl').textContent = `${origin}/phone.html?${params}`;
}

function connectSignal() {
  ws = new WebSocket(signalUrl('role=host'));
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.t === 'room') {
      roomCode = msg.code;
      $('code').textContent = roomCode;
      showJoinUrl();
    } else if (msg.t === 'peer') {
      addPeer(msg.id);
    } else if (msg.t === 'signal') {
      onSignal(msg.from, msg.data);
    }
  };
  ws.onclose = () => { $('code').textContent = 'offline'; };
}

// ---- one phone -------------------------------------------------------------------------

function freeSlot() {
  const used = new Set([...peers.values()].map((p) => p.slot));
  for (let i = 0; i < MAX_PHONES; i++) if (!used.has(i)) return i;
  return -1;
}

function freshStats() {
  return {
    since: performance.now(), total: [], net: [], received: 0, firstSeq: -1, maxSeq: -1, late: 0,
    bytesAtReset: null,
  };
}

function addPeer(id) {
  const slot = freeSlot();
  if (slot < 0) return sig({ t: 'drop', id }); // the server already refuses a ninth; belt and braces
  const pc = new RTCPeerConnection(iceConfig('host'));
  // Input: unordered, no retransmits. A lost packet is replaced by the next one.
  const input = pc.createDataChannel('input', { ordered: false, maxRetransmits: 0 });
  input.binaryType = 'arraybuffer';
  // Control: reliable and ordered, for events that must arrive.
  const control = pc.createDataChannel('control', { ordered: true });
  const col = slot % 4;
  const row = Math.floor(slot / 4);
  const peer = {
    id, slot, pc, input, control, name: id, hello: null, joinedAt: performance.now(),
    x: ARENA_W * (0.125 + 0.25 * col), y: ARENA_H * (0.25 + 0.5 * row),
    stick: { x: 0, y: 0 }, buttons: 0, lastSeq: -1, lastTe: -1, pending: [], trail: [],
    offset: null, pings: new Map(), pingId: 0, offsetSamples: [], rtt: null, pingsSent: 0,
    path: 'unknown', pairRtt: null, bytesReceived: 0, bytesSent: 0, candidateTypes: '',
    stats: freshStats(), remoteSet: false, queued: [], disconnectedAt: null, connectedAt: null,
  };
  peers.set(id, peer);

  pc.onicecandidate = (e) => { if (e.candidate) sig({ t: 'signal', to: id, data: { candidate: e.candidate.toJSON() } }); };
  pc.onconnectionstatechange = () => {
    const s = pc.connectionState;
    if (s === 'connected') { peer.disconnectedAt = null; peer.connectedAt ??= performance.now(); }
    if (s === 'disconnected') peer.disconnectedAt = performance.now();
    if (s === 'failed' || s === 'closed') removePeer(id);
  };
  control.onclose = () => removePeer(id);
  control.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.t === 'hello') {
      peer.hello = msg;
      peer.name = msg.name || id;
      control.send(JSON.stringify({ t: 'welcome', slot, colour: PLAYER_COLOURS[slot] }));
    }
  };
  input.onopen = () => { for (let i = 0; i < 5; i++) setTimeout(() => ping(peer), i * 60); };
  input.onmessage = (e) => onInputChannel(peer, e.data);

  (async () => {
    await pc.setLocalDescription(await pc.createOffer());
    sig({ t: 'signal', to: id, data: { sdp: pc.localDescription.toJSON() } });
  })();
}

async function onSignal(id, data) {
  const peer = peers.get(id);
  if (!peer) return;
  if (data.sdp) {
    await peer.pc.setRemoteDescription(data.sdp);
    peer.remoteSet = true;
    for (const c of peer.queued) await peer.pc.addIceCandidate(c).catch(() => {});
    peer.queued = [];
  } else if (data.candidate) {
    if (peer.remoteSet) await peer.pc.addIceCandidate(data.candidate).catch(() => {});
    else peer.queued.push(data.candidate);
  }
}

function removePeer(id) {
  const peer = peers.get(id);
  if (!peer) return;
  peers.delete(id);
  peer.control.onclose = null;
  try { peer.pc.close(); } catch { /* already closed */ }
  sig({ t: 'drop', id });
  renderTable();
}

// ---- clock alignment: ping/pong, lowest round trip of the last OFFSET_WINDOW ------------

function ping(peer) {
  if (peer.input.readyState !== 'open') return;
  const id = peer.pingId = (peer.pingId + 1) & 0xffff;
  const t0 = performance.now();
  peer.pings.set(id, t0);
  if (peer.pings.size > 32) peer.pings.delete(peer.pings.keys().next().value);
  peer.input.send(encodePing(id, t0));
  peer.pingsSent++;
}

function onPong(peer, buffer, t1) {
  const { id, t0, tp } = decodePong(buffer);
  if (!peer.pings.delete(id)) return;
  const rtt = t1 - t0;
  // host clock = phone clock + offset, assuming the two directions take equal time
  peer.offsetSamples.push({ rtt, offset: (t0 + t1) / 2 - tp });
  if (peer.offsetSamples.length > OFFSET_WINDOW) peer.offsetSamples.shift();
  let best = peer.offsetSamples[0];
  for (const s of peer.offsetSamples) if (s.rtt < best.rtt) best = s;
  peer.offset = best.offset;
  peer.rtt = rtt;
}

// ---- input -----------------------------------------------------------------------------

function onInputChannel(peer, buffer) {
  const recv = performance.now();
  const type = new Uint8Array(buffer, 0, 1)[0];
  if (type === MSG_PONG) return onPong(peer, buffer, recv);
  if (type !== MSG_INPUT) return;
  const m = decodeInput(buffer);
  const st = peer.stats;
  st.received++;
  if (st.firstSeq < 0) st.firstSeq = m.seq;
  if (m.seq > st.maxSeq) st.maxSeq = m.seq;
  if (m.seq <= peer.lastSeq) { st.late++; return; } // older than what we already have: ignore
  peer.lastSeq = m.seq;
  peer.pending.push({ x: m.x, y: m.y, buttons: m.buttons, te: m.te, ts: m.ts, recv });
}

/** One fixed 60 Hz simulation step. `now` is the host clock time the step runs. */
function step(now) {
  for (const peer of peers.values()) {
    if (peer.pending.length) {
      for (const m of peer.pending) {
        peer.stick.x = m.x; peer.stick.y = m.y; peer.buttons = m.buttons;
        if (peer.offset !== null) {
          peer.stats.net.push(m.recv - (m.ts + peer.offset));
          // Only a message carrying a new touch event is a delay sample: a held stick
          // repeats the same event time.
          if (m.te !== peer.lastTe) peer.stats.total.push(now - (m.te + peer.offset));
        }
        peer.lastTe = m.te;
      }
      peer.pending.length = 0;
    }
    // The dot follows the stick directly: no smoothing, no overshoot.
    peer.x = Math.min(ARENA_W - 21, Math.max(21, peer.x + peer.stick.x * SPEED * (STEP_MS / 1000)));
    peer.y = Math.min(ARENA_H - 21, Math.max(21, peer.y + peer.stick.y * SPEED * (STEP_MS / 1000)));
    peer.trail.push(peer.x, peer.y);
    if (peer.trail.length > TRAIL * 2) peer.trail.splice(0, 2);
  }
}

// ---- frame loop ------------------------------------------------------------------------

let last = performance.now();
let acc = 0;
let frameTimes = [];
let steps = 0;
let hostSince = performance.now();

function frame() {
  const now = performance.now();
  const dt = now - last;
  last = now;
  frameTimes.push(dt);
  acc = Math.min(acc + dt, STEP_MS * 5);
  while (acc >= STEP_MS) { step(performance.now()); steps++; acc -= STEP_MS; }
  draw();
  requestAnimationFrame(frame);
}

function draw() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const k = w / ARENA_W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = '#f7f3ea';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  ctx.strokeStyle = 'rgba(29,36,51,0.07)'; // blueprint grid, the arena's one treatment
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= ARENA_W; x += 55) { ctx.moveTo(x, 0); ctx.lineTo(x, ARENA_H); }
  for (let y = 0; y <= ARENA_H; y += 55) { ctx.moveTo(0, y); ctx.lineTo(ARENA_W, y); }
  ctx.stroke();
  for (const peer of peers.values()) {
    const colour = PLAYER_COLOURS[peer.slot];
    ctx.fillStyle = colour;
    for (let i = 0; i < peer.trail.length; i += 2) {
      ctx.globalAlpha = 0.35 * (i / peer.trail.length);
      ctx.beginPath();
      ctx.arc(peer.trail[i], peer.trail[i + 1], 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(peer.x, peer.y, 21, 0, Math.PI * 2);
    ctx.fill();
    if (peer.buttons & 1) { // button held: a ring, drawn the step it applies
      ctx.strokeStyle = '#1d2433';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(peer.x, peer.y, 29, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#1d2433';
    ctx.font = '700 21px ui-rounded, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(peer.slot + 1), peer.x, peer.y + 1);
  }
}

// ---- once a second: pings, link statistics, table ---------------------------------------

async function readLink(peer) {
  try {
    const report = await peer.pc.getStats();
    let pair = null;
    for (const s of report.values()) {
      if (s.type === 'transport' && s.selectedCandidatePairId) pair = report.get(s.selectedCandidatePairId);
    }
    if (!pair) {
      for (const s of report.values()) {
        if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') pair = s;
      }
    }
    if (!pair) return;
    const local = report.get(pair.localCandidateId);
    const remote = report.get(pair.remoteCandidateId);
    const lt = local?.candidateType ?? '?';
    const rt = remote?.candidateType ?? '?';
    peer.candidateTypes = `${lt}/${rt}`;
    peer.path = lt === 'relay' || rt === 'relay' ? 'relayed' : 'direct';
    peer.pairRtt = pair.currentRoundTripTime != null ? pair.currentRoundTripTime * 1000 : null;
    peer.bytesReceived = pair.bytesReceived ?? 0;
    peer.bytesSent = pair.bytesSent ?? 0;
    if (peer.stats.bytesAtReset === null) {
      peer.stats.bytesAtReset = { rx: peer.bytesReceived, tx: peer.bytesSent, at: performance.now() };
    }
  } catch { /* connection went away mid-read */ }
}

const fmt = (v) => (v === null || v === undefined ? '–' : v.toFixed(1));
// A phone chooses its own name, so it is escaped before it goes into the table markup.
const esc = (text) => String(text).slice(0, 24).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function peerSummary(peer) {
  const st = peer.stats;
  const seconds = (performance.now() - st.since) / 1000;
  const expected = st.maxSeq >= 0 ? st.maxSeq - st.firstSeq + 1 : 0;
  const bytes = st.bytesAtReset
    ? {
        rxPerSecond: Math.round((peer.bytesReceived - st.bytesAtReset.rx) / Math.max(0.001, (performance.now() - st.bytesAtReset.at) / 1000)),
        txPerSecond: Math.round((peer.bytesSent - st.bytesAtReset.tx) / Math.max(0.001, (performance.now() - st.bytesAtReset.at) / 1000)),
      }
    : null;
  // Same machine only: both pages share one wall clock, so the true offset is known and
  // the ping/pong estimate can be checked against it. Meaningless across real devices.
  const trueOffset = peer.hello ? peer.hello.timeOrigin - performance.timeOrigin : null;
  return {
    id: peer.id, slot: peer.slot + 1, name: peer.name, path: peer.path, candidateTypes: peer.candidateTypes,
    connectionState: peer.pc.connectionState,
    connectMs: peer.connectedAt ? Math.round(peer.connectedAt - peer.joinedAt) : null,
    settings: peer.hello ? { hz: peer.hello.hz, eager: peer.hello.eager, bot: peer.hello.bot, ua: peer.hello.ua } : null,
    seconds: Math.round(seconds * 10) / 10,
    ratePerSecond: Math.round((st.received / Math.max(0.001, seconds)) * 10) / 10,
    total: summarise(st.total), net: summarise(st.net),
    received: st.received, lost: Math.max(0, expected - st.received), late: st.late,
    pingMs: peer.rtt === null ? null : Math.round(peer.rtt * 100) / 100,
    icePairRttMs: peer.pairRtt,
    clockOffsetMs: peer.offset,
    clockErrorSameMachineMs: trueOffset !== null && peer.offset !== null ? Math.round((peer.offset - trueOffset) * 1000) / 1000 : null,
    bytes, stick: { ...peer.stick }, buttons: peer.buttons,
  };
}

function renderTable() {
  const rows = [...peers.values()].sort((a, b) => a.slot - b.slot).map((peer) => {
    const s = peerSummary(peer);
    const budget = s.path === 'relayed' ? 120 : 50;
    const verdict = s.total.p95 === null ? '–' : s.total.p95 <= budget
      ? `<span class="ok">within ${budget}</span>` : `<span class="over">over ${budget}</span>`;
    return `<tr>
      <td><span class="swatch" style="background:${PLAYER_COLOURS[peer.slot]}"></span>${s.slot} ${esc(s.name)}</td>
      <td><span class="tag ${s.path}">${s.path}</span></td>
      <td class="num">${s.ratePerSecond.toFixed(0)}/s</td>
      <td class="num">${fmt(s.total.p50)}</td><td class="num">${fmt(s.total.p95)}</td><td class="num">${fmt(s.total.p99)}</td>
      <td class="num">${fmt(s.net.p50)}</td><td class="num">${fmt(s.net.p95)}</td><td class="num">${fmt(s.net.p99)}</td>
      <td class="num">${s.lost}</td><td class="num">${s.late}</td><td class="num">${fmt(s.pingMs)}</td>
      <td>${verdict}</td></tr>`;
  });
  $('rows').innerHTML = rows.join('') || '<tr><td colspan="13">No phones yet. Open the join link on a phone.</td></tr>';
  const f = summarise(frameTimes);
  $('hoststats').textContent = `${peers.size} of ${MAX_PHONES} phones · host frame p95 ${fmt(f.p95)} ms`;
}

let tick = 0;
setInterval(async () => {
  tick++;
  const now = performance.now();
  for (const peer of [...peers.values()]) {
    if (peer.disconnectedAt && now - peer.disconnectedAt > 5000) { removePeer(peer.id); continue; }
    if (peer.pc.connectionState !== 'connected' && now - peer.joinedAt > 15000) { removePeer(peer.id); continue; }
    // quick pings while the estimate settles, then one a second
    if (peer.pingsSent < 12 || tick % 4 === 0) ping(peer);
    if (tick % 4 === 0) {
      await readLink(peer);
      if (peer.control.readyState === 'open') {
        const s = peerSummary(peer);
        peer.control.send(JSON.stringify({ t: 'stats', path: s.path, p50: s.total.p50, p95: s.total.p95, lost: s.lost }));
      }
    }
  }
  if (tick % 4 === 0) renderTable();
  if (frameTimes.length > 7200) frameTimes = frameTimes.slice(-3600);
}, 250);

// ---- hooks for the run script ----------------------------------------------------------

window.__spike = {
  roomCode: () => roomCode,
  count: () => [...peers.values()].filter((p) => p.input.readyState === 'open' && p.hello && p.offset !== null).length,
  reset() {
    for (const peer of peers.values()) peer.stats = freshStats();
    frameTimes = [];
    steps = 0;
    hostSince = performance.now();
  },
  async snapshot() {
    for (const peer of peers.values()) await readLink(peer);
    const list = [...peers.values()].sort((a, b) => a.slot - b.slot);
    const seconds = (performance.now() - hostSince) / 1000;
    return {
      roomCode,
      phones: list.map(peerSummary),
      all: {
        total: summarise(list.flatMap((p) => p.stats.total)),
        net: summarise(list.flatMap((p) => p.stats.net)),
      },
      host: {
        seconds: Math.round(seconds * 10) / 10,
        frameMs: summarise(frameTimes),
        framesPerSecond: Math.round((frameTimes.length / seconds) * 10) / 10,
        stepsPerSecond: Math.round((steps / seconds) * 10) / 10,
      },
    };
  },
};

connectSignal();
renderTable();
requestAnimationFrame(frame);
