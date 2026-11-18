// C-05: real game state stays in memory on phone return; host reload loses the round.
import { describe, expect, it } from 'vitest';
import { applyHostEvent, applyPhoneEvent, createRoom, createSession,
  createHostSnapshotStore, restoreHost, savedSelection, safeSessionResults,
  settingsSchema, validateSettings, STEP_MS } from '@kaki/platform';
import type { SessionTransport } from '@kaki/platform';
import { cloneState, createInputBuffer, hashState } from '@kaki/sim-core';
import { findSecret } from '../../../packages/platform/src/game/json';
import { peekPoker as game } from './index';

const settings = { rounds: 3 } as const;
const context = { data: {}, saved: null, teams: false };

function setup(teams = false) {
  let now = 1000;
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null,
    setItem(k: string, v: string) { values.set(k, v); },
    removeItem(k: string) { values.delete(k); } };
  const clock = { now: () => now, schedule() { return 0; }, cancel() { /* No timers needed. */ } };
  const store = createHostSnapshotStore({ storage, clock,
    validateSelection: (id, selected) => id === game.meta.id &&
      validateSettings(settingsSchema(game, { ...context, teams }), selected).ok });
  let room = createRoom();
  for (let i = 1; i <= 8; i++) {
    room = applyPhoneEvent(room, { deviceId: `d${String(i)}`, connectionId: `c${String(i)}` },
      { type: 'join', name: `Guest ${String(i)}`, seatToken: String(i).repeat(32) }, now).state;
    if (teams) room = applyHostEvent(room,
      { type: 'team', seat: i, team: i % 2 ? 'red' : 'blue' }, now).state;
  }
  const deliveries: { id: string; kind: string; value: unknown }[] = [];
  const transport: SessionTransport = {
    sendLayout(id, layout) { deliveries.push({ id, kind: 'layout', value: cloneState(layout) }); return true; },
    sendPrivateView(id, view) { deliveries.push({ id, kind: 'view', value: cloneState(view) }); return true; },
    fence() { /* No acknowledgement required. */ }, status() { /* No renderer. */ },
    subscribe() { return () => { /* No network in the game probe. */ }; },
  };
  const session = createSession({ game, settings, seed: 42, room, context: { ...context, teams },
    buffer: createInputBuffer<string>({ axisCount: 4, seqModulus: 65536, staleAfterSteps: 15 }),
    transport, publicView() { /* No renderer. */ }, event() { /* No renderer. */ } });
  room = applyHostEvent(room, { type: 'phase', phase: 'playing', allowRunningJoin: true }, now).state;
  session.updateRoom(room);
  return { room, store, clock, values, session, deliveries, time(t: number) { now = t; } };
}

