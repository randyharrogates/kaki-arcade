// CTRL-001, CTRL-005, CTRL-006, PERF-012. Integrator runs and reviews evidence.
import assert from 'node:assert/strict';
/** @type {unknown} */
const inputModule = await import(new URL('../../packages/controller-kit/src/button-input.ts', import.meta.url).href);
const { HAPTIC_TICK_MS } = /** @type {{ HAPTIC_TICK_MS: number }} */ (inputModule);
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function buttons(h) {
  const page = await h.newPhone();
  for (const [width, height] of /** @type {[number, number][]} */ ([[667, 375], [844, 390], [932, 430]])) {
    await h.step(`layout-${String(width)}x${String(height)}`, async () => {
      await page.setViewportSize({ width, height });
      await page.goto(`${h.origin}/play?demo=controller&controls=buttons`);
      await page.getByRole('button', { name: 'Cross', exact: true }).waitFor();
      await page.waitForTimeout(100);
      const area = await page.locator('.ka-controller-play').boundingBox(); assert.ok(area);
      /** @type {unknown} */
      const rawSizes = JSON.parse(await page.locator('.ka-buttons-demo').getAttribute('data-sizes') ?? '{}');
      const expected = /** @type {{ face: number; inPlayWidth: number; inPlayHeight: number }} */ (rawSizes);
      const boxes = await page.locator('[data-control]').evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect(); return { tapHighlight: getComputedStyle(node).getPropertyValue('-webkit-tap-highlight-color'), id: node.getAttribute('data-control'), x: r.x, y: r.y, width: r.width, height: r.height };
      }));
      assert.equal(boxes.length, 11);
      const isFace = (/** @type {typeof boxes[number]} */ box) => ['Cross', 'Circle', 'Square', 'Triangle'].includes(box.id ?? '');
      for (const box of boxes) {
        assert.equal(box.tapHighlight, 'rgba(0, 0, 0, 0)', `${box.id ?? ''} suppresses native tap highlight`);
        const face = isFace(box);
        assert.ok(Math.abs(box.width - (face ? expected.face : expected.inPlayWidth)) <= 0.5, `${box.id ?? ''} exact width`);
        assert.ok(Math.abs(box.height - (face ? expected.face : expected.inPlayHeight)) <= 0.5, `${box.id ?? ''} exact height`);
        assert.ok(box.x >= area.x + 12.95 && box.y >= area.y + 12.95 && box.x + box.width <= area.x + area.width - 12.95 && box.y + box.height <= area.y + area.height - 12.95, `${box.id ?? ''} play-area margin`);
      }
      for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) {
        // Circular face targets use their actual geometry, not overlapping enclosing squares.
        const dx = Math.max(a.x - b.x - b.width, b.x - a.x - a.width, 0);
        const dy = Math.max(a.y - b.y - b.height, b.y - a.y - a.height, 0);
        let gap = Math.hypot(dx, dy);
        if (isFace(a) && isFace(b)) gap = Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2) - (a.width + b.width) / 2;
        else if (isFace(a) || isFace(b)) {
          const c = isFace(a) ? a : b, r = c === a ? b : a;
          const cx = c.x + c.width / 2, cy = c.y + c.height / 2;
          gap = Math.hypot(Math.max(r.x - cx, cx - r.x - r.width, 0), Math.max(r.y - cy, cy - r.y - r.height, 0)) - c.width / 2;
        }
        assert.ok(gap >= 12.95, `${a.id ?? ''}/${b.id ?? ''} gap ${String(gap)}`);
      }
      const start = boxes.find(box => box.id === 'Start'); assert.ok(start);
      for (const selector of ['.ka-controller-wake', '[aria-label="Held controls"]']) {
        const text = await page.locator(selector).evaluate(node => { const range = document.createRange(); range.selectNodeContents(node); const r = range.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
        for (const box of boxes) {
          const dx = Math.max(box.x - text.x - text.width, text.x - box.x - box.width, 0);
          const dy = Math.max(box.y - text.y - text.height, text.y - box.y - box.height, 0);
          assert.ok(Math.hypot(dx, dy) >= 12.95, `${box.id ?? ''}/${selector} clearance`);
        }
      }
      await h.shot(`layout-${String(width)}`, page);
    });
  }
  const finger = await h.thumbs(page);
  /** @param {string} id */
  const centre = async id => {
    const box = await page.getByRole('button', { name: id, exact: true }).boundingBox();
    assert.ok(box); return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  /** @param {string} id @param {boolean} value */
  const held = async (id, value) => { assert.equal(await page.getByRole('button', { name: id, exact: true }).getAttribute('data-held'), String(value)); };
  // Use the unpressed bounds for every frame so the 3% inset stays visible.
  const cross = page.getByRole('button', { name: 'Cross', exact: true });
  const box = await cross.boundingBox(); assert.ok(box);
  const clip = { x: Math.floor(box.x - 13), y: Math.floor(box.y - 13), width: Math.ceil(box.width + 26), height: Math.ceil(box.height + 26) };
  const crossPoint = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  /** @type {number[]} */
  let captureTimes = [];
  // Called last in checkFrame, immediately before frameStrip records its timestamp
  // and invokes the screenshot. This measures capture cadence, not in-page rAF.
  const captureTime = () => {
    const now = Math.round(performance.now());
    const previous = captureTimes.at(-1);
    // Capture spacing depends on machine load, so it is reported, not asserted; the frames' own content checks are the proof.
    if (previous !== undefined) process.stdout.write(`strip capture gap ${String(now - previous)} ms\n`);
    captureTimes.push(now);
  };
  const scale = () => cross.evaluate(node => new DOMMatrixReadOnly(getComputedStyle(node).transform).a);
  try {
    await h.step('Press vibrates once with HAPTIC_TICK_MS; release does not', async () => {
      await page.evaluate(() => {
        const calls = /** @type {number[]} */ ([]);
        Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (/** @type {number} */ ms) => { calls.push(ms); return true; } });
        Object.defineProperty(window, 'k03Vibrations', { configurable: true, value: calls });
      });
      const calls = () => page.evaluate(() => /** @type {{ k03Vibrations: number[] }} */ (/** @type {unknown} */ (window)).k03Vibrations);
      await finger.down(crossPoint);
      assert.deepEqual(await calls(), [HAPTIC_TICK_MS]);
      await finger.up();
      assert.deepEqual(await calls(), [HAPTIC_TICK_MS]);
      await cross.evaluate(async node => { await Promise.all(node.getAnimations().map(animation => animation.finished)); });
    });
    await h.step('Empty D-pad centre captures a slide onto Right', async () => {
      const right = await centre('Right'), left = await centre('Left');
      await finger.down({ x: (left.x + right.x) / 2, y: right.y });
      assert.equal(await page.locator('[data-control][data-held="true"]').count(), 0, 'nothing held on empty-centre landing');
      await finger.move([right], { steps: 8 }); await held('Right', true);
      await finger.up(); await held('Right', false);
    });
    await h.step('Cross stays held moving from 2 px inside rim to 1 px inside', async () => {
      const rim = { x: box.x + box.width - 2, y: crossPoint.y };
      await finger.down(rim); await held('Cross', true);
      await finger.move([{ x: rim.x + 1, y: rim.y }], { steps: 1 }); await held('Cross', true);
      await finger.up(); await held('Cross', false);
      await cross.evaluate(async node => { await Promise.all(node.getAnimations().map(animation => animation.finished)); });
    });
    await h.step('Two simultaneous face presses and first-frame feedback', async () => {
      await page.evaluate(() => {
        const node = document.querySelector('[data-control="Cross"]');
        if (!node) throw new Error('Missing Cross');
        /** @type {{ time: number; transform: string; held: string | null }[]} */
        const samples = [];
        const sample = (/** @type {number} */ time) => {
          samples.push({ time, transform: getComputedStyle(node).transform, held: node.getAttribute('data-held') });
          node.setAttribute('data-frame-samples', JSON.stringify(samples));
          if (samples.length < 120) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
        document.addEventListener('pointerdown', event => {
          const node = /** @type {Element} */ (event.target).closest('button');
          requestAnimationFrame(() => { if (node) node.setAttribute('data-first-frame', getComputedStyle(node).transform); });
        });
      });
      await h.frameStrip('press-first-frame', page, { frames: 4, everyMs: 16, clip, checkFrame: async index => {
        if (index === 0) await held('Cross', false);
        if (index === 1) await finger.down(crossPoint, 1);
        if (index >= 2) {
          await held('Cross', true);
          assert.equal(await page.getByRole('button', { name: 'Cross', exact: true }).getAttribute('data-first-frame'), 'matrix(0.97, 0, 0, 0.97, 0, 0)');
        }
        assert.equal(await scale(), index === 0 ? 1 : 0.97, `press frame ${String(index)}`);
        captureTime();
      } });
      await finger.down(await centre('Circle'), 2); await held('Circle', true);
      /** @type {unknown} */
      const rawSamples = JSON.parse(await page.locator('[data-control="Cross"]').getAttribute('data-frame-samples') ?? '[]');
      const samples = /** @type {{ time: number; transform: string; held: string | null }[]} */ (rawSamples);
      const firstPressed = samples.findIndex(sample => sample.held === 'true');
      assert.ok(firstPressed > 0, 'frame sampling begins before touch');
      assert.equal(samples[firstPressed - 1]?.transform, 'matrix(1, 0, 0, 1, 0, 0)');
      assert.equal(samples[firstPressed]?.transform, 'matrix(0.97, 0, 0, 0.97, 0, 0)');
      for (let i = 1; i <= firstPressed; i++) assert.ok((samples[i]?.time ?? Infinity) - (samples[i - 1]?.time ?? 0) <= 34, 'rAF samples at most 34 ms apart');
      await finger.move([{ x: 450, y: 80 }], { id: 1, steps: 2 });
      await held('Cross', false); await held('Circle', true);
      await finger.up(1); await finger.up(2); await held('Circle', false);
    });
    await h.step('Twenty first-animation-frame samples across controls', async () => {
      const ids = ['Cross', 'Circle', 'Square', 'Triangle', 'Up', 'L', 'R', 'Start'];
      for (let i = 0; i < 24; i++) {
        const id = ids[i % ids.length]; assert.ok(id);
        const button = page.getByRole('button', { name: id, exact: true });
        await button.evaluate(node => { node.removeAttribute('data-first-frame'); });
        await finger.down(await centre(id));
        await page.waitForFunction(id => document.querySelector(`[data-control="${id}"]`)?.hasAttribute('data-first-frame'), id);
        assert.equal(await button.getAttribute('data-first-frame'), 'matrix(0.97, 0, 0, 0.97, 0, 0)');
        await finger.up(); await held(id, false);
      }
    });
    let releaseNotes = '';
    await h.step('Release strip begins while held and eases out', async () => {
      await finger.down(crossPoint);
      captureTimes = [];
      /** @type {number[]} */
      const scales = [];
      await h.frameStrip('release', page, { frames: 12, everyMs: 16, clip, checkFrame: async index => {
        if (index === 1) await finger.up();
        scales.push(await scale());
        captureTime();
      } });
      assert.equal(scales[0], 0.97, 'release frame 0 held');
      const rest = scales.findIndex(value => value === 1);
      assert.ok(rest > 0, 'release reaches rest');
      const visible = scales.filter(value => value > 0.97 && value < 0.995).length;
      releaseNotes = `Release run notes: ${String(visible)} intermediate pre-capture samples (0.97 < scale < 0.995); samples lag the picture by one frame; per-frame pre-capture scales ${JSON.stringify(scales)}`;
    });
    await h.step(releaseNotes, async () => { await Promise.resolve(); });
    await h.step('Close-up Cross held and at rest, side by side', async () => {
      await finger.down(crossPoint);
      await h.frameStrip('cross-held-left-rest-right-close-up', page, { frames: 2, everyMs: 0, clip, checkFrame: async index => {
        if (index === 1) {
          await finger.up();
          await cross.evaluate(async node => { await Promise.all(node.getAnimations().map(animation => animation.finished)); });
        }
        assert.equal(await scale(), index === 0 ? 0.97 : 1);
      } });
    });
    await h.step('Trusted touchCancel and hidden visibility release held inputs', async () => {
      await finger.down(await centre('L')); await held('L', true); await finger.cancel(); await held('L', false);
      await finger.down(await centre('R')); await held('R', true);
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        delete /** @type {{ hidden?: boolean }} */ (/** @type {unknown} */ (document)).hidden;
      });
      await held('R', false); await finger.up();
    });
    await h.step('D-pad slide switches directions', async () => {
      await finger.down(await centre('Up'));
      await finger.move([await centre('Right')], { steps: 8 });
      await held('Up', false); await held('Right', true);
      await h.shot('dpad-switched', page); await finger.up(); await held('Right', false);
    });
    await h.step('Reduced motion retains immediate pressed state', async () => {
      await h.reducedMotion(true);
      await finger.down(await centre('Square'));
      await held('Square', true);
      assert.equal(await page.getByRole('button', { name: 'Square', exact: true }).evaluate(node => getComputedStyle(node).transform), 'matrix(0.97, 0, 0, 0.97, 0, 0)');
      await h.shot('reduced-motion-held', page); await finger.up(); await held('Square', false);
      assert.equal(await page.getByRole('button', { name: 'Square', exact: true }).evaluate(node => node.getAnimations().length), 0);
    });
  } finally { await finger.dispose(); }
}
