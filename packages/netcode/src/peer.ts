import { CHANNEL_BINARY_TYPE, CONTROL_CHANNEL_LABEL, CONTROL_CHANNEL_OPTIONS, decodeHostFrame,
  decodeHostMessage, decodePhoneFrame, decodePhoneMessage, encodeHostMessage, encodePhoneMessage,
  encodePing, encodePong, INPUT_CHANNEL_LABEL, INPUT_CHANNEL_OPTIONS, PROTOCOL_VERSION as v,
  validateHostMessage, validatePhoneMessage } from '@kaki/protocol';
import type { HostHandshakeStep, PhoneHandshakeStep, HostMessage, PhoneMessage, IceGrant } from '@kaki/protocol';
import { candidateFromStep, iceConfiguration } from './interfaces';
import type { Channel, PeerFactory, Scheduler } from './interfaces';
import { createPhoneInput } from './input-sender';
import type { PhoneInput } from './input-sender';
import type { HostInput } from './input-receiver';
import { LinkMeter } from './link';
import type { LinkSnapshot } from './link';

export interface Identity { connectionId: string; deviceId: string }
export interface PeerOptions {
  role: 'host' | 'phone';
  connectionId: string;
  ice: IceGrant;
  factory: PeerFactory;
  clock: Scheduler;
  signal(step: HostHandshakeStep | PhoneHandshakeStep): void;
  onState(state: string, connectionId: string): void;
  onControl(message: HostMessage | PhoneMessage, identity: Identity | null, connectionId: string): void;
  onLink(link: LinkSnapshot, connectionId: string): void;
  onError(error: string): void;
}
/** One host↔phone link. Negotiation is serialised, so trickled ICE cannot overtake SDP. */
export function createPeer(options: PeerOptions) {
  const pc = options.factory(iceConfiguration(options.ice));
  const meter = new LinkMeter();
  let identity: Identity | null = null;
  const timers = new Set<unknown>();
  function later(callback: () => void, delay: number): void {
    const timer = options.clock.schedule(() => { timers.delete(timer); if (!closed) callback(); }, delay);
    timers.add(timer);
  }
  let deadlineStarted = false;
  let offerSeen = false;
  function startDeadline(): void {
    if (deadlineStarted) return;
    deadlineStarted = true;
    later(() => { if (!connected()) { close(); if (options.role === 'phone') options.onError('negotiation-timeout'); } }, 15000);
  }
  if (options.role === 'host') startDeadline();
  function connected(): boolean { return input?.readyState === 'open' && control?.readyState === 'open'; }
  let input: Channel | null = null;
  let control: Channel | null = null;
  let receiver: HostInput | null = null;
  let sender: PhoneInput | null = null;
  let closed = false;
  let remote = false;
  let work = Promise.resolve();
  const candidates: (HostHandshakeStep | PhoneHandshakeStep)[] = [];
  const pendingPings = new Map<number, number>();
  let pingId = 0;
  let lastRtt: number | null = null;
  let linkTimer: unknown;
  let scheduled = false;
  let disconnectTimer: unknown;
  let layoutRev: number | null = null;
  let viewRev: number | null = null;

  function isClosed(): boolean { return closed; }
  function fail(): void {
    if (!closed) { close(); options.onError('negotiation-failed'); }
  }
  function enqueue(task: () => Promise<void>): void {
    work = work.then(async () => { if (!closed) await task(); }).catch(fail);
  }
  function emit(step: HostHandshakeStep | PhoneHandshakeStep): void {
    if (!closed) options.signal(step);
  }
  function sendInput(bytes: Uint8Array): boolean {
    if (closed || input?.readyState !== 'open' || input.bufferedAmount > 1024) return false;
    input.send(bytes); return true;
  }
  function ping(): void {
    if (closed || input?.readyState !== 'open') return;
    const id = pingId++ & 65535;
    pendingPings.set(id, options.clock.now());
    for (const [old, time] of pendingPings) if (options.clock.now() - time > 10000) pendingPings.delete(old);
    sendInput(encodePing({ id, rttMs: lastRtt }));
  }
  function report(): void {
    scheduled = false;
    if (closed) return;
    if (options.role === 'phone') ping();
    void (meter.pathKnown ? Promise.resolve() : meter.inspect(pc)).then(() => {
      if (!closed) options.onLink(meter.snapshot(), options.connectionId);
    });
    scheduled = true;
    linkTimer = options.clock.schedule(report, 1000);
  }
  function attach(channel: Channel): void {
    channel.binaryType = CHANNEL_BINARY_TYPE;
    const isInput = channel.label === INPUT_CHANNEL_LABEL;
    if (!isInput && channel.label !== CONTROL_CHANNEL_LABEL) { channel.close(); return; }
    if ((isInput && input !== null) || (!isInput && control !== null)) { channel.close(); return; }
    if (isInput) input = channel;
    else control = channel;
    let opened = false;
    channel.onopen = () => {
      if (closed || opened) return;
      opened = true;
      if (isInput) {
        if (options.role === 'phone') {
          sender = createPhoneInput(options.clock, sendInput);
          for (let i = 0; i < 12; i++) later(ping, i * 60);
        }
        scheduled = true;
        linkTimer = options.clock.schedule(report, 1000);
      }
      options.onState(isInput ? 'input-open' : 'control-open', options.connectionId);
    };
    channel.onclose = close;
    channel.onerror = close;
    let allowance = 240; let updated = options.clock.now();
    channel.onmessage = (event) => {
      if (closed) return;
      const now = options.clock.now();
      allowance = Math.min(240, allowance + (now - updated) * (isInput ? 180 : 60) / 1000); updated = now;
      if (allowance < 1) return; allowance--;
      if (!isInput) {
        const decoded = options.role === 'host' ? decodePhoneMessage(event.data) : decodeHostMessage(event.data);
        if (decoded.ok) {
          if (decoded.value.t === 'resume') identity = { connectionId: options.connectionId, deviceId: decoded.value.seatToken };
          options.onControl(decoded.value, identity, options.connectionId);
        }
        else if (decoded.error.code === 'bad-version') { close(); options.onError('bad-version'); }
        return;
      }
      if (options.role === 'host') {
        const decoded = decodePhoneFrame(event.data);
        if (!decoded.ok) {
          if (decoded.error.code === 'bad-version') { close(); options.onError('bad-version'); }
          return;
        }
        if (decoded.value.kind === 'input') {
          meter.sequence(decoded.value.input.seq);
          receiver?.receiveInput(decoded.value.input);
        } else {
          const { ping: request } = decoded.value;
          if (request.rttMs !== null) meter.rtt(request.rttMs);
          sendInput(encodePong({ id: request.id }));
        }
      } else {
        const decoded = decodeHostFrame(event.data);
        if (!decoded.ok) {
          if (decoded.error.code === 'bad-version') { close(); options.onError('bad-version'); }
          return;
        }
        const start = pendingPings.get(decoded.value.pong.id);
        if (start !== undefined) {
          lastRtt = options.clock.now() - start;
          pendingPings.delete(decoded.value.pong.id);
          meter.rtt(lastRtt);
        }
      }
    };
    if (channel.readyState === 'open') channel.onopen();
  }
  function close(): void {
    if (closed) return;
    closed = true;
    if (scheduled) options.clock.cancel(linkTimer);
    scheduled = false;
    for (const timer of timers) options.clock.cancel(timer); timers.clear();
    sender?.stop();
    pendingPings.clear(); candidates.length = 0;
    options.clock.cancel(disconnectTimer);
    pc.onicecandidate = null; pc.onconnectionstatechange = null; pc.ondatachannel = null;
    for (const channel of [input, control]) if (channel) {
      channel.onerror = null; channel.onopen = null; channel.onclose = null; channel.onmessage = null; channel.close();
    }
    pc.close(); options.onState('closed', options.connectionId);
  }
  pc.onicecandidate = (event) => {
    if (!event.candidate) emit({ kind: 'candidates-done' });
    else emit({ kind: 'candidate', candidate: event.candidate.candidate,
      mid: event.candidate.sdpMid, mLineIndex: event.candidate.sdpMLineIndex });
  };
  pc.onconnectionstatechange = () => {
    if (closed) return;
    void meter.inspect(pc);
    options.clock.cancel(disconnectTimer);
    if (pc.connectionState === 'disconnected') {
      disconnectTimer = options.clock.schedule(() => { if (!closed && pc.connectionState === 'disconnected') close(); }, 3000);
      return;
    }
    options.onState(pc.connectionState, options.connectionId);
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') close();
  };
  pc.ondatachannel = (event) => { attach(event.channel); };
  if (options.role === 'host') {
    attach(pc.createDataChannel(INPUT_CHANNEL_LABEL, INPUT_CHANNEL_OPTIONS));
    attach(pc.createDataChannel(CONTROL_CHANNEL_LABEL, CONTROL_CHANNEL_OPTIONS));
    enqueue(async () => {
      const offer = await pc.createOffer();
      if (closed) return;
      await pc.setLocalDescription(offer);
      emit({ kind: 'offer', sdp: offer.sdp });
    });
  }
  async function addCandidate(step: HostHandshakeStep | PhoneHandshakeStep): Promise<void> {
    if (closed) return;
    if (step.kind === 'candidate') {
      try { await pc.addIceCandidate(candidateFromStep(step)); } catch { /* A rejected candidate does not invalidate other paths. */ }
    }
  }
  return {
    close,
    get closed(): boolean { return closed; },
    get hasSeenOffer(): boolean { return offerSeen; },
    get connected(): boolean { return connected(); },
    get hasRemoteDescription(): boolean { return remote; },
    get controlBufferedAmount(): number { return control?.bufferedAmount ?? 0; },
    /** Trusted room/session adapter supplies device identity; never infer a seat from JSON. */
    bindIdentity(deviceId: string): void {
      if (!deviceId) throw new TypeError('Device identity must not be empty');
      identity = { connectionId: options.connectionId, deviceId };
    },
    bindInput(next: HostInput): void { receiver = next; },
    get inputSender(): PhoneInput | null { return sender; },
    signal(step: HostHandshakeStep | PhoneHandshakeStep): void {
      if (closed) return;
      if (step.kind === 'offer') { offerSeen = true; startDeadline(); }
      enqueue(async () => {
        if (step.kind === 'offer' || step.kind === 'answer') {
          if ((options.role === 'host') !== (step.kind === 'answer')) throw new Error('Wrong SDP role');
          await pc.setRemoteDescription({ type: step.kind, sdp: step.sdp });
          if (closed) return;
          remote = true;
          for (const candidate of candidates) await addCandidate(candidate);
          candidates.length = 0;
          if (options.role === 'phone') {
            const answer = await pc.createAnswer();
            if (isClosed()) return;
            await pc.setLocalDescription(answer);
            emit({ kind: 'answer', sdp: answer.sdp });
          }
        } else if (remote) await addCandidate(step);
        else if (candidates.length < 256) candidates.push(step);
        else throw new Error('Too many pending candidates');
      });
    },
    sendHost(message: HostMessage): boolean {
      if (options.role !== 'host' || closed || control?.readyState !== 'open' || control.bufferedAmount > 16384) return false;
      const checked = validateHostMessage(message);
      if (!checked.ok) return false;
      if (message.t === 'layout' && message.rev === layoutRev) return false;
      if (message.t === 'view' && message.rev === viewRev) return false;
      control.send(encodeHostMessage(checked.value));
      if (message.t === 'layout') layoutRev = message.rev;
      if (message.t === 'view') viewRev = message.rev;
      return true;
    },
    sendPhone(message: PhoneMessage): boolean {
      if (options.role !== 'phone' || closed || control?.readyState !== 'open' || control.bufferedAmount > 16384) return false;
      const checked = validatePhoneMessage(message);
      if (!checked.ok) return false;
      control.send(encodePhoneMessage(checked.value)); return true;
    },
    /** Useful for deterministic adapters/tests; catches negotiation failures internally. */
    settled(): Promise<void> { return work; },
  };
}
export type Peer = ReturnType<typeof createPeer>;
// Consumers construct protocol messages with the protocol version; no transport envelope.
export const NETCODE_PROTOCOL_VERSION = v;
