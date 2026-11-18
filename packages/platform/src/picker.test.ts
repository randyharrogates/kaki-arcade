import { describe, expect, it } from 'vitest';
import { applyPhoneEvent, createRoom } from '@kaki/platform';
import { PICKER_INPUTS } from '@kaki/protocol';
import type { GameMeta } from './game';
const gameMetas: GameMeta[] = ['one', 'two', 'three'].map(id => ({ id, name: id, blurb: 'A game.', players: { min: 1, max: 8 }, teams: 'none', coop: false, solo: true, midGameJoin: true }));
import { initialPicker, pickerInput, pickerRoom, pickerView, unavailable } from './picker';
import type { PickerModel } from './picker';
function roomWith(count: number) {
  let room = createRoom();
  for (let i = 0; i < count; i++) room = applyPhoneEvent(room, { deviceId: `p${String(i)}`, connectionId: `p${String(i)}` },
    { type: 'join', name: `Player ${String(i)}`, seatToken: `seat-${String(i).padStart(27, '0')}` }, 0).state;
  return room;
}
describe('PLAT-020/021 picker state machine', () => {
  it.each(gameMetas)('$name availability follows the real module at every room size and the boundaries', game => {
    for (let count = 0; count <= 9; count++) expect(unavailable(game, count)).toBe(count < game.players.min ? `Needs at least ${String(game.players.min)} player` : count > game.players.max ? `Takes at most ${String(game.players.max)} players` : null);
  });
  it('walks every forward/back transition, wraps focus, ignores inappropriate inputs and fences late inputs', () => {
    const room = roomWith(2); let state = initialPicker(gameMetas);
    const input = (action: typeof PICKER_INPUTS[number]) => { state = pickerInput(state, room, gameMetas, 'p0', action, state.revision); };
    const inert = (actions: readonly typeof PICKER_INPUTS[number][]) => { for (const action of actions) { const before = state; input(action); expect(state).toBe(before); } };
    inert(['select', 'start', 'previous', 'next', 'back']);
    input('open'); expect(state.screen).toBe('picker');
    input('previous'); expect(state.focus).toBe(gameMetas.at(-1)?.id);
    input('next'); expect(state.focus).toBe(gameMetas[0]?.id);
    inert(['open', 'start']);
    input('back'); expect(state.screen).toBe('lobby'); input('open');
    input('select'); expect(state.screen).toBe('start'); inert(['open', 'next', 'previous', 'select']);
    input('back'); expect(state.screen).toBe('picker'); input('select'); input('start'); expect(state.screen).toBe('starting');
    inert(PICKER_INPUTS);
    expect(pickerInput(state, { ...room, phase: 'playing' }, gameMetas, 'p0', 'back', state.revision)).toBe(state);
    expect(pickerInput(state, room, gameMetas, 'p0', 'back', state.revision - 1)).toBe(state);
  });
  it('keeps unavailable games focused, refuses selection and start, and updates the reason with seated count', () => {
    const room = roomWith(1); const empty = createRoom();
    const state: PickerModel = { ...initialPicker(gameMetas), screen: 'picker' };
    expect(pickerView(state, empty, gameMetas).reason).toMatch(/^Needs/);
    // A metadata-driven range also exercises a future installed multiplayer-only module.
    const games = gameMetas.map(g => ({ ...g, players: { min: 2, max: 8 } }));
    for (const screen of ['picker', 'start'] as const) {
      const s = { ...state, screen };
      expect(pickerInput(s, room, games, 'p0', screen === 'picker' ? 'select' : 'start', 0)).toBe(s);
    }
    expect(pickerView(state, roomWith(2), games).reason).toBeNull();
    expect(pickerView(pickerRoom(state, room, empty), room, games).reason).toBe('Needs at least 2 players');
  });
  it('changes control immediately on hand-over; ignores a watcher, unknown connection and disconnected leader', () => {
    const room = roomWith(2); const state = { ...initialPicker(gameMetas), screen: 'picker' as const };
    expect(pickerInput(state, room, gameMetas, 'p1', 'next', 0)).toBe(state);
    expect(pickerInput(state, room, gameMetas, 'stranger', 'next', 0)).toBe(state);
    const handed = { ...room, leader: 2 }; const next = pickerRoom(state, handed, room);
    expect(pickerView(next, handed, gameMetas).leaderName).toBe('Player 1');
    expect(pickerInput(next, handed, gameMetas, 'p0', 'next', 1)).toBe(next);
    expect(pickerInput(next, handed, gameMetas, 'p1', 'next', 1).focus).not.toBe(next.focus);
    const away = { ...room, players: room.players.map(p => ({ ...p, disconnectedAt: 0 })) };
    expect(pickerInput(state, away, gameMetas, 'p0', 'next', 0)).toBe(state);
    expect(pickerInput(initialPicker(gameMetas), emptyRoom(), gameMetas, 'p0', 'open', 0).screen).toBe('lobby');
  });
});
function emptyRoom() { return createRoom(); }

it('PLAT-020 returns every non-lobby screen to the lobby when the final seat leaves', () => {
  for (const screen of ['picker', 'start', 'starting'] as const) {
    expect(pickerRoom({ ...initialPicker(gameMetas), screen }, createRoom(), roomWith(1)).screen).toBe('lobby');
  }
});
it('PLAT-020 fences only leader/count changes, preserving presses across another player rename', () => {
  const room = roomWith(2); const state = { ...initialPicker(gameMetas), screen: 'picker' as const };
  const renamed = { ...room, players: room.players.map(p => p.seat === 2 ? { ...p, name: 'New name' } : p) };
  expect(pickerRoom(state, renamed, room)).toBe(state);
  expect(pickerInput(state, renamed, gameMetas, 'p0', 'select', state.revision).screen).toBe('start');
  expect(pickerRoom(state, roomWith(3), room).revision).toBe(1);
});
