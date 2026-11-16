import { describe, expect, it } from 'vitest';
import { parseHostSubprotocols,
  PROTOCOL_VERSION as v, SIGNAL_SUBPROTOCOL } from '@kaki/protocol';
import type { IceGrant } from '@kaki/protocol';
import { createInputBuffer } from '../../sim-core/src/input';
import { handle, newRoom } from '../../../apps/signal/src/core/room';
import type { Event, RoomState } from '../../../apps/signal/src/core/room';
import { createHostInput, createHostPairing, createPhonePairing,
  createHostTransport, createPhoneTransport, createPeer } from './index';
import type { Scheduler, Socket, Channel, PeerConnection, Candidate, Description,
  Stat } from './index';
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
// ---------------- Round 2 variations ----------------
let pcSerial = 0;
class StrictPC extends TricklePC {
  id = ++pcSerial; state = 'stable'; failures: string[] = [];
  override createOffer(): Promise<Description> { return Promise.resolve({ type: 'offer', sdp: `offer-${String(this.id)}` }); }
  override createAnswer(): Promise<Description> {
    if (!this.remote) return Promise.reject(new Error('no remote'));
    return Promise.resolve({ type: 'answer', sdp: `answer-${String(this.id)}-to-${this.remote.sdp}` });
  }
  override setLocalDescription(d: Description): Promise<void> { this.state = d.type === 'offer' ? 'have-local-offer' : 'stable'; return super.setLocalDescription(d); }
  override setRemoteDescription(d: Description): Promise<void> {
    return new Promise((resolve, reject) => { this.clock.schedule(() => {
      if (d.type === 'answer') {
        if (this.state !== 'have-local-offer' || !d.sdp.endsWith(`to-${this.local?.sdp ?? ''}`)) { this.failures.push(`answer:${d.sdp}`); reject(new Error('InvalidState')); return; }
        this.state = 'stable';
      } else if (this.remote) { this.failures.push(`reoffer:${d.sdp}`); reject(new Error('fingerprint changed')); return; }
      this.remote = d; resolve();
    }, 3); });
  }
}
async function strict(n: number, candidates = 2, stagger = 40, delayMs = 0, hold = false) {
  const clock = new Clock(); const server = new RealServer(clock); server.delayMs = delayMs;
  const hostPCs: StrictPC[] = []; const hostErrors: string[] = []; const sent: { peer: string; kind: string; at: number }[] = [];
  const host = await createHostTransport({ ...base(clock), socket: server.socket,
    credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('no fetch'); },
    factory: () => { const pc = new StrictPC(clock, candidates); hostPCs.push(pc); return pc; },
    onRoom: noop, onPeer: noop, onError: (e) => hostErrors.push(e) });
  // observe to-phone traffic arriving at the server
  const origApply = server.apply.bind(server);
  server.apply = (event: Event) => {
    if (event.t === 'message' && typeof event.data === 'string') { const m = JSON.parse(event.data) as { t: string; peer?: string; step?: { kind: string } }; if (m.t === 'to-phone') sent.push({ peer: m.peer ?? '', kind: m.step?.kind ?? '', at: clock.now() }); }
    origApply(event);
  };
  await settle(clock);
  const phonePCs: StrictPC[][] = []; const phoneErrors: string[] = []; const joinedAt: number[] = [];
  const phones = [];
  for (let i = 0; i < n; i++) {
    const mine: StrictPC[] = []; phonePCs.push(mine);
    phones.push(createPhoneTransport({ ...base(clock), socket: server.socket, code: CODE,
      factory: () => { const pc = new StrictPC(clock, candidates); mine.push(pc); return pc; },
      onJoined: () => joinedAt.push(clock.now()), onPeer: noop, onError: (e) => phoneErrors.push(`${String(i)}:${e}`) }));
    if (!hold) await settle(clock, stagger);
  }
  return { clock, server, host, hostPCs, hostErrors, phones, phonePCs, phoneErrors, sent, joinedAt };
}
function matched(host: StrictPC | undefined, phone: StrictPC | undefined): boolean {
  return !!host && !!phone && phone.remote?.sdp === host.local?.sdp && host.remote?.sdp === `answer-${String(phone.id)}-to-${host.local?.sdp ?? ''}`;
}
function live<T extends { connectionState: string }>(list: T[]): T[] { return list.filter((pc) => pc.connectionState !== 'closed'); }

