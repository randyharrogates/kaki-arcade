// CTRL-005 / PERF-012. Chromium touch input exercises actual pointer capture.
import assert from 'node:assert/strict';
/** @typedef {{full:number, samples:{ms:number, distance:number, transform:string}[], duration:string, token:string}} ReleaseRecord */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function leftStick(h) {
  const page = await h.newPhone();
  const cdp = await page.context().newCDPSession(page);
  /** @param {number} id @param {number} x @param {number} y */
  const point = (id, x, y) => ({ id, x, y });
  const read = () => page.locator('.ka-stick-readout').evaluate(node => ({ x: Number(node.dataset.x), y: Number(node.dataset.y) }));
  const zero = async () => { assert.deepEqual(await read(), { x: 0, y: 0 }); };
  const visual = () => page.locator('.ka-stick-knob').evaluate(node => {
    const matrix = new DOMMatrix(getComputedStyle(node).transform);
    return { x: matrix.e, y: matrix.f, stretch: Math.hypot(matrix.a, matrix.b), transition: getComputedStyle(node).transitionDuration, animations: node.getAnimations().length };
  });
  /** @param {'touchStart'|'touchMove'|'touchEnd'|'touchCancel'} type @param {{id:number,x:number,y:number}[]} points @param {number} dx @param {boolean} [held] */
  const touch = async (type, points, dx, held = true) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    // Chromium can defer pointermove until a frame. Also cross that boundary when
    // the expected state is unchanged (dead zone or an ignored second pointer).
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => { resolve(undefined); }))));
    const vector = Math.max(0, Math.min(1, (dx - 5) / 50));
    const excess = Math.max(0, dx - 55);
    const offset = Math.min(dx, 55) + 13.75 * excess / (13.75 + excess);
    await page.waitForFunction(({ vector, offset, held }) => {
      const readout = document.querySelector('.ka-stick-readout');
      const knob = document.querySelector('.ka-stick-knob');
      return readout instanceof HTMLElement && knob instanceof HTMLElement
        && Number(readout.dataset.x) === vector && Number(readout.dataset.y) === 0
        && document.querySelector('.ka-stick')?.getAttribute('data-held') === String(held)
        && knob.style.transform.startsWith(`translate(${String(offset)}px, 0px)`);
    }, { vector, offset, held });
    if (held) {
      const shown = await visual();
      assert.ok(Math.abs(shown.x - offset) < 0.1, 'Knob tracks without tweening');
      assert.ok(Math.abs(shown.y) < 0.1);
      assert.equal(shown.transition, '0s');
      assert.equal(shown.animations, 0, 'Held knob has no animations');
    }
  };
  const recentred = () => page.waitForFunction(() => {
    const knob = document.querySelector('.ka-stick-knob');
    const base = document.querySelector('.ka-stick-base');
    if (!knob || !base) return false;
    const matrix = new DOMMatrix(getComputedStyle(knob).transform);
    return Math.abs(matrix.e) < 0.1 && Math.abs(matrix.f) < 0.1 && getComputedStyle(base).opacity === '0';
  });
  for (const [width, height] of /** @type {[number,number][]} */ ([[844, 390], [667, 375]])) {
    await h.step(`${String(width)}x${String(height)} touch tracking, rubber-band and multi-touch`, async () => {
      await page.setViewportSize({ width, height });
      await page.goto(`${h.origin}/play?demo=controller`);
      const box = await page.locator('.ka-stick').boundingBox(); assert.ok(box);
      assert.ok(box.width >= 55 && box.height >= 55);
      const x = Math.round(box.x + box.width * 0.35); const y = Math.round(box.y + box.height * 0.65);
      await touch('touchStart', [point(1, x, y)], 0); await zero();
      const baseBox = await page.locator('.ka-stick-base').boundingBox(); assert.ok(baseBox);
      assert.ok(Math.abs(baseBox.x + baseBox.width / 2 - x) <= 0.5);
      assert.ok(Math.abs(baseBox.y + baseBox.height / 2 - y) <= 0.5);
      await h.shot(`${String(width)}-off-centre-floating`, page);
      await h.frameStrip(`${String(width)}-tracking`, page, { frames: 5, everyMs: 34, checkFrame: async frame => {
        const dx = frame * 10;
        await touch('touchMove', [point(1, x + dx, y)], dx);
        const shown = await visual();
        assert.ok(Math.abs(shown.x - dx) < 0.1, 'Knob tracks without tweening');
        assert.equal(shown.transition, '0s');
        assert.ok(Math.abs(shown.stretch - (1 + 0.12 * Math.max(0, (dx - 5) / 50))) < 0.001);
        const value = await read(); assert.ok(Math.abs(value.x - Math.max(0, (dx - 5) / 50)) < 0.001); assert.equal(value.y, 0);
      } });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(1, x + 30, y + 40)] });
      await page.waitForFunction(() => {
        const n = document.querySelector('.ka-stick-readout');
        return n instanceof HTMLElement && Math.abs(Number(n.dataset.x) - 0.54) < 0.001 && Math.abs(Number(n.dataset.y) - 0.72) < 0.001;
      });
      const diagonal = await read(); assert.ok(Math.abs(diagonal.x - 0.54) < 0.001); assert.ok(Math.abs(diagonal.y - 0.72) < 0.001);
      await h.shot(`${String(width)}-diagonal`, page);
      await touch('touchMove', [point(1, x + 110, y)], 110);
      assert.deepEqual(await read(), { x: 1, y: 0 });
      const beyond = await visual(); assert.ok(beyond.x > 55 && beyond.x < 68.75);
      await h.shot(`${String(width)}-rubber-band`, page);
      const second = point(2, width - 34, height / 2);
      await touch('touchStart', [point(1, x + 110, y), second], 110);
      await touch('touchMove', [point(1, x + 110, y), point(2, width - 55, height / 2)], 110);
      assert.deepEqual(await read(), { x: 1, y: 0 });
      // CDP: touchEnd carries no points; lifting only finger 2 is a touchMove that omits it.
      await touch('touchMove', [point(1, x + 110, y)], 110);
      assert.deepEqual(await read(), { x: 1, y: 0 });
      await h.shot(`${String(width)}-second-touch-no-steal`, page);
      // Sample independently of screenshot throughput, on every animation frame.
      await page.evaluate(() => {
        const knob = document.querySelector('.ka-stick-knob');
        if (!knob) throw new Error('Missing knob');
        const full = Math.hypot(new DOMMatrix(getComputedStyle(knob).transform).e, new DOMMatrix(getComputedStyle(knob).transform).f);
        const samples = /** @type {{ms:number, distance:number, transform:string}[]} */ ([]);
        const record = { full, samples, duration: '', token: '' };
        Object.assign(window, { stickRelease: record });
        document.querySelector('.ka-stick')?.addEventListener('pointerup', () => {
          const start = performance.now();
          const sample = () => {
            record.duration = getComputedStyle(knob).transitionDuration;
            record.token = getComputedStyle(knob).getPropertyValue('--ka-duration-fast-exit').trim();
            const transform = getComputedStyle(knob).transform;
            const m = new DOMMatrix(transform);
            samples.push({ ms: performance.now() - start, distance: Math.hypot(m.e, m.f), transform });
            if (performance.now() - start < 170) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }, { once: true });
      });
      // Frame zero precedes dispatch; do not wait across animation frames after touchEnd.
      await h.frameStrip(`${String(width)}-release`, page, { frames: 10, everyMs: 16, clip: box, checkFrame: async frame => {
        if (frame === 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        if (frame === 9) {
          const end = await visual(); assert.ok(Math.hypot(end.x, end.y) < 0.1, 'Release strip ends at centre');
          assert.equal(await page.locator('.ka-stick-base').evaluate(n => getComputedStyle(n).opacity), '0');
          await zero();
        }
      } });
      const release = await page.evaluate(() => {
        const record = /** @type {Window & {stickRelease: ReleaseRecord}} */ (/** @type {unknown} */ (window)).stickRelease;
        return record;
      });
      assert.equal(parseFloat(release.duration) * 1000, parseFloat(release.token), 'Release uses fast-exit token');
      const intermediate = release.samples.filter(s => s.distance > 0.1 && s.distance < release.full - 0.1);
      assert.ok(intermediate.length >= 2, 'Multiple intermediate animation frames captured');
      for (let i = 1; i < intermediate.length; i++) {
        const current = intermediate[i]; const previous = intermediate[i - 1];
        assert.ok(current && previous && current.distance < previous.distance, 'Return decreases each frame');
      }
      const settled = release.samples.find(s => s.distance < 0.1);
      assert.ok(settled && settled.ms <= parseFloat(release.token) + 34, 'Settles within one frame of fast-exit duration');
      await recentred();
      assert.ok(Math.abs((await visual()).x) < 0.1);
      assert.equal(await page.locator('.ka-stick-base').evaluate(n => getComputedStyle(n).opacity), '0');
      const edgeX = Math.round(box.x + 21); const edgeY = Math.round(box.y + 21);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(1, edgeX, edgeY)] });
      await page.waitForFunction(() => document.querySelector('.ka-stick')?.getAttribute('data-held') === 'true');
      const knobBox = await page.locator('.ka-stick-knob').boundingBox(); assert.ok(knobBox);
      assert.ok(Math.abs(knobBox.x + knobBox.width / 2 - edgeX) <= 0.5);
      assert.ok(Math.abs(knobBox.y + knobBox.height / 2 - edgeY) <= 0.5);
      const landed = await read(); assert.ok(landed.x < 0 && landed.y < 0);
      const padding = await page.locator('.ka-stick').evaluate(n => {
        const b = n.getBoundingClientRect();
        return { x: b.x + n.clientLeft, y: b.y + n.clientTop, width: n.clientWidth, height: n.clientHeight };
      });
      const edge = await page.locator('.ka-stick-base').boundingBox(); assert.ok(edge);
      assert.ok(edge.x >= padding.x - 0.5 && edge.y >= padding.y - 0.5);
      assert.ok(edge.x + edge.width <= padding.x + padding.width + 0.5 && edge.y + edge.height <= padding.y + padding.height + 0.5);
      await h.shot(`${String(width)}-edge-landing`, page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(1, edgeX + 1, edgeY)] });
      await page.waitForFunction(x => Number(document.querySelector('.ka-stick-readout')?.getAttribute('data-x')) !== x, landed.x);
      const nudged = await read(); assert.ok(Math.hypot(nudged.x - landed.x, nudged.y - landed.y) < 0.021);
      await h.shot(`${String(width)}-edge-one-pixel`, page);
      const ax = edge.x + edge.width / 2; const ay = edge.y + edge.height / 2;
      await touch('touchMove', [point(1, ax + 55, ay)], 55);
      await touch('touchCancel', [], 0, false); await zero(); await recentred();
      assert.ok(Math.hypot((await visual()).x, (await visual()).y) < 0.1);
      await h.shot(`${String(width)}-touch-cancel`, page);
    });
  }
  await h.step('Reduced motion keeps values and removes stretch and release animation', async () => {
    await h.reducedMotion(true);
    const box = await page.locator('.ka-stick').boundingBox(); assert.ok(box);
    const x = Math.round(box.x + box.width / 2); const y = Math.round(box.y + box.height / 2);
    await touch('touchStart', [point(1, x, y)], 0);
    await touch('touchMove', [point(1, x + 55, y)], 55);
    assert.deepEqual(await read(), { x: 1, y: 0 });
    assert.equal((await visual()).stretch, 1);
    await h.shot('reduced-motion-held', page);
    await touch('touchEnd', [], 0, false); await zero();
    await recentred();
    const released = await visual(); assert.equal(released.x, 0); assert.equal(released.transition, '0s');
    assert.equal(await page.locator('.ka-stick-base').evaluate(n => getComputedStyle(n).opacity), '0');
    await h.shot('reduced-motion-released', page);
  });
  await cdp.detach();
}
