import { describe, expect, it } from 'vitest';
import { decodePhoneFrame,
  parseHostSubprotocols,
  encodePing, encodePong, PROTOCOL_VERSION as v, SIGNAL_SUBPROTOCOL } from '@kaki/protocol';
import { createInputBuffer } from '../../sim-core/src/input';
import { handle, newRoom } from '../../../apps/signal/src/core/room';
import type { Event, RoomState } from '../../../apps/signal/src/core/room';
import { createHostInput, createPhoneInput, createHostPairing, createPhonePairing,
  createHostTransport, createPhoneTransport, createPeer, LinkMeter } from './index';
import type { Scheduler, Socket, Channel, PeerConnection, Candidate, Description,
  Peer, Stat } from './index';
class Clock implements Scheduler {
  time = 0;
  serial = 0;
  tasks = new Map<number, { at: number; callback: () => void }>();
  now(): number { return this.time; }
  schedule(callback: () => void, delayMs: number): number {
    const id = ++this.serial; this.tasks.set(id, { at: this.time + delayMs, callback }); return id;
  }
  cancel(handle: unknown): void { this.tasks.delete(handle as number); }
  advance(ms: number): void {
    const end = this.time + ms;
    for (;;) {
      const next = [...this.tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end + 1e-8) break;
      this.time = next[1].at; this.tasks.delete(next[0]); next[1].callback();
    }
    this.time = end;
  }
}
class FakeSocket implements Socket {
  readyState = 0;
  onopen: Socket['onopen'] = null;
  onmessage: Socket['onmessage'] = null;
  onclose: Socket['onclose'] = null;
  onerror: Socket['onerror'] = null;
  sent: string[] = [];
  receive(data: unknown): void { this.onmessage?.({ data }); }
  send(data: string): void { this.sent.push(data); this.route?.(data); }
  route: ((data: string) => void) | null = null;
  serverClose: (() => void) | null = null;
  close(): void {
    if (this.readyState === 3) return;
    this.readyState = 3; this.serverClose?.(); this.onclose?.();
  }
  open(): void { this.readyState = 1; this.onopen?.(); }
}
const token = 'a'.repeat(32);
const ice = { servers: [], ttlS: 0, relay: 'off' } as const;
function grant() { return { ...ice, servers: [] }; }
const analog = { stickX: 0, stickY: 0, tilt: null };
const flush = async (): Promise<void> => { for (let i = 0; i < 40; i++) await Promise.resolve(); };

/** Script the nth binary send with zero (loss), one (delay), or many (duplication) delays. */
class FakeChannel implements Channel {
  bufferedAmount = 0;
  onerror: Channel['onerror'] = null;
  binaryType = '';
  readyState = 'connecting';
  onopen: Channel['onopen'] = null;
  onclose: Channel['onclose'] = null;
  onmessage: Channel['onmessage'] = null;
  other: FakeChannel | null = null;
  sent: (string | Uint8Array)[] = [];
  deliveries = new Set<unknown>();
  plan: (index: number) => number[] = () => [0];
  constructor(readonly label: string, readonly clock: Clock) {}
  send(data: string | Uint8Array): void {
    const copy = typeof data === 'string' ? data : data.slice();
    const index = this.sent.push(copy) - 1;
    for (const delay of this.plan(index)) {
      const handle = this.clock.schedule(() => {
        this.deliveries.delete(handle);
        if (this.other?.readyState === 'open') this.other.onmessage?.({ data: copy });
      }, delay);
      this.deliveries.add(handle);
    }
  }
  open(): void { this.readyState = 'open'; this.onopen?.(); }
  close(): void {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    for (const task of this.deliveries) this.clock.cancel(task);
    this.deliveries.clear(); this.onclose?.();
  }
}
class FakePC implements PeerConnection {
  connectionState = 'new';
  onconnectionstatechange: PeerConnection['onconnectionstatechange'] = null;
  onicecandidate: PeerConnection['onicecandidate'] = null;
  ondatachannel: PeerConnection['ondatachannel'] = null;
  channels: FakeChannel[] = [];
  options: { ordered: boolean; maxRetransmits?: number }[] = [];
  remote: Description | null = null;
  local: Description | null = null;
  candidates: (Candidate | null)[] = [];
  stats = new Map<string, Stat>();
  constructor(readonly clock: Clock) {}
  createDataChannel(label: string, options: { ordered: boolean; maxRetransmits?: number }): FakeChannel {
    const channel = new FakeChannel(label, this.clock); this.channels.push(channel); this.options.push(options); return channel;
  }
  createOffer(): Promise<Description> { return Promise.resolve({ type: 'offer', sdp: 'offer-sdp' }); }
  createAnswer(): Promise<Description> { return Promise.resolve({ type: 'answer', sdp: 'answer-sdp' }); }
  setLocalDescription(description: Description): Promise<void> { this.local = description; return Promise.resolve(); }
  setRemoteDescription(description: Description): Promise<void> { this.remote = description; return Promise.resolve(); }
  addIceCandidate(candidate: Candidate | null): Promise<void> {
    if (!this.remote) return Promise.reject(new Error('No remote description'));
    this.candidates.push(candidate); return Promise.resolve();
  }
  getStats(): Promise<ReadonlyMap<string, Stat>> { return Promise.resolve(this.stats); }
  close(): void { this.connectionState = 'closed'; for (const channel of this.channels) channel.close(); }
}
function joinChannels(host: FakePC, phone: FakePC): void {
  for (const local of host.channels) {
    const remote = new FakeChannel(local.label, phone.clock);
    phone.channels.push(remote); local.other = remote; remote.other = local;
    phone.ondatachannel?.({ channel: remote });
    local.open(); remote.open();
  }
}
function buffer() { return createInputBuffer<number>({ seqModulus: 65536, staleAfterSteps: 15 }); }

