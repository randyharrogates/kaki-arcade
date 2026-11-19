import { expect, it } from 'vitest';
import { createSession, EMPTY_SETUP, STEP_MS, AXIS_COUNT } from '@kaki/platform';
import type { ControllerLayout } from '@kaki/platform';
import { createInputBuffer } from '@kaki/sim-core';
import { peekPoker } from '../../../games/peek-poker/src';
import { FakeTransport, makeRoom } from '../../../packages/platform/src/session/testing.fixture';

it('PP-031 rejects every historical seat-8 wire revision across an immediate reveal and accepts only the round-2 grid revision', () => {
  const transport = new FakeTransport();
  const session = createSession({ game: peekPoker, seed: 42, settings: { rounds: 5 as const }, context: EMPTY_SETUP,
    room: makeRoom(8), transport,
    buffer: createInputBuffer<string>({ axisCount: AXIS_COUNT, seqModulus: 65536, staleAfterSteps: 15 }),
    publicView() { /* no screen required */ }, event() { /* asserted through session state */ } });
  const state = () => { if (!session.state) throw Error('Missing state'); return session.state; };
  const untilPick = (round: number) => {
    for (let i = 0; i < 10000 && !(state().round === round && state().phase === 'pick'); i++) session.advance(STEP_MS);
    expect([state().round, state().phase]).toEqual([round, 'pick']);
  };
  const tap = (seat: number, control: string, value: number | string) => {
    transport.tap(`c${String(seat)}`, control, value); session.advance(STEP_MS);
  };
  try {
    untilPick(1);
    for (let seat = 1; seat <= 8; seat++) {
      tap(seat, 'grid', 0); tap(seat, 'grid', 1); tap(seat, 'lock', 'go');
      expect(state().phase).toBe(seat === 8 ? 'reveal' : 'pick');
    }
    untilPick(2);
    const revisions = transport.sent.filter(s => s.connection === 'c8' && s.type === 'layout')
      .map(s => (s.value as ControllerLayout).revision);
    const current = transport.lastLayout.get('c8')?.revision;
    expect(revisions.at(-1)).toBe(current);
    expect(new Set(revisions).size).toBeGreaterThan(3);
    for (const revision of revisions) {
      transport.tap('c8', 'grid', 0, revision); session.advance(STEP_MS);
      expect(state().players[7]?.picks, `wire revision ${String(revision)}`).toEqual(revision === current ? [0] : []);
      expect(state().players[7]?.locked).toBe(false);
    }
    // Finish round 2, again with seat 8 last: no early lock or delayed round-1 tap.
    for (let seat = 1; seat <= 8; seat++) {
      if (seat !== 8) tap(seat, 'grid', 0);
      tap(seat, 'grid', 1); tap(seat, 'lock', 'go');
      expect(state().phase).toBe(seat === 8 ? 'reveal' : 'pick');
    }
  } finally { session.quit('seat-1', true); }
});
