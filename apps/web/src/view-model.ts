import { normaliseCode, joinLink } from './join-link';
export { normaliseCode, joinLink } from './join-link';
import type { TeamSetupView } from './team-setup';
import type { LinkSnapshot } from '@kaki/netcode';
import { RECONNECT_WINDOW_MS } from '@kaki/platform';
import type { RoomState } from '@kaki/platform';
import { PLAYER_COLOURS } from '@kaki/ui';

export type PairingState = 'creating' | 'restoring' | 'ready' | 'reconnecting' | 'unreachable' | 'expired' | 'replaced';
import type { PickerModel } from '@kaki/platform';
export interface LobbyInput {
  teamSetup?: TeamSetupView | null;
  picker?: PickerModel;
  room: RoomState;
  links: ReadonlyMap<string, LinkSnapshot>;
  pairing: PairingState;
  code: string;
  origin: string;
  joinOrigin?: string;
}
const statuses: Record<PairingState, string> = {
  creating: 'Creating your room', restoring: 'Restoring your room', ready: 'Scan to join', reconnecting: 'Reconnecting to the pairing server',
  unreachable: 'Cannot reach the pairing server', expired: 'This room has expired',
  replaced: 'Another host tab has taken over',
};
export function lobbyView(input: LobbyInput, clock: { now(): number } = { now: () => input.room.clock }) {
  // Reconnecting retains the live room; all other non-ready states suppress link claims.
  const active = input.pairing === 'ready' || input.pairing === 'reconnecting';
  const code = active ? normaliseCode(input.code) : '';
  const link = joinLink(input.origin, code, input.joinOrigin);
  return {
    status: statuses[input.pairing], pairing: input.pairing,
    retry: input.pairing === 'unreachable', newRoom: input.pairing === 'expired',
    codeGroups: code ? [code.slice(0, 4), code.slice(4)].filter(Boolean) : [],
    joinLink: link, qrPayload: link, count: `${String(input.room.players.length)} of 8 players`,
    seats: PLAYER_COLOURS.map(token => {
      const player = input.room.players.find(p => p.seat === token.seat);
      const quality = player ? input.links.get(player.connectionId)?.quality : undefined;
      const held = player !== undefined && player.disconnectedAt !== null;
      return {
        dimmed: player !== undefined && !active,
        held, holdSeconds: held ? Math.max(0, Math.ceil((RECONNECT_WINDOW_MS - (clock.now() - player.disconnectedAt)) / 1000)) : null,
        number: token.seat, colour: token.colour, name: player?.name ?? `Seat ${String(token.seat)}`,
        occupied: player !== undefined, leader: player !== undefined && input.room.leader === token.seat,
        connection: player && !active ? '' : !player ? (code ? 'Scan to join' : '') : held ? 'Seat held' : quality === 'relayed' ? 'Relayed' : quality === 'weak' ? 'Weak' : quality === 'good' ? 'Good' : 'Connected',
        icon: player && !active ? '' : !player ? (code ? 'join' : '') : held ? 'held' : quality === 'relayed' ? 'relayed' : quality === 'weak' ? 'weak' : quality === 'good' ? 'good' : '',
      };
    }),
  };
}
export type LobbyView = ReturnType<typeof lobbyView>;

export function seatIdentity(seat: LobbyView['seats'][number]): string { return JSON.stringify({ ...seat, holdSeconds: null }); }
