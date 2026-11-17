import { QUESTION_DATA, questionData } from '../../games/rabakz/src/index';
import type { Question } from '../../games/rabakz/src/index';
import { Session } from 'node:inspector';
import { PerformanceObserver, performance } from 'node:perf_hooks';
import { setImmediate } from 'node:timers/promises';
import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createMatch } from '../../packages/platform/src/harness/match';
import { createBots } from '../../packages/platform/src/harness/bots';
import type { AnyGameModule, JsonValue } from '../../packages/platform/src/game/types';
import { hashState } from '../../packages/sim-core/src/index';
import { clockTick, resolution, summary } from './metrics.js';
interface HeapNode { id?: number; selfSize: number; callFrame: { functionName: string; url: string }; children: HeapNode[] }
export function allocationSources(node: HeapNode, totals: Record<string, number> = {}, caller = '(V8/native/unknown)', nodes: Record<number, string> = {}) {
  const source = node.callFrame.url || caller;
  if (node.id !== undefined) nodes[node.id] = source; totals[source] = (totals[source] ?? 0) + node.selfSize;
  for (const child of node.children) allocationSources(child, totals, source, nodes);
  return totals;
}
export async function installedGames(root: string): Promise<AnyGameModule[]> {
  const result: AnyGameModule[] = [];
  for (const entry of (await readdir(resolve(root, 'games'), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const exports: unknown = await import(pathToFileURL(resolve(root, 'games', entry.name, 'src/index.ts')).href);
    const game = Object.values(exports as object).find((v: unknown) => v !== null && typeof v === 'object' && 'meta' in v && 'init' in v && 'step' in v) as AnyGameModule | undefined;
    if (!game) throw new Error(`No game module: ${entry.name}`);
    result.push(game);
  }
  return result;
}
export function runMatch(game: AnyGameModule, players: number, maxSteps = 216000, measured = true) {
  const times: number[] = [], driver: number[] = [];
  // Module boundary deliberately uses the published AnyGameModule erased state type.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return
  const instrumented: AnyGameModule = { ...game, step(state, inputs, dt) { const start = performance.now(); const next = game.step(state, inputs, dt); if (measured) times.push(performance.now() - start); return next; } };
  const data: Record<string, JsonValue> = Object.fromEntries((game.preload?.(null) ?? []).filter(a => a.kind === 'data').map(a => [a.key, []]));
  const defaults = typeof game.settings === 'function' ? game.settings({ data, saved: null, teams: false }) : game.settings;
  const length = defaults.fields.find(f => f.id === 'length')?.default;
  for (const asset of game.preload?.(Object.fromEntries(defaults.fields.map(f => [f.id, f.default]))) ?? []) {
    if (asset.kind !== 'data' || asset.key in data) continue;
    // Module-declared question payload and public content types, without an id switch.
    if (asset.key === QUESTION_DATA) data[asset.key] = questionData(Array.from({ length: typeof length === 'number' ? length : 10 }, (_, i): Question => ({ id: `perf-${String(i)}`, prompt: 'Performance fixture', options: ['A', 'B', 'C', 'D'], correct: i % 4, category: 'perf', difficulty: 'easy', type: 'multiple-choice', region: 'general' })));
    else throw new Error(`Unsupported performance preload: ${asset.key}`);
  }
  const match = createMatch(instrumented, { seed: 808, players, record: false, context: { data } });
  const bots = createBots(match, { seed: 808 });
  const start = performance.now();
  while (!match.isOver && !match.blocked && match.steps < maxSteps) { const before = performance.now(); bots.step(); if (measured) driver.push(performance.now() - before); }
  return { steps: match.steps, simulatedSeconds: match.steps / 60, elapsedMs: performance.now() - start, complete: match.isOver, hash: hashState(match.state), stepMs: summary(times), driverMs: summary(driver) };
}
export async function measureGame(game: AnyGameModule, players: number, maxSteps?: number) {
  if (players < game.meta.players.min || players > game.meta.players.max) return { game: game.meta.id, players, status: 'not assessed', reason: 'Player count unsupported by module' };
  runMatch(game, players, maxSteps, false);
  const tick = clockTick();
  global.gc?.(); await setImmediate();
  const pauses: number[] = [];
  const observer = new PerformanceObserver(list => { for (const entry of list.getEntries()) if (entry.startTime >= start && entry.startTime <= end) pauses.push(entry.duration); });
  observer.observe({ entryTypes: ['gc'] });
  const start = performance.now(); let end = Infinity;
  const result = runMatch(game, players, maxSteps); end = performance.now();
  await setImmediate(); await setImmediate(); observer.disconnect();
  if (!result.complete && maxSteps === undefined) throw new Error(`${game.meta.id}: full match did not finish within safety cap`);
  const session = new Session(); session.connect();
  const post = (method: string, params: object = {}) => new Promise<unknown>((resolve, reject) => { session.post(method, params, (error, value) => { if (error) reject(error); else resolve(value); }); });
  let allocation: object;
  try {
    await post('HeapProfiler.startSampling', { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    const allocationRun = runMatch(game, players, maxSteps, false);
    const profile = await post('HeapProfiler.stopSampling') as { profile: { head: HeapNode; samples: { size: number; nodeId: number }[] } };
    const samples = profile.profile.samples;
    if (allocationRun.hash !== result.hash) throw new Error('Allocation run diverged from timing run');
    const nodes: Record<number, string> = {};
    const sources = allocationSources(profile.profile.head, {}, undefined, nodes);
    const sourceSamples: Record<string, number[]> = {};
    for (const sample of samples) { const source = nodes[sample.nodeId] ?? '(unknown)'; (sourceSamples[source] ??= []).push(sample.size); }
    const error = (values: number[]) => 1.96 * Math.sqrt(values.reduce((sum, size) => sum + size * size, 0)) / allocationRun.steps;
    const gameSource = (source: string) => source.includes(`/games/${game.meta.id}/`) || source.includes('/packages/sim-core/');
    allocation = { sourceBytesPerStep: Object.fromEntries(Object.entries(sources).map(([source, bytes]) => [source, bytes / allocationRun.steps])),
      source95ErrorBytesPerStep: Object.fromEntries(Object.entries(sourceSamples).map(([source, values]) => [source, error(values)])),
      gameBytesPerStep: Object.entries(sources).filter(([source]) => gameSource(source)).reduce((sum, [, bytes]) => sum + bytes, 0) / allocationRun.steps,
      game95ErrorBytesPerStep: error(samples.filter(sample => gameSource(nodes[sample.nodeId] ?? '')).map(sample => sample.size)),
      method: 'V8 HeapProfiler sampling, 4096-byte interval; collected objects included; built-ins attributed to nearest JS caller', bytesPerStep: samples.reduce((n, s) => n + s.size, 0) / allocationRun.steps, samples: samples.length, approximate95PercentRelativeError: samples.length ? 196 / Math.sqrt(samples.length) : null, caveat: 'Statistical error only; systematic sampling bias unknown', deterministic: allocationRun.hash === result.hash };

  } finally { session.disconnect(); }
  return { game: game.meta.id, players, ...result, clockTickMs: tick, timingResolution: { stepMs: resolution(result.stepMs, tick), driverMs: resolution(result.driverMs, tick), gcMs: resolution(summary(pauses), tick) }, allocation, gc: { method: 'Node PerformanceObserver gc; measured time pass only; forced pre-run GC excluded', exposedGC: Boolean(global.gc), pausesMs: pauses, ...summary(pauses) } };
}
