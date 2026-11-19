import { expect, it } from 'vitest';
import { STEP_MS } from '@kaki/platform';
import type { PhoneReconnectDial } from '@kaki/platform';
import { createHostInput, createPhoneInput } from '../../../packages/netcode/src/index';
import { createPhone } from './phone';
import { Clock, MemoryStorage, CODE, SECRET } from './testing.fixture';
import { twin } from '../../../packages/platform/src/session/testing.fixture';
import { tabaoRush } from '../../../games/tabao-rush/src/rules/game';

function rig() {
  const t = twin({ game: tabaoRush, seed: 42, players: 2, settings: {} });
  const clock = new Clock();
  const receiver = createHostInput(t.buffer, 'seat-1');
  const inputSender = createPhoneInput(clock, bytes => receiver.receive(bytes));
  let dial: PhoneReconnectDial | undefined;
  const phone = createPhone({ clock, storage: new MemoryStorage(), dial(options) {
    dial = options;
    const peer = { sendPhone: () => true, inputSender };
    options.onPeer(peer);
    return { stop() { inputSender.stop(); } };
  } }, null, () => undefined);
  phone.join(CODE, 'Cook');
  if (!dial) throw new Error('No dial');
  dial.onControl({ v: 1, t: 'seat', seat: 1, colour: 0, name: 'Cook', nameReplaced: false, resumed: false, seatToken: SECRET });
  dial.onControl({ v: 1, t: 'room', phase: 'playing', players: 2, leader: true, team: null });
  t.transport.tap('c1', 'ready', 'ready');
  t.transport.tap('c2', 'ready', 'ready');
  t.session.advance(STEP_MS);
  expect(t.session.state?.phase).toBe('play');
  const layout = t.transport.lastLayout.get('c1');
  if (!layout) throw new Error('No layout');
  dial.onControl({ v: 1, t: 'layout', rev: layout.revision, layout });
  dial.onControl({ v: 1, t: 'view', rev: 1, view: null });
  return { t, clock, phone, dial, layout, inputSender,
    advance(n = 1) { for (let i = 0; i < n; i++) { clock.advance(STEP_MS); t.session.advance(STEP_MS); } },
    hold(control: string, value: { x: number; y: number } | boolean) {
      phone.controllerInput({ revision: layout.revision, control, phase: typeof value === 'object' ? 'change' : value ? 'press' : 'release', value });
    },
  };
}

it('TR-020 real phone stick moves a cook after picker and remains held between changes', () => {
  const { t, clock, phone, layout } = rig();
  const before = t.session.state?.cooks[0]?.x ?? 0;
  phone.controllerInput({ revision: layout.revision, control: 'move', phase: 'change', value: { x: 1, y: 0 } });
  t.session.advance(STEP_MS);
  expect(t.session.state?.cooks[0]?.x).toBeGreaterThan(before);
  const first = t.session.state?.cooks[0]?.x ?? 0;
  // Stay clear of the second cook: collision separation can move an idle cook.
  for (let i = 0; i < 4; i++) { clock.advance(STEP_MS); t.session.advance(STEP_MS); }
  expect(t.session.state?.cooks[0]?.x).toBeGreaterThan(first);
  phone.controllerInput({ revision: layout.revision, control: 'move', phase: 'change', value: { x: 0, y: 0 } });
  clock.advance(STEP_MS); t.session.advance(STEP_MS);
  const stopped = t.session.state?.cooks[0]?.x;
  clock.advance(STEP_MS); t.session.advance(STEP_MS);
  expect(t.session.state?.cooks[0]?.x).toBe(stopped);
  phone.stop();
});


