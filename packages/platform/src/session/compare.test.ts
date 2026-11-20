import { expect, it } from 'vitest';
import { cloneState, createInputBuffer } from '@kaki/sim-core';
import type { ControllerLayout, PrivateView, LayoutControl, PanelBlock } from '../game/layout';
import { STEP_MS } from '../game/types';
import { sameLayout, sameView } from './compare';
import { createSession } from './index';
import { fixture } from './session.fixture';
import { FakeTransport, makeRoom } from './testing.fixture';

it('compares fresh shapes and detects cosmetic changes in every compound payload', () => {
  const layout: ControllerLayout = { revision: 1, controls: [
    { kind: 'options', id: 'pick', options: [{ id: 'yes', label: 'Yes', focus: true }] },
    { kind: 'grid', id: 'grid', rows: 1, cols: 1, cells: [{ label: 'A', state: 'plain' }] },
    { kind: 'cards', id: 'hand', cards: [{ id: 'a', label: 'A', faceDown: true }] },
    { kind: 'button', id: 'b', button: 'face-bottom', label: 'Pick' },
  ] };
  expect(sameLayout(cloneState(layout), layout)).toBe(true);
  for (const control of [
    { kind: 'options', id: 'pick', options: [{ id: 'yes', label: 'Yes', focus: false }] },
    { kind: 'grid', id: 'grid', rows: 1, cols: 1, cells: [{ label: 'A', state: 'selected' }] },
    { kind: 'cards', id: 'hand', cards: [{ id: 'a', label: 'A', faceDown: false }] },
    { kind: 'button', id: 'b', button: 'face-bottom', label: 'Pick', disabled: true },
  ] as const) {
    const controls = layout.controls.map(c => c.id === control.id ? control : c);
    expect(sameLayout(layout, { ...layout, controls })).toBe(false);
  }
  const view: PrivateView = { revision: 0, blocks: [{ kind: 'text', text: 'Wait' },
    { kind: 'stat', label: 'Score', value: 3 }, { kind: 'cards', cards: [{ id: 'a', label: 'A' }] },
    { kind: 'grid', rows: 1, cols: 1, cells: [{ colour: 'seat-1' }] }] };
  expect(sameView(cloneState(view), view)).toBe(true);
  expect(sameView(view, { ...view, blocks: [{ kind: 'text', text: 'Go' }, ...view.blocks.slice(1)] })).toBe(false);
  expect(sameView(view, null)).toBe(false);
  expect(sameView(null, null)).toBe(true);
});

it('same game object skips traversal, but an audience change still refreshes delivery', () => {
  let reads = 0;
  const layout: ControllerLayout = { revision: 0, get controls(): readonly LayoutControl[] {
    reads++; return [{ kind: 'text', id: 'lead', audience: 'leader', text: 'Leader' }];
  } };
  const view: PrivateView = { revision: 0, get blocks(): readonly PanelBlock[] {
    reads++; return [{ kind: 'text', audience: 'leader', text: 'Secret' }];
  } };
  const room = makeRoom(2), transport = new FakeTransport();
  const session = createSession({ game: { ...fixture, controllerLayout: () => layout, privateView: () => view },
    settings: { steps: 100 }, seed: 1, room, context: { firstInRoom: false, data: {}, saved: null, teams: false },
    buffer: createInputBuffer<string>({ axisCount: 4, seqModulus: 65536, staleAfterSteps: 15 }), transport,
    publicView() { /* sink */ }, event() { /* sink */ } });
  const initialReads = reads;
  session.advance(STEP_MS);
  expect(reads).toBe(initialReads);
  expect(transport.sent).toHaveLength(4);
  session.updateRoom({ ...room, leader: 2 });
  expect(reads).toBeGreaterThan(initialReads);
  expect(transport.sent).toHaveLength(8);
});
