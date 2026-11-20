import { expect, it, vi } from 'vitest';
import { consoleE2e as game } from './console-e2e.fixture';
import type { PlayerInfo, StepInputs } from '@kaki/platform';
import { loadGame, gameMetas } from './game-registry';
const players: PlayerInfo[] = Array.from({ length: 8 }, (_, i) => ({ id: `seat-${String(i + 1)}`, seat: i + 1, name: `Phone ${String(i + 1)}`, colour: `seat-${String(i + 1)}` as PlayerInfo['colour'] }));
it('PLAT-030 fixture is deterministic, counts all eight inputs and isolates secrets', () => {
  const context = { firstInRoom: false, data: {}, saved: null, teams: false };
  const initial = game.init(15, players, {}, context);
  const inputs: StepInputs = { frames: new Map(), disconnected: [], connected: new Map(players.map(p => [p.id, true])), actions: players.map(p => ({ player: p.id, control: 'advance', revision: 1 })), leader: 'seat-1' };
  const next = game.step(initial, inputs, 1000 / 60);
  expect(next).toEqual(game.step(game.init(15, players, {}, context), inputs, 1000 / 60));
  expect(game.publicView(next)).toEqual({ steps: 1, total: 8 });
  expect(game.publicView(initial).total).toBe(0);
  if (!game.scrambleSecrets) throw new Error('No secret scrambling');
  for (const p of players) {
    const secret = initial.secrets[p.id];
    expect(JSON.stringify(game.privateView(next, p.id))).toContain(secret);
    expect(JSON.stringify(game.publicView(next))).not.toContain(secret);
    for (const other of players.filter(other => other.id !== p.id)) expect(JSON.stringify(game.privateView(next, other.id))).not.toContain(secret);
    expect(game.publicView(game.scrambleSecrets(next, null, 7))).toEqual(game.publicView(next));
  }
  expect(game.results(next).score).toBe(8);
  expect(game.assets(next)).toEqual([]);
});
it('PLAT-030 fixture is absent and cannot load without the development query flag', async () => {
  expect(gameMetas.some(meta => meta.id === 'console-e2e')).toBe(false);
  await expect(loadGame('console-e2e')).rejects.toThrow('Fixture disabled');
});

it('PLAT-030 explicit development flag registers the fixture through the normal loader', async () => {
  vi.stubGlobal('location', { search: '?fixture=console-e2e' }); vi.resetModules();
  try {
    const registry = await import('./game-registry');
    expect(registry.gameMetas.map(meta => meta.id)).toEqual(['console-e2e']);
    const loaded = await registry.loadGame('console-e2e');
    expect(loaded.meta).toEqual(registry.gameMetas[0]);
    expect(registry.validGameSelection('console-e2e', {})).toBe(true);
    expect(await registry.sessionRegistrations['console-e2e']?.screen?.()).toBeDefined();
  } finally { vi.unstubAllGlobals(); vi.resetModules(); }
});
