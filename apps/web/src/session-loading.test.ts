import '../../../content/rabakz/src/bank.d.ts';
import { expect, it, vi } from 'vitest';
import { prepareSetup, prepareSession } from './session-loading';
import { settingsView, reconcileSettings } from './game-setup';
import { gameMetas, loadGame } from './game-registry';
import type { SessionTransportEvent } from '@kaki/platform';
import type { LoadedGame } from './session-adapter';
import type { rabakz } from '@kaki/game-rabakz';
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

it('RZ-015 seeded selection avoids recent ids, falls back oldest first and never repeats', async () => {
  const { questions } = await import('@kaki/content-rabakz/session');
  const { createRng, nextFloat } = await import('@kaki/sim-core');
  const settings = { count: 10, categories: 'mixed', difficulty: 'mixed' } as const;
  const select = async (recent: readonly string[]) => { const rng = createRng(42); return questions(settings, () => nextFloat(rng), recent); };
  const first = (await select([])).map(q => q.id);
  const second = (await select(first)).map(q => q.id);
  expect(second).toEqual((await select(first)).map(q => q.id));
  expect(second.every(id => !first.includes(id))).toBe(true);
  expect(new Set(second).size).toBe(10);
  // Collect the whole eligible pool without depending on its size or generated ids.
  const bank = (await import('virtual:rabakz-bank')).default;
  const all = bank.files.flatMap(file => ((JSON.parse(file.text) as { questions?: { id: string }[] }).questions ?? []).map(q => q.id));
  const fallback = (await select(all)).map(q => q.id);
  expect(new Set(fallback)).toEqual(new Set(all.slice(0, 10)));
  expect(new Set(fallback).size).toBe(10);
});

it('RZ-015 real cached console host saves a completed match and reads recent ids before the next init', async () => {
  const { createRoom, applyPhoneEvent } = await import('@kaki/platform');
  const { createSessionAdapter } = await import('./session-adapter');
  const { loadSessionGame } = await import('./session-loading');
  const data = new Map<string, string>();
  let unreadable = false;
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => { if (unreadable) throw new Error('blocked read'); return data.get(key) ?? null; },
    setItem: (key: string, value: string) => { expect(inFrame).toBe(false); data.set(key, value); writes++; },
  });
  const record = () => JSON.parse(data.get('kaki.host-device.game.rabakz.progress-v1') ?? '{}') as { data?: { recent: string[]; bests: Record<string, number> } };
  const room = applyPhoneEvent(createRoom(), { connectionId: 'phone', deviceId: 'device' },
    { type: 'join', name: 'Guest', seatToken: '1'.repeat(32) }, 0).state;
  let answer = 0;
  const load = vi.fn(async (id: string) => {
    const loaded = await loadSessionGame(id);
    const init = loaded.game.init.bind(loaded.game);
    return { ...loaded, game: { ...loaded.game, init(...args: Parameters<typeof init>) {
      const state = init(...args) as ReturnType<typeof rabakz.init>;
      answer = state.questions[0]?.correct ?? 0;
      return state;
    } } };
  });
  let receive: (event: SessionTransportEvent) => void = () => undefined;
  let revision = 0;
  let bestAtStart: number | undefined;
  let writes = 0;
  let frame: (ms: number) => void = () => undefined;
  let inFrame = false;
  const progress = { finished: false };
  const isFinished = () => progress.finished;
  let seen = new Map<number, string>();
  const adapter = createSessionAdapter({
    load, prepare: prepareSession, assets: () => Promise.resolve(), seed: () => 42,
    transport: { sendLayout: (_connection, layout) => { revision = layout.revision; return true; }, sendPrivateView: () => true,
      status: () => undefined, fence: () => undefined, subscribe(callback) { receive = callback; return () => undefined; } },
    frames: { subscribe(callback) { frame = callback; return () => { frame = () => undefined; }; } },
    display(display) {
      if (!display) return;
      const view = display.view as ReturnType<typeof rabakz.publicView>;
      if (view.phase === 'question' && view.question) { seen.set(view.round, view.question.id); if (view.round === 1) bestAtStart = view.soloBest; }
    },
    event(event) { expect(event.type).not.toBe('error'); if (event.type === 'results') progress.finished = true; },
  });
  try {
    const setup = await adapter.setup('rabakz', false);
    expect(setup.context.saved).toBeNull();
    const settings = { length: 10, categories: [], difficulty: 'mixed' };
    const matches: string[][] = [];
    for (let match = 0; match < 2; match++) {
      progress.finished = false; seen = new Map();
      await adapter.start('rabakz', room, settings);
      expect(bestAtStart).toBe(match === 0 ? undefined : 100);
      if (match === 0) receive({ type: 'tap', connectionId: 'phone', action: { control: 'answer', revision, value: String(answer) } });
      // Idle timeout completes each question through the real session; no fabricated
      // over-state or direct call to the records wrapper's results method.
      for (let i = 0; i < 5000 && !isFinished(); i++) { inFrame = true; frame(100); inFrame = false; }
      expect(progress.finished).toBe(true);
      expect(seen.size).toBe(10);
      const ids = [...seen.values()];
      expect(new Set(ids).size).toBe(10);
      matches.push(ids);
      await vi.waitFor(() => { expect(record().data?.recent).toEqual(matches.flat()); });
      adapter.continueResults(); adapter.backToPicker();
    }
    expect(matches[1]?.every(id => !matches[0]?.includes(id))).toBe(true);
    seen = new Map();
    await adapter.start('rabakz', room, settings);
    const quitIds = [...seen.values()];
    adapter.command('quit', 'seat-1');
    await vi.waitFor(() => { expect(record().data?.recent).toEqual([...matches.flat(), quitIds[0]]); });
    expect(record().data?.bests).toEqual({ '10': 100 });
    expect(writes).toBe(3);
    const beforeUnreadable = new Map(data);
    unreadable = true;
    await adapter.start('rabakz', room, settings);
    expect(bestAtStart).toBeUndefined();
    unreadable = false; // Writes work again, but this match must still never write.
    adapter.command('quit', 'seat-1');
    await new Promise<void>(resolve => { setTimeout(resolve, 0); });
    expect(data).toEqual(beforeUnreadable);
    expect(writes).toBe(3);
    expect(load).toHaveBeenCalledOnce(); // The console reuses the module across matches.
    expect(data.has('kaki.host-device.game.rabakz.progress-v1')).toBe(true);
  } finally { adapter.stop(); vi.unstubAllGlobals(); }
});

