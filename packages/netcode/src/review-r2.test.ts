import { describe, expect, it } from 'vitest';
import { decodePhoneFrame,
  parseHostSubprotocols,
  PROTOCOL_VERSION as v, SIGNAL_SUBPROTOCOL } from '@kaki/protocol';
import type { IceGrant } from '@kaki/protocol';
import { createInputBuffer } from '../../sim-core/src/input';
import { handle, newRoom } from '../../../apps/signal/src/core/room';
import type { Event, RoomState } from '../../../apps/signal/src/core/room';
import { createHostInput, createPhoneInput, createHostPairing, createPhonePairing,
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

describe('round 2: must-fix variations', () => {
  it('V1 host blip while a phone is mid-negotiation ends with one matched, connectable pair', async () => {
    const h = await strict(1, 3, 0, 20);
    // advance until host has offered but phone has not answered
    for (let i = 0; i < 200 && !h.hostPCs[0]?.local; i++) { h.clock.advance(1); await flush(); }
    const hostId = h.server.room.sockets.find((s) => s.role === 'host')?.id ?? '';
    h.server.sever(hostId);
    await settle(h.clock, 5000);
    const hosts = live(h.hostPCs); const phones = live(h.phonePCs[0] ?? []);
    const failures = [...h.hostPCs, ...(h.phonePCs[0] ?? [])].flatMap((pc) => pc.failures);
    expect(failures).toEqual([]);
    expect(hosts).toHaveLength(1); expect(phones).toHaveLength(1);
    expect(matched(hosts[0], phones[0])).toBe(true);
  });
  it('V2 blip at 10 s into a hung negotiation: rebuilt peer survives past the old 15 s deadline', async () => {
    const h = await strict(1, 1, 0, 0);
    const first = h.phonePCs[0]?.[0];
    if (first) first.createAnswer = () => new Promise(() => { /* hung */ });
    await settle(h.clock, 10000);
    const hostId = h.server.room.sockets.find((s) => s.role === 'host')?.id ?? '';
    h.server.sever(hostId); await settle(h.clock, 2000);
    const hosts = live(h.hostPCs); const phones = live(h.phonePCs[0] ?? []);
    expect(hosts).toHaveLength(1); expect(phones).toHaveLength(1);
    const hp = hosts[0]; const pp = phones[0];
    if (hp && pp) joinChannels(hp, pp);
    await settle(h.clock, 10000);
    expect(hp?.connectionState).not.toBe('closed'); expect(h.host.peers.size).toBe(1);
    expect(matched(hp, pp)).toBe(true);
  });
  it('V3 phone socket closes before channels open: phone reports, host abandons', async () => {
    const h = await strict(1, 1, 0, 0);
    const before = h.hostPCs.length;
    const phoneId = h.server.room.sockets.find((s) => s.role === 'phone')?.id ?? '';
    h.server.sever(phoneId); await settle(h.clock, 200);
    expect(h.phoneErrors.length).toBe(1); expect(h.host.peers.size).toBe(0); expect(before).toBe(1);
  });
  it('V4 a second offer arriving while the first is still being applied', async () => {
    const clock = new Clock(); const pcs: StrictPC[] = []; const errors: string[] = []; let deliver: ((m: string) => void) | null = null;
    const phone = createPhoneTransport({ ...base(clock), code: CODE, socket: () => { const s = new FakeSocket(); deliver = (m) => { s.receive(m); }; clock.schedule(() => { s.open(); }, 0); return s; },
      factory: () => { const pc = new StrictPC(clock, 0); pcs.push(pc); return pc; }, onJoined: noop, onPeer: noop, onError: (e) => errors.push(e) });
    clock.advance(0);
    const d = deliver as unknown as (m: string) => void;
    d(JSON.stringify({ v, t: 'joined', peer: 'p1', roomToken: 'r'.repeat(20), hostPresent: true, ice: grant() }));
    d(JSON.stringify({ v, t: 'from-host', step: { kind: 'offer', sdp: 'offer-900' } }));
    d(JSON.stringify({ v, t: 'from-host', step: { kind: 'offer', sdp: 'offer-901' } }));
    await settle(clock, 200);
    const alive = live(pcs);
    expect(alive).toHaveLength(1); expect(alive[0]?.remote?.sdp).toBe('offer-901');
    expect(pcs.flatMap((pc) => pc.failures)).toEqual([]); expect(errors).toEqual([]); phone.stop();
  });
  it('V5 eight phones 20 ms apart with 12 candidates: no rate limit, every pair matched', async () => {
    const h = await strict(8, 12, 20, 5);
    await settle(h.clock, 10000);
    const limited = h.server.log.filter((m) => m.code === 'rate-limited').length;
    const hosts = live(h.hostPCs);
    const pairs = h.phonePCs.map((list) => live(list)[0]);
    const ok = pairs.filter((p) => hosts.some((hp) => matched(hp, p))).length;
    expect(limited).toBe(0); expect(ok).toBe(8);
  });
  it('V6 pacing keeps offer before candidates per peer; reports head-of-line delay of the last offer', async () => {
    const h = await strict(8, 12, 0, 5, true);
    for (let i = 0; i < 6000; i++) { h.clock.advance(1); await flush(); }
    const peers = [...new Set(h.sent.map((s) => s.peer))];
    let disorder = 0; const offerDelay: number[] = [];
    for (const p of peers) {
      const mine = h.sent.filter((s) => s.peer === p);
      const firstOffer = mine.findIndex((s) => s.kind === 'offer');
      if (firstOffer !== 0) disorder++;
      offerDelay.push(mine[0]?.at ?? 0);
    }
    expect(disorder).toBe(0);
    expect(peers).toHaveLength(8);
    expect(Math.max(...offerDelay) - Math.max(...h.joinedAt)).toBeLessThanOrEqual(300);
  });
  it('V7 queued sends for a peer that left are dropped', async () => {
    const h = await strict(8, 12, 0, 5, true);
    // let joins happen, then the last phone leaves immediately
    for (let i = 0; i < 60; i++) { h.clock.advance(1); await flush(); }
    const phoneIds = h.server.room.sockets.filter((s) => s.role === 'phone').map((s) => s.id);
    expect(phoneIds.length).toBeGreaterThan(0);
    for (let i = 0; i < 640; i++) { h.clock.advance(1); await flush(); }
    const ids = h.server.room.sockets.filter((s) => s.role === 'phone').map((s) => s.id);
    const counts = ids.map((id) => [id, h.sent.filter((s) => s.peer === id).length] as const).sort((x, y) => x[1] - y[1]);
    const victim = counts[0]?.[0] ?? '';
    const sentBefore = h.sent.filter((s) => s.peer === victim).length;
    h.server.sever(victim);
    for (let i = 0; i < 6000; i++) { h.clock.advance(1); await flush(); }
    const after = h.sent.filter((s) => s.peer === victim).length - sentBefore;
    const notFound = h.server.log.filter((m) => m.code === 'peer-not-found').length;
    expect(after).toBe(0); expect(notFound).toBe(0);
  });
  it('V8 phone joins while the host is away for 20 s, then the host arrives', async () => {
    const clock = new Clock(); const server = new RealServer(clock); const phonePCs: StrictPC[] = []; const errs: string[] = [];
    const phone = createPhoneTransport({ ...base(clock), socket: server.socket, code: CODE,
      factory: () => { const pc = new StrictPC(clock, 1); phonePCs.push(pc); return pc; }, onJoined: noop, onPeer: noop, onError: (e) => errs.push(e) });
    await settle(clock, 20000);
    const hostPCs: StrictPC[] = [];
    const host = await createHostTransport({ ...base(clock), socket: server.socket, credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('x'); },
      factory: () => { const pc = new StrictPC(clock, 1); hostPCs.push(pc); return pc; }, onRoom: noop, onPeer: noop, onError: noop });
    await settle(clock, 3000);
    expect(errs).toEqual([]);
    expect(hostPCs.some((hp) => phonePCs.some((pp) => matched(hp, pp)))).toBe(true);
    host.stop(); phone.stop();
  });
});

