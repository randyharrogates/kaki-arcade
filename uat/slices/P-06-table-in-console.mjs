// PP-030, PP-031, PLAT-033. Integrator: run with --phones 1, 2 and 8.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function tableInConsole(h) {
  await h.host.addInitScript(() => {
    const load = document.fonts.load.bind(document.fonts);
    /** @type {{ font: string; at: number; completed: number }[]} */
    const requests = [];
    Reflect.set(window, 'p06Fonts', requests);
    document.fonts.load = async (font, text) => {
      const request = { font, at: Date.now(), completed: 0 }; requests.push(request);
      const faces = await load(font, text); request.completed = Date.now(); return faces;
    };
  });
  await runTable(h, false);
  // Leave the TV page before clearing: a live host writes its room back as it unloads, so clearing in
  // place restored the old room (held seats, "Name taken"). The reduced pass needs a fresh room.
  const firstCode = h.code;
  await h.host.goto(`${h.origin}/play`);
  await h.host.evaluate(() => { sessionStorage.clear(); });
  await runTable(h, true);
  assert.notEqual(h.code, firstCode, 'The reduced-motion pass runs in a fresh room');
}
/** @param {import('../../tools/uat/harness.ts').Harness} h @param {boolean} reduced */
async function runTable(h, reduced) {
  await h.host.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const pixelsPage = await h.host.context().newPage();
  // Decode screenshots outside the app; inspect painted pixels, not DOM visibility.
  const assertPainted = async () => {
    const source = (await h.host.screenshot()).toString('base64');
    const colour = await h.host.locator('.ka-surface').last().evaluate(el => getComputedStyle(el).backgroundColor);
    const surfaceFraction = await pixelsPage.evaluate(async ({ source, colour }) => {
      const image = new Image(); image.src = 'data:image/png;base64,' + source; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); if (!ctx) throw Error('No pixel context');
      ctx.fillStyle = colour; ctx.fillRect(0, 0, 1, 1);
      const surface = ctx.getImageData(0, 0, 1, 1).data;
      ctx.drawImage(image, 0, 0); const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let bare = 0;
      for (let i = 0; i < data.length; i += 4) {
        if ([0, 1, 2].every(c => Math.abs((data[i + c] ?? 0) - (surface[c] ?? 0)) <= 18)) bare++;
      }
      return bare / (data.length / 4);
    }, { source, colour });
    assert.ok(surfaceFraction < 0.95, `Start frame is ${(surfaceFraction * 100).toFixed(1)}% bare surface`);
  };
  assert.ok([1, 2, 8].includes(h.maxPhones), 'Use --phones 1, 2 or 8');
  const phones = [];
  /** @type {{ url: string; type: string; at: number }[]} */
  const requests = [];
  /** @param {import('playwright').Request} request */
  const record = request => { requests.push({ url: request.url(), type: request.resourceType(), at: Date.now() }); };
  h.host.on('request', record);
  try {
    // Same source seam as C-16b: mark the exact frame-subscription boundary.
    await h.host.route('**/src/session-adapter.ts', async route => {
      const response = await route.fetch();
      const source = await response.text();
      assert.ok(source.includes('runner = next;'), 'Session seam still matches');
      await route.fulfill({ response, body: source.replace('runner = next;', "document.documentElement.dataset.p06Started = String(Date.now()); runner = next;") });
    });
    // Hold the real atlas response so several strip frames show the loading picker.
    /** @type {() => void} */
    let releaseAtlas = () => { throw new Error('Atlas gate not initialised'); };
    const atlasGate = new Promise(resolve => { releaseAtlas = () => { resolve(undefined); }; });
    await h.host.route('**/*peek-poker-cards*.webp', async route => {
      const response = await route.fetch();
      await atlasGate;
      await route.fulfill({ response });
    });
    await h.createRoom();
    // The reduced-motion pass needs only one phone: the harness allows maxPhones + 1 phone contexts in all.
    for (let i = 0; i < (reduced ? 1 : h.maxPhones); i++) {
      const phone = await h.newPhone(); phones.push(phone);
      await phone.setViewportSize({ width: 844, height: 390 });
      const name = `Player ${String(i + 1)}`;
      await h.openJoin(phone, name);
      await phone.getByRole('button', { name: 'Join', exact: true }).click();
      try { await h.waitSeated(phone, name); } catch (error) {
        await h.shot(`seat-fault-${reduced ? 'reduced' : 'full'}-phone${String(i + 1)}`, phone, undefined, false);
        await h.shot(`seat-fault-${reduced ? 'reduced' : 'full'}-tv`, h.host, undefined, false);
        throw error;
      }
    }
    const leader = phones[0]; assert.ok(leader);
    await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
    await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
    await leader.getByRole('button', { name: 'Next', exact: true }).click();
    await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
    await leader.getByRole('button', { name: 'Select', exact: true }).click();
    await h.host.locator('[data-game="peek-poker"][data-expanded="true"]').waitFor();
    await h.frameStrip(reduced ? 'peek-poker-start-reduced' : 'peek-poker-start-crossfade', h.host, { frames: 10, everyMs: 600, checkFrame: async index => {
      if (index === 1) await leader.getByRole('button', { name: 'Start', exact: true }).click();
      if (index >= 2 && index <= 4) {
        for (const selector of ['.picker-screen h1', '.picker-screen [data-game="peek-poker"][data-expanded="true"]']) {
          assert.ok(await h.host.locator(selector).last().evaluate(element => {
            const box = element.getBoundingClientRect();
            const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return hit !== null && element.contains(hit);
          }), `Starting hold hit test: ${selector}`);
        }
      }
      await assertPainted();
      if (index === 4) releaseAtlas();
      if (index === 5) {
        await h.host.waitForFunction(() => Boolean(document.documentElement.dataset.p06Started));
        if (reduced) {
          await h.host.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.ok(await h.host.locator('.mounted-game-screen > .overlap').evaluate(element =>
            element.getAnimations({ subtree: true }).every(animation => animation.effect?.getTiming().iterations === Infinity ||
              animation.playState === 'finished' || animation.effect?.getComputedTiming().activeDuration === 0)), 'Reduced Start switches without a fade');
        }
      }
    } });
    await h.host.waitForFunction(() => Boolean(document.documentElement.dataset.p06Started));
    await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
    const started = await h.host.evaluate(() => Number(document.documentElement.dataset.p06Started));
    await h.host.clock.install();
    // Advance real host animation frames, including Overlap cleanup, before freezing ink.
    for (let frame = 0; frame < 120; frame++) {
      await h.host.clock.runFor(16);
      if (await h.host.evaluate(() => document.getAnimations().every(animation =>
        animation.playState === 'finished' || animation.effect?.getTiming().iterations === Infinity))) break;
    }
    assert.ok(await h.host.evaluate(() => document.getAnimations().every(animation =>
      animation.playState === 'finished' || animation.effect?.getTiming().iterations === Infinity)), 'Host entrance animations finished');
    await h.shot(reduced ? 'tv-memorise-reduced' : 'tv-memorise', h.host, undefined, false);
    if (reduced) {
      assert.ok(await h.host.evaluate(() => document.getAnimations().every(animation =>
        animation.playState === 'finished' || animation.effect?.getTiming().iterations === Infinity)), 'Reduced Start has no active finite fade');
      return;
    }
    const viewport = h.host.viewportSize(); assert.ok(viewport);
    await h.host.setViewportSize({ width: 1280, height: 720 });
    await h.host.clock.runFor(100);
    await h.shot('tv-memorise-1280x720', h.host, undefined, false);
    await h.host.setViewportSize(viewport);
    await h.host.clock.runFor(100);
    for (let second = 0; second < 60; second++) {
      if (await h.host.locator('.pp-table[data-phase="pick"]').count()) break;
      await h.host.clock.runFor(1000);
    }
    await h.host.locator('.pp-table[data-phase="pick"]').waitFor();
    await h.host.clock.runFor(500);
    await h.shot('tv-pick', h.host, undefined, false);
    // Spread picks, with five sharing cell 0 at eight phones to cover two-row markers.
    for (const [i, phone] of phones.entries()) {
      await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button').nth(phones.length === 8 && i < 5 ? 0 : i).click();
      await h.host.clock.runFor(100);
      await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) [data-part="grid"] button').nth((i + 5) % 16).click();
      await h.host.clock.runFor(100);
      await phone.getByRole('button', { name: 'Lock in', exact: true }).click();
      await h.host.clock.runFor(100);
      // The last lock can move straight to reveal; capture the earlier lock-ins.
      if (await h.host.locator('.pp-table[data-phase="pick"]').count()) {
        assert.ok(await h.host.getByText('Picked', { exact: true }).count());
        await h.shot(`tv-pick-locked-${String(phones.indexOf(phone) + 1)}`, h.host, undefined, false);
      }
    }
    for (let second = 0; second < 60; second++) {
      if (await h.host.locator('.pp-table[data-phase="reveal"]').count()) break;
      await h.host.clock.runFor(1000);
    }
    await h.host.locator('.pp-table[data-phase="reveal"]').waitFor();
    await h.host.clock.runFor(500);
    await h.shot('tv-reveal', h.host, undefined, false);
    assert.equal(await h.host.getByText('This game’s screen is not built yet').count(), 0);
    assert.ok(requests.some(r => r.at < started && r.url.includes('manifest.json')), 'Manifest request recorded before start');
    assert.ok(requests.some(r => r.at < started && /peek-poker-cards.*\.webp/.test(r.url)), 'Card atlas request recorded before start');
    const fonts = /** @type {{ font: string; at: number; completed: number }[]} */ (await h.host.evaluate(() => /** @type {unknown} */ (Reflect.get(window, 'p06Fonts'))));
    // These are the four explicit FontFaceSet requests from prepareTable, including
    // locally resolved/fallback faces which need no network font request.
    for (const configuration of ['400 34px', '700 34px', '700 55px', '400 89px']) {
      assert.ok(fonts.some(request => request.font.startsWith(configuration) && request.at < started && request.completed > 0 && request.completed <= started), `Table font ready before Start: ${configuration}`);
    }
    await writeFile(join(h.evidence, 'font-requests-before-start.json'), JSON.stringify(fonts, null, 2));
    const afterStart = requests.filter(r => r.at >= started);
    const assets = afterStart.filter(r => ['image', 'font', 'stylesheet', 'script'].includes(r.type) || /\/assets\/|manifest\.json/.test(r.url));
    await writeFile(join(h.evidence, 'requests-after-start.json'), JSON.stringify({ requests: afterStart, assets }, null, 2));
    assert.deepEqual(assets, [], 'No asset requests during the round');
  } finally {
    h.host.off('request', record);
    await pixelsPage.close();
    await h.host.unroute('**/src/session-adapter.ts');
    await h.host.unroute('**/*peek-poker-cards*.webp');
    await h.host.clock.resume();
    for (const phone of phones) await phone.close();
  }
}
