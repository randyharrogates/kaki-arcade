import { expect, it } from 'vitest';
import { createSession, STEP_MS, AXIS_COUNT } from '@kaki/platform';
import { createInputBuffer } from '@kaki/sim-core';
import { tabaoRush } from './index';
import { FakeTransport, makeRoom } from '../../../packages/platform/src/session/testing.fixture';
// Timing diagnostics live in C-10 evidence; this regression asserts delivery structure.
it('8-player session completes steps without resending identical layouts', () => {
  const buffer = createInputBuffer<string>({ axisCount: AXIS_COUNT, seqModulus: 65536, staleAfterSteps: 15 });
  const transport = new FakeTransport();
  const events: unknown[] = [];
  const session = createSession({ game: tabaoRush, settings: {}, seed: 1, room: makeRoom(8),
    context: { data: {}, saved: null, teams: false }, buffer, transport,
    publicView() { /* TV */ }, event(e) { events.push(e); } });
  expect(transport.sent.filter(m => m.type === 'layout')).toHaveLength(8);
  for (let i = 0; i < 600; i++) session.advance(STEP_MS);
  expect(session.step).toBe(600);
  expect(events).toEqual([]);
  expect(transport.sent.filter(m => m.type === 'layout')).toHaveLength(8);
  expect(transport.sent.filter(m => m.type === 'view').length).toBeGreaterThanOrEqual(8);
});
