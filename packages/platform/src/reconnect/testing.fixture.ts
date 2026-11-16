// Local fakes drive public netcode constructors and the signal room's production reducer.
// No test file is imported. All storage and network activity remains in memory.
import { parseHostSubprotocols, SIGNAL_SUBPROTOCOL } from '@kaki/protocol';
import { handle, newRoom } from '../../../../apps/signal/src/core/room';
import type { Event } from '../../../../apps/signal/src/core/room';
import type { Channel, PeerConnection, Socket, Description, Scheduler } from
  '../../../netcode/src/index';
import type { ReconnectStorage } from './storage';
export class MemoryStorage implements ReconnectStorage {
  data = new Map<string, string>();
  writes = 0;
  fail = false;
  getItem(key: string): string | null {
    if (this.fail) throw new Error('Denied');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.fail) throw new Error('Quota');
    this.writes++; this.data.set(key, value);
  }
  removeItem(key: string): void {
    if (this.fail) throw new Error('Denied');
    this.data.delete(key);
  }
}
export class Clock implements Scheduler {
  time = 1000;
  serial = 0;
  tasks = new Map<number, { at: number; callback(): void }>();
  now(): number { return this.time; }
  schedule(callback: () => void, delayMs: number): number {
    const id = ++this.serial; this.tasks.set(id, { at: this.time + delayMs, callback }); return id;
  }
  cancel(id: unknown): void { this.tasks.delete(id as number); }
  advance(ms: number): void {
    const end = this.time + ms;
    let count = 0;
    for (;;) {
      const next = [...this.tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end + 1e-8) break;
      if (++count > 100000) throw new Error('Timer loop');
      this.time = next[1].at; this.tasks.delete(next[0]); next[1].callback();
    }
    this.time = end;
  }
}
export const CODE = 'BCDF2345';
export const SECRET = 'a'.repeat(32);
export class SimSocket implements Socket {
  readyState = 0;
  onopen: Socket['onopen'] = null;
  onmessage: Socket['onmessage'] = null;
  onclose: Socket['onclose'] = null;
  onerror: Socket['onerror'] = null;
  constructor(readonly route: (data: string) => void, readonly end: () => void) {}
  send(data: string): void { this.route(data); }
  close(): void {
    if (this.readyState === 3) return;
    this.readyState = 3; this.end(); this.onclose?.();
  }
}
export class SignalRoom {
  room;
  serial = 0;
  urls: string[] = [];
  offlinePhones = false;
  live = new Map<string, SimSocket>();
  constructor(readonly clock: Clock) { this.room = newRoom(CODE, SECRET, clock.now()); }
  apply(event: Event): void {
    const out = handle(this.room, event, this.clock.now()); this.room = out.state;
    for (const send of out.sends) this.clock.schedule(() => {
      const socket = this.live.get(send.id);
      if (socket?.readyState === 1) socket.onmessage?.({ data: JSON.stringify(send.message) });
    }, 0);
    for (const id of out.closes) this.clock.schedule(() => this.live.get(id)?.close(), 0);
  }
  socket = (url: string, protocols: string[]): Socket => {
    this.urls.push(url);
    const id = `peer-${String(++this.serial)}`;
    const socket = new SimSocket(data => this.clock.schedule(() => {
      if (socket.readyState === 1) this.apply({ t: 'message', id, data });
    }, 0), () => { this.live.delete(id); this.apply({ t: 'disconnect', id }); });
    this.clock.schedule(() => {
      const host = url.endsWith('/host');
      if ((!host && this.offlinePhones) || this.room.expired || (host ? parseHostSubprotocols(protocols) !== SECRET :
        protocols.length !== 1 || protocols[0] !== SIGNAL_SUBPROTOCOL)) {
        socket.close(); return;
      }
      this.live.set(id, socket);
      this.apply({ t: 'connect', id, authenticatedHost: host,
        roomToken: `signal-${id}`.padEnd(32, 'x') });
      socket.readyState = 1; socket.onopen?.();
    }, 0);
    return socket;
  };
}
export class SimChannel implements Channel {
  binaryType = '';
  bufferedAmount = 0;
  readyState = 'connecting';
  onerror: Channel['onerror'] = null;
  onopen: Channel['onopen'] = null;
  onclose: Channel['onclose'] = null;
  onmessage: Channel['onmessage'] = null;
  other: SimChannel | undefined;
  constructor(readonly label: string, readonly clock: Clock) {}
  send(data: string | Uint8Array): void {
    const copy = typeof data === 'string' ? data : data.slice();
    this.clock.schedule(() => {
      if (this.other?.readyState === 'open') this.other.onmessage?.({ data: copy });
    }, 0);
  }
  open(): void { this.readyState = 'open'; this.onopen?.(); }
  close(): void {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed'; this.onclose?.();
    // Reliable messages already queued drain before the remote close notification.
    this.clock.schedule(() => this.other?.close(), 0);
  }
}
export class PeerHub {
  serial = 0;
  pcs = new Map<string, SimPC>();
  constructor(readonly clock: Clock) {}
  factory = (): SimPC => {
    const pc = new SimPC(String(++this.serial), this); this.pcs.set(pc.id, pc); return pc;
  };
}
export class SimPC implements PeerConnection {
  connectionState = 'new';
  onconnectionstatechange: PeerConnection['onconnectionstatechange'] = null;
  onicecandidate: PeerConnection['onicecandidate'] = null;
  ondatachannel: PeerConnection['ondatachannel'] = null;
  channels: SimChannel[] = [];
  constructor(readonly id: string, readonly hub: PeerHub) {}
  createDataChannel(label: string): Channel {
    const channel = new SimChannel(label, this.hub.clock); this.channels.push(channel); return channel;
  }
  createOffer(): Promise<Description> { return Promise.resolve({ type: 'offer', sdp: this.id }); }
  createAnswer(): Promise<Description> { return Promise.resolve({ type: 'answer', sdp: this.id }); }
  setLocalDescription(): Promise<void> { return Promise.resolve(); }
  setRemoteDescription(description: Description): Promise<void> {
    if (description.type === 'answer') {
      const phone = this.hub.pcs.get(description.sdp);
      if (!phone) throw new Error('Missing peer');
      this.hub.clock.schedule(() => {
        if (this.connectionState === 'closed' || phone.connectionState === 'closed') return;
        for (const channel of this.channels) {
          const other = new SimChannel(channel.label, this.hub.clock);
          phone.channels.push(other); channel.other = other; other.other = channel;
          phone.ondatachannel?.({ channel: other }); channel.open(); other.open();
        }
        this.connectionState = 'connected'; phone.connectionState = 'connected';
      }, 0);
    }
    return Promise.resolve();
  }
  addIceCandidate(): Promise<void> { return Promise.resolve(); }
  close(): void {
    this.connectionState = 'closed'; for (const c of this.channels) c.close();
  }
}
export async function settle(clock: Clock): Promise<void> {
  for (let i = 0; i < 80; i++) { clock.advance(0); await Promise.resolve(); }
}
