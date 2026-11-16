import { applyHostEvent, applyPhoneEvent, createRoom } from '@kaki/platform';
import type { LinkSnapshot } from '@kaki/netcode';
import type { LobbyInput } from './view-model';
export function demoInput(count: number, params = new URLSearchParams()): Omit<LobbyInput, 'origin'> {
  let room = createRoom();
  const links = new Map<string, LinkSnapshot>();
  const names = ['Cloud Noodle', 'Pebble Puff', 'Mango Moon', 'Waffle Fern', 'Velvet Kite', 'Bumble Bean', 'Puddle Pip', 'Comet Crumb'];
  if (params.get('names') === 'long') {
    names.splice(0, 2, '天地玄黃宇宙洪荒日月盈昃', '😀😁😂😃😄😅😆😉😊😋😎😍');
    for (let i = 2; i < names.length; i++) names[i] = (names[i] ?? '').padEnd(12, 's');
  }
  for (let index = 0; index < Math.min(8, Math.max(0, Math.floor(count))); index++) {
    const id = `demo-${String(index)}`;
    room = applyPhoneEvent(room, { connectionId: id, deviceId: id },
      { type: 'join', name: names[index] ?? 'Player', seatToken: `demo-seat-${String(index).padStart(24, '0')}` }, 0).state;
    links.set(id, { quality: index === 1 ? 'weak' : index === 2 ? 'relayed' : 'good', path: index === 2 ? 'relayed' : 'direct', medianMs: 20, p95Ms: 30, loss: 0 });
  }
  if (count >= 4) room = applyHostEvent(room, { type: 'disconnect', seat: 4 }, 0).state;
  if (params.get('change') === 'return' && room.players[0] && !room.players.some(p => p.disconnectedAt !== null)) room = applyHostEvent(room, { type: 'disconnect', seat: room.players[0].seat }, 0).state;
  return { room, links, code: 'H7KQ9MXR', pairing: demoState(params.get('state')) };
}

function demoState(state: string | null): LobbyInput['pairing'] {
  return state === 'creating' || state === 'unreachable' || state === 'expired' || state === 'replaced' || state === 'restoring' ? state : 'ready';
}
export function demoChange(input: Omit<LobbyInput, 'origin'>, change: string): Omit<LobbyInput, 'origin'> {
  if (change === 'join') {
    const next = demoInput(Math.min(8, input.room.players.length + 1));
    const player = next.room.players[input.room.players.length];
    if (!player) return input;
    return { ...input, links: new Map([...input.links, ...[...next.links].filter(([id]) => id === player.connectionId)]), room: { ...input.room, leader: input.room.leader ?? player.seat, players: [...input.room.players, { ...player, disconnectedAt: null }] } };
  }
  const seat = change === 'leave' ? input.room.players.at(-1) : input.room.players[0];
  if (!seat) return input;
  if (change === 'return') {
    const held = input.room.players.find(p => p.disconnectedAt !== null);
    return { ...input, room: { ...input.room, players: input.room.players.map(p => p === held ? { ...p, disconnectedAt: null } : p) } };
  }
  if (change === 'leave') return { ...input, room: applyPhoneEvent(input.room, { connectionId: seat.connectionId, deviceId: seat.deviceId, seat: seat.seat }, { type: 'leave' }, 2000).state };
  return { ...input, room: applyHostEvent(input.room, { type: 'disconnect', seat: seat.seat }, 2000).state };
}
