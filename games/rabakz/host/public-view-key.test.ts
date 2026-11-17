import { expect, it } from 'vitest';
import { publicViewKey } from './index';
import { rabakz } from '../src/index';
import { scenario } from './scenarios';

it('PERF-001 unchanged display fields retain the key, while score and phase changes invalidate it', () => {
  const view = rabakz.publicView(scenario('one-player'));
  const key = publicViewKey(view);
  expect(publicViewKey(structuredClone(view))).toBe(key);
  const next = structuredClone(view);
  const player = next.players[0];
  if (!player) throw new Error('Missing player');
  player.score++;
  const changed = publicViewKey(next);
  expect(changed).not.toBe(key);
  expect(publicViewKey(structuredClone(next))).toBe(changed);
  expect(publicViewKey({ ...next, phase: 'final' })).not.toBe(changed);
});