it('NET-005 CTRL-005 TR-020 hold, pause, release and resume stays neutral', () => {
  const r = rig();
  r.hold('move', { x: 1, y: 0 }); r.advance();
  r.dial.onControl({ v: 1, t: 'room', phase: 'paused', players: 2, leader: true, team: null });
  r.phone.controllerInput({ revision: r.layout.revision, control: 'move', phase: 'release', value: { x: 0, y: 0 } });
  r.dial.onControl({ v: 1, t: 'room', phase: 'playing', players: 2, leader: true, team: null });
  const x = r.t.session.state?.cooks[0]?.x;
  r.advance(4);
  expect(r.t.session.state?.cooks[0]?.x).toBe(x);
  r.phone.stop();
});

it('NET-005 CTRL-005 TR-020 new peer clears held input without begin', () => {
  const r = rig();
  r.hold('move', { x: 1, y: 0 }); r.advance();
  const peer = { sendPhone: () => true, inputSender: r.inputSender };
  r.dial.onPeer(peer);
  const x = r.t.session.state?.cooks[0]?.x;
  r.advance(4);
  expect(r.t.session.state?.cooks[0]?.x).toBe(x);
  r.phone.stop();
});

it('NET-005 CTRL-005 TR-020 fresh-sender redial then Cross does not resend stale stick', () => {
  const r = rig();
  r.hold('move', { x: -1, y: 0 }); r.advance();
  // The old link dies without neutral; the new host receiver resets its buffer.
  r.inputSender.stop();
  const receiver = createHostInput(r.t.buffer, 'seat-1');
  const inputSender = createPhoneInput(r.clock, bytes => receiver.receive(bytes));
  const peer = { sendPhone: () => true, inputSender };
  r.dial.onPeer(peer);
  r.advance(5);
  const before = r.t.session.state?.cooks[0];
  r.hold('cross', true); r.advance(10);
  expect(r.t.session.state?.cooks[0]?.x).toBe(before?.x);
  expect(r.t.session.state?.cooks[0]?.y).toBe(before?.y);
  r.phone.stop(); inputSender.stop();
});

it('CTRL-005 TR-020 team setup neutralises held stick and buttons', () => {
  const r = rig();
  r.hold('move', { x: -1, y: 0 }); r.hold('circle', true); r.advance();
  r.dial.onControl({ v: 1, t: 'view', rev: 2, view: {
    kind: 'team-setup', revision: 2, screen: 'teams', enabled: true, players: [], error: null,
  } });
  r.advance();
  expect(r.t.buffer.sample().get('seat-1')).toMatchObject({ held: 0, axes: [0, 0, 0, 0] });
  const before = r.t.session.state?.cooks[0];
  r.advance(4);
  expect(r.t.session.state?.cooks[0]?.x).toBe(before?.x);
  r.phone.stop();
});

it('CTRL-005 TR-020 layout removal releases Cross through sender and receiver', () => {
  const r = rig();
  r.hold('cross', true); r.advance();
  r.dial.onControl({ v: 1, t: 'layout', rev: r.layout.revision + 1,
    layout: { ...r.layout, revision: r.layout.revision + 1, controls: r.layout.controls.filter(c => c.id !== 'cross') } });
  r.advance();
  expect(r.t.buffer.sample().get('seat-1')?.held).toBe(0);
  r.hold('cross', false); r.advance();
  expect(r.t.buffer.sample().get('seat-1')?.held).toBe(0);
  r.phone.stop();
});

it('TR-020 Cross picks up cucumber through the real sender and receiver', () => {
  const r = rig();
  r.t.buffer.receive('seat-2', 0, 0, [0, 1, 0, 0]); r.advance(15);
  r.t.buffer.receive('seat-2', 1, 0, [0, 0, 0, 0]);
  r.hold('move', { x: 1, y: 0 }); r.advance(40);
  r.hold('move', { x: 0, y: -1 }); r.advance(1);
  r.hold('move', { x: 0, y: 0 }); r.advance();
  r.hold('cross', true); r.advance();
  expect(r.t.session.state?.inventory.held['seat-1']?.ingredient).toBe('cucumber');
  r.phone.stop();
});