describe('PLAT-007 PLAT-009 peekPoker reconnect', { timeout: 60_000 }, () => {
  it.each([1000, 60000, 119000])('phone returns at %i ms with exact state, score, layout and private view', gap => {
    const r = setup();
    for (let i = 0; i < 60; i++) r.session.advance(STEP_MS);
    const state = r.session.state;
    if (state === undefined) throw new Error('Game failed to initialise');
    const hash = hashState(state); const scores = game.results(state);
    const before = cloneState(game.privateView(state, 'seat-1'));
    r.room = applyHostEvent(r.room, { type: 'disconnect', seat: 1 }, 1000).state;
    r.session.updateRoom(r.room);
    r.room = applyPhoneEvent(r.room, { deviceId: 'returning', connectionId: 'returning' },
      { type: 'resume', seatToken: '1'.repeat(32) }, 1000 + gap).state;
    r.session.updateRoom(r.room);
    expect(hashState(r.session.state)).toBe(hash);
    expect(game.results(state)).toEqual(scores);
    expect(r.room.players[0]).toMatchObject({ seat: 1, colour: 0, name: 'Guest 1' });
    expect(r.deliveries.filter(d => d.id === 'returning').map(d => d.kind)).toEqual(['layout', 'view']);
    expect(r.deliveries.findLast(d => d.id === 'returning' && d.kind === 'view')?.value).toEqual(before);
  });
  it.each([false, true])('host reload preserves session metadata and loses the round, paused=%s', async paused => {
    const r = setup();
    for (let i = 0; i < 60; i++) r.session.advance(STEP_MS);
    if (paused) r.session.pause('seat-1');
    r.room = applyHostEvent(r.room, { type: 'phase', phase: paused ? 'paused' : 'playing',
      allowRunningJoin: true }, 1000).state;
    r.room = applyHostEvent(r.room, { type: 'disconnect', seat: 3 }, 1000).state;
    const state = r.session.state;
    if (state === undefined) throw new Error('Missing state');
    const results = safeSessionResults(game, state, [game.results(state)]);
    const scores = { 'seat-1': { [game.meta.id]: 83 }, 'seat-2': { [game.meta.id]: 42 } };
    expect(r.store.write({ credentials: { code: 'BCDF2345', hostToken: 'a'.repeat(32) },
      createdAt: 1000, room: r.room, scores, results, selection: savedSelection(game, state, settings),
    })).toBe(true);
    const text = [...r.values.values()][0]; if (!text) throw new Error('Missing snapshot');
    const stored: unknown = JSON.parse(text);
    for (const secret of game.secrets(state)) expect(findSecret(secret, stored, 'snapshot')).toBeNull();
    r.time(62000);
    const restored = await restoreHost({ store: r.store, clock: r.clock,
      reopen: () => Promise.resolve({ code: 'BCDF2345', hostToken: 'a'.repeat(32), reopened: true,
        link: { stop() { /* No socket in the game probe. */ } } }) });
    if (restored?.retryable) throw new Error('Unexpected retryable restore');
    expect(restored?.match).toBe('lost'); expect(restored?.room.phase).toBe('lobby');
    expect(restored?.room.players).toHaveLength(8); expect(restored?.room.leader).toBe(1);
    expect(restored?.room.players.every(p => p.disconnectedAt === (p.seat === 3 ? 1000 : 62000))).toBe(true);
    expect(restored?.scores).toEqual(scores); expect(restored?.results).toEqual(results);
    expect(restored?.selection?.saved).toEqual(game.save?.(state) ?? null);
    expect(restored?.room.players.map(p => [p.seat, p.colour, p.name, p.team, p.seatToken]))
      .toEqual(r.room.players.map(p => [p.seat, p.colour, p.name, p.team, p.seatToken]));
  });
});

describe('DATA-002 Peek Poker stored secrets', () => {
  it('scans hidden faces and every private pick in a running round', () => {
    const r = setup();
    for (let i = 0; i < 5000 && r.session.state?.phase !== 'pick'; i++)
      r.session.advance(STEP_MS);
    let state = r.session.state;
    if (state?.phase !== 'pick') throw new Error('Picking not reached');
    // A valid private choice, using the game's current revision.
    state = game.step(state, {
      frames: new Map(), actions: [{ player: 'seat-1', control: 'grid', value: 3,
        revision: game.controllerLayout(state, 'seat-1').revision }],
      leader: 'seat-1', disconnected: [], connected: new Map([['seat-1', true]]),
    }, STEP_MS);
    const declared = game.secrets(state);
    expect(declared.some(secret => secret.owner === 'seat-1')).toBe(true);
    expect(declared.filter(secret => secret.owner === null)).toHaveLength(16);
    expect(r.store.write({ credentials: { code: 'BCDF2345', hostToken: 'a'.repeat(32) },
      createdAt: 1000, room: r.room, scores: {},
      results: safeSessionResults(game, state, [game.results(state)]),
      selection: savedSelection(game, state, settings) })).toBe(true);
    const text = [...r.values.values()][0]; if (!text) throw new Error('No snapshot');
    const snapshot: unknown = JSON.parse(text);
    for (const secret of declared) expect(findSecret(secret, snapshot, 'snapshot')).toBeNull();
    expect(text).not.toContain('picks'); expect(text).not.toContain('grid');
  });
});
