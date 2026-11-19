import { expect, it } from 'vitest';
import { createTick, EMPTY_SETUP, STEP_MS, checkLayout } from '@kaki/platform';
import { deepFreeze, hashState } from '@kaki/sim-core';
import { tabaoRush } from './game';
import type { TabaoState } from './state';
import { HEADS } from './cook-picker';
const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${String(i+1)}`, seat: i+1, name: `Cook ${String(i+1)}`, colour: `seat-${String(i+1)}` as 'seat-1' }));
const init = (n: number) => tabaoRush.init(42,players(n),{},EMPTY_SETUP);
function tap(state: TabaoState, player: string, control: string, value?: number) {
  return tabaoRush.step(state,createTick({ actions: [{ player,control,revision:0,...(value === undefined ? {} : { value }) }] }),STEP_MS);
}
it.each([1,4,8])('TR-064 defaults, locked choices and deterministic start for %i players', n => {
  let state = init(n);
  expect(state.picks?.map(p => p.head)).toEqual(Array.from({length:n},(_,i)=>i));
  for (const p of state.players) expect(checkLayout(tabaoRush.controllerLayout(state,p.id))).toEqual([]);
  expect(tabaoRush.step(state,createTick(),STEP_MS).tick).toBe(0);
  const before = hashState(state); deepFreeze(state);
  let twin = state;
  for (const p of state.players) {
    state = tap(state,p.id,'ready'); twin = tap(twin,p.id,'ready');
    expect(hashState(state)).toBe(hashState(twin));
  }
  expect(before).not.toBe(hashState(state)); expect(state.phase).toBe('play'); expect(state.tick).toBe(0);
  expect(tabaoRush.step(state,createTick(),STEP_MS).tick).toBe(1);
  expect(Object.values((tabaoRush.publicView(state) as {heads:Record<string,string>}).heads)).toHaveLength(n);
});
it('TR-064 refuses taken cooks, locks and unlocks Ready, and keeps a disconnected selection', () => {
  let state = init(4);
  expect(tap(state,'p2','cooks',0).picks).toEqual(state.picks);
  state = tap(state,'p2','cooks',7); expect(state.picks?.[1]?.head).toBe(7);
  state = tap(state,'p2','ready');
  expect(tap(state,'p2','cooks',6).picks?.[1]?.head).toBe(7);
  state = tap(state,'p2','ready'); expect(state.picks?.[1]?.ready).toBe(false);
  for (const id of ['p1','p3','p4']) state = tap(state,id,'ready');
  const next = tabaoRush.step(state,createTick({disconnected:['p2']}),STEP_MS);
  expect(next.phase).toBe('play'); expect(next.picks?.[1]?.head).toBe(7);
});
it('TR-064 a picker join receives the lowest free cook and a leave releases it', () => {
  let state = init(2); state = tap(state,'p1','cooks',7);
  state = tabaoRush.join(state,{id:'late',seat:6,name:'Late',colour:'seat-6'});
  expect(state.picks?.find(p=>p.player==='late')?.head).toBe(0);
  state = tabaoRush.leave(state,'late'); expect(state.picks?.some(p=>p.player==='late')).toBe(false);
});
it('TR-052 TR-061 TR-064 versus note uses team colour; co-op uses seat colour', () => {
  const coop = init(2);
  const versus = tabaoRush.init(42,players(2).map((p,i)=>({...p,team:i as 0|1})),{}, {...EMPTY_SETUP,teams:true});
  for(const [state,colour] of [[coop,'seat'],[versus,'team']] as const) {
    const note = tabaoRush.controllerLayout(state,'p1').controls.find(c=>c.id==='pick-note');
    expect(note).toMatchObject({tone:'note',text:`Faded ones are taken. Your apron stays your ${colour} colour.`});
    const grid = tabaoRush.controllerLayout(state,'p1').controls.find(c=>c.kind==='grid');
    expect(grid?.kind === 'grid' && grid.cells[0]?.colour).toBe(colour === 'team' ? 'team-red' : 'seat-1');
  }
  expect(HEADS).toHaveLength(8);
});

it.each([['p1', 'p2'], ['p2', 'p1']])('TR-064 same-tick free cook race: %s wins before %s', (first, second) => {
  const state = tabaoRush.step(init(2), createTick({ actions: [first, second].map(player => ({ player, control: 'cooks', value: 7, revision: 0 })) }), STEP_MS);
  expect(state.picks?.find(p => p.player === first)?.head).toBe(7);
  expect(state.picks?.find(p => p.player === second)?.head).toBe(second === 'p1' ? 0 : 1);
});
it.each([['p1', 'p2'], ['p2', 'p1']])('TR-064 refuses both sides of a same-tick swap (%s first)', (first, second) => {
  const before = init(2);
  const after = tabaoRush.step(before, createTick({ actions: [first, second].map(player => ({ player, control: 'cooks', value: player === 'p1' ? 1 : 0, revision: 0 })) }), STEP_MS);
  expect(after.picks).toEqual(before.picks);
});
it('TR-064 waits when everyone disconnects and starts after a connected player readies', () => {
  const before = init(2);
  const waiting = tabaoRush.step(before, createTick({ disconnected: ['p1', 'p2'] }), STEP_MS);
  expect(waiting.phase).toBe('pick'); expect(waiting.tick).toBe(0);
  expect(waiting.picks).toEqual(before.picks);
  const resumed = tabaoRush.step(waiting, createTick({ disconnected: ['p2'], actions: [{ player: 'p1', control: 'ready', revision: 0 }] }), STEP_MS);
  expect(resumed.phase).toBe('play');
});
it('TR-064 picker joins remain active without advancing the cooking tick', () => {
  const waiting = tabaoRush.step(init(2), createTick(), STEP_MS);
  const joined = tabaoRush.join(waiting, { id: 'late', seat: 3, name: 'Late', colour: 'seat-3' });
  expect(joined.players.find(p => p.id === 'late')).toMatchObject({ joinedMidGame: true, spectating: false });
  expect(joined.tick).toBe(0);
});

it('TR-064 a join after Ready is a mid-game join even before the first cooking tick', () => {
  const playing = tap(init(1), 'p1', 'ready');
  const joined = tabaoRush.join(playing, { id: 'late', seat: 2, name: 'Late', colour: 'seat-2' });
  expect(joined.players.find(p => p.id === 'late')?.joinedMidGame).toBe(true);
});
