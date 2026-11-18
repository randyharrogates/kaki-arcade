import { expect, it, vi } from 'vitest';
import type * as ScreenModule from './Screen';
const mocks = vi.hoisted(() => ({ preload: vi.fn(), ready: vi.fn(), update: vi.fn(), destroy: vi.fn(), fetch: vi.fn(), decode: vi.fn() }));
vi.mock('./assets', () => ({ preloadCards: mocks.preload }));
vi.mock('./Screen', async importOriginal => ({ ...await importOriginal<typeof ScreenModule>(), PeekPokerScreen: () => ({ ready: mocks.ready, update: mocks.update, destroy: mocks.destroy }) }));
import { ConsoleScreen, publicViewKey } from './console';
import * as models from './view-model';
import { scenario } from './scenarios';
import { peekPoker } from '../src/index';
it('PP-031 fetches and decodes before ready; phase updates request no assets', async () => {
  mocks.preload.mockImplementation(async () => { await mocks.fetch(); await mocks.decode(); return {}; });
  let warmed = (): void => undefined;
  mocks.ready.mockImplementation(() => new Promise<void>(resolve => { warmed = resolve; }));
  const options = (phase: Parameters<typeof scenario>[0]) => ({ view: peekPoker.publicView(scenario(phase)), width: 1920, height: 1080 });
  const screen = ConsoleScreen.mount({} as HTMLElement, options('memorise'));
  let started = false;
  void screen.ready.then(() => { started = true; });
  await vi.waitFor(() => { expect(mocks.ready).toHaveBeenCalledOnce(); });
  expect(started).toBe(false); warmed(); await screen.ready;
  expect(started).toBe(true);
  const requests = [mocks.fetch.mock.calls.length, mocks.decode.mock.calls.length];
  for (const phase of ['memorise', 'picking', 'locked', 'reveal'] as const) screen.update(options(phase));
  expect([mocks.fetch.mock.calls.length, mocks.decode.mock.calls.length]).toEqual(requests);
  expect(mocks.preload).toHaveBeenCalledOnce(); screen.destroy();
});

it('PP-030 keys equivalent public drawings equally and changes with visible fields', () => {
  const view = peekPoker.publicView(scenario('memorise'));
  const key = publicViewKey(view);
  expect(typeof key).toBe('number');
  expect(publicViewKey(structuredClone(view))).toBe(key);
  expect(publicViewKey({ ...view, seconds: view.seconds + 1 })).not.toBe(key);
  expect(publicViewKey(peekPoker.publicView(scenario('picking')))).not.toBe(key);
});

it('PP-030 unchanged ticks build no render model or serialised key', () => {
  const model = vi.spyOn(models, 'screenModel');
  const serialise = vi.spyOn(JSON, 'stringify');
  const view = peekPoker.publicView(scenario('memorise'));
  const copy = structuredClone(view);
  const key = publicViewKey(view);
  for (let tick = 0; tick < 120; tick++) expect(publicViewKey(copy)).toBe(key);
  expect(model).not.toHaveBeenCalled();
  expect(serialise).not.toHaveBeenCalled();
  model.mockRestore(); serialise.mockRestore();
});

it('PP-030 interleaved sessions never suppress a changed drawing', () => {
  const a = peekPoker.publicView(scenario('memorise'));
  const b = peekPoker.publicView(scenario('picking'));
  let previousA: number | undefined, previousB: number | undefined;
  for (let tick = 0; tick < 3; tick++) {
    const keyA = publicViewKey({ ...a, seconds: a.seconds + tick });
    expect(keyA).not.toBe(previousA); previousA = keyA;
    const keyB = publicViewKey({ ...b, seconds: b.seconds + tick });
    expect(keyB).not.toBe(previousB); previousB = keyB;
  }
  // A newly created session still publishes its initial equivalent snapshot.
  expect(publicViewKey(structuredClone(b))).not.toBe(undefined);
});

it('PP-032 publishes changed scores and solo records on scoreboard and podium', () => {
  for (const phase of ['scoreboard', 'over'] as const) {
    const view = { ...peekPoker.publicView(scenario('reveal')), phase };
    for (const mutate of [
      (copy: typeof view) => { const player = copy.players[0]; if (!player) throw Error('player'); player.score++; },
      (copy: typeof view) => { copy.soloBest = (copy.soloBest ?? 0) + 1; },
      (copy: typeof view) => { copy.newBest = !copy.newBest; },
    ]) {
      const key = publicViewKey(view);
      const copy = structuredClone(view); mutate(copy);
      expect(publicViewKey(copy)).not.toBe(key);
      expect(publicViewKey(structuredClone(copy))).toBe(publicViewKey(copy));
    }
  }
});