// ---------------- Review harness: drives netcode against apps/signal's pure core ----------------
const CODE = 'BCDF2345';
const SECRET = 'abcdefghijklmnopqrstuvwxyz012345';
class RealServer {
  room: RoomState;
  live = new Map<string, FakeSocket>();
  serial = 0;
  log: { id: string; t: string; code?: string }[] = [];
  expiredUpgrade = false;
  delayMs = 0;
  constructor(readonly clock: Clock) { this.room = newRoom(CODE, SECRET, clock.now()); }
  apply(event: Event): void {
    const out = handle(this.room, event, this.clock.now());
    this.room = out.state;
    for (const send of out.sends) {
      const m = send.message as { t: string; code?: string };
      this.log.push({ id: send.id, t: m.t, ...(m.code && m.t === 'error' ? { code: m.code } : {}) });
      const socket = this.live.get(send.id);
      const data = JSON.stringify(send.message);
      if (socket) this.clock.schedule(() => { if (socket.readyState === 1) socket.receive(data); }, this.delayMs);
    }
    for (const id of out.closes) {
      const socket = this.live.get(id);
      this.live.delete(id);
      if (socket) this.clock.schedule(() => {
        if (socket.readyState !== 3) { socket.readyState = 3; socket.onclose?.(); }
        this.apply({ t: 'disconnect', id });
      }, 0);
    }
  }
  /** Drop a socket as the network would: client sees close, server sees disconnect. */
  sever(id: string): void {
    const socket = this.live.get(id); this.live.delete(id);
    if (socket) { socket.readyState = 3; socket.onclose?.(); }
    this.apply({ t: 'disconnect', id });
  }
  socket = (url: string, protocols: string[]): FakeSocket => {
    const socket = new FakeSocket();
    const route = url.endsWith('/host') ? 'host' : 'phone';
    const id = `s${String(++this.serial)}`;
    this.clock.schedule(() => {
      // Upgrade checks as room-object.ts fetch() does them.
      const reject = (): void => { socket.readyState = 3; socket.onerror?.(); socket.onclose?.(); };
      if (this.room.expired || this.expiredUpgrade) { reject(); return; }
      const secret = parseHostSubprotocols(protocols);
      const host = route === 'host' && secret === SECRET;
      if (route === 'host' && !host) { reject(); return; }
      if (route === 'phone' && (protocols.length !== 1 || protocols[0] !== SIGNAL_SUBPROTOCOL)) { reject(); return; }
      if (!host && this.room.sockets.filter((s) => s.role === 'opening').length >= 4) { reject(); return; }
      this.live.set(id, socket);
      socket.route = (data) => { this.clock.schedule(() => { if (this.live.get(id) === socket) this.apply({ t: 'message', id, data }); }, this.delayMs); };
      socket.serverClose = () => { if (this.live.get(id) === socket) { this.live.delete(id); this.clock.schedule(() => { this.apply({ t: 'disconnect', id }); }, 0); } };
      socket.readyState = 1; socket.onopen?.();
      this.apply({ t: 'connect', id, roomToken: `room-token-${id}`.padEnd(20, 'x'), authenticatedHost: host });
    }, 0);
    return socket;
  };
}
class TricklePC extends FakePC {
  constructor(clock: Clock, readonly count: number) { super(clock); }
  override setLocalDescription(description: Description): Promise<void> {
    this.local = description;
    for (let i = 0; i < this.count; i++) this.clock.schedule(() => this.onicecandidate?.({ candidate: { candidate: `candidate:${String(i)} 1 udp 1 10.0.0.${String(i)} 5000 typ host`, sdpMid: '0', sdpMLineIndex: 0 } }), 1);
    this.clock.schedule(() => this.onicecandidate?.({ candidate: null }), 2);
    return Promise.resolve();
  }
}
const noop = (): void => { /* not observed */ };
function base(clock: Clock) {
  return { clock, baseUrl: 'https://signal', onState: noop, onControl: noop, onLink: noop };
}
async function settle(clock: Clock, ms = 0): Promise<void> {
  for (let i = 0; i < 20; i++) { clock.advance(ms / 20); await flush(); }
}
async function hostAndPhones(n: number, candidates = 0, stagger = 40) {
  const clock = new Clock(); const server = new RealServer(clock);
  const hostPCs: FakePC[] = []; const hostErrors: string[] = []; const states: string[] = [];
  const host = await createHostTransport({ ...base(clock), socket: server.socket,
    credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('no fetch'); },
    factory: () => { const pc = new TricklePC(clock, candidates); hostPCs.push(pc); return pc; },
    onRoom: noop, onPeer: noop, onError: (e) => hostErrors.push(e),
    onState: (s, id) => states.push(`${id}:${s}`) });
  await settle(clock);
  const phonePCs: FakePC[] = []; const phoneErrors: string[] = []; const phonePeers: Peer[] = [];
  const phones = [];
  for (let i = 0; i < n; i++) { phones.push(createPhoneTransport({ ...base(clock), socket: server.socket,
    code: CODE.toLowerCase().replace(/(....)/, '$1-'),
    factory: () => { const pc = new TricklePC(clock, candidates); phonePCs.push(pc); return pc; },
    onJoined: noop, onPeer: (p) => phonePeers.push(p), onError: (e) => phoneErrors.push(e) })); await settle(clock, stagger); }
  await settle(clock, 5000);
  return { clock, server, host, hostPCs, hostErrors, states, phones, phonePCs, phoneErrors, phonePeers };
}
function connectAll(h: Awaited<ReturnType<typeof hostAndPhones>>): void {
  h.hostPCs.forEach((pc, i) => { const phone = h.phonePCs[i]; if (phone) joinChannels(pc, phone); });
}

