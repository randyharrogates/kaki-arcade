import { afterEach, expect, it, vi } from 'vitest';
import type { VNode } from 'preact';
import type { PhoneMessage } from '@kaki/protocol';
import type { LayoutEngineProps } from '../../../packages/controller-kit/src/layout-renderer';
import { STEP_MS } from '@kaki/platform';
import type { PhoneReconnectDial } from '@kaki/platform';
import { tabaoRush } from '../../../games/tabao-rush/src/rules/game';
import { twin } from '../../../packages/platform/src/session/testing.fixture';
import { GameController } from './phone-route';
import { createPhone, phoneController, phoneView } from './phone';
import { Clock, MemoryStorage, CODE, SECRET } from './testing.fixture';

const hooks = vi.hoisted(() => ({ state: 0 }));
vi.mock('preact/hooks', () => ({
  useState: (initial: unknown) => [hooks.state++ === 0 ? { width: 844, height: 322, viewport: { width: 844, height: 390 } } : initial, vi.fn()],
  useRef: (current: unknown) => ({ current }),
  useMemo: (compute: () => unknown) => compute(),
  useEffect: vi.fn(),
  useLayoutEffect: vi.fn(),
}));
afterEach(() => { hooks.state = 0; });
function find(node: VNode, predicate: (node: VNode) => boolean): VNode | undefined {
  if (predicate(node)) return node;
  const children = (node.props as { children?: unknown }).children;
  for (const child of [children].flat(Infinity)) {
    if (child && typeof child === 'object' && 'props' in child) {
      const found = find(child as VNode, predicate);
      if (found) return found;
    }
  }
  return undefined;
}
it.each([false, true])('CTRL-005 CTRL-006 first visible Ready reaches the host before pictures load (tutorial %s)', firstInRoom => {
  const t = twin({ game: tabaoRush, seed: 42, players: 3, settings: {}, context: { firstInRoom } });
  try {
    for (let seat = 1; seat <= 3; seat++) {
      const connection = `c${String(seat)}`;
      let dial: PhoneReconnectDial | undefined;
      let view = phoneView('entry');
      const sent = vi.fn((message: PhoneMessage) => {
        if (message.t === 'action') {
          const data = message.data as { control: string; value: string };
          t.transport.tap(connection, data.control, data.value, message.rev);
        }
        return true;
      });
      const phone = createPhone({ clock: new Clock(), storage: new MemoryStorage(), dial(options) {
        dial = options; options.onPeer({ sendPhone: sent }); return { stop() { /* No link resources. */ } };
      } }, null, next => { view = next; });
      phone.join(CODE, 'Cook');
      if (!dial) throw Error('Missing phone');
      dial.onControl({ v: 1, t: 'seat', seat: seat as 1 | 2 | 3, colour: seat - 1, name: 'Cook', nameReplaced: false, resumed: false, seatToken: SECRET });
      dial.onControl({ v: 1, t: 'room', phase: 'playing', players: 3, leader: seat === 1, team: null });
      dial.onControl({ v: 1, t: 'picker-state', revision: 1, screen: 'starting', leaderName: 'Cook',
        game: { id: 'tabao-rush', name: 'Tabao Rush', blurb: 'Cook together', min: 1, max: 8 }, reason: null, failed: false });
      const layout = t.transport.lastLayout.get(connection);
      if (!layout) throw Error('Missing picker');
      dial.onControl({ v: 1, t: 'layout', rev: layout.revision, layout });
      dial.onControl({ v: 1, t: 'view', rev: 0, view: null });
      const controller = phoneController(view);
      if (!controller) throw Error('Missing controller');
      // Initial render: image effect has not resolved; the real picker and Ready are visible.
      hooks.state = 0;
      const tree = GameController({ controller, view, send: output => { phone.controllerInput(output); } });
      const engine = find(tree, node => typeof node.type === 'function' && node.type.name === 'LayoutEngine');
      if (!engine) throw Error('Missing visible layout');
      const props = engine.props as unknown as LayoutEngineProps;
      props.onOutput({ control: 'ready', value: 'ready', phase: 'choose', revision: layout.revision });
      expect(sent).toHaveBeenCalledOnce();
      t.session.advance(STEP_MS);
      expect(t.session.state?.picks?.find(p => p.player === `seat-${String(seat)}`)?.ready).toBe(true);
      const area = find(tree, node => (node.props as { class?: string }).class === 'phone-game-controls');
      expect((area?.props as unknown as { inert: boolean }).inert).toBe(false);
      phone.stop();
    }
    expect(t.session.state?.phase).toBe(firstInRoom ? 'tutorial' : 'play');
  } finally { t.session.quit('seat-1', true); }
});

it.each(['paused', 'disconnected'] as const)('CTRL-006 picture loading preserves the %s input guard', mode => {
  const state = tabaoRush.init(42, [{ id: 'seat-1', seat: 1, name: 'Cook', colour: 'seat-1' }], {}, { firstInRoom: false, teams: false, data: {}, saved: null });
  const view = { ...phoneView('lobby', { seat: 1, leader: true, phase: mode === 'paused' ? 'paused' : 'playing' }), connected: mode !== 'disconnected', layout: true, gameLayout: tabaoRush.controllerLayout(state, 'seat-1') };
  const controller = phoneController(view);
  if (!controller) throw Error('Missing controller');
  const send = vi.fn();
  hooks.state = 0;
  const tree = GameController({ controller, view, send });
  const engine = find(tree, node => typeof node.type === 'function' && node.type.name === 'LayoutEngine');
  if (!engine) throw Error('Missing layout');
  (engine.props as unknown as LayoutEngineProps).onOutput({ control: 'ready', value: 'ready', phase: 'choose', revision: 0 });
  expect(send).not.toHaveBeenCalled();
  const area = find(tree, node => (node.props as { class?: string }).class === 'phone-game-controls');
  expect((area?.props as unknown as { inert: boolean }).inert).toBe(true);
});