describe('round 2: V1b', () => {
  it('V1b host blip after the phone applied the offer, answer in flight', async () => {
    const h = await strict(1, 3, 0, 20);
    for (let i = 0; i < 400 && !h.phonePCs[0]?.[0]?.local; i++) { h.clock.advance(1); await flush(); }
    const hostId = h.server.room.sockets.find((s) => s.role === 'host')?.id ?? '';
    h.server.sever(hostId);
    for (let i = 0; i < 3000; i++) { h.clock.advance(1); await flush(); }
    const hosts = live(h.hostPCs); const phones = live(h.phonePCs[0] ?? []);
    const failures = [...h.hostPCs, ...(h.phonePCs[0] ?? [])].flatMap((pc) => pc.failures);
    expect(failures).toEqual([]);
    expect(hosts).toHaveLength(1); expect(phones).toHaveLength(1); expect(matched(hosts[0], phones[0])).toBe(true);
  });
});
describe('round 2: new code under new faults', () => {
  class LateClock extends Clock {
    late = 0;
    override schedule(callback: () => void, delayMs: number): number { return super.schedule(callback, delayMs >= 1000 ? delayMs + this.late : delayMs); }
  }
  for (const late of [5000, 60000]) {
    it(`V9 keep-alive with timers ${String(late)} ms late: no reconnect, no lost players`, async () => {
      const clock = new LateClock(); clock.late = late; const server = new RealServer(clock); const hostPCs: FakePC[] = []; const phonePCs: FakePC[] = [];
      const host = await createHostTransport({ ...base(clock), socket: server.socket, credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('x'); },
        factory: () => { const pc = new FakePC(clock); hostPCs.push(pc); return pc; }, onRoom: noop, onPeer: noop, onError: noop });
      await settle(clock);
      const phone = createPhoneTransport({ ...base(clock), socket: server.socket, code: CODE, factory: () => { const pc = new FakePC(clock); phonePCs.push(pc); return pc; }, onJoined: noop, onPeer: noop, onError: noop });
      await settle(clock, 100);
      const hp = hostPCs[0]; const pp = phonePCs[0]; if (hp && pp) joinChannels(hp, pp);
      const serial = server.serial;
      await settle(clock, 600000);
      expect(server.serial).toBe(serial); expect(hp?.connectionState).not.toBe('closed');
      host.stop(); phone.stop();
    });
  }
  it('V10 404 gone via transport is terminal: peers closed, no sockets, no tasks', async () => {
    const clock = new Clock(); const server = new RealServer(clock); const errs: string[] = []; const states: string[] = [];
    const host = await createHostTransport({ ...base(clock), socket: server.socket, credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('x'); },
      factory: () => new FakePC(clock), onRoom: noop, onPeer: noop, onError: (e) => errs.push(e), onPairingState: (s) => states.push(s),
      upgradeStatus: () => Promise.resolve(server.room.expired || server.expiredUpgrade ? 404 : 426) });
    await settle(clock);
    createPhonePairing({ clock, baseUrl: 'https://signal', socket: server.socket, code: CODE, onMessage: noop, onError: noop });
    await settle(clock, 100); expect(host.peers.size).toBe(1);
    server.expiredUpgrade = true;
    const hostId = server.room.sockets.find((s) => s.role === 'host')?.id ?? '';
    server.sever(hostId); await settle(clock, 60000);
    expect(errs).toContain('room-not-found'); expect(host.peers.size).toBe(0);
    const serial = server.serial; await settle(clock, 60000); expect(server.serial).toBe(serial);
  });
  it('V11 retry-on-429: a phone tries at most 5 sockets then reports once; the host keeps trying and says so once', async () => {
    const clock = new Clock(); let made = 0; const errs: string[] = [];
    const refuse = (): FakeSocket => { made++; const s = new FakeSocket(); clock.schedule(() => { s.readyState = 3; s.onerror?.(); s.onclose?.(); }, 0); return s; };
    createPhonePairing({ clock, random: () => 0.5, baseUrl: 'https://signal', socket: refuse, code: CODE, onMessage: noop, onError: (e) => errs.push(e) });
    await settle(clock, 60000);
    expect(made).toBe(5); expect(errs).toEqual(['socket-closed']);
    made = 0; const herrs: string[] = [];
    const host = await createHostPairing({ clock, random: () => 0.5, baseUrl: 'https://signal', socket: refuse, credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('x'); }, onMessage: noop, onError: (e) => herrs.push(e) });
    await settle(clock, 120000);
    expect(made).toBeGreaterThan(5); expect(herrs).toEqual(['socket-unavailable']); host.stop();
  });
  it.each([0, 1])('V12 ICE refresh before peer creation, ttl %i', async (ttlS) => {
    const clock = new Clock(); const server = new RealServer(clock); const configs: IceConfigurationLike[] = [];
    const socket: typeof server.socket = (url, protocols) => {
      const s = server.socket(url, protocols);
      const receive = s.receive.bind(s);
      s.receive = (data) => {
        const m = JSON.parse(data as string) as { t: string; ice?: IceGrant };
        if (m.t === 'created') m.ice = { ...grant(), ttlS };
        if (m.t === 'ice' && m.ice?.ttlS === 0) m.ice = { ...grant(), servers: [{ urls: ['stun:fresh.example'], username: null, credential: null }] };
        receive(JSON.stringify(m));
      };
      return s;
    };
    const host = await createHostTransport({ ...base(clock), socket, credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('x'); },
      factory: (c) => { configs.push(c); return new FakePC(clock); }, onRoom: noop, onPeer: noop, onError: noop });
    await settle(clock, 2000);
    expect(host.refreshIceIfExpired()).toBe(ttlS !== 0);
    // Let that explicit refresh complete, then expire a newly supplied one-second grant.
    await settle(clock, 100);
    if (ttlS) {
      const hostSocket = [...server.live.values()][0];
      hostSocket?.receive(JSON.stringify({ v, t: 'ice', ice: { ...grant(), ttlS: 1 } }));
      await settle(clock, 2000);
    }
    const before = server.log.filter((m) => m.t === 'ice').length;
    createPhonePairing({ ...base(clock), socket: server.socket, code: CODE, onMessage: noop, onError: noop });
    await settle(clock, 1000);
    expect(configs).toHaveLength(1);
    expect(configs[0]?.iceServers).toEqual(ttlS ? [{ urls: ['stun:fresh.example'] }] : []);
    expect(server.log.filter((m) => m.t === 'ice').length - before).toBe(ttlS ? 1 : 0);
    expect(host.iceExpiresAt).toBe(Infinity); host.stop();
  });
  it.each([0, 1])('V12 phone refreshes expired ICE before accepting its first offer, ttl %i', async (ttlS) => {
    const clock = new Clock(); const server = new RealServer(clock); const configs: IceConfigurationLike[] = [];
    const phone = createPhoneTransport({ ...base(clock), code: CODE,
      socket: (url, protocols) => {
        const socket = server.socket(url, protocols); const receive = socket.receive.bind(socket);
        socket.receive = (data) => {
          const m = JSON.parse(data as string) as { t: string; ice?: IceGrant };
          if (m.t === 'joined') m.ice = { ...grant(), ttlS };
          if (m.t === 'ice' && m.ice?.ttlS === 0) m.ice = { ...grant(), servers: [{ urls: ['stun:fresh.example'], username: null, credential: null }] };
          receive(JSON.stringify(m));
        };
        return socket;
      }, factory: (config) => { configs.push(config); return new FakePC(clock); }, onJoined: noop, onPeer: noop, onError: noop });
    await settle(clock, 20000);
    const host = await createHostTransport({ ...base(clock), socket: server.socket, credentials: { code: CODE, hostToken: SECRET }, fetch: () => { throw new Error('x'); }, factory: () => new FakePC(clock), onRoom: noop, onPeer: noop, onError: noop });
    await settle(clock, 1000);
    expect(configs.at(-1)?.iceServers).toEqual(ttlS ? [{ urls: ['stun:fresh.example'] }] : []);
    expect(server.log.filter((m) => m.t === 'ice')).toHaveLength(ttlS ? 1 : 0);
    expect(phone.peer?.hasRemoteDescription).toBe(true); host.stop(); phone.stop();
  });
  it('V13 flood limit keeps every frame of a real 120 Hz stick plus pings', () => {
    const clock = new Clock(); const hostPC = new FakePC(clock); const phonePC = new FakePC(clock); let got = 0; let sent = 0;
    const rx = createHostInput(buffer(), 1); const orig = rx.receiveInput.bind(rx); rx.receiveInput = (i) => { got++; return orig(i); };
    const host = createPeer({ ...base(clock), role: 'host', connectionId: 'p', ice: grant(), factory: () => hostPC, signal: noop, onError: noop });
    const phone = createPeer({ ...base(clock), role: 'phone', connectionId: 'p', ice: grant(), factory: () => phonePC, signal: noop, onError: noop });
    host.bindInput(rx); joinChannels(hostPC, phonePC);
    const ch = phonePC.channels[0]; if (ch) { const s = ch.send.bind(ch); ch.send = (d) => { if (typeof d !== 'string' && d[0] !== undefined && (d[0] & 15) < 2) sent++; s(d); }; }
    for (let t = 0; t < 10000; t += 1000 / 120) { clock.advance(1000 / 120); phone.inputSender?.change(16, { stickX: Math.sin(t), stickY: 0, tilt: null }); }
    clock.advance(100);
    expect(got).toBe(sent); host.close(); phone.close();
  });
  function rig(plan: (n: number) => number[], congest: () => boolean) {
    const clock = new Clock(); const a = new FakeChannel('kaki-input', clock); const b = new FakeChannel('kaki-input', clock);
    a.other = b; b.other = a; a.open(); b.open(); a.plan = plan;
    const inputs = buffer(); const receiver = createHostInput(inputs, 1);
    b.onmessage = (e) => { receiver.receive(e.data); };
    const pc = new FakePC(clock);
    const peer = createPeer({ ...base(clock), role: 'phone', connectionId: 'p', ice: grant(), factory: () => pc, signal: noop, onError: noop });

    // route the phone peer's input channel through a
    const ch = new FakeChannel('kaki-input', clock); pc.ondatachannel?.({ channel: ch });
    const ticks = new Map<number, number>();
    ch.send = (d) => { const x = decodePhoneFrame(d); if (x.ok && x.value.kind === 'input') { const inp = x.value.input; ticks.set(inp.seq, inp.buttons); inp.history.forEach((m, k) => { if (inp.seq - k - 1 >= 0) ticks.set(inp.seq - k - 1, m); }); a.send(d); } };
    Object.defineProperty(ch, 'bufferedAmount', { get: () => (congest() ? 5000 : 0) });
    ch.open();
    let presses = 0; let held = 0;
    const step = (): void => { const f = inputs.sample().get(1); if (f) { presses += f.pressed & 16 ? 1 : 0; held = f.held; } clock.schedule(step, 1000 / 60); };
    clock.schedule(step, 1000 / 60);
    const wireTicks = (): number[] => { const out: number[] = []; const max = Math.max(-1, ...ticks.keys()); for (let q = 0; q <= max; q++) out.push(ticks.get(q) ?? -1); return out; };
    return { clock, peer, wireTicks, get presses() { return presses; }, get held() { return held; } };
  }
  function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
  it('V14 NET-005 fuzz with back-pressure active: never stuck, never more presses than sent', () => {

    for (let seed = 1; seed <= 60; seed++) {
      const r = rng(seed * 13); let congested = false;
      const t = rig(() => { const x = r(); if (x < 0.2) return []; if (x < 0.3) return [r() * 60, r() * 60]; return [r() * 40]; }, () => congested);
      let down = false;
      for (let i = 0; i < 80; i++) {
        if (r() < 0.15) congested = !congested;
        down = r() < 0.5 ? !down : down; t.peer.inputSender?.change(down ? 16 : 0, analog); t.clock.advance(5 + r() * 100);
      }
      congested = r() < 0.5; t.peer.inputSender?.change(0, analog); t.clock.advance(150);

      congested = false; t.clock.advance(3000);
      expect(t.held).toBe(0);
      let wp = 0; let prev = 0; for (const b of t.wireTicks()) { if (b < 0) continue; if ((b & 16) && !(prev & 16)) wp++; prev = b; }
      expect(t.presses).toBeLessThanOrEqual(wp);
      t.peer.close();
    }
  });
  it('V14 back-pressure preserves nine released frames after the channel drains', () => {
    const clock = new Clock(); const pc = new FakePC(clock);
    const peer = createPeer({ ...base(clock), role: 'phone', connectionId: 'p', ice: grant(), factory: () => pc, signal: noop, onError: noop });
    const channel = new FakeChannel('kaki-input', clock); pc.ondatachannel?.({ channel }); channel.open();
    peer.inputSender?.change(16, analog); clock.advance(20);
    channel.bufferedAmount = 5000;
    peer.inputSender?.change(0, analog); clock.advance(1000);
    const before = channel.sent.length;
    channel.bufferedAmount = 0; clock.advance(1000);
    const releases = channel.sent.slice(before).map(decodePhoneFrame).filter((d) => d.ok && d.value.kind === 'input');
    expect(releases).toHaveLength(9);
    for (const d of releases) if (d.ok && d.value.kind === 'input') expect(d.value.input.buttons).toBe(0);
    peer.close();
  });
  it('V15 a 2 s timer stall gives one tick, not a burst', () => {
    const clock = new Clock(); const times: number[] = [];
    const sender = createPhoneInput(clock, () => { times.push(clock.now()); }); sender.change(16, analog);
    clock.advance(100);
    const task = [...clock.tasks.entries()][0]; if (!task) throw new Error('no task');
    clock.tasks.delete(task[0]); clock.time += 2000; const n = times.length; task[1].callback();
    clock.advance(20);
    expect(times.length - n).toBeLessThanOrEqual(2); sender.stop();
  });
  it('V16 single decode path equals byte path for random frames', () => {
    const r = rng(5); const a = buffer(); const b = buffer(); const ra = createHostInput(a, 1); const rb = createHostInput(b, 1);
    for (let i = 0; i < 2000; i++) {
      const seq = Math.floor(r() * 300); const hist = Array.from({ length: 8 }, () => (r() < 0.5 ? 16 : 0));
      const bytes = encodeInputLike(seq, r() < 0.5 ? 16 : 0, hist);
      ra.receive(bytes); const d = decodePhoneFrame(bytes); if (d.ok && d.value.kind === 'input') rb.receiveInput(d.value.input);
      if (i % 3 === 0) expect(JSON.stringify([...a.sample()])).toBe(JSON.stringify([...b.sample()]));
    }
  });
  it('V17 tap-survivor test aliasing: are captured frames distinct objects?', () => {
    const clock = new Clock(); const frames: Uint8Array[] = []; const sender = createPhoneInput(clock, (bytes) => frames.push(bytes.slice()));
    sender.change(16, analog); sender.change(0, analog); clock.advance(1000);
    expect(new Set(frames).size).toBe(frames.length); sender.stop();
  });
});
interface IceConfigurationLike { iceServers: unknown[] }
import { encodeInput as encodeInputReal } from '@kaki/protocol';
function encodeInputLike(seq: number, buttons: number, history: number[]): Uint8Array { return encodeInputReal({ seq, buttons, history, stickX: 0, stickY: 0, tilt: null }); }
