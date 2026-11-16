import { describe, expect, it } from 'vitest';
import { decodeHostSignal, decodeOpeningSignal, decodePhoneFrame, decodePhoneSignal,
  decodeToHostSignal, decodeToPhoneSignal, encodeInput, encodeSignal, parseHostSubprotocols,
  createInputSender, setButtons, nextInputSend,
  PROTOCOL_VERSION as v, RELEASED, SIGNAL_SUBPROTOCOL } from '@kaki/protocol';
import type { AnySignal, HostSignal, PhoneSignal, OpeningSignal } from '@kaki/protocol';
import { createInputBuffer } from '../../sim-core/src/input';
import { createHostInput, createPhoneInput, createHostPairing, createPhonePairing,
  createHostTransport, createPhoneTransport, createPeer, LinkMeter } from './index';
import type { Scheduler, Socket, Channel, PeerConnection, Candidate, Description,
  IceConfiguration, Peer, Stat } from './index';

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

/** Only pairing messages supported by the production core. Pin every route to role decoders. */
class PairingServer {
  sockets: FakeSocket[] = [];
  host: FakeSocket | null = null;
  phones = new Map<string, FakeSocket>();
  everHost = false;
  constructor(readonly clock: Clock) {}
  deliver(socket: FakeSocket, message: AnySignal, host: boolean): void {
    const data = encodeSignal(message);
    expect((host ? decodeToHostSignal(data) : decodeToPhoneSignal(data)).ok).toBe(true);
    socket.receive(data);
  }
  socket = (url: string, protocols: string[]): FakeSocket => {
    const socket = new FakeSocket(); this.sockets.push(socket);
    const host = url.endsWith('/host');
    if (host) expect(parseHostSubprotocols(protocols)).toBe(token);
    else expect(protocols).toEqual([SIGNAL_SUBPROTOCOL]);
    const id = `peer${String(this.sockets.length)}`;
    let joined = false;
    let deadline: unknown;
    const roomToken = id.padEnd(32, 'x');
    socket.serverClose = () => {
      this.clock.cancel(deadline); this.clock.cancel(openingTask);
      if (this.host === socket) {
        this.host = null;
        for (const phone of this.phones.values()) this.deliver(phone, { v, t: 'host', present: false }, false);
      }
      if (this.phones.delete(id) && this.host) this.deliver(this.host, { v, t: 'peer-left', peer: id }, true);
    };
    socket.route = (data) => {
      const decoded = host ? decodeHostSignal(data) : joined ? decodePhoneSignal(data) : decodeOpeningSignal(data);
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) return;
      const message: HostSignal | PhoneSignal | OpeningSignal = decoded.value;
      if (message.t === 'join') {
        this.clock.cancel(deadline);
        if (message.code !== 'ABCDEFGH' || this.phones.size >= 8) {
          this.deliver(socket, { v, t: 'error', code: message.code !== 'ABCDEFGH' ? 'room-not-found' : 'room-full', retryAfterS: null }, false);
          socket.close(); return;
        }
        joined = true; this.phones.set(id, socket);
        this.deliver(socket, { v, t: 'joined', peer: id, roomToken, hostPresent: this.host !== null, ice: grant() }, false);
        if (this.host) this.deliver(this.host, { v, t: 'peer-joined', peer: id }, true);
      } else if (message.t === 'to-phone') {
        const target = this.phones.get(message.peer);
        if (target) this.deliver(target, { v, t: 'from-host', step: message.step }, false);
      } else if (message.t === 'to-host' && this.host) {
        this.deliver(this.host, { v, t: 'from-phone', peer: id, step: message.step }, true);
      }
    };
    const openingTask = this.clock.schedule(() => {
      socket.open();
      if (host) {
        const previous = this.host; this.host = socket;
        if (previous) {
          this.deliver(previous, { v, t: 'error', code: 'not-allowed', retryAfterS: null }, true);
          previous.close();
        }
        this.deliver(socket, { v, t: 'created', code: 'ABCDEFGH', hostToken: token, reopened: this.everHost, ice: grant() }, true);
        this.everHost = true;
        for (const [peer, phone] of this.phones) {
          this.deliver(phone, { v, t: 'host', present: true }, false);
          this.deliver(socket, { v, t: 'peer-joined', peer }, true);
        }
      } else if (!joined && socket.readyState === 1) {
        deadline = this.clock.schedule(() => {
          this.deliver(socket, { v, t: 'error', code: 'opening-timeout', retryAfterS: null }, false);
          socket.close();
        }, 10000);
      }
    }, 0);
    return socket;
  };
}

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
    for (const delay of typeof data === 'string' ? [0] : this.plan(index)) {
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
function peerOptions(clock: Clock, pc: FakePC) {
  return { clock, factory: () => pc, ice: grant(), connectionId: 'peer1',
    signal: () => { /* intentionally ignored by this scenario */ }, onState: () => { /* observed in individual tests */ }, onControl: () => { /* intentionally ignored by this scenario */ }, onLink: () => { /* intentionally ignored by this scenario */ },
    onError: (error: string) => { throw new Error(error); } };
}

describe('pairing and WebRTC', () => {
  it('NET-002 creates by HTTP POST, authenticates both subprotocols, keeps host alive and reopens with backoff', async () => {
    const clock = new Clock(); const server = new PairingServer(clock);
    const reopened: boolean[] = []; const requests: string[] = [];
    const host = await createHostPairing({ clock, random: () => 0.5, baseUrl: 'https://signal', socket: server.socket,
      fetch: (url, init) => { requests.push(`${init.method} ${url}`); return Promise.resolve({ ok: true,
        json: () => Promise.resolve({ code: 'ABCDEFGH', hostToken: token }) }); },
      onMessage: (m) => { if (m.t === 'created') reopened.push(m.reopened); }, onError: () => { /* intentionally ignored by this scenario */ } });
    clock.advance(0);
    expect(requests).toEqual(['POST https://signal/rooms']);
    expect(server.host?.readyState).toBe(1);
    server.host?.close(); clock.advance(249); expect(server.sockets).toHaveLength(1);
    clock.advance(1); expect(reopened).toEqual([false, true]);
    host.stop(); expect(clock.tasks.size).toBe(0);
  });
  it.each(['not-allowed', 'bad-message', 'opening-timeout'] as const)(
    'NET-002 terminal %s ends host and phone attempts without a close event', async (code) => {
      for (const role of ['host', 'phone']) {
        const clock = new Clock(); const socket = new FakeSocket(); const errors: string[] = [];
        const options = { clock, socket: () => socket, baseUrl: 'https://signal', onError: (e: string) => errors.push(e), onMessage: () => { /* intentionally ignored by this scenario */ } };
        const pairing = role === 'host' ? await createHostPairing({ ...options, credentials: { code: 'ABCDEFGH', hostToken: token },
          fetch: () => { throw new Error('Must not fetch on reopen'); } }) : createPhonePairing({ ...options, code: 'abcd-efgh' });
        socket.open(); socket.receive(encodeSignal({ v, t: 'error', code, retryAfterS: null }));
        expect(errors).toEqual([code]); expect(socket.onclose).toBeNull();
        clock.advance(10000); expect(clock.tasks.size).toBe(0); pairing.stop();
      }
    });

  it('NET-002 transient peer errors do not terminate the host room; retry backoff is bounded and cancellable', async () => {
    const clock = new Clock(); const sockets: FakeSocket[] = []; const notices: string[] = [];
    const host = await createHostPairing({ clock, random: () => 0.5, baseUrl: 'https://signal',
      credentials: { code: 'ABCDEFGH', hostToken: token },
      fetch: () => { throw new Error('No POST for stored credentials'); },
      socket: () => { const socket = new FakeSocket(); sockets.push(socket); return socket; },
      onError: (code) => { throw new Error(code); }, onMessage: (m) => notices.push(m.t) });
    sockets[0]?.open(); sockets[0]?.receive(encodeSignal({ v, t: 'error', code: 'peer-not-found', retryAfterS: null }));
    expect(sockets[0]?.readyState).toBe(1); expect(notices).toEqual(['error']);
    const waits = [250, 500, 1000, 2000, 4000, 8000, 10000, 10000];
    for (const wait of waits) {
      sockets.at(-1)?.close();
      const length = sockets.length; clock.advance(wait - 1); expect(sockets).toHaveLength(length);
      clock.advance(1); expect(sockets).toHaveLength(length + 1);
    }
    sockets.at(-1)?.close(); host.stop(); expect(clock.tasks.size).toBe(0);
  });
  it('NET-002 a phone waiting without a host joins when the host reattaches', async () => {
    const clock = new Clock(); const server = new PairingServer(clock); const events: AnySignal[] = [];
    const phone = createPhonePairing({ clock, random: () => 0.5, baseUrl: 'https://signal', code: 'ABCDEFGH', socket: server.socket,
      onMessage: (m) => events.push(m), onError: () => { /* no failures expected */ } });
    clock.advance(0); expect(events[0]).toMatchObject({ t: 'joined', hostPresent: false });
    const host = await createHostPairing({ clock, random: () => 0.5, baseUrl: 'https://signal', socket: server.socket,
      credentials: { code: 'ABCDEFGH', hostToken: token }, fetch: () => { throw new Error('No fetch'); },
      onMessage: (m) => events.push(m), onError: () => { /* no failures expected */ } });
    clock.advance(0); expect(events).toContainEqual({ v, t: 'peer-joined', peer: 'peer1' });
    phone.stop(); host.stop(); expect(clock.tasks.size).toBe(0);
  });

  it('NET-002 full pairing uses host offers, phone answers, ICE configuration and trickled candidates', async () => {
    const clock = new Clock(); const server = new PairingServer(clock);
    const hostPC = new FakePC(clock); const phonePC = new FakePC(clock);
    const hostPeers: Peer[] = []; const phonePeers: Peer[] = [];
    const host = await createHostTransport({ ...peerOptions(clock, hostPC), socket: server.socket,
      baseUrl: 'https://signal', fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ code: 'ABCDEFGH', hostToken: token }) }),
      onRoom: () => { /* intentionally ignored by this scenario */ }, onPeer: (_id, peer) => hostPeers.push(peer) });
    clock.advance(0);
    const phone = createPhoneTransport({ ...peerOptions(clock, phonePC), socket: server.socket,
      baseUrl: 'https://signal', code: 'ABCDEFGH', onJoined: () => { /* intentionally ignored by this scenario */ }, onPeer: (peer) => phonePeers.push(peer) });
    clock.advance(0); await flush();
    expect(hostPC.local?.type).toBe('offer'); expect(phonePC.local?.type).toBe('answer');
    expect(hostPC.remote?.type).toBe('answer'); expect(phonePC.remote?.type).toBe('offer');
    expect(hostPC.channels.map((c) => c.label)).toEqual(['kaki-input', 'kaki-control']);
    expect(hostPC.options).toEqual([{ ordered: false, maxRetransmits: 0 }, { ordered: true }]);
    expect(phonePC.options).toEqual([]);
    hostPC.onicecandidate?.({ candidate: { candidate: 'ice', sdpMid: '0', sdpMLineIndex: 0 } });
    phonePC.onicecandidate?.({ candidate: null }); await flush();
    expect(phonePC.candidates[0]?.candidate).toBe('ice'); expect(hostPC.candidates).not.toContain(null);
    const inputs = buffer();
    hostPeers[0]?.bindInput(createHostInput(inputs, 1));
    joinChannels(hostPC, phonePC); clock.advance(0);
    phonePeers[0]?.inputSender?.change(16, analog); clock.advance(0);
    expect(inputs.sample().get(1)?.pressed).toBe(16);
    expect(hostPC.channels.every((c) => c.binaryType === 'arraybuffer')).toBe(true);
    // The real server reports peer-left when phone signalling closes; keep live channels.
    const hostSocket = server.host;
    if (hostSocket) server.deliver(hostSocket, { v, t: 'peer-left', peer: 'peer2' }, true);
    expect(hostPC.connectionState).toBe('new');
    expect(hostPeers).toHaveLength(1); expect(phonePeers).toHaveLength(1);
    phone.stop(); host.stop(); expect(clock.tasks.size).toBe(0);
  });

  it('NET-002 eight phones pair independently and a ninth receives the real room-full error', async () => {
    const clock = new Clock(); const server = new PairingServer(clock);
    const hostPCs: FakePC[] = [];
    const host = await createHostTransport({ ...peerOptions(clock, new FakePC(clock)), socket: server.socket,
      factory: () => { const pc = new FakePC(clock); hostPCs.push(pc); return pc; },
      baseUrl: 'https://signal', fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ code: 'ABCDEFGH', hostToken: token }) }),
      onRoom: () => { /* no UI */ }, onPeer: (id, peer) => { peer.bindIdentity(`device-${id}`); } });
    clock.advance(0);
    const phones = Array.from({ length: 8 }, () => createPhoneTransport({ ...peerOptions(clock, new FakePC(clock)),
      socket: server.socket, baseUrl: 'https://signal', code: 'ABCDEFGH',
      onJoined: () => { /* tokens are not persisted in this test */ }, onPeer: () => { /* no UI */ } }));
    clock.advance(0); await flush();
    expect(host.peers.size).toBe(8);
    expect(hostPCs.every((pc) => pc.remote?.type === 'answer')).toBe(true);
    const errors: string[] = [];
    const ninth = createPhoneTransport({ ...peerOptions(clock, new FakePC(clock)), socket: server.socket,
      baseUrl: 'https://signal', code: 'ABCDEFGH', onError: (error) => errors.push(error),
      onJoined: () => { throw new Error('Ninth phone cannot join'); }, onPeer: () => { throw new Error('Ninth phone cannot negotiate'); } });
    clock.advance(0); expect(errors).toEqual(['room-full']); expect(host.peers.size).toBe(8);
    ninth.stop(); for (const phone of phones) phone.stop(); host.stop();
    expect(clock.tasks.size).toBe(0);
  });

  it('NET-002 queues early candidates and omits null ICE credentials', async () => {
    const clock = new Clock(); const pc = new FakePC(clock); let config: IceConfiguration | null = null;
    const peer = createPeer({ ...peerOptions(clock, pc), role: 'phone',
      ice: { servers: [{ urls: ['stun:example'], username: null, credential: null }], ttlS: 0, relay: 'off' },
      factory: (configuration) => { config = configuration; return pc; } });
    peer.signal({ kind: 'candidate', candidate: 'early', mid: null, mLineIndex: null });
    peer.signal({ kind: 'offer', sdp: 'sdp' }); await peer.settled();
    expect(pc.candidates).toHaveLength(1);
    expect(config).toEqual({ iceServers: [{ urls: ['stun:example'] }] }); peer.close();
  });
});

