// S-01 network spike: phone page. THROWAWAY CODE, never imported by the product.
//
// URL parameters:
//   room=CODE   the room to join (asked for if missing)
//   bot=1       scripted input: the stick moves in a circle, the button toggles
//   hz=60       fixed send rate while anything is held
//   eager=1     also send straight away on a touch event, not only on the next tick
//   name=…      label shown on the host
//   plus the connection parameters in common.js (turn, turnUser, turnPass, stun, relay)
import { MSG_PING, encodeInput, encodePong, iceConfig, signalUrl } from './common.js';

const q = new URLSearchParams(location.search);
const BOT = q.get('bot') === '1';
const HZ = Math.min(120, Math.max(5, Number(q.get('hz') ?? 60)));
const EAGER = q.get('eager') === '1';
const IDLE_HZ = 5; // keep-alive while nothing is held, so loss stays measurable
const RELEASE_REPEATS = 3; // "all released" is sent three times so one lost packet cannot stick a button
const STICK_RADIUS = 89;

const $ = (id) => document.getElementById(id);
const setState = (text) => { $('state').textContent = text; };

const state = { x: 0, y: 0, buttons: 0, te: performance.now() };
let seq = 0;
let input = null;
let control = null;
let releasesLeft = 0;
let lastSend = 0;
let sent = 0;
const handlerLag = []; // ms from a real touch event's own timestamp to our handler running

// ---- sending ---------------------------------------------------------------------------

function send() {
  if (!input || input.readyState !== 'open') return;
  const now = performance.now();
  input.send(encodeInput(seq++, state.te, now, state.x, state.y, state.buttons));
  lastSend = now;
  sent++;
}

const held = () => state.x !== 0 || state.y !== 0 || state.buttons !== 0;

/** Called for every touch event (real or scripted) with the event's own timestamp. */
function onInputEvent(eventTime) {
  // event.timeStamp is on the performance.now() clock in current browsers; guard anyway
  const now = performance.now();
  state.te = Math.abs(now - eventTime) < 1000 ? eventTime : now;
  if (!BOT && handlerLag.length < 20000) handlerLag.push(now - state.te);
  if (!held()) releasesLeft = RELEASE_REPEATS;
  if (EAGER && now - lastSend >= 4) send();
}

// Fixed-rate tick that does not drift: each tick is scheduled against the start time.
const period = 1000 / HZ;
const idleEvery = Math.round(HZ / IDLE_HZ);
let tickStart = performance.now();
let tickCount = 0;
function tick() {
  tickCount++;
  if (held()) send();
  else if (releasesLeft > 0) { releasesLeft--; send(); }
  else if (tickCount % idleEvery === 0) send();
  const next = tickStart + (tickCount + 1) * period;
  const wait = next - performance.now();
  if (wait < -period * 4) { tickStart = performance.now(); tickCount = 0; } // was suspended: start afresh
  setTimeout(tick, Math.max(0, wait));
}

// ---- touch stick and button: pointer events, tracked 1:1, no tween ----------------------

const stickEl = $('stick');
const knob = $('knob');
const buttonEl = $('button');
let stickPointer = null;

function moveStick(e) {
  const r = stickEl.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2);
  let dy = e.clientY - (r.top + r.height / 2);
  const len = Math.hypot(dx, dy);
  if (len > STICK_RADIUS) { dx *= STICK_RADIUS / len; dy *= STICK_RADIUS / len; }
  state.x = dx / STICK_RADIUS;
  state.y = dy / STICK_RADIUS;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  onInputEvent(e.timeStamp);
}
function releaseStick(e) {
  if (e.pointerId !== stickPointer) return;
  stickPointer = null;
  state.x = 0; state.y = 0;
  knob.style.transform = '';
  onInputEvent(e.timeStamp);
}
stickEl.addEventListener('pointerdown', (e) => {
  if (stickPointer !== null) return;
  stickPointer = e.pointerId;
  stickEl.setPointerCapture(e.pointerId);
  moveStick(e);
});
stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stickPointer) moveStick(e); });
stickEl.addEventListener('pointerup', releaseStick);
stickEl.addEventListener('pointercancel', releaseStick);