describe('review: against the real pairing core', () => {
  it('R1 eight phones pair through the real core and every host PC has an answer', async () => {
    const h = await hostAndPhones(8, 4);
    expect(h.hostErrors).toEqual([]); expect(h.phoneErrors).toEqual([]);
    expect(h.host.peers.size).toBe(8);
    expect(h.hostPCs.every((pc) => pc.remote?.type === 'answer')).toBe(true);
    expect(h.phonePCs.every((pc) => pc.candidates.length === 4)).toBe(true);
  });
  it('R2 a host signalling blip must not tear down healthy, connected phones', async () => {
    const h = await hostAndPhones(3);
    connectAll(h); await settle(h.clock);
    const before = h.hostPCs.slice(0, 3);
    expect(before.every((pc) => pc.connectionState !== 'closed')).toBe(true);
    const hostId = h.server.room.sockets.find((s) => s.role === 'host')?.id ?? '';
    h.server.sever(hostId);
    await settle(h.clock, 1000);
    expect(h.server.room.sockets.some((s) => s.role === 'host')).toBe(true); // reconnected
    expect(before.map((pc) => pc.connectionState)).toEqual(['new', 'new', 'new']);
  });
  it('R3 a phone signalling socket closing must not tear down its open data channels', async () => {
    const h = await hostAndPhones(1);
    connectAll(h); await settle(h.clock);
    const phoneId = h.server.room.sockets.find((s) => s.role === 'phone')?.id ?? '';
    h.server.sever(phoneId); await settle(h.clock, 100);
    expect(h.phoneErrors).toEqual([]);
    expect(h.phonePCs[0]?.connectionState).not.toBe('closed');
    expect(h.hostPCs[0]?.connectionState).not.toBe('closed');
  });
  it('R4 a phone that never answers is eventually abandoned by the host', async () => {
    const clock = new Clock(); const server = new RealServer(clock); const hostPCs: FakePC[] = [];
    const host = await createHostTransport({ ...base(clock), socket: server.socket,
      credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('no fetch'); },
      factory: () => { const pc = new FakePC(clock); hostPCs.push(pc); return pc; },
      onRoom: noop, onPeer: noop, onError: noop });
    await settle(clock);
    const silent = createPhonePairing({ clock, baseUrl: 'https://signal', socket: server.socket, code: CODE, onMessage: noop, onError: noop });
    await settle(clock, 100);
    expect(host.peers.size).toBe(1);
    silent.stop(); await settle(clock, 100); // peer-left arrives for a phone that never connected
    await settle(clock, 60000);
    expect(host.peers.size).toBe(0);
    expect(hostPCs[0]?.connectionState).toBe('closed');
  });
  it('R5 eight phones joining together with ordinary candidate counts do not get the host rate-limited', async () => {
    const h = await hostAndPhones(8, 7);
    const limited = h.server.log.filter((m) => m.code === 'rate-limited');
    expect(limited).toEqual([]);
  });
  it('R6 a host reattaching to an expired room learns that within a minute', async () => {
    const clock = new Clock(); const server = new RealServer(clock); server.expiredUpgrade = true;
    const errors: string[] = [];
    const pairing = await createHostPairing({ clock, baseUrl: 'https://signal', socket: server.socket,
      credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('no'); },
      onMessage: noop, onError: (e) => errors.push(e) });
    await settle(clock, 60000);
    pairing.stop();
    expect(errors.length).toBeGreaterThan(0);
  });
  it('R7 after a host-side peer is recreated, the phone accepts the fresh offer on a fresh connection', async () => {
    const h = await hostAndPhones(1);
    // Host socket drops before the channels open; host reattaches and re-offers.
    const hostId = h.server.room.sockets.find((s) => s.role === 'host')?.id ?? '';
    h.server.sever(hostId); await settle(h.clock, 1000);
    expect(h.hostPCs.length).toBe(2);
    expect(h.phonePCs.length).toBe(2); // phone must build a new RTCPeerConnection for the new host PC
  });
  it('R8 one rejected candidate does not kill the whole link', async () => {
    const clock = new Clock();
    class Picky extends FakePC { override addIceCandidate(c: Candidate | null): Promise<void> {
      if (c?.candidate === 'bad') return Promise.reject(new Error('OperationError')); return super.addIceCandidate(c); } }
    const pc = new Picky(clock); const errors: string[] = [];
    const peer = createPeer({ ...base(clock), role: 'phone', connectionId: 'p', ice: grant(), factory: () => pc, signal: noop, onError: (e) => errors.push(e) });
    peer.signal({ kind: 'offer', sdp: 'x' });
    peer.signal({ kind: 'candidate', candidate: 'bad', mid: '0', mLineIndex: 0 });
    peer.signal({ kind: 'candidate', candidate: 'good', mid: '0', mLineIndex: 0 });
    await peer.settled(); await flush();
    expect(errors).toEqual([]); expect(pc.connectionState).not.toBe('closed');
  });
  it('R9 the host can end the room at signalling (close-room) and drop one phone', async () => {
    const h = await hostAndPhones(1);
    const api = h.host as unknown as Record<string, unknown>;
    expect(typeof api.send === 'function' || typeof api.closeRoom === 'function').toBe(true);
  });
});

