import { memoryGate } from './memory.js';
import { resolve } from 'node:path';
import { prepareEvidence, safeName } from '../uat/core.js';
import { machine } from './metrics.js';
import { writeReport } from './report.js';
import { installedGames, measureGame } from './headless.js';
export function parse(args: string[]) {
  const values = args.filter((v, i) => !(i === 0 && v === '--'));
  let scenario = 'simulation', headed = true, phones = 8, slice: string | undefined, out: string | undefined, build = 'development';
  if (values[0] && !values[0].startsWith('--')) scenario = safeName(values.shift() ?? '');
  while (values.length) {
    const flag = values.shift();
    if (flag === '--headed') headed = true;
    else if (flag === '--headless') headed = false;
    else if (flag === '--phones') { const n = values.shift(); if (!['1', '4', '8'].includes(n ?? '')) throw new Error('--phones must be 1, 4 or 8'); phones = Number(n); }
    else if (flag === '--slice') slice = safeName(values.shift() ?? '');
    else if (flag === '--out') out = safeName(values.shift() ?? '');
    else if (flag === '--build') { build = values.shift() ?? ''; if (!['development', 'production'].includes(build)) throw new Error('Unknown build'); }
    else throw new Error(`Unknown argument ${flag ?? ''}`);
  }
  return { scenario, headed, phones, slice: slice ?? scenario, out: out ?? (scenario === 'simulation' ? 'perf' : `perf-${String(phones)}`), build };
}
export async function main(args: string[]) {
  if (args.length === 1 && args[0] === '--scan-production') {
    const { scanProduction } = await import('./production.js');
    process.stdout.write(`Production scan: ${String(await scanProduction('apps/web/dist'))} bytes; kaki-perf-timing-v1 and __kakiPerfRecord absent.\n`); return;
  }
  if (args.includes('--help')) { process.stdout.write('Usage: pnpm perf [-- <scenario> --phones 1|4|8 --headed|--headless --slice <name> --out <name> --build development|production]\nDefault: full installed-game simulations. Controller cold start: controller (production, headless, blocking). Browser scenarios: files in uat/perf; lobby-8 is available, picker is pending.\n'); return; }
  const options = parse(args), root = process.cwd();
  if (options.scenario === 'controller') {
    const ignored = args.filter(v => ['--headed', '--headless', '--phones', '--build'].includes(v));
    if (ignored.length) throw new Error(`pnpm perf -- controller always runs one headless production page; remove ${ignored.join(', ')}`);
    const { main } = await import('./controller-startup.js');
    await main({ slice: options.slice, out: args.includes('--out') ? options.out : 'perf-1' });
    return;
  }
  const gate = memoryGate();
  process.stdout.write(`Memory gate: ${JSON.stringify(gate)}\n`);
  const command = ['node --expose-gc tools/perf/run.mjs', ...args.filter((v, i) => !(i === 0 && v === '--'))].join(' ');
  if (options.scenario === 'simulation') {
    const folder = await prepareEvidence(root, options.slice, options.out);
    const environment = machine(), measurements: object[] = [];
    for (const game of await installedGames(root)) for (const players of [1, 4, 8]) measurements.push(await measureGame(game, players));

    process.exitCode = await writeReport(root, options.slice, { schemaVersion: 1, layer: 'simulation', scenario: 'installed-games', machine: { ...environment, memoryGate: gate, runtime: 'Node accelerated simulation', browser: null, browserVersion: null, headed: false, viewport: null, deviceScaleFactor: null }, measurements,
      assessments: ['PERF-001', 'PERF-010', 'PERF-012', 'PERF-030'].map(id => ({ id, status: 'not assessed', reason: 'Node simulation is not browser rendering, touch delay or a 30-minute session; no simulation time/allocation budget is stated' })),
      notes: [`Command: ${command}`, 'Warm-up: one full unmeasured pass before each timing run. Tabao Rush round length is conformance scaffolding until T-05.', 'Fixed 60 Hz; seed 808; default game settings, seeded bots, full match until isOver (safety cap 216000 steps). Module defaults may not be the heaviest level. Rabakz uses a synthetic default-length bank.', 'Step timing covers only GameModule.step. Driver timing and allocation include bots, input buffer, driveStep, layout checks, public views and harness bookkeeping. Timings are accelerated CPU runs, not real-time display frames.', 'Allocation: V8 statistical heap sampling includes collected objects in a separate deterministic run. Approximate 95% relative sampling error is 1.96/sqrt(N); systematic error is unknown. No exact allocation counter exists here. Node GC pauses do not prove browser GC behaviour.'],
    }, folder);
  } else {
    const { loadScenario } = await import('./registry.js');
    const scenario = await loadScenario(root, options.scenario);
    if (scenario.hostPage && options.build === 'production') throw new Error('Custom development pages require --build development');
    const { run } = await import('../uat/runner.js');
    const { browserScenario } = await import('./browser.js');
    await run([options.slice, '--out', options.out, '--phones', String(options.phones), ...(options.headed ? ['--headed'] : [])], { production: options.build === 'production', command: command, headed: options.headed, script: resolve(root, 'uat/perf', `${scenario.name}.mjs`), execute: h => browserScenario(h, scenario, options.headed, command, options.build, gate) });
  }
}
