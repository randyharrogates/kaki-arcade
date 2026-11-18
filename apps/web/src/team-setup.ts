/** D-153: hold refusal copy long enough to read. */
export const REFUSAL_HOLD_MS = 3000;
import { validSettingsView } from './game-setup';
import type { SettingsView } from './game-setup';
import type { PlayerInfo, RoomState } from '@kaki/platform';
interface TeamSetupBase {
  kind: 'team-setup'; revision: number; enabled: boolean;
  players: PlayerInfo[]; error: string | null;
  notice?: string | null; refused?: boolean;
}
export type TeamSetupView = TeamSetupBase & (
  { screen: 'choice'; teamsOffered: boolean; teamsReason: string | null; settings: SettingsView | null } |
  { screen: 'teams'; teamsOffered?: boolean; teamsReason?: string | null; settings?: SettingsView | null }
);
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
    (value.screen === 'choice' && (!('teamsOffered' in value) || !('teamsReason' in value) || !('settings' in value))) ||
    ('teamsOffered' in value && typeof value.teamsOffered !== 'boolean') ||
    ('teamsReason' in value && value.teamsReason !== null && typeof value.teamsReason !== 'string') ||
    ('settings' in value && value.settings !== null && !validSettingsView(value.settings)) ||
    !('error' in value) || (value.error !== null && typeof value.error !== 'string')) return null;
  return value as TeamSetupView;
}