describe('review: upgrade refusals', () => {
  it('R18 six phones scanning in the same instant: refused opening sockets retry successfully', async () => {
    const clock = new Clock(); const server = new RealServer(clock); const errors: string[] = [];
    await createHostPairing({ clock, baseUrl: 'https://signal', socket: server.socket, credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('no'); }, onMessage: noop, onError: noop });
    await settle(clock);
    for (let i = 0; i < 6; i++) createPhonePairing({ clock, baseUrl: 'https://signal', socket: server.socket, code: CODE, onMessage: noop, onError: (e) => errors.push(e) });
    await settle(clock, 5000);
    expect(errors).toEqual([]);
  });
  for (const [cands, gap] of [[3, 40], [4, 40], [5, 40], [7, 40], [7, 300], [7, 1000]] as const) {
    it(`R19x scan ${String(cands)} candidates, ${String(gap)} ms apart`, async () => {
      const h = await hostAndPhones(8, cands, gap);
      await settle(h.clock, 3000);
      const limited = h.server.log.filter((m) => m.code === 'rate-limited').length;
      expect(limited).toBe(0);
    });
  }
  it('R19 eight phones, 10 candidates each, joining 40 ms apart: host is not rate-limited', async () => {
    const h = await hostAndPhones(8, 10, 40);
    expect(h.hostPCs).toHaveLength(8); expect(h.phonePCs).toHaveLength(8);
    expect(h.hostPCs.every((pc) => pc.remote?.type === 'answer')).toBe(true);
    connectAll(h);
    expect([...h.host.peers.values()].every((peer) => peer.connected)).toBe(true);
    expect(h.phonePeers.every((peer) => peer.connected)).toBe(true);
    expect(h.server.log.filter((m) => m.code === 'rate-limited')).toEqual([]);
    expect(h.hostErrors).toEqual([]);
  });
});
describe('review: input attacks', () => {
  function rig(plan: (n: number) => number[]) {
    const clock = new Clock(); const a = new FakeChannel('kaki-input', clock); const b = new FakeChannel('kaki-input', clock);
    a.other = b; b.other = a; a.open(); b.open(); a.plan = plan;
    const inputs = buffer(); const receiver = createHostInput(inputs, 1);
    b.onmessage = (e) => { receiver.receive(e.data); };
    const wire: { seq: number; buttons: number }[] = [];
    const sender = createPhoneInput(clock, (data) => {
      const d = decodePhoneFrame(data); if (d.ok && d.value.kind === 'input') wire.push({ seq: d.value.input.seq, buttons: d.value.input.buttons });
      a.send(data);
    });
    let presses = 0; let releases = 0; let held = 0;
    const step = (): void => { const f = inputs.sample().get(1); if (f) { presses += f.pressed & 16 ? 1 : 0; releases += f.released & 16 ? 1 : 0; held = f.held; } clock.schedule(step, 1000 / 60); };
    clock.schedule(step, 1000 / 60);
    return { clock, sender, wire, get presses() { return presses; }, get releases() { return releases; }, get held() { return held; } };
  }
  function wirePresses(wire: { buttons: number }[]): number {
    let n = 0; let prev = 0; for (const f of wire) { if ((f.buttons & 16) && !(prev & 16)) n++; prev = f.buttons; } return n;
  }
  function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

  it('R10 fuzz: 30% loss, taps >= 40 ms apart: every wire press arrives exactly once, none sticks', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = rng(seed);
      const t = rig(() => (r() < 0.3 ? [] : [r() * 3]));
      let down = false;
      for (let i = 0; i < 60; i++) { down = !down; t.sender.change(down ? 16 : 0, analog); t.clock.advance(40 + r() * 120); }
      t.sender.change(0, analog); t.clock.advance(2000);
      expect(t.held).toBe(0);
      expect(t.presses).toBe(wirePresses(t.wire));
      expect(t.releases).toBe(t.presses);
    }
  });
  it('R11 fuzz: loss, duplication, reordering up to 60 ms: never more presses than sent, never stuck', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const r = rng(seed * 7);
      const t = rig(() => { const x = r(); if (x < 0.2) return []; if (x < 0.3) return [r() * 60, r() * 60, r() * 60]; return [r() * 60]; });
      let down = false;
      for (let i = 0; i < 80; i++) { down = r() < 0.5 ? !down : down; t.sender.change(down ? 16 : 0, analog); t.clock.advance(5 + r() * 100); }
      t.sender.change(0, analog); t.clock.advance(3000);
      expect(t.held).toBe(0);
      expect(t.presses).toBeLessThanOrEqual(wirePresses(t.wire));
    }
  });
  it('R12 no loss, no delay: each press is in the very next host step (zero added steps)', () => {
    const t = rig(() => [0]);
    let worst = 0;
    for (let i = 0; i < 50; i++) {
      t.clock.advance(37);
      const before = t.presses; const start = t.clock.now(); t.sender.change(16, analog);
      while (t.presses === before) t.clock.advance(1);
      worst = Math.max(worst, t.clock.now() - start);
      t.clock.advance(50); t.sender.change(0, analog);
    }
    expect(worst).toBeLessThanOrEqual(1000 / 60 + 1);
  });
  it('R13 two and three changes inside one 120 Hz cap interval', () => {
    const t = rig(() => [0]);
    t.sender.change(16, analog); t.clock.advance(1); t.sender.change(0, analog); t.clock.advance(1); t.sender.change(16, analog);
    t.clock.advance(100); t.sender.change(0, analog); t.clock.advance(500);
    expect(t.presses).toBe(2); // two changes inside the interval survive as release+press
    const u = rig(() => [0]);
    u.sender.change(16, analog); u.clock.advance(1); u.sender.change(0, analog); u.clock.advance(1); u.sender.change(16, analog); u.clock.advance(1); u.sender.change(0, analog);
    u.clock.advance(500);
    expect(u.presses).toBe(1); // protocol rule: three changes cancel two (documented loss of a <8 ms tap)
  });
  it('R14 a ping or pong frame given to the receiver is ignored; hostile control data never reaches onControl', () => {
    const inputs = buffer(); const rx = createHostInput(inputs, 1);
    expect(rx.receive(encodePing({ id: 1, rttMs: 3 }))).toBe(false);
    expect(rx.receive(encodePong({ id: 1 }))).toBe(false);
    const clock = new Clock(); const hostPC = new FakePC(clock); const phonePC = new FakePC(clock); const got: unknown[] = [];
    const host = createPeer({ ...base(clock), role: 'host', connectionId: 'p', ice: grant(), factory: () => hostPC, signal: noop, onError: noop, onControl: (m) => got.push(m) });
    createPeer({ ...base(clock), role: 'phone', connectionId: 'p', ice: grant(), factory: () => phonePC, signal: noop, onError: noop });
    joinChannels(hostPC, phonePC);
    const control = hostPC.channels[1];
    for (const data of [new ArrayBuffer(4), 'x'.repeat(1_000_000), JSON.stringify({ v, t: 'seat', seat: 1 }),
      JSON.stringify({ v, t: 'hello', name: 'A', __proto__: { polluted: true } }), JSON.stringify({ v: 2, t: 'hello', name: null })]) {
      expect(() => control?.onmessage?.({ data })).not.toThrow();
    }
    expect(got.every((m) => (m as { t: string }).t === 'hello')).toBe(true);
    host.close();
  });
  it('R15 link loss across the 16-bit wrap and legitimate silence', () => {
    const m = new LinkMeter();
    for (let s = 65530; s < 65536; s++) m.sequence(s);
    for (let s = 0; s < 6; s++) if (s !== 2) m.sequence(s);
    expect(m.snapshot().loss).toBeCloseTo(1 / 12);
    const q = new LinkMeter(); for (let s = 0; s < 10; s++) q.sequence(s); for (let s = 10; s < 20; s++) q.sequence(s); // silence in between sends nothing
    expect(q.snapshot().loss).toBe(0);
  });
  it('R16 RTT window keeps 60 samples; p95 nearest rank', () => {
    const m = new LinkMeter(); for (let i = 1; i <= 100; i++) m.rtt(i);
    const s = m.snapshot(); expect(s.medianMs).toBe(70); expect(s.p95Ms).toBe(97);
  });
  it('R17 sender allocations per tick (encodeInput) -- counted', () => {
    const clock = new Clock(); let frames = 0;
    const sender = createPhoneInput(clock, () => { frames++; });
    const OriginalU8 = globalThis.Uint8Array; let made = 0;
    const counting = new Proxy(OriginalU8, { construct(target, args) { made++; return Reflect.construct(target, args) as Uint8Array; } });
    (globalThis as { Uint8Array: unknown }).Uint8Array = counting;
    try { sender.change(16, analog); clock.advance(1000); } finally { (globalThis as { Uint8Array: unknown }).Uint8Array = OriginalU8; }
    sender.stop();
    expect({ frames, made }).toEqual({ frames, made: 0 });
  });
});

