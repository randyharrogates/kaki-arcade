import { expect, it } from 'vitest';
import { createSession, createTick, driveStep, EMPTY_SETUP, STEP_MS } from '@kaki/platform';
import { createInputBuffer } from '@kaki/sim-core';
import { FakeTransport, makeRoom } from '../../../packages/platform/src/session/testing.fixture';
import { tabaoRush } from './rules/game';

it('TR-055 two picks in one room accept all three Ready presses after a completed round', () => {
  const room = makeRoom(3);
  const buffer = createInputBuffer<string>({ axisCount: 4, seqModulus: 65536, staleAfterSteps: 15 });
  for (const firstInRoom of [true, false]) {
    const transport = new FakeTransport();
    const session = createSession({
      game: { ...tabaoRush, init(...args) { return { ...tabaoRush.init(...args), endTick: 1 }; } },
      seed: 42, settings: {}, context: { ...EMPTY_SETUP, firstInRoom }, room, buffer, transport,
      publicView() { /* No renderer. */ }, event() { /* Inspected through state. */ },
    });
    for (const player of room.players) {
      transport.tap(player.connectionId, 'ready', 'ready');
      session.advance(STEP_MS);
      expect(session.state?.picks?.find(pick => pick.player === `seat-${String(player.seat)}`)?.ready).toBe(true);
    }
    expect(session.state?.phase).toBe(firstInRoom ? 'tutorial' : 'play');
    if (firstInRoom) {
      transport.tap('c1', 'header-action', 'skip-tutorial');
      session.advance(STEP_MS);
    }
    expect(session.state?.phase).toBe('play');
    session.advance(STEP_MS);
    expect(session.ended).toBe(true);
  }
});

it('TR-055 picker revisions advance after each acknowledgement and stale Ready cannot toggle it back', () => {
  let state = tabaoRush.init(42, [1, 2, 3].map(seat => ({
    id: `seat-${String(seat)}`, seat, name: `Cook ${String(seat)}`, colour: 'seat-1' as const,
  })), {}, EMPTY_SETUP);
  for (const player of state.players) {
    const revision = tabaoRush.controllerLayout(state, player.id).revision;
    const tick = createTick({ actions: [{ player: player.id, control: 'ready', value: 'ready', revision }] });
    state = driveStep(tabaoRush, state, tick, STEP_MS);
    expect(state.picks?.find(pick => pick.player === player.id)?.ready).toBe(true);
    expect(tabaoRush.controllerLayout(state, player.id).revision).toBeGreaterThan(revision);
    state = driveStep(tabaoRush, state, tick, STEP_MS);
    expect(state.picks?.find(pick => pick.player === player.id)?.ready).toBe(true);
  }
  expect(state.phase).toBe('play');
});
