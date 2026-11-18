import '../../../content/rabakz/src/bank.d.ts';
import { expect, it, vi } from 'vitest';
import { prepareSetup, prepareSession } from './session-loading';
import { settingsView, reconcileSettings } from './game-setup';
import { gameMetas, loadGame } from './game-registry';
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

vi.mock('virtual:rabakz-bank-index', async () => {
  const { rabakzBank } = await import('@kaki/content-rabakz/vite');
  const source = await rabakzBank().load('\0virtual:rabakz-bank-index');
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

it('PLAT-025 prepares Rabakz team data/settings with the selected team context', async () => {
  const game = await loadGame('rabakz') as unknown as LoadedGame;
  const ready = await prepareSession(game, 7, true);
  expect(ready.context.teams).toBe(true);
  expect(ready.context.data['selected-questions.json']).toHaveLength(10);
});

it('PLAT-006/025 loads setup data for the real sixteen-option form and keeps its wire view below 4096 bytes', async () => {
  const game = await loadGame(gameMetas[2]?.id ?? '') as unknown as LoadedGame;
  const setup = await prepareSetup(game);
  const settings = settingsView(setup.schema, reconcileSettings(setup.schema));
  const multi = settings.fields.find(field => field.kind === 'multi');
  expect(multi?.kind === 'multi' ? multi.options : []).toHaveLength(16);
  const view = { kind: 'team-setup', revision: 1, screen: 'choice', enabled: false, teamsOffered: true, teamsReason: null, settings, players: [], error: null };
  expect(new TextEncoder().encode(JSON.stringify(view)).byteLength).toBeLessThanOrEqual(4096);
});