describe('input end to end', () => {
  it('PERF-010 NET-001 immediate input reaches the authoritative buffer with zero added simulation steps', () => {
    const clock = new Clock(); const inputs = buffer(); const receiver = createHostInput(inputs, 1);
    const sender = createPhoneInput(clock, (data) => { receiver.receive(data); });
    sender.change(16, analog);
    expect(inputs.sample().get(1)?.pressed).toBe(16); expect(clock.now()).toBe(0);
    sender.stop(); expect(clock.tasks.size).toBe(0);
  });
  it.each(Array.from({ length: 9 }, (_, i) => i))('NET-005 tap survives with only carrying frame %i arriving and never repeats', (survivor) => {
    const clock = new Clock(); const inputs = buffer(); const receiver = createHostInput(inputs, 1);
    const frames: Uint8Array[] = []; const sender = createPhoneInput(clock, (bytes) => frames.push(bytes.slice()));
    sender.change(16, analog); sender.change(0, analog); clock.advance(1000);
    expect(frames).toHaveLength(10);
    const surviving = frames[survivor]; if (!surviving) throw new Error('Missing carrying frame');
    receiver.receive(surviving); receiver.receive(surviving);
    expect(inputs.sample().get(1)?.pressed).toBe(16);
    receiver.receive(frames[9]);
    expect(inputs.sample().get(1)?.pressed).toBe(0);
    for (let i = 0; i < 16; i++) inputs.sample();
    expect(inputs.sample().get(1)?.held).toBe(0); sender.stop();
  });
  it('NET-005 input survives scripted loss, duplication, reordering and delay on data channels', () => {
    const clock = new Clock(); const a = new FakeChannel('kaki-input', clock); const b = new FakeChannel('kaki-input', clock);
    a.other = b; b.other = a; a.open(); b.open();
    a.plan = (n) => n < 2 ? [] : n === 2 ? [30, 35] : [0];
    const inputs = buffer(); const receiver = createHostInput(inputs, 1);
    b.onmessage = (e) => { receiver.receive(e.data); };
    const sender = createPhoneInput(clock, (data) => { a.send(data); });
    sender.change(16, analog); sender.change(0, analog);
    let presses = 0;
    for (let i = 0; i < 40; i++) { clock.advance(10); if (inputs.sample().get(1)?.pressed) presses++; }
    expect(presses).toBe(1); expect(inputs.sample().get(1)?.held).toBe(0);
    sender.stop(); a.close(); b.close(); expect(clock.tasks.size).toBe(0);
  });
  it('NET-005 silence releases a held button after 15 steps without repeating its press', () => {
    const inputs = buffer(); const receiver = createHostInput(inputs, 1);
    const frame = encodeInput({ ...RELEASED, seq: 0, buttons: 16, history: [] });
    receiver.receive(frame); expect(inputs.sample().get(1)?.pressed).toBe(16);
    for (let i = 0; i < 14; i++) expect(inputs.sample().get(1)?.held).toBe(16);
    expect(inputs.sample().get(1)?.released).toBe(16);
    receiver.receive(encodeInput({ ...RELEASED, seq: 1, buttons: 16, history: [16] }));
    expect(inputs.sample().get(1)?.pressed).toBe(0);
  });
  it('NET-005 ticks at 60 Hz, cap defers rather than drops, nine released frames then silence, frame ≤25 bytes', () => {
    const clock = new Clock(); const times: number[] = []; const frames: Uint8Array[] = [];
    const sender = createPhoneInput(clock, (bytes) => { times.push(clock.now()); frames.push(bytes.slice()); });
    sender.change(16, analog); clock.advance(1); sender.change(0, analog);
    expect(times).toEqual([0]); clock.advance(1000 / 120 - 1);
    expect(times).toHaveLength(2); clock.advance(1000);
    expect(frames).toHaveLength(10); expect(clock.tasks.size).toBe(0);
    expect(frames.every((frame) => frame.byteLength <= 25)).toBe(true);
    expect(times.slice(2).every((time, i) => time - (times[i + 1] ?? 0) >= 1000 / 120 - 0.001 && time - (times[i + 1] ?? 0) <= 1000 / 60 + 0.001)).toBe(true);
    sender.stop();
  });
  it('NET-005 a sub-tick tap and a sub-tick release are each deferred into separate wire ticks', () => {
    const clock = new Clock(); const masks: number[] = [];
    const sender = createPhoneInput(clock, (data) => {
      const frame = decodePhoneFrame(data); if (frame.ok && frame.value.kind === 'input') masks.push(frame.value.input.buttons);
    });
    sender.change(0, { stickX: 1, stickY: 0, tilt: null });
    clock.advance(1); sender.change(16, analog); sender.change(0, analog); clock.advance(100);
    expect(masks.slice(0, 3)).toEqual([0, 16, 0]); sender.stop();
  });
  it('NET-005 new seat connection resets buffer and resume rejects in-flight paused history', () => {
    const inputs = buffer(); const receiver = createHostInput(inputs, 1);
    receiver.receive(encodeInput({ ...RELEASED, seq: 100, buttons: 16, history: [] })); inputs.sample();
    const replacement = createHostInput(inputs, 1);
    expect(inputs.sample().get(1)?.released).toBe(16);
    replacement.pause();
    replacement.receive(encodeInput({ ...RELEASED, seq: 0, buttons: 16, history: [] }));
    replacement.acknowledgeResume(5);
    replacement.receive(encodeInput({ ...RELEASED, seq: 4, buttons: 16, history: [] }));
    replacement.receive(encodeInput({ ...RELEASED, seq: 5, history: [16, 16, 16] }));
    expect(inputs.sample().get(1)?.pressed).toBe(0);
    replacement.receive(encodeInput({ ...RELEASED, seq: 6, buttons: 16, history: [] }));
    expect(inputs.sample().get(1)?.pressed).toBe(16);
  });

  it('NET-005 sender follows protocol button blips and analogue quantisation over touch bursts', () => {
    const clock = new Clock();
    let reference = createInputSender();
    let current: { stickX: number; stickY: number; tilt: { x: number; y: number } | null } = analog;
    let compared = 0;
    const sender = createPhoneInput(clock, (bytes) => {
      const expected = nextInputSend(reference, current);
      reference = expected.sender;
      expect(expected.frame).not.toBeNull();
      if (expected.frame) expect(bytes).toEqual(encodeInput(expected.frame));
      compared++;
    });
    for (let i = 0; i < 300; i++) {
      const buttons = (i * 37) & 255;
      current = { stickX: Math.sin(i), stickY: -0.5, tilt: i % 5 === 0 ? { x: 0.2, y: -1 } : null };
      reference = setButtons(reference, buttons);
      sender.change(buttons, current); clock.advance(i % 19);
    }
    expect(compared).toBeGreaterThan(100); sender.stop();
  });
  it('NET-005 held input ticks at 60 Hz, keeps tilt active and wraps its 16-bit sequence', () => {
    const clock = new Clock(); let count = 0; let sequence = -1;
    const sender = createPhoneInput(clock, (bytes) => {
      const decoded = decodePhoneFrame(bytes);
      if (decoded.ok && decoded.value.kind === 'input') {
        sequence = decoded.value.input.seq; count++;
      }
    });
    sender.change(0, { ...analog, tilt: { x: 0, y: 0 } }); clock.advance(1000);
    expect(count).toBe(61);
    clock.advance((65536 - 61) * (1000 / 60) + 0.001);
    expect(sequence).toBe(65535); expect(sender.nextSequence()).toBe(0);
    clock.advance(1000 / 60); expect(sequence).toBe(0);
    sender.stop(); expect(clock.tasks.size).toBe(0);
  });

  it('NET-005 hostile binary frames never throw or change the input buffer', () => {
    const inputs = buffer(); const receiver = createHostInput(inputs, 1);
    const before = structuredClone(inputs.sample().get(1));
    const hostile: unknown[] = [undefined, null, {}, 'text', new Uint8Array(), new Uint8Array(500),
      new Uint8Array([0xff]), 12, Symbol('bad')];
    const detached = new ArrayBuffer(8);
    structuredClone(detached, { transfer: [detached] });
    const revoked = Proxy.revocable({}, {}); revoked.revoke();
    hostile.push(detached, revoked.proxy);
    for (const value of hostile) expect(() => receiver.receive(value)).not.toThrow();
    for (let i = 0; i < 256; i++) expect(() => receiver.receive(new Uint8Array([i, 255, 255, 128, 128]))).not.toThrow();
    expect(inputs.sample().get(1)).toEqual(before);
  });
});

