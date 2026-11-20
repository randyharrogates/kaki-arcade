import { expect, it } from 'vitest';
import { cloneState, deepFreeze, hashState } from '@kaki/sim-core';
import { BUTTON, createTick, EMPTY_SETUP, STEP_MS } from '@kaki/platform';
import type { StepInputs } from '@kaki/platform';
import { makePlayers } from '@kaki/platform/kit';
import { tabaoRush } from './game';
import { TUTORIAL_TARGETS, TUTORIAL_LEVEL } from './tutorial';
import type { TabaoState } from './state';
import { WORK_STEPS } from './stations';

function begin(count: number, firstInRoom = true) {
  let state = tabaoRush.init(41, makePlayers(count, false), {}, { ...EMPTY_SETUP, firstInRoom });
  state = tabaoRush.step(state, createTick({ actions: state.players.map(p => ({ player: p.id, control: 'ready', value: 'ready', revision: 0 })) }), STEP_MS);
  return state;
}
function step(state: TabaoState, inputs: StepInputs = createTick()) { return tabaoRush.step(deepFreeze(state), inputs, STEP_MS); }
function aim(state: TabaoState, id: string, tile: number): TabaoState {
  return { ...state, cooks: state.cooks.map((c, i) => c.id === id ? { ...c, x: tile % 8 + 0.5, y: Math.floor(tile / 8) + 1.5, facing: 6, targetTile: tile } : { ...c, x: 1.5 + i % 4, y: 4.5 }) };
}
function press(state: TabaoState, id: string, bit: number, held = true) {
  return step(state, createTick({ frames: new Map([[id, { axes: [0, 0, 0, 0], held: held ? 1 << bit : 0, pressed: held ? 0 : 1 << bit, released: 0, seq: 0, age: 0 }]]) }));
}
it.each([1, 4, 8])('TR-055 %i cooks complete four real lessons then start a clean round', count => {
  let state = begin(count);
  expect(state.phase).toBe('tutorial'); expect(state.level).toBe(TUTORIAL_LEVEL);
  const ids = state.cooks.map(c => c.id);
  for (const id of ids) {
    state = { ...state, cooks: state.cooks.map(c => c.id === id ? { ...c, x: 6.5, y: 3.5, targetTile: null } : c) };
    state = step(state);
  }
  expect(state.tutorial?.step).toBe(1);
  for (const id of ids) state = press(aim(state, id, TUTORIAL_TARGETS[1]), id, BUTTON.FACE_BOTTOM, false);
  expect(state.tutorial?.step).toBe(2);
  for (const [index, id] of ids.entries()) {
    const board = [11, 12, 13][index % 3] ?? 12;
    state = press(aim(state, id, board), id, BUTTON.FACE_BOTTOM, false);
    for (let tick = 0; tick < WORK_STEPS; tick++) state = press(state, id, BUTTON.FACE_RIGHT);
    expect(state.stations?.[board]?.content?.kind).toBe('chopped');
    state = press(state, id, BUTTON.FACE_BOTTOM, false);
  }
  expect(state.tutorial?.step).toBe(3);
  for (const id of ids) state = press(aim(state, id, TUTORIAL_TARGETS[3]), id, BUTTON.FACE_BOTTOM, false);
  expect(state.phase).toBe('play'); expect(state.tick).toBe(0); expect(state.tutorial).toBeUndefined();
  expect(state.inventory.held).toEqual({}); expect(state.cooks).toHaveLength(count);
  expect(tabaoRush.isOver(state)).toBe(false);
});
it('TR-055 starts the tutorial only for firstInRoom', () => {
  expect(begin(1, false).phase).toBe('play'); expect(begin(1, true).phase).toBe('tutorial');
});
it('TR-055 only a seated connected leader may skip, at every step', () => {
  for (let lesson = 0; lesson < 4; lesson++) {
    const base = begin(4); const state = { ...base, tutorial: { step: lesson, done: [] } };
    const leader = state.players[0]?.id ?? ''; const other = state.players[1]?.id ?? '';
    const skip = (id: string, disconnected: string[] = []) => step(state, createTick({ leader, disconnected, actions: [{ player: id, control: 'header-action', value: 'skip-tutorial', revision: tabaoRush.controllerLayout(state,id).revision }] }));
    expect(skip(other).phase).toBe('tutorial'); expect(skip(leader, [leader]).phase).toBe('tutorial');
    expect(skip(leader).phase).toBe('play');
  }
});
it('TR-055 a disconnected cook counts as done and leaving does not stall the lesson', () => {
  let state = begin(4);
  const id = state.cooks[0]?.id ?? '';
  state = { ...state, cooks: state.cooks.map(c => c.id === id ? { ...c, x: 6.5, y: 3.5 } : c) };
  state = step(state, createTick({ disconnected: state.cooks.filter(c => c.id !== id).map(c => c.id) }));
  expect(state.tutorial?.step).toBe(1);
  for (const player of state.players.slice(1)) state = tabaoRush.leave(state, player.id);
  state = press(aim(state, id, 10), id, BUTTON.FACE_BOTTOM, false);
  expect(state.tutorial?.step).toBe(2);
});
it('TR-055 has no deadline, orders, burning or score and remains deterministic after restore', () => {
  let a = begin(1);
  a = { ...a, tick: a.endTick + 100 };
  const b = cloneState(a);
  for (let tick = 0; tick < 600; tick++) a = step(a);
  let restored = b;
  for (let tick = 0; tick < 600; tick++) restored = step(restored);
  expect(hashState(a)).toBe(hashState(restored)); expect(tabaoRush.isOver(a)).toBe(false);
  const view = tabaoRush.publicView(a) as { kitchens: unknown[]; stations: { fire: boolean }[] };
  expect(view.kitchens).toEqual([]); expect(view.stations.every(s => !s.fire)).toBe(true);
  expect(tabaoRush.results(a).score).toBe(0);
});
it('TR-055 finished tutorial food never burns while another cook is learning', () => {
  let state = begin(1);
  const id = state.cooks[0]?.id ?? '';
  state = { ...state, tutorial: { step: 2, done: [] } };
  state = press(aim(state, id, 10), id, BUTTON.FACE_BOTTOM, false);
  state = press(aim(state, id, 12), id, BUTTON.FACE_BOTTOM, false);
  for (let tick = 0; tick < WORK_STEPS; tick++) state = press(state, id, BUTTON.FACE_RIGHT);
  for (let tick = 0; tick < 1000; tick++) state = step(state);
  expect(state.stations?.[12]?.content?.kind).toBe('chopped');
  expect(state.stations?.[12]?.fire).toBe(false);
});

it('TR-055 TR-056 a joiner during the tutorial spawns in round one', () => {
  let state = step(begin(1));
  const joiner = makePlayers(2, false)[1]; if (!joiner) throw new Error('Joiner');
  state = tabaoRush.join(state, joiner);
  expect(state.players.find(p => p.id === joiner.id)?.spectating).toBe(true);
  const leader = state.players[0]?.id ?? '';
  state = step(state, createTick({ leader, actions: [{ player: leader, control: 'header-action', value: 'skip-tutorial', revision: tabaoRush.controllerLayout(state, leader).revision }] }));
  expect(state.phase).toBe('play');
  expect(state.players.find(p => p.id === joiner.id)?.spectating).toBe(false);
  expect(state.cooks.some(c => c.id === joiner.id)).toBe(true);
});
