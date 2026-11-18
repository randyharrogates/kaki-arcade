import { expect, it } from 'vitest';
import { gamepadPoll } from './gamepad-poll';
const pad = (index: number, button: number) => ({ index, mapping: 'standard', buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === button })) }) as unknown as Gamepad;
it('CTRL-009 leaves once on Back, ignores other pads, and clears unplugged bindings', () => {
  const history: boolean[][] = [];
  expect(gamepadPoll(history, [pad(0, 8)], 0, 'lobby')).toEqual([{ type: 'leave' }]);
  expect(gamepadPoll(history, [pad(0, 8)], 0, 'lobby')).toEqual([]);
  expect(gamepadPoll([], [pad(0, 8)], undefined, 'lobby')).toEqual([]);
  expect(gamepadPoll([], [pad(0, -1), pad(1, 8)], 0, 'lobby')).toEqual([]);
  expect(gamepadPoll([], [null], 0, 'playing')).toEqual([{ type: 'clear' }]);
});
it('CTRL-009 only offers joins in lobby and does not bind a refused join', () => {
  expect(gamepadPoll([], [pad(0, 9)], undefined, 'playing')).toEqual([]);
  expect(gamepadPoll([], [pad(0, 9)], undefined, 'lobby')).toEqual([{ type: 'join', index: 0 }]);
  expect(gamepadPoll([], [pad(0, 8)], undefined, 'lobby')).toEqual([]);
});

it('CTRL-009 Start pauses and pause navigation uses keyboard keys', () => {
  expect(gamepadPoll([], [pad(0, 9)], 0, 'playing')).toEqual([{ type: 'key', key: 'Escape' }]);
  for (const [button, key] of [[12, 'ArrowUp'], [13, 'ArrowDown'], [0, 'Enter']] as const)
    expect(gamepadPoll([], [pad(0, button)], 0, 'paused')).toEqual([{ type: 'key', key }]);
});

it('CTRL-009 starts on connection or an existing pad, stops on the last disconnect and publishes only changes', async () => {
  const { watchGamepads } = await import('./gamepad-poll');
  let pads: (Gamepad | null)[] = [];
  const events = new Map<string, () => void>();
  let callback: (() => void) | undefined;
  let starts = 0, stops = 0, ticks = 0;
  const changes: boolean[] = [];
  const target = {
    addEventListener: (name: string, fn: () => void) => { events.set(name, fn); },
    removeEventListener: (name: string) => { events.delete(name); },
    setInterval: (fn: () => void) => { starts++; callback = fn; return starts; },
    clearInterval: () => { stops++; },
  } as unknown as Window;
  const source = { getGamepads: () => pads };
  const stop = watchGamepads(target, source, () => { ticks++; }, value => changes.push(value));
  expect(starts).toBe(0);
  pads = [pad(0, -1)]; events.get('gamepadconnected')?.();
  callback?.(); callback?.();
  expect(starts).toBe(1); expect(ticks).toBe(2); expect(changes).toEqual([true]);
  pads.push(pad(1, -1)); events.get('gamepadconnected')?.();
  pads[0] = null; events.get('gamepaddisconnected')?.(); expect(stops).toBe(0);
  pads = []; events.get('gamepaddisconnected')?.(); expect(stops).toBe(1); expect(changes).toEqual([true, false]);
  stop(); expect(events.size).toBe(0);
  pads = [pad(0, -1)];
  watchGamepads(target, source, () => { ticks++; }, () => undefined)();
  expect(starts).toBe(2); expect(stops).toBe(2);
});