describe('control and link checks', () => {
  it('NET-001 only typed validated controls cross the reliable channel, revisions are per phone and identity is transport bound', () => {
    const clock = new Clock(); const hostPC = new FakePC(clock); const phonePC = new FakePC(clock);
    const received: unknown[] = [];
    const host = createPeer({ ...peerOptions(clock, hostPC), role: 'host', onControl: (m, id) => received.push([m, id]) });
    const phone = createPeer({ ...peerOptions(clock, phonePC), role: 'phone' });
    host.bindIdentity('device-1'); joinChannels(hostPC, phonePC);
    expect(host.sendHost({ v, t: 'layout', rev: 1, layout: {} })).toBe(true);
    expect(host.sendHost({ v, t: 'layout', rev: 1, layout: {} })).toBe(false);
    expect(host.sendHost({ v, t: 'view', rev: 1, view: null })).toBe(true);
    expect(host.sendHost({ v, t: 'view', rev: 1, view: null })).toBe(false);
    expect(host.sendHost({ v, t: 'view', rev: 2, view: null })).toBe(true);
    expect(phone.sendPhone({ v, t: 'hello', name: 'Player' })).toBe(true);
    const control = hostPC.channels[1];
    control?.onmessage?.({ data: '{bad' }); control?.onmessage?.({ data: JSON.stringify({ v, t: 'hello', name: null, seat: 8 }) });
    clock.advance(0);
    expect(received).toEqual([
      [{ v, t: 'hello', name: null }, { connectionId: 'peer1', deviceId: 'device-1' }],
      [{ v, t: 'hello', name: 'Player' }, { connectionId: 'peer1', deviceId: 'device-1' }],
    ]);
    host.close(); phone.close(); expect(clock.tasks.size).toBe(0);
  });
  it('NET-002 NET-005 12 binary pings on connect, one per second, pong RTT and no scheduled work after teardown', async () => {
    const clock = new Clock(); const hostPC = new FakePC(clock); const phonePC = new FakePC(clock);
    const reports: unknown[] = [];
    const host = createPeer({ ...peerOptions(clock, hostPC), role: 'host' });
    const phone = createPeer({ ...peerOptions(clock, phonePC), role: 'phone', onLink: (link) => reports.push(link) });
    joinChannels(hostPC, phonePC); clock.advance(660);
    expect(phonePC.channels[0]?.sent).toHaveLength(12);
    expect(hostPC.channels[0]?.sent).toHaveLength(12);
    clock.advance(340); await flush();
    expect(phonePC.channels[0]?.sent).toHaveLength(13);
    expect(reports).toEqual([expect.objectContaining({ medianMs: 0, p95Ms: 0 })]);
    phone.inputSender?.change(16, analog); phone.close(); host.close();
    expect(clock.tasks.size).toBe(0);
    clock.advance(10000); expect(clock.tasks.size).toBe(0);
  });

  it('NET-002 per-phone connection state events and failure teardown retain the connection id', () => {
    const clock = new Clock(); const pc = new FakePC(clock); const states: unknown[] = [];
    const peer = createPeer({ ...peerOptions(clock, pc), role: 'host',
      onState: (state, id) => states.push([state, id]) });
    pc.connectionState = 'connected'; pc.onconnectionstatechange?.();
    pc.connectionState = 'disconnected'; pc.onconnectionstatechange?.();
    pc.connectionState = 'failed'; pc.onconnectionstatechange?.();
    expect(states).toEqual(['connected', 'disconnected', 'failed', 'closed'].map((state) => [state, 'peer1']));
    expect(pc.onicecandidate).toBeNull(); peer.close(); expect(clock.tasks.size).toBe(0);
  });

  it('NET-005 link maths repairs reordered gaps, ignores duplicates and handles sequence wrap', () => {
    const meter = new LinkMeter(); meter.sequence(65534); meter.sequence(0);
    expect(meter.snapshot().loss).toBeCloseTo(1 / 3);
    meter.sequence(65535); meter.sequence(65535); expect(meter.snapshot().loss).toBe(0);
    for (let i = 1; i <= 20; i++) meter.rtt(i);
    expect(meter.snapshot()).toMatchObject({ medianMs: 10, p95Ms: 19 });
    for (let i = 1; i < 200; i++) meter.sequence(i);
    expect(meter.snapshot().loss).toBe(0);
  });
  it('NET-002 quality has hysteresis and selected candidate pair identifies relay or direct', async () => {
    const clock = new Clock(); const pc = new FakePC(clock); const meter = new LinkMeter();
    meter.rtt(101); expect(meter.snapshot().quality).toBe('weak');
    for (let i = 0; i < 60; i++) meter.rtt(20);
    expect(meter.snapshot().quality).toBe('weak'); expect(meter.snapshot().quality).toBe('weak');
    expect(meter.snapshot().quality).toBe('good');
    pc.stats = new Map([
      ['t', { id: 't', type: 'transport', selectedCandidatePairId: 'pair' }],
      ['pair', { id: 'pair', type: 'candidate-pair', localCandidateId: 'l', remoteCandidateId: 'r' }],
      ['l', { id: 'l', type: 'local-candidate', candidateType: 'host' }],
      ['r', { id: 'r', type: 'remote-candidate', candidateType: 'relay' }],
    ]);
    await meter.inspect(pc); expect(meter.snapshot().quality).toBe('relayed');
    pc.stats.set('r', { id: 'r', type: 'remote-candidate', candidateType: 'srflx' });
    await meter.inspect(pc); expect(meter.snapshot().path).toBe('direct');
  });
});
