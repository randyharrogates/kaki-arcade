// PLAT-030, NFR-TEST. Timings are evidence, never assertions.
import { createMatch, makeMatchPlayers } from '../../../packages/platform/src/harness/index.ts';
import { createTick, driveStep, STEP_MS, EMPTY_SETUP } from '../../../packages/platform/src/index.ts';
import { tabaoRush, ROUND_STEPS } from '../../../games/tabao-rush/src/index.ts';
function harness(record = false, hashEvery = 60) {
  const m = createMatch(tabaoRush, { seed: 42, players: 8, record, hashEvery });
  for (const p of m.players) m.stick(p.id, 1, .3);
  m.step(ROUND_STEPS); return m;
}
function raw() {
  const ps = makeMatchPlayers(8); let s = tabaoRush.init(42, ps, {}, EMPTY_SETUP);
  const frames = new Map(ps.map(p => [p.id, { axes: [1, .3, 0, 0], held: 0, pressed: 0, released: 0, age: 0, seq: 0 }]));
  for (let i = 0; i < ROUND_STEPS; i++) s = driveStep(tabaoRush, s, createTick({ frames }), STEP_MS);
  return s;
}
const variants = [() => raw(), () => harness(), () => harness(true, 60), () => harness(true, 1)];
for (let i = 0; i < 3; i++) for (const run of variants) run();
const samples = variants.map(() => [] as number[]);
for (let i = 0; i < 9; i++) for (let j = 0; j < variants.length; j++) {
  const t = performance.now(); variants[j]!(); samples[j]!.push(performance.now() - t);
}
const median = (x: number[]) => [...x].sort((a, b) => a - b)[4]!;
const results = samples.map((times, i) => ({ mode: ['raw', 'not recording', 'hashEvery 60', 'hashEvery 1'][i],
  medianMs: median(times), bytes: i < 2 ? 0 : Buffer.byteLength(JSON.stringify(harness(true, i === 2 ? 60 : 1).recording())), samples: times }));
console.log(JSON.stringify({ players: 8, seconds: 210, steps: ROUND_STEPS, nonRecordingOverheadPercent: (results[1]!.medianMs / results[0]!.medianMs - 1) * 100, results }, null, 2));
