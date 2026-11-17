import type { GameMeta } from './game/index';
import type { RoomState } from './room/room';
import type { PickerInput, PickerScreen, PickerState } from '@kaki/protocol';

export interface PickerModel { screen: PickerScreen; focus: string; revision: number; error?: string | undefined }
export function initialPicker(games: readonly GameMeta[]): PickerModel {
  return { screen: 'lobby', focus: games[0]?.id ?? '', revision: 0 };
}
export function playerRange(meta: GameMeta): string { return `${String(meta.players.min)} to ${String(meta.players.max)} players`; }
export function unavailable(meta: GameMeta, count: number): string | null {
  return count < meta.players.min ? `Needs at least ${String(meta.players.min)} ${meta.players.min === 1 ? 'player' : 'players'}`
    : count > meta.players.max ? `Takes at most ${String(meta.players.max)} ${meta.players.max === 1 ? 'player' : 'players'}` : null;
}
/** Pure shell transitions. Held seats count as seated, matching the room and runner. */
export function pickerInput(state: PickerModel, room: RoomState, games: readonly GameMeta[], connection: string, input: PickerInput, revision: number): PickerModel {
  if (revision !== state.revision || !room.players.some(p => p.connectionId === connection && p.seat === room.leader && p.disconnectedAt === null)) return state;
  const game = games.find(g => g.id === state.focus);
  let screen = state.screen;
  let focus = state.focus;
  if (screen === 'lobby' && input === 'open' && room.players.length > 0 && games.length > 0) screen = 'picker';
  else if (screen === 'picker') {
    if (input === 'previous' || input === 'next') {
      const index = games.findIndex(g => g.id === focus);
      focus = games[(index + (input === 'next' ? 1 : games.length - 1)) % games.length]?.id ?? focus;
    } else if (input === 'back') screen = 'lobby';
    else if (input === 'select' && game && !unavailable(game, room.players.length)) screen = 'start';
  } else if (screen === 'start') {
    if (input === 'back') screen = 'picker';
    else if (input === 'start' && game && !unavailable(game, room.players.length)) screen = 'starting';
  }
  return screen === state.screen && focus === state.focus ? state : { screen, focus, revision: state.revision + 1 };
}
/** A room change fences old inputs, including a hand-over, leave or count change. */
export function pickerRoom(state: PickerModel, room: RoomState, before: RoomState): PickerModel {
  if (state.screen === 'lobby') return state;
  if (!room.players.length) return { ...state, screen: 'lobby', revision: state.revision + 1, error: undefined };
  return room.leader === before.leader && room.players.length === before.players.length ? state : { ...state, revision: state.revision + 1 };
}
export function pickerFailed(state: PickerModel, games: readonly GameMeta[]): PickerModel {
  return { ...state, screen: 'start', revision: state.revision + 1,
    error: `Could not load ${games.find(game => game.id === state.focus)?.name ?? 'the game'}. Try again.` };
}
export function pickerView(state: PickerModel, room: RoomState, games: readonly GameMeta[]): PickerState {
  const game = state.screen === 'lobby' ? undefined : games.find(g => g.id === state.focus);
  return { v: 1, t: 'picker-state', revision: state.revision, screen: state.screen,
    leaderName: state.screen === 'lobby' ? null : room.players.find(p => p.seat === room.leader)?.name ?? null,
    game: game ? { id: game.id, name: game.name, blurb: game.blurb, min: game.players.min, max: game.players.max } : null,
    failed: state.error !== undefined, reason: state.error ?? (game ? unavailable(game, room.players.length) : null) };
}