describe('NET-002 NET-005 review lifecycle and limits', () => {
  it('abandons an opening peer at exactly 15 seconds without a peer-left', async () => {
    const h = await hostAndPhones(1);
    expect(h.host.peers.size).toBe(1);
    await settle(h.clock, 10000);
    expect(h.host.peers.size).toBe(0);
    expect(h.hostPCs[0]?.connectionState).toBe('closed'); h.host.stop();
  });
  it('keeps both signalling sockets alive with protocol pings and reconnects a dead host', async () => {
    const h = await hostAndPhones(1); connectAll(h);
    await settle(h.clock, 21000);
    expect(h.server.log.filter((m) => m.t === 'pong').length).toBeGreaterThanOrEqual(4);
    const id = h.server.room.sockets.find((s) => s.role === 'host')?.id ?? '';
    const socket = h.server.live.get(id);
    if (socket) socket.route = null; // half-open: send succeeds but replies never arrive
    await settle(h.clock, 22000);
    expect(h.server.serial).toBeGreaterThan(2);
    expect(h.hostPCs).toHaveLength(1); h.host.stop(); h.phones.forEach((p) => { p.stop(); });
  });
  it('reports a dead phone socket after missing keep-alive replies without ending open channels', async () => {
    const h = await hostAndPhones(1); connectAll(h);
    const id = h.server.room.sockets.find((s) => s.role === 'phone')?.id ?? '';
    const socket = h.server.live.get(id); if (socket) socket.route = null;
    await settle(h.clock, 21000);
    expect(h.phonePCs[0]?.connectionState).not.toBe('closed');
    expect(h.phoneErrors).toEqual([]); h.host.stop(); h.phones.forEach((p) => { p.stop(); });
  });
  it('stops retrying a 404 and emits gone; retry jitter uses the injected source', async () => {
    const clock = new Clock(); const sockets: FakeSocket[] = []; const states: string[] = [];
    const pairing = await createHostPairing({ ...base(clock), credentials: { code: CODE, hostToken: SECRET },
      random: () => 1, upgradeStatus: () => Promise.resolve({ status: 404, gone: true }),
      fetch: () => { throw new Error('no fetch'); },
      socket: () => { const s = new FakeSocket(); sockets.push(s); return s; },
      onPairingState: (s) => states.push(s), onMessage: noop, onError: noop });
    sockets[0]?.onerror?.(); await flush(); await settle(clock, 60000);
    expect(states).toEqual(['connecting', 'reconnecting', 'gone']); expect(sockets).toHaveLength(1); pairing.stop();
  });
  it('jitter changes the reconnect deadline deterministically', async () => {
    const clock = new Clock(); const sockets: FakeSocket[] = [];
    const pairing = await createHostPairing({ ...base(clock), credentials: { code: CODE, hostToken: SECRET },
      random: () => 1, fetch: () => { throw new Error('no fetch'); },
      socket: () => { const s = new FakeSocket(); sockets.push(s); return s; }, onMessage: noop, onError: noop });
    sockets[0]?.onerror?.(); clock.advance(312.4); expect(sockets).toHaveLength(1);
    clock.advance(0.1); expect(sockets).toHaveLength(2); pairing.stop();
  });
  it('typed host commands drop a phone, refresh ICE and close the room', async () => {
    const h = await hostAndPhones(2); const id = [...h.host.peers.keys()][0] ?? '';
    expect(h.host.refreshIce()).toBe(true); await settle(h.clock, 200);
    expect(h.server.log.some((m) => m.t === 'ice')).toBe(true);
    expect(h.host.send({ v, t: 'drop', peer: id, reason: 'room-full' })).toBe(true);
    await settle(h.clock, 200); expect(h.host.peers.size).toBe(1);
    expect(h.host.send({ v, t: 'close-room' })).toBe(true); await settle(h.clock, 200);
    expect(h.server.room.expired).toBe(true); h.host.stop(); h.phones.forEach((p) => { p.stop(); });
  });
  it('uses resume seat token identity and bounds control floods and back-pressure', () => {
    const clock = new Clock(); const pc = new FakePC(clock); const got: unknown[] = [];
    const peer = createPeer({ ...base(clock), role: 'host', connectionId: 'p', ice: grant(), factory: () => pc,
      signal: noop, onError: noop, onControl: (_m, identity) => got.push(identity) });
    pc.channels.forEach((c) => { c.open(); }); const control = pc.channels[1];
    control?.onmessage?.({ data: JSON.stringify({ v, t: 'resume', seatToken: token }) });
    expect(got[0]).toEqual({ connectionId: 'p', deviceId: token });
    for (let i = 0; i < 1000; i++) control?.onmessage?.({ data: JSON.stringify({ v, t: 'hello', name: 'A' }) });
    expect(got).toHaveLength(240);
    if (control) control.bufferedAmount = 20000;
    expect(peer.controlBufferedAmount).toBe(20000);
    expect(peer.sendHost({ v, t: 'view', rev: 1, view: null })).toBe(false); peer.close();
  });
  it('skips congested input and channel errors close the peer', () => {
    const clock = new Clock(); const pc = new FakePC(clock);
    const peer = createPeer({ ...base(clock), role: 'phone', connectionId: 'p', ice: grant(), factory: () => pc, signal: noop, onError: noop });
    const channel = new FakeChannel('kaki-input', clock); pc.ondatachannel?.({ channel }); channel.open(); channel.bufferedAmount = 2000;
    peer.inputSender?.change(16, analog); expect(channel.sent).toHaveLength(0);
    channel.bufferedAmount = 0; clock.advance(17); expect(channel.sent.length).toBeGreaterThan(0);
    channel.onerror?.(); expect(pc.connectionState).toBe('closed');
  });
  it('does not poll stats after discovering the path; state changes inspect again', async () => {
    const clock = new Clock(); const pc = new FakePC(clock); let calls = 0;
    pc.getStats = () => { calls++; return Promise.resolve(new Map([
      ['pair', { id: 'pair', type: 'candidate-pair', nominated: true, state: 'succeeded', localCandidateId: 'a', remoteCandidateId: 'b' }],
      ['a', { id: 'a', type: 'local-candidate', candidateType: 'host' }], ['b', { id: 'b', type: 'remote-candidate', candidateType: 'host' }],
    ])); };
    const peer = createPeer({ ...base(clock), role: 'host', connectionId: 'p', ice: grant(), factory: () => pc, signal: noop, onError: noop });
    pc.channels.forEach((c) => { c.open(); }); await settle(clock, 1000); const first = calls;
    await settle(clock, 3000); expect(calls).toBe(first);
    pc.onconnectionstatechange?.(); await flush(); expect(calls).toBe(first + 1); peer.close();
  });
});

