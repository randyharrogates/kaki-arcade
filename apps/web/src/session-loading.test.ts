import '../../../content/rabakz/src/bank.d.ts';
import { expect, it, vi } from 'vitest';
import { prepareSession } from './session-loading';
import { loadGame } from './game-registry';
import type { LoadedGame } from './session-adapter';
it('C-16 real Rabakz defaults receive ten seeded questions before init; other modules need no data', async () => {
  const game = await loadGame('rabakz') as unknown as LoadedGame;
  const prepared = await prepareSession(game, 7);
  expect(prepared.settings).toEqual({ length: 10, categories: [], difficulty: 'mixed' });
  const questions = prepared.context.data['selected-questions.json'];
  expect(questions).toHaveLength(10);
  expect((await prepareSession(game, 7)).context.data).toEqual(prepared.context.data);
  const state = game.init(7, [], prepared.settings, prepared.context);
  expect(game.assets(state)).toEqual([]);
  expect(game.publicView(state)).toHaveProperty('correct', null);
  for (const id of ['tabao-rush', 'peek-poker']) {
    const module = await loadGame(id);
    const ready = await prepareSession(module as unknown as LoadedGame, 7);
    expect(ready.context.data).toEqual({});
  }
});

vi.mock('virtual:rabakz-bank', async () => {
  const { rabakzBank } = await import('@kaki/content-rabakz/vite');
  const source = await rabakzBank().load('\0virtual:rabakz-bank');
  if (!source) throw new Error('Missing bank');
  return { default: JSON.parse(source.slice('export default '.length)) as unknown };
});

it('validated selection honours Mixed quotas before init', async () => {
  const game = await loadGame('rabakz') as unknown as LoadedGame;
  const prepared = await prepareSession(game, 7);
  const state = game.init(7, [], prepared.settings, prepared.context);
  const { rabakz } = await import('@kaki/game-rabakz');
  const checked = rabakz.init(7, [], { length: 10, categories: [], difficulty: 'mixed' }, prepared.context);
  expect(checked.questions.filter(q => q.difficulty === 'easy')).toHaveLength(3);
  expect(checked.questions.filter(q => q.difficulty === 'medium')).toHaveLength(4);
  expect(checked.questions.filter(q => q.difficulty === 'hard')).toHaveLength(3);
  expect(game.assets(state)).toEqual([]);
});
