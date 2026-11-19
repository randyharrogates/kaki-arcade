// PERF-002, PERF-023: real pairing; development fixture uses the public presentation contract.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function detailBenchmark(h) {
  assert.equal(h.maxPhones, 1);
  await h.host.addInitScript(() => {
    if (location.pathname !== '/host') return;
    localStorage.removeItem('kaki.host-device.platform.detail-benchmark-console-e2e-v2');
    localStorage.removeItem('kaki.host-device.platform.settings');
    const url = new URL(location.href); url.searchParams.set('fixture', 'console-e2e');
    history.replaceState(null, '', url);
  });
  await h.createRoom();
  const { page: phone } = await h.joinPhone('Benchmark');
  const results = [];
  for (const scenario of ['auto', 'cached', 'slow', 'explicit-full', 'no-scene']) {
    await h.host.setViewportSize({ width: 1920, height: 1080 });
    const beforeRuns = await h.host.evaluate(scenario => {
      const url = new URL(location.href);
      url.searchParams.delete('benchmark-slow'); url.searchParams.delete('benchmark-no-scene');
      if (scenario === 'slow') url.searchParams.set('benchmark-slow', '1');
      if (scenario === 'no-scene') url.searchParams.set('benchmark-no-scene', '1');
      history.replaceState(null, '', url);
      if (scenario !== 'cached') localStorage.removeItem('kaki.host-device.platform.detail-benchmark-console-e2e-v2');
      localStorage.setItem('kaki.host-device.platform.settings', JSON.stringify({ schemaVersion: 1, data: { detailMode: scenario === 'explicit-full' ? 'full' : 'auto', measurement: null } }));
      delete document.documentElement.dataset.benchmarkAssets;
      delete document.documentElement.dataset.benchmarkAtlas;
      return Number(document.documentElement.dataset.benchmarkRuns ?? 0);
    }, scenario);
    await phone.getByRole('button', { name: 'Pick a game', exact: true }).click();
    await phone.getByRole('button', { name: 'Select', exact: true }).click();
    await phone.getByRole('button', { name: 'Start', exact: true }).click();
    if (scenario === 'auto' || scenario === 'slow') {
      await h.host.getByText('Starting…', { exact: true }).waitFor();
      if (scenario === 'auto') {
        await h.frameStrip('auto-starting-1920', h.host, { frames: 3, everyMs: 300, checkFrame: async () => {
          assert.equal(await h.host.getByText('Starting…', { exact: true }).isVisible(), true);
        } });
      } else await h.shot(`${scenario}-starting-1920`);
    }
    await h.host.getByRole('main', { name: 'Console test game' }).waitFor();
    const result = await h.host.evaluate(() => ({ measurement: /** @type {unknown} */ (JSON.parse(localStorage.getItem('kaki.host-device.platform.detail-benchmark-console-e2e-v2') ?? 'null')), detail: document.documentElement.dataset.chosenDetail, assets: document.documentElement.dataset.benchmarkAssets, atlas: document.documentElement.dataset.benchmarkAtlas, costMs: Number(document.documentElement.dataset.detailPreparationMs), runs: Number(document.documentElement.dataset.benchmarkRuns ?? 0) }));
    const sceneRuns = result.runs - beforeRuns;
    if (scenario === 'slow') { assert.equal(result.detail, 'lower'); assert.equal(result.assets, 'half'); assert.ok(result.atlas?.endsWith('.webp')); }
    if (['cached', 'explicit-full', 'no-scene'].includes(scenario)) { assert.equal(sceneRuns, 0); assert.equal(result.assets, undefined); assert.equal(result.atlas, undefined); assert.equal(result.detail, 'full'); assert.ok(result.costMs < 100, 'skipped benchmark preparation should be near zero'); }
    if (scenario === 'explicit-full' || scenario === 'no-scene') assert.equal(result.detail, 'full');
    if (scenario === 'no-scene') assert.equal(result.measurement, null);
    results.push({ scenario, sceneRuns, ...result });
    await h.shot(`${scenario}-ready-1920`);
    // Sampling and cost recording are finished before changing the viewport.
    await h.host.setViewportSize({ width: 1280, height: 720 });
    await h.shot(`${scenario}-ready-1280`);
    await phone.getByRole('button', { name: 'Menu', exact: true }).click();
    await phone.getByRole('button', { name: 'Quit to picker', exact: true }).click();
    await h.host.keyboard.press('Escape');
  }
  await writeFile(join(h.evidence, 'detail.json'), JSON.stringify(results, null, 2));
}