it('RZ-013 shell confirms a new best only after a successful store write; unreadable records hide it', async () => {
  const { saveSession } = await import('./session-loading');
  const { rabakz } = await import('@kaki/game-rabakz');
  let stored: string | null = null;
  let blocked = false;
  vi.stubGlobal('localStorage', {
    getItem: () => { if (blocked) throw new Error('blocked'); return stored; },
    setItem: (_key: string, value: string) => { if (blocked) throw new Error('blocked'); stored = value; },
  });
  try {
    const game = rabakz as unknown as LoadedGame;
    const ready = await prepareSession(game, 42);
    const initial = rabakz.init(42, [{ id: 'one', name: 'Guest', seat: 1, colour: 'seat-1' }], { length: 10, difficulty: 'mixed' }, ready.context);
    const seat = initial.players[0];
    if (!seat) throw new Error('Missing seat');
    const end = { ...initial, phase: 'over' as const, round: 9, players: [{ ...seat, score: 100 }] };
    const view = rabakz.publicView(end);
    blocked = true;
    expect(await saveSession(game, end, view)).toMatchObject({ newBest: false });
    blocked = false;
    expect(await saveSession(game, end, view)).toMatchObject({ soloBest: 100, newBest: true });
    for (const corrupt of ['oops', JSON.stringify({ schemaVersion: 2, data: {} })]) {
      stored = corrupt;
      expect((await prepareSession(game, 42)).context.saved).toEqual({ recent: [], bests: {} });
    }
    blocked = true;
    const unreadable = await prepareSession(game, 42);
    expect(unreadable.context.saved).toBeNull();
    const original = stored;
    blocked = false;
    expect(await saveSession(game, end, view, unreadable.context.saved !== null)).toEqual(view);
    expect(stored).toBe(original);
  } finally { vi.unstubAllGlobals(); }
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
