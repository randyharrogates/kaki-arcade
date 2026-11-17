import type { PlayerInfo, RoomState } from '@kaki/platform';
export interface TeamSetupView {
  kind: 'team-setup'; revision: number; screen: 'choice' | 'teams'; enabled: boolean;
  players: PlayerInfo[]; error: string | null;
  notice?: string | null; refused?: boolean;
}
export function roomPlayers(room: RoomState): PlayerInfo[] {
  return room.players.map(p => ({ id: `seat-${String(p.seat)}`, seat: p.seat, name: p.name, colour: `seat-${String(p.seat)}` as PlayerInfo['colour'] }));
}
/** Opaque platform view inside the existing validated view envelope. */
export function teamSetupView(value: unknown): TeamSetupView | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || value.kind !== 'team-setup' ||
    !('revision' in value) || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) ||
    !('screen' in value) || (value.screen !== 'choice' && value.screen !== 'teams') ||
    !('enabled' in value) || typeof value.enabled !== 'boolean' ||
    !('players' in value) || !Array.isArray(value.players) ||
    ('notice' in value && value.notice !== null && typeof value.notice !== 'string') ||
    ('refused' in value && typeof value.refused !== 'boolean') ||
    !('error' in value) || (value.error !== null && typeof value.error !== 'string')) return null;
  return value as TeamSetupView;
}
