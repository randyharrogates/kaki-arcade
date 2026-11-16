// S-01 network spike: code shared by the host and phone pages. THROWAWAY CODE.

// ---- wire format (little-endian) -------------------------------------------------------
// INPUT 24 bytes: u8 type · u32 seq · f64 te · f64 ts · i8 x · i8 y · u8 buttons
//   te = phone clock time of the newest touch event in this state
//   ts = phone clock time the message was sent
//   Both are spike-only measurement fields; the product message needs neither f64.
// PING  11 bytes: u8 type · u16 id · f64 t0 (host clock)
// PONG  19 bytes: u8 type · u16 id · f64 t0 (echoed) · f64 tp (phone clock)
export const MSG_INPUT = 1;
export const MSG_PING = 2;
export const MSG_PONG = 3;
export const INPUT_BYTES = 24;

export function encodeInput(seq, te, ts, x, y, buttons) {
  const view = new DataView(new ArrayBuffer(INPUT_BYTES));
  view.setUint8(0, MSG_INPUT);
  view.setUint32(1, seq, true);
  view.setFloat64(5, te, true);
  view.setFloat64(13, ts, true);
  view.setInt8(21, Math.round(x * 127));
  view.setInt8(22, Math.round(y * 127));
  view.setUint8(23, buttons);
  return view.buffer;
}

export function decodeInput(buffer) {
  const view = new DataView(buffer);
  return {
    seq: view.getUint32(1, true),
    te: view.getFloat64(5, true),
    ts: view.getFloat64(13, true),
    x: view.getInt8(21) / 127,
    y: view.getInt8(22) / 127,
    buttons: view.getUint8(23),
  };
}

export function encodePing(id, t0) {
  const view = new DataView(new ArrayBuffer(11));
  view.setUint8(0, MSG_PING);
  view.setUint16(1, id, true);
  view.setFloat64(3, t0, true);
  return view.buffer;
}

export function encodePong(pingBuffer, tp) {
  const ping = new DataView(pingBuffer);
  const view = new DataView(new ArrayBuffer(19));
  view.setUint8(0, MSG_PONG);
  view.setUint16(1, ping.getUint16(1, true), true);
  view.setFloat64(3, ping.getFloat64(3, true), true);
  view.setFloat64(11, tp, true);
  return view.buffer;
}

export function decodePong(buffer) {
  const view = new DataView(buffer);
  return { id: view.getUint16(1, true), t0: view.getFloat64(3, true), tp: view.getFloat64(11, true) };
}

// ---- numbers ---------------------------------------------------------------------------

/** Nearest-rank percentiles of an unsorted array of numbers. */
export function summarise(samples) {
  if (samples.length === 0) return { n: 0, p50: null, p95: null, p99: null, max: null, min: null };
  const s = Float64Array.from(samples).sort();
  const at = (p) => s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
  const r = (v) => Math.round(v * 100) / 100;
  return { n: s.length, p50: r(at(50)), p95: r(at(95)), p99: r(at(99)), max: r(s[s.length - 1]), min: r(s[0]) };
}

// ---- connection settings from the URL --------------------------------------------------
// ?turn=<turn url>&turnUser=<name>&turnPass=<secret>   add a TURN relay
// ?stun=<stun url>                                     add a STUN server
// ?relay=1     on a phone: use the relay only. On the host: put relay=1 in the join link.
// ?relay=both  on the host: also force the host itself through the relay.
// With no parameters there are no ICE servers at all: only local addresses are tried and
// no external service is contacted.
export function iceConfig(role) {
  const q = new URLSearchParams(location.search);
  const iceServers = [];
  if (q.get('stun')) iceServers.push({ urls: q.get('stun') });
  if (q.get('turn')) {
    iceServers.push({ urls: q.get('turn'), username: q.get('turnUser') ?? '', credential: q.get('turnPass') ?? '' });
  }
  const relay = q.get('relay');
  const force = role === 'phone' ? relay === '1' || relay === 'both' : relay === 'both';
  return { iceServers, iceTransportPolicy: force ? 'relay' : 'all' };
}

/** The connection parameters a phone must inherit from the host's URL. */
export function inheritedParams() {
  const q = new URLSearchParams(location.search);
  const out = new URLSearchParams();
  for (const key of ['turn', 'turnUser', 'turnPass', 'stun']) if (q.get(key)) out.set(key, q.get(key));
  if (q.get('relay')) out.set('relay', '1');
  return out;
}

export function signalUrl(query) {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}/sig?${query}`;
}

export const PLAYER_COLOURS = ['#e4572e', '#17bebb', '#ffc914', '#76b041', '#8f6bd6', '#f26ca7', '#3d7fd9', '#f08a24'];
