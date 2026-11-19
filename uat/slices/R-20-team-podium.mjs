import assert from 'node:assert/strict';
const demo = `/@fs${new URL('../../games/rabakz/dev/index.html', import.meta.url).pathname}`;
/** RZ-012 RZ-016 RZ-032. Integrator runs and visually reviews every still. */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function podium(h) {
  const cases = [
    { state: 'podium-teams-late', players: 8, name: 'late-no-team' },
    { state: 'podium-teams-split', players: 8, name: 'seven-one-teams' },
    { state: 'podium-partial-ties', players: 8, name: 'partial-ties' },
    { state: 'podium-tie-second', players: 8, name: 'tie-second' },
    { state: 'scoreboard-teams', players: 8, name: 'teams-scoreboard' },
    { state: 'podium-teams', players: 4, name: 'teams-distinct' },
    { state: 'podium-teams-tie', players: 4, name: 'teams-tied' },
    { state: 'podium-tie-first', players: 4, name: 'ffa-two-way-tie' },
    { state: 'podium-ties', players: 4, name: 'everyone-tied' },
    { state: 'podium', players: 8, name: 'eight-players' },
    { state: 'podium-teams', players: 8, name: 'eight-team-players' },
    { state: 'podium-teams-tie', players: 8, name: 'eight-team-players-tied' },
    { state: 'podium-ties', players: 8, name: 'eight-players-tied' },
    { state: 'scoreboard', players: 8, name: 'ffa-scoreboard' },
    { state: 'scoreboard-teams-late', players: 8, name: 'late-no-team-scoreboard' },
  ];
  for (const width of [1920, 1280]) for (const item of cases) await h.step(`${item.name}-${String(width)}`, async () => {
    await h.host.setViewportSize({ width, height: width * 1080 / 1920 });
    await h.host.goto(`${h.origin}${demo}?state=${item.state}&players=${String(item.players)}&at=2500`);
    await h.host.waitForFunction(() => document.documentElement.dataset.rzReady === '1');
    await h.host.evaluate(() => document.fonts.ready);
    const findings = await h.host.evaluate(() => (/** @type {{ __rzOverflow(): unknown[] }} */ (/** @type {unknown} */ (window))).__rzOverflow());
    assert.deepEqual(findings, [], 'Existing overflow checker passes');
    assert.equal(await h.host.locator('[data-player], .rz-rank').count(), item.players);
    assert.equal(await h.host.locator('[data-fit="failed"]').count(), 0);
    if (item.name.includes('tied')) assert.equal(await h.host.locator('.rz-step-place').innerText(), 'Tied for first');
    if (item.name === 'teams-distinct') assert.equal(await h.host.locator('.rz-step').count(), 2);
    if (item.state.startsWith('podium-teams')) assert.equal(await h.host.locator('.rz-place').count(), 0);
    assert.ok(await h.host.locator('[data-final-member] .rz-rank-name, .rz-rank-name').evaluateAll(names => names.every(n => parseFloat(getComputedStyle(n).fontSize) >= 34)));
    if (item.state === 'podium-teams-late') assert.equal(await h.host.locator('[data-final-unassigned]').count(), 1);
    if (item.state === 'podium-teams-split') assert.deepEqual((await h.host.locator('[data-final-team]').evaluateAll(teams => teams.map(t => t.querySelectorAll('[data-player]').length))).sort((a, b) => a - b), [1, 7]);
    await h.shot(`${item.name}-${String(width)}`);
  });
  await h.host.setViewportSize({ width: 1920, height: 1080 });
  await h.host.goto(`${h.origin}${demo}?state=podium-teams&players=8&at=0`);
  await h.host.waitForFunction(() => document.documentElement.dataset.rzReady === '1');
  // Compose locally because the shared harness labels strips with wall-clock time.
  const frames = [];
  for (let index = 0; index < 6; index++) {
    const time = await h.host.evaluate(at => {
      for (const animation of document.getAnimations()) { animation.pause(); animation.currentTime = at; }
      return Number(document.getAnimations()[0]?.currentTime ?? at);
    }, index * 89);
    frames.push({ time, source: `data:image/png;base64,${(await h.host.screenshot()).toString('base64')}` });
  }
  const strip = await h.host.context().newPage();
  try {
    await strip.setViewportSize({ width: 1920, height: 1108 * frames.length });
    await strip.setContent('<body style="margin:0"></body>');
    await strip.evaluate(async frames => {
      for (const frame of frames) {
        const image = new Image(); image.style.display = 'block'; image.src = frame.source; await image.decode();
        const label = document.createElement('div'); label.style.cssText = 'height:28px;background:white;color:black;font:18px sans-serif'; label.textContent = `${String(frame.time)} ms`;
        document.body.append(image, label);
      }
    }, frames);
    await h.shot('team-step-entrance', strip);
  } finally { await strip.close(); }
  await h.host.emulateMedia({ reducedMotion: 'reduce' });
  await h.host.goto(`${h.origin}${demo}?state=podium-teams-tie&players=8`);
  await h.host.waitForFunction(() => document.documentElement.dataset.rzReady === '1');
  assert.equal(await h.host.locator('[data-player]').count(), 8);
  assert.equal(await h.host.locator('.rz-step-place').innerText(), 'Tied for first');
  await h.shot('reduced-motion-teams-tied');
}
