/* eslint-disable no-console -- Node command-line output. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AnyGameModule, SetupContext } from '../src/game/types';
import { createMatch, replayMatch, parseRecording } from '../src/harness/match';
import { createBots } from '../src/harness/bots';
import { dumpView, formatTimeline } from '../src/harness/text';
export interface CliIO {
  read(path: string): string;
  write(path: string, text: string): void;
  load(path: string): Promise<unknown>;
  log(text: string): void;
}
const defaultIO: CliIO = {
  read: (path) => readFileSync(path, 'utf8'), write: (path, text) => { writeFileSync(path, text); },
  load: (path) => import(pathToFileURL(resolve(path)).href) as Promise<unknown>, log: console.log,
};
/** Injectable filesystem/module boundary; importing this module never runs a command. */
export async function main(args: readonly string[], io: CliIO = defaultIO): Promise<number> {
  function flag(name: string): string | undefined {
    const index = args.indexOf(`--${name}`);
    if (index < 0) return undefined;
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`--${name} needs a value`);
    return value;
  }
  function numberFlag(name: string, fallback: number): number { return Number(flag(name) ?? fallback); }
  async function loadGame(name: string): Promise<AnyGameModule> {
    const path = flag('module') ?? `games/${name}/src/index.ts`;
    const exports = await io.load(path);
    if (!exports || typeof exports !== 'object') throw new Error('module has no exports');
    const game = Object.values(exports).find((v: unknown) => v !== null && typeof v === 'object' && 'meta' in v && 'step' in v && 'init' in v) as AnyGameModule | undefined;
    if (!game) throw new Error(`no GameModule exported by ${path}`);
    if (game.meta.id !== name) throw new Error(`requested game ${name}, module declares ${game.meta.id}`);
    return game;
  }
  if (args[0] === 'play' && args[1]) {
    const game = await loadGame(args[1]);
    const context = flag('context'), settings = flag('settings'), record = flag('record');
    const match = createMatch(game, { record: Boolean(record), hashEvery: numberFlag('hash-every', 60), seed: numberFlag('seed', 1), players: numberFlag('players', game.meta.players.min),
      ...(args.includes('--teams') ? { teams: true } : {}),
      ...(settings ? { settings: JSON.parse(settings) as object } : {}),
      ...(context ? { context: JSON.parse(io.read(context)) as Partial<SetupContext> } : {}) });
    const bots = args.includes('--bots') ? createBots(match, { seed: numberFlag('seed', 1) }) : null;
    const steps = numberFlag('steps', 10000);
    if (!Number.isSafeInteger(steps) || steps < 0) throw new Error('--steps must be a non-negative integer');
    for (let i = 0; i < steps && !match.isOver && !match.blocked; i += 1) { if (bots) bots.step(); else match.step(); }
    if (record) io.write(record, JSON.stringify(match.recording()));
    io.log(formatTimeline(match.timeline)); io.log(dumpView(match.results()));
    return 0;
  }
  if (args[0] === 'replay' && args[1]) {
    const recording = parseRecording(io.read(args[1]));
    const result = replayMatch(await loadGame(recording.game), recording);
    io.log(dumpView({ matches: result.matches, finalHash: result.finalHash, divergence: result.divergence }));
    return result.matches ? 0 : 1;
  }
  throw new Error('Usage: play <game> [--record file --settings json --teams --context file --module path --seed N --players N --steps N --bots]; replay <file> [--module path]');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.exitCode = await main(process.argv.slice(2)); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
