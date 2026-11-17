import { expect, it } from 'vitest';
import { enter, exit } from '@kaki/ui';
import { retainOutgoing } from './fade-layers';
it('NN-5 picker headings overlap even when Starting arrives during the previous crossfade', () => {
  const leavingPicker = retainOutgoing([], { id: 0, content: 'Pick a game' });
  const starting = retainOutgoing(leavingPicker, { id: 1, content: 'Fern starts on their phone' });
  expect(starting.map(layer => layer.content)).toEqual(['Pick a game', 'Fern starts on their phone']);
  // The latest heading enters while both previous identities retain their own exit.
  const incoming = enter({ kind: 'fade', tempo: 'slow', reduced: false });
  const outgoing = exit({ kind: 'fade', tempo: 'slow', reduced: false });
  expect(incoming.keyframes.map(frame => frame.opacity)).toEqual([0, 1]);
  expect(outgoing.keyframes.map(frame => frame.opacity)).toEqual([1, 0]);
  expect(outgoing.options.duration).toBeLessThan(incoming.options.duration);
  // Completing the oldest exit leaves the more recent outgoing line on screen.
  expect(starting.filter(layer => layer.id !== 0).map(layer => layer.content)).toEqual(['Fern starts on their phone']);
});