function setButton(down, e) {
  state.buttons = down ? 1 : 0;
  buttonEl.classList.toggle('down', down);
  onInputEvent(e.timeStamp);
}
buttonEl.addEventListener('pointerdown', (e) => { buttonEl.setPointerCapture(e.pointerId); setButton(true, e); });
buttonEl.addEventListener('pointerup', (e) => setButton(false, e));
buttonEl.addEventListener('pointercancel', (e) => setButton(false, e));
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- scripted input --------------------------------------------------------------------
// Stands in for touch events: they arrive at roughly touch rate and are NOT in step with
// the send ticks, so the wait for the next tick is part of the measured delay, as it would
// be for a thumb.
function startBot() {
  const phase = Math.random() * Math.PI * 2;
  const began = performance.now();
  const next = () => {
    const now = performance.now();
    const a = phase + ((now - began) / 3000) * Math.PI * 2; // one circle every 3 s
    state.x = Math.cos(a);
    state.y = Math.sin(a);
    state.buttons = Math.floor((now - began) / 1000) % 2;
    knob.style.transform = `translate(${state.x * STICK_RADIUS}px, ${state.y * STICK_RADIUS}px)`;
    buttonEl.classList.toggle('down', state.buttons === 1);
    onInputEvent(now);
    setTimeout(next, 6 + Math.random() * 16);
  };
  next();
}

// ---- connection ------------------------------------------------------------------------

function join(room) {
  if (typeof RTCPeerConnection === 'undefined') {
    setState('This browser has no WebRTC on this page. Try the HTTPS link.');
    return;
  }
  setState(`Joining ${room}…`);
  const ws = new WebSocket(signalUrl(`role=phone&room=${encodeURIComponent(room)}`));
  const pc = new RTCPeerConnection(iceConfig('phone'));
  let remoteSet = false;
  let queued = [];
  let refused = false;
  const sig = (msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };

  pc.onicecandidate = (e) => { if (e.candidate) sig({ t: 'signal', data: { candidate: e.candidate.toJSON() } }); };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') setState('Could not reach the big screen. Same Wi-Fi?');
    if (pc.connectionState === 'disconnected') setState('Link lost…');
  };
  pc.ondatachannel = (e) => {
    const ch = e.channel;
    if (ch.label === 'input') {
      ch.binaryType = 'arraybuffer';
      ch.onmessage = (m) => {
        const tp = performance.now(); // stamp first, then decode
        if (new Uint8Array(m.data, 0, 1)[0] === MSG_PING) ch.send(encodePong(m.data, tp));
      };
      ch.onopen = () => { input = ch; };
      if (ch.readyState === 'open') input = ch;
    } else if (ch.label === 'control') {
      const hello = () => {
        control = ch;
        ch.send(JSON.stringify({
          t: 'hello', name: q.get('name') ?? (BOT ? 'bot' : 'phone'), timeOrigin: performance.timeOrigin,
          hz: HZ, eager: EAGER, bot: BOT, ua: navigator.userAgent,
        }));
        ws.close(); // pairing is done: the signalling socket is no longer needed
      };
      ch.onopen = hello;
      if (ch.readyState === 'open') hello();
      ch.onclose = () => setState('Disconnected from the big screen.');
      ch.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.t === 'welcome') {
          $('who').textContent = `Phone ${msg.slot + 1}`;
          $('who').style.color = msg.colour;
          setState('Connected');
        } else if (msg.t === 'stats') {
          $('numbers').textContent = `${msg.path} · delay p50 ${msg.p50 ?? '–'} · p95 ${msg.p95 ?? '–'} ms · lost ${msg.lost} · sent ${sent}`;
        }
      };
    }
  };

  ws.onmessage = async (e) => {
    const msg = JSON.parse(e.data);
    if (msg.t === 'error') {
      refused = true;
      setState(msg.reason === 'full' ? 'Room is full (8 phones).' : `No room with the code ${room}.`);
      pc.close();
    } else if (msg.t === 'signal' && msg.data.sdp) {
      await pc.setRemoteDescription(msg.data.sdp);
      remoteSet = true;
      for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
      queued = [];
      await pc.setLocalDescription(await pc.createAnswer());
      sig({ t: 'signal', data: { sdp: pc.localDescription.toJSON() } });
    } else if (msg.t === 'signal' && msg.data.candidate) {
      if (remoteSet) await pc.addIceCandidate(msg.data.candidate).catch(() => {});
      else queued.push(msg.data.candidate);
    }
  };
  ws.onerror = () => { if (!refused) setState('Could not reach the pairing server.'); };
  addEventListener('pagehide', () => pc.close());
  window.__phone = { pc, sent: () => sent, state, handlerLag };
}

const room = (q.get('room') ?? '').toUpperCase();
if (room) {
  join(room);
} else {
  $('joinform').hidden = false;
  $('pads').hidden = true;
  setState('Enter the code on the big screen');
  $('joinform').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('roominput').value.trim().toUpperCase();
    if (code.length === 4) { q.set('room', code); location.search = q.toString(); }
  });
}
setTimeout(tick, period);
if (BOT) startBot();
