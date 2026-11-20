import assert from 'node:assert/strict';
/** @typedef {import('playwright').Page} Page */
/** Read only the renderer's public snapshot; every action goes through a paired phone. @param {Page} host */
async function view(host) {
  return /** @type {import('../../games/tabao-rush/host/model.ts').View} */ (await host.evaluate(() => /** @type {unknown} */ (Reflect.get(document.querySelector('.tr-tutorial')?.parentElement ?? {}, '__trView'))));
}
/** @param {Page} host @param {Page} phone @param {string} id @param {number} x @param {number} y */
async function walk(host, phone, id, x, y) {
  const box = await phone.locator('.ka-stick').boundingBox(); assert.ok(box);
  const anchor = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await phone.mouse.move(anchor.x, anchor.y); await phone.mouse.down();
  try {
    for (let attempt = 0; attempt < 160; attempt++) {
      const cook = (await view(host)).cooks.find(c => c.id === id); assert.ok(cook);
      const dx = x - cook.x, dy = y - cook.y, distance = Math.hypot(dx, dy);
      if (distance < 0.12) return;
      const speed = Math.min(1, Math.max(0.2, distance * 1.5));
      await phone.mouse.move(anchor.x + dx / distance * 89 * speed, anchor.y + dy / distance * 89 * speed);
      await phone.waitForTimeout(68);
    }
    throw Error(`Cook ${id} did not reach ${String(x)}, ${String(y)}`);
  } finally { await phone.mouse.up(); }
}
/** @param {Page} phone @param {string} control @param {number} ms */
async function hold(phone, control, ms) {
  const box = await phone.locator(`[data-part="${control}"] button`).boundingBox(); assert.ok(box);
  await phone.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await phone.mouse.down();
  try { await phone.waitForTimeout(ms); } finally { await phone.mouse.up(); }
}
/** @param {Page} host @param {Page} phone @param {string} id @param {number} x */
async function counter(host, phone, id, x) {
  const cook = (await view(host)).cooks.find(c => c.id === id); assert.ok(cook);
  await walk(host, phone, id, cook.x, 2.7); await walk(host, phone, id, x, 2.7);
  await walk(host, phone, id, x, 2.4);
}
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function tutorial(h) {
  assert.equal(h.maxPhones, 3, 'Use --phones 3');
  await h.createRoom();
  /** @type {Page[]} */ const phones = [];
  for (let index = 0; index < 3; index++) {
    const phone = await h.newPhone(); phones.push(phone); await phone.setViewportSize({ width: 844, height: 390 });
    await h.openJoin(phone, `Cook ${String(index + 1)}`); await phone.getByRole('button', { name: 'Join', exact: true }).click(); await h.waitSeated(phone, `Cook ${String(index + 1)}`);
  }
  const leaderPhone = phones[0], otherPhone = phones[1];
  assert.ok(leaderPhone && otherPhone);
  const leader = leaderPhone, other = otherPhone;
  async function start() {
    await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
    await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
    await leader.getByRole('button', { name: 'Select', exact: true }).click();
    await leader.getByRole('button', { name: 'Start', exact: true }).click();
    // Retry until the phone acknowledges Ready (as in T-08).
    const tutorialUp = h.host.locator('.tr-tutorial[data-step="1"]:not([hidden])');
    for (const [index, phone] of phones.entries()) {
      const ready = phone.getByRole('button', { name: 'Ready', exact: true });
      await ready.waitFor({ timeout: 30000 });
      let attempts = 0;
      for (; attempts < 5 && !await tutorialUp.isVisible() && await ready.getAttribute('aria-pressed', { timeout: 2000 }).catch(() => 'true') !== 'true'; attempts++) {
        await ready.click();
        await phone.locator('button[aria-pressed="true"]', { hasText: 'Ready' }).waitFor({ timeout: 2000 }).catch(() => undefined);
      }
      assert.ok((attempts > 0 && await tutorialUp.isVisible()) || await phone.locator('button[aria-pressed="true"]', { hasText: 'Ready' }).count() > 0,
        `Phone ${String(index + 1)} never acknowledged Ready after ${String(attempts)} presses on the first pick`);
    }
    await tutorialUp.waitFor();
  }
  /** @param {number} step */
  async function stills(step) {
    await h.host.locator(`.tr-tutorial[data-step="${String(step)}"]:not([hidden])`).waitFor();
    await h.host.setViewportSize({ width: 1920, height: 1080 }); await h.shot(`tv-step-${String(step)}`);
    // Decode the actual composite screenshot, including the Pixi canvas.
    const png = await h.host.screenshot();
    const pixels = await h.host.evaluate(async source => {
      const image = new Image(); image.src = source; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Pixel context'); ctx.drawImage(image, 0, 0);
      const dpr = window.devicePixelRatio;
      const sample = (/** @type {number} */ x, /** @type {number} */ y) => Array.from(ctx.getImageData(Math.round(x*dpr), Math.round(y*dpr), 1, 1).data).slice(0, 3);
      // Sample above and below the rail throughout the formerly black column.
      const edge = [1560, 1700, 1850, 1910].flatMap(x => [13, 1067].map(y => sample(x,y)));
      const ink = [];
      for (let x=45;x<90;x++) for(let y=20;y<56;y++) {
        const rgb=sample(x,y); if (rgb.every(c=>c<160)) { ink.push(x); break; }
      }
      return { edge, captionStart: Math.min(...ink) };
    }, `data:image/png;base64,${png.toString('base64')}`);
    assert.ok(pixels.edge.every(rgb => rgb.some(c => c > 30)), 'Tutorial backdrop covers x >= 1560');
    assert.ok(pixels.captionStart >= 53 && pixels.captionStart <= 60, `Caption begins near x=55: ${String(pixels.captionStart)}`);
    await h.shot(`phone-leader-step-${String(step)}`, leader); await h.shot(`phone-cook-step-${String(step)}`, other);
    assert.equal(await other.getByRole('button', { name: 'Skip tutorial', exact: true }).count(), 0);
    if (step === 1) { await h.host.setViewportSize({ width: 1280, height: 720 }); await h.shot('tv-step-1-1280'); await h.host.setViewportSize({ width: 1920, height: 1080 }); }
  }
  /** @param {boolean} reduced */
  async function moveLesson(reduced) {
    for (let index = 0; index < phones.length; index++) {
      const phone = phones[index]; assert.ok(phone); const id = `seat-${String(index + 1)}`;
      const cook = (await view(h.host)).cooks.find(c => c.id === id); assert.ok(cook);
      await walk(h.host, phone, id, cook.x, 2.7); await walk(h.host, phone, id, 6.5, 2.7);
      if (index === phones.length - 1) {
        /** @type {Promise<void> | undefined} */ let moving;
        await h.frameStrip(reduced ? 'ring-move-reduced' : 'ring-move', h.host, { frames: 8, everyMs: 89, checkFrame: frame => { if (frame === 1) moving = walk(h.host, phone, id, 6.5, 3.5); return Promise.resolve(); } });
        await moving;
      } else await walk(h.host, phone, id, 6.5, 3.5);
      await walk(h.host, phone, id, 5.5 - index, 3.5); await walk(h.host, phone, id, 5.5 - index, 4.5);
    }
  }
  await h.step('Start and capture the first lesson', async () => { await start(); await stills(1); });
  await h.step('All three cooks move through real phone sticks', async () => { await moveLesson(false); await stills(2); }, 90000);
  await h.step('All three cooks pick up from the real crate', async () => {
    for (let index = 0; index < phones.length; index++) {
      const phone = phones[index]; assert.ok(phone); const id = `seat-${String(index + 1)}`;
      await counter(h.host, phone, id, 2.5); await hold(phone, 'cross', 89);
      await walk(h.host, phone, id, 2.5, 3.5); await walk(h.host, phone, id, 5.5 - index, 3.5); await walk(h.host, phone, id, 5.5 - index, 4.5);
    }
    await stills(3);
  }, 90000);
  await h.step('Every cook places and chops their ingredient with cross and held circle', async () => {
    for (let index = 0; index < phones.length; index++) {
      const phone = phones[index]; assert.ok(phone); const id = `seat-${String(index + 1)}`;
      await counter(h.host, phone, id, 4.5); await hold(phone, 'cross', 89); await hold(phone, 'circle', 3400);
      await hold(phone, 'cross', 89);
      await walk(h.host, phone, id, 4.5, 3.5); await walk(h.host, phone, id, 5.5 - index, 3.5); await walk(h.host, phone, id, 5.5 - index, 4.5);
    }
    await stills(4);
  }, 120000);
  await h.step('Every cook places on Serve and the first real round starts', async () => {
    for (let index = 0; index < phones.length; index++) {
      const phone = phones[index]; assert.ok(phone); const id = `seat-${String(index + 1)}`;
      await counter(h.host, phone, id, 6.5); await hold(phone, 'cross', 89);
      if (index < phones.length - 1) { await walk(h.host, phone, id, 6.5, 3.5); await walk(h.host, phone, id, 5.5 - index, 3.5); await walk(h.host, phone, id, 5.5 - index, 4.5); }
    }
    await h.host.locator('.tr-tutorial[hidden]').waitFor({ state: 'attached' }); assert.equal((await view(h.host)).phase, 'play'); await h.shot('tv-first-real-round');
  }, 90000);
  await h.step('After a completed real round the same room has no tutorial', async () => {
    await leader.getByRole('button', { name: 'Play again', exact: true }).waitFor({ timeout: 240000 });
    await leader.getByRole('button', { name: 'Play again', exact: true }).click();
    // Keep the retry; report the phone and actual press count if Ready is never acknowledged.
    const pickerGone = h.host.locator('.tr-cook-picker[hidden]');
    for (const [index, phone] of phones.entries()) {
      const ready = phone.getByRole('button', { name: 'Ready', exact: true });
      await ready.waitFor({ timeout: 30000 });
      let attempts = 0;
      // Judge each phone by its own button: the previous screen's hidden picker can already match pickerGone.
      for (; attempts < 5 && await ready.getAttribute('aria-pressed', { timeout: 2000 }).catch(() => 'true') !== 'true'; attempts++) {
        await ready.click();
        await phone.locator('button[aria-pressed="true"]', { hasText: 'Ready' }).waitFor({ timeout: 2000 }).catch(() => undefined);
      }
      assert.ok(await phone.locator('button[aria-pressed="true"]', { hasText: 'Ready' }).count() > 0 || await ready.count() === 0,
        `Phone ${String(index + 1)} never acknowledged Ready after ${String(attempts)} presses after Play again`);
    }
    await pickerGone.waitFor({ state: 'attached' });
    assert.equal((await view(h.host)).phase, 'play'); assert.equal(await leader.getByRole('button', { name: 'Skip tutorial', exact: true }).count(), 0); await h.shot('tv-second-round-no-tutorial');
  }, 260000);
  await h.step('New room with reduced motion and leader skip at step two', async () => {
    // A genuinely new room: the host's reopen snapshot lives in sessionStorage, so clear it or /host reopens the same room (PLAT-009).
    const oldCode = h.code;
    await h.host.goto(h.origin); await h.host.evaluate(() => { sessionStorage.clear(); localStorage.removeItem('kaki.host-reconnect.v1'); }); await h.createRoom();
    assert.notEqual(h.code, oldCode, 'The TV opened a new room');
    for (const [index, phone] of phones.entries()) {
      await phone.emulateMedia({ reducedMotion: 'reduce' });
      // A new group: forget the old room's seat and device, then join the new code.
      await phone.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
      await h.openJoin(phone, `Cook ${String(index + 1)}`); await phone.getByRole('button', { name: 'Join', exact: true }).click(); await h.waitSeated(phone, `Cook ${String(index + 1)}`);
    }
    await h.host.emulateMedia({ reducedMotion: 'reduce' }); await start(); await moveLesson(true);
    await h.host.locator('.tr-tutorial[data-step="2"]').waitFor(); await h.shot('tv-skip-step-2');
    await leader.getByRole('button', { name: 'Skip tutorial', exact: true }).click();
    await h.host.locator('.tr-tutorial[hidden]').waitFor({ state: 'attached' }); assert.equal((await view(h.host)).phase, 'play'); await h.shot('tv-skipped-real-round');
  }, 120000);
}