// ---------------- Round 3 ----------------
function phoneRig() {
  const clock = new Clock(); const pcs: StrictPC[] = []; const errors: string[] = []; const states: string[] = []; const sent: string[] = [];
  let sock: FakeSocket | null = null;
  const phone = createPhoneTransport({ ...base(clock), code: CODE, socket: () => { const s = new FakeSocket(); sock = s; s.route = (d) => { if (d.includes('"ping"')) { clock.schedule(() => { s.receive(JSON.stringify({ v, t: 'pong' })); }, 1); return; } sent.push(d); }; clock.schedule(() => { s.open(); }, 0); return s; },
    factory: () => { const pc = new StrictPC(clock, 0); pcs.push(pc); return pc; }, onJoined: noop, onPeer: noop,
    onError: (e) => errors.push(e), onState: (s) => states.push(s) });
  clock.advance(0);
  const d = (m: object): void => { (sock as unknown as FakeSocket).receive(JSON.stringify({ v, ...m })); };
  d({ t: 'joined', peer: 'p1', roomToken: 'r'.repeat(20), hostPresent: false, ice: grant() });
  return { clock, pcs, errors, states, sent, d, phone };
}
describe('round 3', () => {
  it('W1 phone joins 60 s before the host; first offer still answered', async () => {
    const r = phoneRig(); await settle(r.clock, 60000);
    r.d({ t: 'from-host', step: { kind: 'offer', sdp: 'offer-700' } }); await settle(r.clock, 100);
    const alive = live(r.pcs);
    expect(alive).toHaveLength(1); expect(alive[0]?.remote?.sdp).toBe('offer-700'); expect(alive[0]?.local?.type).toBe('answer');
    expect(r.sent.some((s) => s.includes('"answer"'))).toBe(true);
  });
  it('W2 phone deadline fires mid-answer: what does the app learn, and does a later offer recover?', async () => {
    const r = phoneRig();
    r.d({ t: 'from-host', step: { kind: 'offer', sdp: 'offer-701' } }); await settle(r.clock, 100);
    await settle(r.clock, 16000); // never connected -> deadline
    expect(r.errors).toContain('negotiation-timeout');
    expect(r.states).toContain('closed');
    r.d({ t: 'from-host', step: { kind: 'offer', sdp: 'offer-702' } }); await settle(r.clock, 100);
    const alive = live(r.pcs); expect(alive).toHaveLength(1); expect(alive[0]?.remote?.sdp).toBe('offer-702');
  });
  it('W3 three offers in a row: one live PC with the last offer, no failures', async () => {
    const r = phoneRig();
    for (const n of [710, 711, 712]) r.d({ t: 'from-host', step: { kind: 'offer', sdp: `offer-${String(n)}` } });
    await settle(r.clock, 200);
    const alive = live(r.pcs); expect(alive).toHaveLength(1); expect(alive[0]?.remote?.sdp).toBe('offer-712');
    expect(r.pcs.flatMap((p) => p.failures)).toEqual([]); expect(r.errors).toEqual([]);

  });
  it('W4 offer after the phone peer reported negotiation-failed is accepted', async () => {
    const r = phoneRig();
    const first = r.pcs[0]; if (first) first.setRemoteDescription = () => Promise.reject(new Error('boom'));
    r.d({ t: 'from-host', step: { kind: 'offer', sdp: 'offer-719' } }); await settle(r.clock, 50);
    r.d({ t: 'from-host', step: { kind: 'offer', sdp: 'offer-720' } }); await settle(r.clock, 100);
    const alive = live(r.pcs); expect(alive).toHaveLength(1); expect(alive[0]?.remote?.sdp).toBe('offer-720');
  });
  it('W5 candidate never overtakes its own offer; stream of new offers cannot starve candidates forever', async () => {
    const clock = new Clock(); const out: { peer: string; kind: string }[] = [];
    const sock = new FakeSocket(); sock.route = (d) => { const m = JSON.parse(d) as { t: string; peer?: string; step?: { kind: string } }; if (m.t === 'to-phone') out.push({ peer: m.peer ?? '', kind: m.step?.kind ?? '' }); };
    const p = await createHostPairing({ clock, baseUrl: 'https://signal', socket: () => { clock.schedule(() => { sock.open(); }, 0); return sock; }, credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('x'); }, onMessage: noop, onError: noop });
    clock.advance(0);
    const send = (peer: string, step: object): void => { p.send({ v, t: 'to-phone', peer, step } as never); };
    // exhaust tokens, then peer A: candidates queued before its offer? (offer first as peer emits) plus late offer reorder probe
    for (let i = 0; i < 40; i++) send('Z', { kind: 'candidate', candidate: `z${String(i)}`, mid: '0', mLineIndex: 0 });
    send('A', { kind: 'offer', sdp: 'offer-A' }); for (let i = 0; i < 5; i++) send('A', { kind: 'candidate', candidate: `a${String(i)}`, mid: '0', mLineIndex: 0 });
    send('B', { kind: 'candidate', candidate: 'b0', mid: '0', mLineIndex: 0 });
    // stream of new peers' offers every 30 ms for 5 s
    for (let i = 0; i < 160; i++) { clock.advance(30); send(`N${String(i)}`, { kind: 'offer', sdp: `offer-${String(i)}` }); }
    clock.advance(20000);
    const firstA = out.findIndex((o) => o.peer === 'A');
    expect(out[firstA]?.kind).toBe('offer');
    const bAt = out.findIndex((o) => o.peer === 'B');
    expect(bAt).toBeGreaterThanOrEqual(0); p.stop();
  });
  it('W6 phone side: its answer is never overtaken by its own candidates', async () => {
    const r = phoneRig(); const pcs = r.pcs;
    r.d({ t: 'from-host', step: { kind: 'offer', sdp: 'offer-730' } });
    await settle(r.clock, 5);
    pcs.at(-1)?.onicecandidate?.({ candidate: { candidate: 'c', sdpMid: '0', sdpMLineIndex: 0 } });
    await settle(r.clock, 100);
    const steps = r.sent.map((s) => (JSON.parse(s) as { step?: { kind: string } }).step?.kind).filter(Boolean);
    expect(steps[0]).toBe('answer');
  });
  it('W7 discarding a departed peer does not discard the live replacement with the same id', async () => {
    const h = await strict(1, 12, 0, 5);
    // host blip: old not-connected peer closed (discardPeer), new peer with same id created
    const hostId = h.server.room.sockets.find((s) => s.role === 'host')?.id ?? '';
    h.server.sever(hostId); await settle(h.clock, 3000);
    const hosts = live(h.hostPCs); const phones = live(h.phonePCs[0] ?? []);
    expect(hosts).toHaveLength(1); expect(matched(hosts[0], phones[0])).toBe(true);
    expect(phones[0]?.candidates.length).toBe(12);
  });
  it('W8 buffer never drains: no frames sent, sender polls; host releases by silence; no late tap when it drains much later', () => {
    const clock = new Clock(); const pc = new FakePC(clock); const inputs = buffer(); const rx = createHostInput(inputs, 1);
    const peer = createPeer({ ...base(clock), role: 'phone', connectionId: 'p', ice: grant(), factory: () => pc, signal: noop, onError: noop });
    const ch = new FakeChannel('kaki-input', clock); pc.ondatachannel?.({ channel: ch }); ch.open();
    const hostSide = new FakeChannel('kaki-input', clock); ch.other = hostSide; hostSide.other = ch; hostSide.open(); hostSide.onmessage = (e) => { rx.receive(e.data); };
    let presses = 0; const step = (): void => { const f = inputs.sample().get(1); if (f) presses += f.pressed & 16 ? 1 : 0; clock.schedule(step, 1000 / 60); }; clock.schedule(step, 1000 / 60);
    peer.inputSender?.change(16, analog); clock.advance(30);
    ch.bufferedAmount = 5000;
    peer.inputSender?.change(0, analog); peer.inputSender?.change(16, analog); peer.inputSender?.change(0, analog); // tap during congestion
    const sentBefore = ch.sent.length; clock.advance(60000);
    expect(ch.sent.length).toBe(sentBefore);

    ch.bufferedAmount = 0; clock.advance(2000);
    expect(presses).toBe(1);
    peer.close();
  });
  it('W9 host ICE refresh that never answers does not block forever', async () => {
    const clock = new Clock(); const server = new RealServer(clock); const configs: unknown[] = []; const hostPCs: FakePC[] = []; const phonePCs: FakePC[] = [];
    const socket: typeof server.socket = (url, protocols) => {
      const s = server.socket(url, protocols); const receive = s.receive.bind(s);
      s.receive = (data) => { const m = JSON.parse(data as string) as { t: string; ice?: IceGrant }; if (m.t === 'ice') return; if (m.t === 'created') m.ice = { ...grant(), ttlS: 1 }; receive(JSON.stringify(m)); };
      return s;
    };
    const host = await createHostTransport({ ...base(clock), socket, credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('x'); },
      factory: (c) => { configs.push(c); const pc = new FakePC(clock); hostPCs.push(pc); return pc; }, onRoom: noop, onPeer: noop, onError: noop });
    await settle(clock, 3000);
    const phone = createPhoneTransport({ ...base(clock), socket: server.socket, code: CODE, onJoined: noop, onPeer: noop, onError: noop,
      factory: () => { const pc = new FakePC(clock); phonePCs.push(pc); return pc; } });
    await settle(clock, 3000); await settle(clock, 100);
    expect(configs).toHaveLength(1);
    const hp = hostPCs[0]; const pp = phonePCs.at(-1);
    expect(hp?.remote?.type).toBe('answer');
    if (hp && pp) joinChannels(hp, pp);
    expect(phone.peer?.connected).toBe(true);
    expect([...host.peers.values()][0]?.connected).toBe(true);
    phone.stop(); host.stop();
  });
  it.each(['timeout', 'error'])('phone refresh falls back on %s', async (mode) => {
    const r = phoneRig();
    r.d({ t: 'ice', ice: { ...grant(), ttlS: 1 } });
    await settle(r.clock, 1100);
    r.d({ t: 'from-host', step: { kind: 'offer', sdp: 'offer-740' } });
    await settle(r.clock, 50);
    if (mode === 'error') r.d({ t: 'error', code: 'server-error' });
    await settle(r.clock, mode === 'timeout' ? 3000 : 100);
    await settle(r.clock, 100);
    expect(live(r.pcs).at(-1)?.local?.type).toBe('answer');
    r.phone.stop();
  });
  it('host refresh error releases a waiting phone immediately', async () => {
    const clock = new Clock(); const server = new RealServer(clock); const pcs: FakePC[] = [];
    const socket: typeof server.socket = (url, protocols) => {
      const s = server.socket(url, protocols); const receive = s.receive.bind(s);
      s.receive = (data) => {
        const m = JSON.parse(data as string) as { t: string; ice?: IceGrant };
        if (m.t === 'ice') { receive(JSON.stringify({ v, t: 'error', code: 'server-error' })); return; }
        if (m.t === 'created') m.ice = { ...grant(), ttlS: 1 };
        receive(JSON.stringify(m));
      }; return s;
    };
    const host = await createHostTransport({ ...base(clock), socket,
      credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('x'); },
      factory: () => { const pc = new FakePC(clock); pcs.push(pc); return pc; },
      onRoom: noop, onPeer: noop, onError: noop });
    await settle(clock, 1100);
    const phone = createPhonePairing({ ...base(clock), socket: server.socket, code: CODE, onMessage: noop, onError: noop });
    await settle(clock, 100);
    expect(pcs).toHaveLength(1); phone.stop(); host.stop();
  });
  it('discarding phone signalling preserves a queued keep-alive and relay request', () => {
    const clock = new Clock(); const socket = new FakeSocket();
    const pairing = createPhonePairing({ ...base(clock), socket: () => socket, code: CODE, onMessage: noop, onError: noop });
    socket.open();
    clock.schedule(() => {
      for (let i = 0; i < 40; i++) pairing.send({ v, t: 'to-host', step: { kind: 'candidate', candidate: 'c', mid: '0', mLineIndex: 0 } });
      pairing.send({ v, t: 'to-host', step: { kind: 'answer', sdp: 'obsolete' } });
      pairing.send({ v, t: 'relay' });
    }, 9999);
    clock.advance(10000); pairing.discardPeer(''); clock.advance(200);
    expect(socket.sent.some((data) => data.includes('"ping"'))).toBe(true);
    expect(socket.sent.some((data) => data.includes('"relay"'))).toBe(true);
    expect(socket.sent.some((data) => data.includes('obsolete'))).toBe(false);
    pairing.stop();
  });
  it('W10 host ICE refresh lost to a socket drop recovers after reconnect', async () => {
    const clock = new Clock(); const server = new RealServer(clock); const configs: unknown[] = [];
    let dropNextIce = true;
    const socket: typeof server.socket = (url, protocols) => {
      const s = server.socket(url, protocols); const receive = s.receive.bind(s);
      s.receive = (data) => { const m = JSON.parse(data as string) as { t: string; ice?: IceGrant }; if (m.t === 'ice' && dropNextIce) { dropNextIce = false; return; } if (m.t === 'created' || m.t === 'ice') m.ice = { ...grant(), ttlS: 1 }; receive(JSON.stringify(m)); };
      return s;
    };
    const host = await createHostTransport({ ...base(clock), socket, credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('x'); },
      factory: (c) => { configs.push(c); return new FakePC(clock); }, onRoom: noop, onPeer: noop, onError: noop });
    await settle(clock, 3000);
    createPhonePairing({ ...base(clock), socket: server.socket, code: CODE, onMessage: noop, onError: noop });
    await settle(clock, 3000);
    const hostId = server.room.sockets.find((s) => s.role === 'host')?.id ?? ''; server.sever(hostId);
    await settle(clock, 5000);
    expect(configs.length).toBeGreaterThan(0); host.stop();
  });
});
