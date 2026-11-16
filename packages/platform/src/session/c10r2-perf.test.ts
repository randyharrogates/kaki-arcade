import { expect, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createInputBuffer } from '@kaki/sim-core';
import { createSession } from './index';
import { fixture } from './session.fixture';
import { FakeTransport, makeRoom } from './testing.fixture';
import { tabaoRush } from '../../../../games/tabao-rush/src/index';
import { peekPoker } from '../../../../games/peek-poker/src/rules/game';
import type { GameModule } from '../game/types';
import { STEP_MS } from '../game/types';

// Stand-in isolates runner/buffer cost: in-place step and constant layout/private objects.
// Optional diagnostic output goes to evidence; no machine-dependent assertion.
it('eight-phone constant objects send only once and complete every step', () => {
  const layout = { revision: 0, controls: [{ kind: 'stick' as const, id: 'move' },
    { kind: 'button' as const, id: 'b', button: 'face-bottom' as const, label: 'Pick' }] };
  const view = { revision: 0, blocks: [{ kind: 'text' as const, text: 'hello' },
    { kind: 'stat' as const, label: 'Score', value: 3 }] };
  const publicView = { step: 0 };
  for (const record of [false, true]) {
    const buffer = createInputBuffer<string>({ axisCount: 4, seqModulus: 65536, staleAfterSteps: 15 });
    const transport = new FakeTransport();
    const session = createSession({ game: { ...fixture, stepMode: 'in-place', step: s => s,
      publicView: () => publicView, controllerLayout: () => layout, privateView: () => view, isOver: () => false },
    settings: { steps: 100000 }, seed: 1, room: makeRoom(8), context: { data: {}, saved: null, teams: false }, buffer, transport,
    publicView() { /* sink */ }, event() { /* sink */ }, ...(record ? { recordInput() { /* sink */ } } : {}) });
    const ids = Array.from({ length: 8 }, (_, i) => `seat-${String(i + 1)}`);
    const axes = [0.5, 0.5, 0, 0];
    let seq = 0;
    const run = (n: number): void => {
      for (let i = 0; i < n; i++) {
        for (const id of ids) buffer.receive(id, seq % 65536, 0, axes);
        seq++; session.advance(STEP_MS);
      }
    };
    run(500);
    global.gc?.(); // Diagnostic runs expose GC to start from a collected heap.
    const heap = process.memoryUsage().heapUsed, time = performance.now();
    run(6000);
    const bytes = (process.memoryUsage().heapUsed - heap) / 6000;
    const us = (performance.now() - time) * 1000 / 6000;
    if (process.env.C10_PERF_EVIDENCE) appendFileSync(process.env.C10_PERF_EVIDENCE,
      `8 phones, recordInput=${String(record)}: ${bytes.toFixed(2)} B/step net heap growth; ${us.toFixed(2)} us/step\n`);
    expect(session.step).toBe(6500);
    expect(transport.sent.filter(m => m.type === 'layout')).toHaveLength(8);
    expect(transport.sent.filter(m => m.type === 'view')).toHaveLength(8);
  }
});

function measureGame<S, Settings extends object, V>(name: string, game: GameModule<S, Settings, V>, settings: NoInfer<Settings>): void {
  for (const record of [false, true]) {
    const buffer = createInputBuffer<string>({ axisCount: 4, seqModulus: 65536, staleAfterSteps: 15 });
    const transport = new FakeTransport();
    const events: unknown[] = [];
    const session = createSession({ game, settings, seed: 1, room: makeRoom(8), context: { data: {}, saved: null, teams: false },
      buffer, transport, publicView() { /* sink */ }, event(e) { events.push(e); },
      ...(record ? { recordInput() { /* sink */ } } : {}) });
    const ids = Array.from({ length: 8 }, (_, i) => `seat-${String(i + 1)}`), axes = [0.5, 0.5, 0, 0];
    for (let i = 0; i < 500; i++) {
      for (const id of ids) buffer.receive(id, i, 0, axes);
      session.advance(STEP_MS);
    }
    global.gc?.(); // Diagnostic runs expose GC to start from a collected heap.
    const heap = process.memoryUsage().heapUsed, time = performance.now();
    for (let i = 500; i < 6500; i++) {
      for (const id of ids) buffer.receive(id, i, 0, axes);
      session.advance(STEP_MS);
    }
    const bytes = (process.memoryUsage().heapUsed - heap) / 6000, us = (performance.now() - time) * 1000 / 6000;
    if (process.env.C10_PERF_EVIDENCE) appendFileSync(process.env.C10_PERF_EVIDENCE,
      `${name}, recordInput=${String(record)}: ${bytes.toFixed(2)} B/step net heap growth; ${us.toFixed(2)} us/step; layouts=${String(transport.sent.filter(m => m.type === 'layout').length)} views=${String(transport.sent.filter(m => m.type === 'view').length)}\n`);
    expect(session.step).toBe(6500);
    expect(events).toEqual([]);
    expect(transport.sent.filter(m => m.type === 'layout')).toHaveLength(name === 'peek' ? 56 : 8);
  }
}
it('real-game diagnostic ports complete all steps with expected phase layout sends', () => {
  measureGame('tabao', { ...tabaoRush, isOver: () => false,
    step: (s, i, d) => tabaoRush.step(s.tick >= s.endTick - 1 ? { ...s, tick: 0 } : s, i, d) }, {});
  measureGame('peek', { ...peekPoker, isOver: () => false }, { rounds: 5 });
});