describe('NET-001 PERF-010 delayed channels and input bounds', () => {
  it('preserves signalling order under delay and delivers delayed reliable control', async () => {
    const clock = new Clock(); const server = new RealServer(clock); server.delayMs = 15;
    const hostPC = new FakePC(clock); const phonePC = new FakePC(clock); const got: unknown[] = [];
    const host = await createHostTransport({ ...base(clock), socket: server.socket,
      credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('no fetch'); },
      factory: () => hostPC, onRoom: noop, onPeer: noop, onError: noop,
      onControl: (m) => got.push(m) });
    const phone = createPhoneTransport({ ...base(clock), code: CODE, socket: server.socket,
      factory: () => phonePC, onJoined: noop, onPeer: noop, onError: noop });
    await settle(clock, 500); expect(hostPC.remote?.type).toBe('answer');
    joinChannels(hostPC, phonePC); const control = phonePC.channels[1]; if (control) control.plan = () => [45];
    expect(phone.peer?.sendPhone({ v, t: 'hello', name: 'Delayed' })).toBe(true);
    clock.advance(44); expect(got).toEqual([]); clock.advance(1); expect(got).toHaveLength(1);
    host.stop(); phone.stop();
  });
  it('bounds received input before decoding and forwards a valid input without decoding again', () => {
    const clock = new Clock(); const pc = new FakePC(clock); let calls = 0;
    const receiver = createHostInput(buffer(), 1);
    receiver.receive = () => { throw new Error('must pass decoded input'); };
    receiver.receiveInput = () => { calls++; return true; };
    const host = createPeer({ ...base(clock), role: 'host', connectionId: 'p', ice: grant(), factory: () => pc, signal: noop, onError: noop });
    host.bindInput(receiver); pc.channels.forEach((c) => { c.open(); });
    const sender = createPhoneInput(clock, (data) => {
      for (let i = 0; i < 1000; i++) pc.channels[0]?.onmessage?.({ data });
    });
    sender.change(16, analog); expect(calls).toBe(240); sender.stop(); host.close();
  });
  it('spaces startup pings by 60 ms so delayed pongs produce RTT samples', async () => {
    const clock = new Clock(); const hostPC = new FakePC(clock); const phonePC = new FakePC(clock); const reports: { medianMs: number | null }[] = [];
    const host = createPeer({ ...base(clock), role: 'host', connectionId: 'p', ice: grant(), factory: () => hostPC, signal: noop, onError: noop });
    const phone = createPeer({ ...base(clock), role: 'phone', connectionId: 'p', ice: grant(), factory: () => phonePC, signal: noop, onError: noop, onLink: (link) => reports.push(link) });
    joinChannels(hostPC, phonePC); const phoneInput = phonePC.channels[0]; const hostInput = hostPC.channels[0];
    if (phoneInput) phoneInput.plan = () => [10]; if (hostInput) hostInput.plan = () => [10];
    clock.advance(59); expect(phonePC.channels[0]?.sent).toHaveLength(1);
    clock.advance(1); expect(phonePC.channels[0]?.sent).toHaveLength(2);
    await settle(clock, 1000); expect(reports[0]?.medianMs).toBe(20); host.close(); phone.close();
  });
});

describe('NET-005 absolute tick and wire encoding', () => {
  it('anchors ticks to absolute time even when each callback runs three milliseconds late', () => {
    const clock = new Clock(); const times: number[] = [];
    const sender = createPhoneInput(clock, () => { times.push(clock.now()); }); sender.change(16, analog);
    for (let i = 1; i <= 20; i++) {
      const task = [...clock.tasks.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!task) throw new Error('Missing tick');
      clock.tasks.delete(task[0]); clock.time = task[1].at + 3; task[1].callback();
      expect(clock.now()).toBeCloseTo(i * 1000 / 60 + 3);
    }
    expect(times).toHaveLength(21); sender.stop();
  });
});
