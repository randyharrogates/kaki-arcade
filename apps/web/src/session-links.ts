import { validatePhoneMessage } from '@kaki/protocol';
import { createHostInput } from '@kaki/netcode';
import type { HostInput } from '@kaki/netcode';
import type { PhoneMessage, HostMessage } from '@kaki/protocol';
import type { RoomState, SessionTransport, SessionTransportEvent } from '@kaki/platform';
import type { InputBuffer } from '@kaki/sim-core';
import { wireJson } from './session-adapter';

export interface SessionPeer { sendHost(message: HostMessage): boolean; bindInput(input: HostInput): void; bindControl?(send: (message: PhoneMessage) => void): void }
/** Only the current room-authenticated connection is allowed to feed its seat's buffer. */
export function sessionLinks() {
  const peers = new Map<string, SessionPeer>();
  const inputs = new Map<string, HostInput>();
  const layouts = new Map<string, { wire: number; session: number }>();
  const views = new Map<string, number>();
  let room: RoomState | undefined;
  let buffer: InputBuffer<string> | undefined;
  let receive: ((event: SessionTransportEvent) => void) | undefined;
  function bind(): void {
    if (!buffer || !room) return;
    for (const [id, input] of inputs) if (!room.players.some(p => p.connectionId === id && p.disconnectedAt === null)) { input.pause(); inputs.delete(id); }
    for (const p of room.players) {
      const peer = peers.get(p.connectionId);
      if (!peer || inputs.has(p.connectionId) || p.disconnectedAt !== null) continue;
      const input = createHostInput(buffer, `seat-${String(p.seat)}`);
      inputs.set(p.connectionId, input); peer.bindInput(input);
    }
  }
  const transport: SessionTransport = {
    sendLayout(id, layout) {
      const revision = (layouts.get(id)?.wire ?? -1) + 1;
      const sent = peers.get(id)?.sendHost({ v: 1, t: 'layout', rev: revision, layout: wireJson({ ...layout, revision }) }) ?? false;
      if (sent) layouts.set(id, { wire: revision, session: layout.revision });
      return sent;
    },
    sendPrivateView(id, view) {
      const revision = (views.get(id) ?? -1) + 1;
      const sent = peers.get(id)?.sendHost({ v: 1, t: 'view', rev: revision, view: wireJson(view === null ? null : { ...view, revision }) }) ?? false;
      if (sent) views.set(id, revision);
      return sent;
    },
    fence(id, sequence) { if (sequence === null) inputs.get(id)?.pause(); else inputs.get(id)?.acknowledgeResume(sequence); },
    status(id, paused) {
      const p = room?.players.find(p => p.connectionId === id);
      if (room && p) peers.get(id)?.sendHost({ v: 1, t: 'room', phase: paused ? 'paused' : 'playing', players: room.players.length, leader: p.seat === room.leader, team: p.team ? { id: p.team === 'red' ? 0 : 1, name: p.team === 'red' ? 'Red' : 'Blue' } : null });
    },
    subscribe(callback) { receive = callback; bind(); return () => { receive = undefined; for (const input of inputs.values()) input.pause(); inputs.clear(); }; },
  };
  const links = {
    transport,
    setup(next: RoomState, nextBuffer: InputBuffer<string>) { room = next; buffer = nextBuffer; if (receive) bind(); },
    updateRoom(next: RoomState) { room = next; if (receive) bind(); },
    peer(id: string, peer: SessionPeer) { peers.set(id, peer); peer.bindControl?.(message => { links.control(id, message); }); if (receive) bind(); },
    dropped(id: string) { inputs.get(id)?.pause(); inputs.delete(id); peers.delete(id); views.delete(id); layouts.delete(id); receive?.({ type: 'connection', connectionId: id, connected: false }); },
    control(id: string, message: unknown) {
      if (!receive || !room?.players.some(p => p.connectionId === id && p.disconnectedAt === null)) return;
      const checked = validatePhoneMessage(message);
      if (!checked.ok || checked.value.t !== 'action' || checked.value.viewRev !== (views.get(id) ?? null)) return;
      const layout = layouts.get(id);
      if (checked.value.rev !== layout?.wire) return;
      const data = checked.value.data;
      if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.control !== 'string') return;
      if (data.value !== undefined && typeof data.value !== 'string' && typeof data.value !== 'number') return;
      receive({ type: 'tap', connectionId: id, action: { control: data.control, revision: layout.session, ...(data.value === undefined ? {} : { value: data.value }) } });
    },
    stop() { for (const input of inputs.values()) input.pause(); inputs.clear(); peers.clear(); views.clear(); layouts.clear(); room = undefined; buffer = undefined; receive = undefined; },
  };
  return links;
}
