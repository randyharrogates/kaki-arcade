// PLAT-006, PLAT-009, PLAT-020, PLAT-021; NFR-A11Y, NFR-DES, NFR-TEST.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join as pathJoin } from 'node:path';
import { hostPresets } from '../../tools/uat/core.js';
const phoneMatrix = Object.fromEntries(/** @type {[number, number][]} */ ([
  [320, 568], [360, 667], [390, 844], [430, 932],
  [568, 320], [667, 375], [844, 390], [932, 430],
]).map(([width, height]) => [`${String(width)}x${String(height)}`, { width, height }]));
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function picker(h) {
  // Enrich the harness-generated table using the actual filenames (including 4K .png).
  const save = h.save.bind(h);
  h.save = async (...args) => {
    await save(...args);
    const report = pathJoin(h.evidence, 'REPORT.md');
    const text = await readFile(report, 'utf8');
    await writeFile(report, text.replace(/(\| !\[([^\]]+)\]\([^)]+\) \| )(UNSETTLED )?\| \|/g,
      (_match, prefix, file, unsettled) => `${String(prefix)}${String(unsettled ?? '')}${String(file).replace(/^\d+-/, '').replace(/\.(jpg|png)$/, '').replaceAll('-', ' ')} | |`));
  };
  if (h.maxPhones < 2) throw new Error('C-09 requires --phones 2');
  if (process.env.C09_DEMO_MATRIX === '1') {
    await h.host.setViewportSize(hostPresets['1080p']);
    for (const layout of ['a', 'b', 'c']) for (const players of [1, 8]) for (const art of [0, 1]) {
      await h.step(`Start layout ${layout}, ${String(players)} seats, art ${String(art)}`, async () => {
        await h.host.goto(`${h.origin}/host?demo=picker&state=start&layout=${layout}&players=${String(players)}&art=${String(art)}`);
        await h.host.locator('[data-expanded="true"]').waitFor();
        await h.shot(`layout-${layout}-${String(players)}-art-${String(art)}`); await noScroll(h.host);
      });
    }
    return;
  }
  await h.createRoom();
  /** @type {string[]} */
  const phoneRuleRequests = [];
  /** @param {string} name */
  const join = async name => h.step(`Join ${name}`, async () => {
    const page = await h.newPhone();
    page.on('request', request => {
      if (/\/games\/.*\/(?:rules\/(?!meta\.ts)|index\.ts)/.test(request.url())) phoneRuleRequests.push(request.url());
    });
    await h.openJoin(page, name);
    await page.getByRole('button', { name: 'Join', exact: true }).click();
    await h.waitSeated(page, name);
    return page;
  });
  let realHeadingSize = '';
  const leader = await join('Cloud Noodle');
  const watcher = await join('Pebble Puff');
  /** @param {string} name */
  const capture = async name => {
    for (const page of [h.host, leader, watcher]) await h.shot(name, page);
  };
  /** @param {import('playwright').Page} page @param {string} name */
  const action = async (page, name) => page.getByRole('button', { name, exact: true }).click();
  /** @param {string} game */
  const follows = async (game, screen = 'picker') => {
    await h.host.locator(`[data-game][data-focused="true"][data-expanded="${String(screen !== 'picker')}"]`).getByRole('heading', { name: game, exact: true }).waitFor();
    for (const page of [leader, watcher]) await page.locator('.phone-live').filter({ hasText: game }).waitFor();
  };
  await h.step('Real leader and watcher follow focus, expand, collapse and start', async () => {
    await action(leader, 'Pick a game'); await follows('Tabao Rush'); await watchTileSettles(h.host); await capture('real-picker');
    for (const page of [leader, watcher]) await page.evaluate(() => {
      const live = document.querySelector('.phone-live'); if (!live) throw new Error('Missing live region');
      live.setAttribute('data-uat-announcements', '');
      new MutationObserver(() => { live.setAttribute('data-uat-announcements', `${live.getAttribute('data-uat-announcements') ?? ''}\n${live.textContent}`); }).observe(live, { childList: true, characterData: true, subtree: true });
    });
    const midMove = h.host.evaluate(async () => {
      while (!document.querySelector('.game-tile-content[data-snapshot]')) await new Promise(requestAnimationFrame);
      const animations = document.getAnimations().filter(a => a.playState === 'running' || a.pending);
      for (const animation of animations) { animation.pause(); animation.currentTime = 150; }
    });
    await action(leader, 'Next'); await midMove;
    await assertTileFrame(h.host, 'focus'); await h.shot('real-focus-150ms', h.host, undefined, false);
    await h.host.evaluate(() => { for (const animation of document.getAnimations()) if (animation.playState === 'paused') animation.play(); });
    await follows('Peek Poker'); await capture('real-focus');
    for (const page of [leader, watcher]) {
      const announcements = await page.locator('.phone-live').getAttribute('data-uat-announcements');
      assert.equal(announcements, '\n' + (page === leader ? 'You choose the game: Peek Poker' : 'Cloud Noodle is choosing: Peek Poker'));
      assert.equal(await page.locator('[aria-live]').count(), 1, 'Only one live region');
    }
    const continuity = h.host.evaluate(async () => {
      const read = () => [...document.querySelectorAll('[data-game]')].map(tile => {
        const r = tile.getBoundingClientRect(); return [r.left, r.top, r.width, r.height];
      });
      let boxes = read(); let previousTime = performance.now(); const start = previousTime;
      const errors = [];
      /** @type {Map<Element, number>} */
      const speeds = new Map();
      while (performance.now() - start < 1000) {
        await new Promise(requestAnimationFrame);
        const now = performance.now(); const next = read();
        const stage = document.querySelector('.picker-stage')?.getBoundingClientRect();
        // Peak easing derivative is 2.86 (about 8.6 px/ms for the longest move).
        // Use each tile animation's own travel and duration, including interrupted moves.
        const limits = [...document.querySelectorAll('[data-game]')].map(tile => {
          const animation = tile.getAnimations().find(a => a.effect instanceof KeyframeEffect && a.effect.getKeyframes().some(k => k.transform));
          if (!(animation?.effect instanceof KeyframeEffect)) return (speeds.get(tile) ?? 0) * (now - previousTime) + 2;
          const frames = animation.effect.getKeyframes();
          const first = frames[0]; const last = frames.at(-1);
          const translation = new DOMMatrix(String(first?.transform ?? 'none'));
          const travel = Math.max(Math.abs(translation.m41), Math.abs(translation.m42),
            Math.abs(parseFloat(String(first?.width)) - parseFloat(String(last?.width))),
            Math.abs(parseFloat(String(first?.height)) - parseFloat(String(last?.height))));
          const speed = travel * 2.86 / Number(animation.effect.getTiming().duration);
          const bound = Math.max(speed, speeds.get(tile) ?? 0) * (now - previousTime) + 2;
          speeds.set(tile, speed);
          return bound;
        });
        for (let i = 0; i < next.length; i++)
          if (next[i]?.some((value, j) => Math.abs(value - (boxes[i]?.[j] ?? value)) > (limits[i] ?? 2)))
            errors.push({ tile: i, time: Math.round(now - start), from: boxes[i]?.map(Math.round), to: next[i]?.map(Math.round), allowed: Math.round(limits[i] ?? 2) });
        for (let i = 0; i < next.length; i++) {
          const box = next[i];
          if (stage && box?.[0] !== undefined && box[1] !== undefined && box[2] !== undefined && box[3] !== undefined && (box[0] < stage.left - 1 || box[1] < stage.top - 1 ||
              box[0] + box[2] > stage.right + 1 || box[1] + box[3] > stage.bottom + 1))
            errors.push({ tile: i, time: Math.round(now - start), outsideStage: box, stage: [stage.left, stage.top, stage.right, stage.bottom] });
        }
        boxes = next; previousTime = now;
      }
      return errors;
    });
    await action(leader, 'Next'); await new Promise(resolve => setTimeout(resolve, 60)); await action(leader, 'Next');
    assert.deepEqual(await continuity, [], 'Two real Next presses 60ms apart have no frame discontinuity');
    await follows('Tabao Rush'); await action(leader, 'Next'); await follows('Peek Poker');
    await action(leader, 'Select'); await follows('Peek Poker', 'start'); await tileSettled(h.host); await h.host.evaluate(() => document.fonts.ready); realHeadingSize = await h.host.locator('.picker-screen .incoming h1').evaluate(heading => getComputedStyle(heading).fontSize); await capture('real-selected');
    await action(leader, 'Back'); await follows('Peek Poker');
    await action(leader, 'Select'); await follows('Peek Poker', 'start');
    await action(leader, 'Start');
    for (const page of [leader, watcher]) await page.locator('.phone-live').filter({ hasText: 'Starting Peek Poker' }).waitFor();
    await tileSettled(h.host);
    assert.deepEqual(await h.host.evaluate(() => document.documentElement.getAttribute('data-uat-clip-errors') ?? '[]'), '[]', 'Every settled real expand/collapse releases its mask and canvas');
    await noScroll(leader); await noScroll(watcher);
    assert.deepEqual(phoneRuleRequests, [], 'Phones must never request game rules');
  });
  await h.step('Host reload during picker restores lobby; leader departure transfers controls', async () => {
    await h.host.reload(); await h.waitSeated(leader, 'Cloud Noodle');
    await action(leader, 'Pick a game'); await follows('Tabao Rush');
    await h.host.reload(); await h.waitSeated(leader, 'Cloud Noodle'); await h.waitSeated(watcher, 'Pebble Puff');
    assert.equal(await h.host.locator('.picker-stage').count(), 0);
    await leader.getByText("Pick a game when everyone’s in.", { exact: true }).waitFor();
    await watcher.getByText('Waiting for the leader to pick a game.', { exact: true }).waitFor();
    await capture('real-reload-lobby');
    await action(leader, 'Pick a game'); await follows('Tabao Rush');
    await action(leader, 'Leave');
    await watcher.getByRole('heading', { name: 'You choose the game', exact: true }).waitFor();
    await action(watcher, 'Next');
    await h.host.locator('[data-focused="true"]').getByRole('heading', { name: 'Peek Poker', exact: true }).waitFor();
    await capture('real-leader-left');
    await action(watcher, 'Leave');
    await h.host.locator('.room-code').waitFor();
    // The picker crossfades out over the lobby, so wait for it to leave rather than assert at once.
    await h.host.locator('.picker-stage').waitFor({ state: 'detached' });
    await h.shot('real-empty-lobby-code');
  });
  // D-098: leaving the final seat returns to the join code.
  for (const [preset, viewport] of Object.entries(hostPresets)) {
    await h.host.setViewportSize(viewport);
    // 4K stills are lossless and about 1 MB each: two are enough to judge the layout there.
    for (const query of ['players=0', 'players=8&state=start', ...(preset === '1080p' ? ['players=1&state=start'] : [])]) {
      await h.step(`Demo ${preset} ${query}`, async () => {
        await h.host.goto(`${h.origin}/host?demo=picker&names=wide&${query}`);
        await h.host.locator('.picker-stage').waitFor();
        if (query === 'players=0') {
          assert.equal(await h.host.getByText('Needs at least 1 player', { exact: true }).count(), 3);
          await unclippedTileText(h.host);
        }
        if (query.includes('state=start')) {
          await singleLineHeading(h.host);
          assert.equal(await h.host.locator('[data-expanded="true"]').evaluate(tile => {
            const picture = tile.querySelector('.game-picture-slot')?.getBoundingClientRect();
            const copy = tile.querySelector('.game-metadata')?.getBoundingClientRect();
            return picture !== undefined && copy !== undefined && Math.abs(picture.bottom - copy.bottom) <= 1;
          }), true, 'Layout B copy shares the picture bottom edge');
        }
        await h.shot(`demo-${preset}-${query.replace(/[=&]/g, '-')}`); await noScroll(h.host);
      });
    }
  }
  for (const preset of /** @type {const} */ (['720p', '1080p'])) await h.step(`Stable stage band ${preset} with wide names`, async () => {
    await h.host.setViewportSize(hostPresets[preset]);
    const boxes = [];
    for (const state of ['picker', 'start']) {
      await h.host.goto(`${h.origin}/host?demo=picker&names=wide&state=${state}`);
      await h.host.locator('.picker-stage').waitFor(); await tileSettled(h.host);
      await h.host.evaluate(() => document.fonts.ready);
      boxes.push(await h.host.locator('.picker-stage').boundingBox());
    }
    assert.deepEqual(boxes[0], boxes[1], 'Picker and start reserve identical stage rectangles');
  });
  for (const [orientation, viewport] of Object.entries(phoneMatrix)) {
    for (const page of [leader, watcher]) for (const names of ['', '&names=wide']) {
      await page.setViewportSize(viewport);
      for (const state of ['', '&state=start', '&state=starting', '&players=0', '&state=start&players=0', '&state=start&failure=1']) {
        await page.goto(`${h.origin}/play?demo=picker-${page === leader ? 'leader' : 'watcher'}${state}${names}`);
        await page.locator('.phone-picker').waitFor(); await leaveGeometry(page); if (orientation === '390x844' && !names) await h.shot(`demo-${orientation}-${state.replace(/[=&]+/g, '-').replace(/^-/, '') || 'picker'}`, page); await noScroll(page);
      }
    }
  }
  for (const [orientation, viewport] of Object.entries(phoneMatrix)) for (const state of ['lobby', 'rename']) for (const names of ['', '&names=wide']) {
    await leader.setViewportSize(viewport);
    await leader.goto(`${h.origin}/play?demo=${state}&leader=1${names}`);
    await leader.getByRole('button', { name: 'Leave', exact: true }).waitFor();
    await leaveGeometry(leader); await noScroll(leader); if (orientation === '320x568' && names) await h.shot(`phone-${state}-leave-${orientation}-wide`, leader);
  }
  await h.host.setViewportSize(hostPresets['1080p']);
  await h.host.goto(`${h.origin}/host?demo=picker&state=start&players=2`);
  await tileSettled(h.host); await h.host.evaluate(() => document.fonts.ready);
  assert.equal(await h.host.locator('.picker-screen .incoming h1').evaluate(heading => getComputedStyle(heading).fontSize), realHeadingSize, 'Real and demo headers have identical typography at the same viewport and name');
  await h.host.goto(`${h.origin}/host?demo=picker&state=start&failure=1`);
  await h.host.locator('.picker-screen header p').filter({ hasText: 'Could not load Tabao Rush. Try again.' }).waitFor();
  await tileSettled(h.host);
  await h.shot('load-failure');
  await h.host.setViewportSize(hostPresets['720p']);
  for (const change of ['focus', 'expand', 'collapse']) {
    await h.step(`Same-node ${change} slow10 strip`, async () => {
      // The script triggers the change after initial layout and content have settled.
      await h.host.goto(`${h.origin}/host?demo=picker&focus=tabao-rush&change=${change}${change === 'collapse' ? '&state=start' : ''}`);
      await h.host.locator('[data-game="tabao-rush"]').waitFor();
      await h.host.evaluate(async () => {
        const end = performance.now() + 1500; let quiet = 0;
        while (quiet < 2 && performance.now() < end) { await new Promise(requestAnimationFrame); quiet = document.getAnimations().some(a => a.playState === 'running' || a.pending) ? 0 : quiet + 1; }
        if (quiet < 2) throw new Error('Picker did not settle before the demo change');
        const url = new URL(location.href); url.searchParams.set('slow', '10'); history.replaceState(null, '', url);
      });
      // Half-resolution strip pixels keep all nine complete-stage frames within 12 MB.
      const cdp = await h.host.context().newCDPSession(h.host);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 0.5, mobile: false });
      const original = await h.host.locator('[data-game="tabao-rush"]').elementHandle(); assert.ok(original);
      const seatWidths = await h.host.locator('.picker-players li').evaluateAll(seats => seats.map(seat => seat.getBoundingClientRect().width));
      await h.host.evaluate(() => { window.dispatchEvent(new Event('picker-demo-change')); });
      const clip = await h.host.locator('.picker-screen').boundingBox(); assert.ok(clip);
      const duration = await original.evaluate(node => Math.max(...node.getAnimations({ subtree: true }).map(a => Number(a.effect?.getTiming().duration))));
      await h.frameStrip(`demo-${change}-slow10`, h.host, { frames: 9, everyMs: duration / 8, clip, checkFrame: async frame => {
        assert.equal(await original.evaluate(node => node === document.querySelector('[data-game="tabao-rush"]')), true, 'Tile must retain DOM identity');
        // Frame nine covers the complete duration; frame two must be part-way.
        await assertTileFrame(h.host, change);
        if (change === 'collapse') for (const [index, width] of (await h.host.locator('.picker-players li').evaluateAll(seats => seats.map(seat => seat.getBoundingClientRect().width))).entries()) assert.ok(Math.abs(width - (seatWidths[index] ?? NaN)) <= 1, 'Collapse seat width stays at expanded geometry');
        if (frame === 0 && change !== 'focus') assert.equal(await h.host.locator('[data-focused="false"]').evaluateAll(tiles => tiles.every(tile => getComputedStyle(tile).visibility === 'visible')), true, 'Siblings visible in first frame');
        if (frame === 1) assert.equal(await original.evaluate(node => node.getAnimations({ subtree: true }).some(a => {
          const progress = a.effect?.getComputedTiming().progress;
          return a.playState === 'running' && progress !== null && progress !== undefined && progress > 0 && progress < 1;
        })), true, 'Second strip frame must be mid-transition');
      } });
      await cdp.send('Emulation.clearDeviceMetricsOverride'); await cdp.detach();
      await tileSettled(h.host);
      await h.shot(`demo-${change}-settled`);
      if (change === 'expand') assert.equal(await h.host.locator('[data-focused="false"]').evaluateAll(tiles => tiles.every(tile => getComputedStyle(tile).visibility === 'hidden')), true, 'Siblings hide only after expansion');
    });
  }
  for (const interruptAt of [60, 144]) await h.step(`Interrupted focus at ${String(interruptAt)} ms preserves every rectangle`, async () => {
    await h.host.setViewportSize(hostPresets['1080p']);
    await h.host.goto(`${h.origin}/host?demo=picker&change=focus`);
    await h.host.locator('.picker-stage').waitFor(); await tileSettled(h.host);
    const result = await h.host.evaluate(async interruptAt => {
      const tiles = [...document.querySelectorAll('[data-game]')];
      const read = () => tiles.map(tile => {
        const r = tile.getBoundingClientRect(); return [r.left, r.top, r.width, r.height];
      });
      const initial = read();
      window.dispatchEvent(new Event('picker-demo-change'));
      await new Promise(resolve => setTimeout(resolve, interruptAt));
      const old = document.getAnimations().filter(a => a.playState === 'running' || a.pending);
      for (const animation of old) animation.pause();
      await new Promise(requestAnimationFrame);
      const before = read();
      window.dispatchEvent(new Event('picker-demo-change'));
      await new Promise(requestAnimationFrame);
      const fresh = document.getAnimations().filter(a => !old.includes(a));
      for (const animation of fresh) { animation.pause(); animation.currentTime = 0; }
      const after = read();
      for (const animation of fresh) animation.play();
      while (tiles.some(tile => tile.getAnimations({ subtree: true }).some(a => a.playState === 'running' || a.pending))) await new Promise(requestAnimationFrame);
      // Two advances focus Rabakz; Tabao and Peek occupy the first and second side rows.
      return { before, after, final: read(), expected: [initial[1], initial[2], initial[0]], focus: tiles.find(tile => tile.getAttribute('data-focused') === 'true')?.getAttribute('data-game') };
    }, interruptAt);
    for (let i = 0; i < result.before.length; i++)
      assert.ok(result.after[i]?.every((value, j) => Math.abs(value - (result.before[i]?.[j] ?? NaN)) <= 2), `Interrupted first frame preserves tile ${String(i)}`);
    assert.equal(result.focus, 'rabakz');
    for (let i = 0; i < result.final.length; i++)
      assert.ok(result.final[i]?.every((value, j) => Math.abs(value - (result.expected[i]?.[j] ?? NaN)) <= 2), `Two advances settle tile ${String(i)} to its grid`);
    await tileSettled(h.host);
  });
  await h.step('Reduced motion retains final state without tile animation', async () => {
    await h.reducedMotion(true);
    for (const change of ['focus', 'expand', 'collapse']) {
      await h.host.goto(`${h.origin}/host?demo=picker&slow=10&change=${change}${change === 'collapse' ? '&state=start' : ''}`);
      await h.host.locator('.picker-stage').waitFor();
      await h.host.evaluate(() => { window.dispatchEvent(new Event('picker-demo-change')); });
      await h.host.waitForFunction(change => change === 'focus'
        ? document.querySelector('[data-game="peek-poker"]')?.getAttribute('data-focused') === 'true'
        : document.querySelector('[data-game="tabao-rush"]')?.getAttribute('data-expanded') === String(change === 'expand'), change);
      assert.equal(await h.host.evaluate(() => [...document.querySelectorAll('[data-game]')].some(node => node.getAnimations({ subtree: true }).some(a => a.playState === 'running' && Number(a.effect?.getTiming().duration) > 0))), false);
      await tileSettled(h.host);
      await h.shot(`demo-reduced-${change}`);
    }
    for (const page of [leader, watcher]) {
      await page.goto(`${h.origin}/play?demo=picker-${page === leader ? 'leader' : 'watcher'}&state=start`);
      await page.locator('.phone-picker').waitFor();
      await h.shot('demo-reduced-start', page); await noScroll(page);
    }
  });
}
/** @param {import('playwright').Page} page */
async function noScroll(page) {
  assert.equal(await page.evaluate(() => {
    const elements = [document.documentElement, document.body, document.querySelector('.phone-page')].filter(Boolean);
    return elements.every(e => !e || e.scrollWidth <= e.clientWidth && e.scrollHeight <= e.clientHeight);
  }), true, 'No scrolling');
}

/** @param {import('playwright').Page} page */
async function leaveGeometry(page) {
  assert.equal(await page.locator('.phone-id strong').evaluate(name => name.scrollWidth <= name.clientWidth && name.scrollHeight <= name.clientHeight && getComputedStyle(name).textOverflow !== 'ellipsis'), true, 'Full nickname fits without clipping');
  const leave = page.getByRole('button', { name: 'Leave', exact: true });
  assert.equal(await leave.evaluate(button => {
    const box = button.getBoundingClientRect();
    return box.width >= 55 && box.height >= 55 && getComputedStyle(button).fontSize === '21px' && button.classList.contains('ka-pressable') &&
      [...document.querySelectorAll('button, input')].filter(other => other !== button).every(other => {
        const b = other.getBoundingClientRect();
        if (!b.width || !b.height) return true;
        return Math.max(b.left - box.right, box.left - b.right, b.top - box.bottom, box.top - b.bottom) >= 21;
      });
  }), true, 'Leave is 55×55, 21px text, pressable and clear of controls');
}

/** Watch without delaying the real Select, Back, Select sequence.
 * @param {import('playwright').Page} page */
async function watchTileSettles(page) {
  await page.evaluate(() => {
    const seen = new WeakSet();
    /** @type {unknown[]} */
    const errors = [];
    /** @param {HTMLElement} tile */
    const inspect = tile => {
      const actual = tile.getBoundingClientRect();
      const clip = getComputedStyle(tile).clipPath;
      const saved = tile.getAttribute('style');
      for (const name of ['position', 'left', 'top', 'width', 'height', 'z-index']) tile.style.removeProperty(name);
      const layout = tile.getBoundingClientRect();
      if (saved === null) tile.removeAttribute('style'); else tile.setAttribute('style', saved);
      if (clip !== 'none' || [actual.x - layout.x, actual.y - layout.y, actual.width - layout.width, actual.height - layout.height].some(delta => Math.abs(delta) > 0.5)) errors.push({ clip, actual: [actual.x, actual.y, actual.width, actual.height], layout: [layout.x, layout.y, layout.width, layout.height] });
      document.documentElement.setAttribute('data-uat-clip-errors', JSON.stringify(errors));
    };
    const tick = () => {
      for (const tile of document.querySelectorAll('[data-game]')) for (const animation of tile.getAnimations()) {
        if (seen.has(animation) || !(animation.effect instanceof KeyframeEffect) || !animation.effect.getKeyframes().some(frame => 'clipPath' in frame)) continue;
        seen.add(animation);
        animation.addEventListener('finish', () => { queueMicrotask(() => {
          if (!tile.getAnimations().some(a => a.playState === 'running' || a.pending)) inspect(/** @type {HTMLElement} */ (tile));
        }); }, { once: true });
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}
/** Assert the real rect matches the final CSS grid layout, with no filled clip effect.
 * @param {import('playwright').Page} page */
async function tileSettled(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('[data-game]')].every(tile =>
    tile.getAnimations({ subtree: true }).every(a => a.playState !== 'running' && !a.pending)));
  assert.equal(await page.locator('[data-game]').evaluateAll(tiles => tiles.every(tile => {
    const actual = tile.getBoundingClientRect();
    const clip = getComputedStyle(tile).clipPath;
    const saved = tile.getAttribute('style');
    for (const name of ['position', 'left', 'top', 'width', 'height', 'z-index']) tile.style.removeProperty(name);
    const layout = tile.getBoundingClientRect();
    if (saved === null) tile.removeAttribute('style'); else tile.setAttribute('style', saved);
    return clip === 'none' && [actual.x - layout.x, actual.y - layout.y, actual.width - layout.width, actual.height - layout.height].every(delta => Math.abs(delta) <= 0.5);
  })), true, 'Settled tiles have clip-path:none and their final layout rectangle');
}

/** @param {import('playwright').Page} page */
async function singleLineHeading(page) {
  assert.equal(await page.locator('.picker-screen h1').evaluate(heading => {
    if (!(heading instanceof HTMLElement)) return false;
    const range = document.createRange(); range.selectNodeContents(heading);
    const rects = [...range.getClientRects()];
    const count = document.querySelector('.picker-screen .player-count')?.getBoundingClientRect();
    const right = Math.max(...rects.map(r => r.right));
    return count && new Set(rects.map(r => r.top)).size === 1 &&
      right <= count.left - 34 + 1 && right <= innerWidth - 55 + 1 &&
      ['89px', '55px'].includes(getComputedStyle(heading).fontSize);
  }), true, 'TV start heading fits one line at the 55px minimum');
}

/** Inspect painted text rectangles after ancestor masks, including each tile's own clip.
 * @param {import('playwright').Page} page
 * @param {string} change */
async function assertTileFrame(page, change) {
  const errors = await page.evaluate(change => {
    const errors = [];
    const heading = document.querySelector('.picker-screen header .incoming h1');
    const count = document.querySelector('.picker-screen .player-count');
    if (heading && count && Math.abs(heading.getBoundingClientRect().top - count.getBoundingClientRect().top) > 1) errors.push('Player count is not level with header first line');
    const ghost = Number(getComputedStyle(document.documentElement).getPropertyValue('--ka-opacity-ghost'));
    /** @typedef {{ left: number, top: number, right: number, bottom: number }} Rect */
    /** @param {Rect} a @param {Rect} b */
    const intersect = (a, b) => ({ left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) });
    /** @param {Element} element */
    const bounds = element => {
      const box = element.getBoundingClientRect();
      const clip = getComputedStyle(element).clipPath;
      const values = /^inset\(([^)]+)\)/.exec(clip)?.[1]?.split('round')[0]?.trim().split(/\s+/);
      if (!values) return box;
      const sides = [values[0], values[1] ?? values[0], values[2] ?? values[0], values[3] ?? values[1] ?? values[0]];
      const scale = box.width / (element instanceof HTMLElement ? element.offsetWidth : box.width);
      const pixels = sides.map((value, i) => (value ?? '0').endsWith('%') ? parseFloat(value ?? '0') / 100 * (i % 2 ? box.width : box.height) : parseFloat(value ?? '0') * scale);
      return { left: box.left + (pixels[3] ?? 0), top: box.top + (pixels[0] ?? 0), right: box.right - (pixels[1] ?? 0), bottom: box.bottom - (pixels[2] ?? 0) };
    };
    const headerBoxes = [];
    for (const copy of document.querySelectorAll('.picker-screen header .incoming, .picker-screen header .outgoing')) {
      const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent?.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) {
          const painted = intersect(rect, bounds(copy));
          if (painted.right > painted.left && painted.bottom > painted.top) headerBoxes.push({ copy, rect: painted });
        }
      }
    }
    for (let i = 0; i < headerBoxes.length; i++) for (const other of headerBoxes.slice(i + 1)) {
      const box = headerBoxes[i];
      if (!box || box.copy === other.copy) continue;
      const overlap = intersect(box.rect, other.rect);
      if (overlap.right - overlap.left > 1 && overlap.bottom - overlap.top > 1) errors.push('Overlapping header copy text');
    }
    for (const tile of document.querySelectorAll('[data-game]')) {
      if (getComputedStyle(tile).visibility === 'hidden') continue;
      const visible = bounds(tile);
      const titles = new Set();
      /** @type {{ copy: Element, rect: Rect }[]} */
      const textBoxes = [];
      let strongLine = false;
      const walker = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        let opacity = 1;
        let clips = null;
        for (let parent = node.parentElement; parent; parent = parent.parentElement) {
          const css = getComputedStyle(parent); opacity *= Number(css.opacity);
          if (css.visibility === 'hidden') opacity = 0;
          // Exclude the tile here: this assertion must detect a missing tile clip.
          if (parent !== tile && (css.overflow === 'hidden' || css.clipPath !== 'none')) clips = clips ? intersect(clips, bounds(parent)) : bounds(parent);
          if (parent === tile) {
            if (css.overflow === 'hidden' || css.clipPath !== 'none') clips = clips ? intersect(clips, visible) : visible;
            break;
          }
        }
        if (!opacity) continue;
        if ((change === 'focus' ? tile.getAttribute('data-game') === 'rabakz' : tile.getAttribute('data-focused') === 'false') && opacity !== 1)
          errors.push('Unchanged tile text must stay at opacity 1');
        for (const rect of range.getClientRects()) {
          const painted = clips ? intersect(rect, clips) : rect;
          if (painted.right <= painted.left || painted.bottom <= painted.top) continue;
          if (painted.left < visible.left - 1 || painted.top < visible.top - 1 || painted.right > visible.right + 1 || painted.bottom > visible.bottom + 1) errors.push(`${tile.getAttribute('data-game') ?? ''}: escaped text ${node.textContent}`);
          if (opacity > 0.5 && painted.bottom - painted.top >= rect.height - 1 && painted.right - painted.left >= rect.width - 1) strongLine = true;
          const copy = node.parentElement?.closest('.game-tile-content');
          if (copy) textBoxes.push({ copy, rect: painted });
          if (opacity > ghost + 0.001 && node.parentElement?.closest('h2')) titles.add(node.parentElement.closest('h2'));
        }
      }
      for (let i = 0; i < textBoxes.length; i++) for (const other of textBoxes.slice(i + 1)) {
        const box = textBoxes[i];
        if (!box || box.copy === other.copy) continue;
        const overlap = intersect(box.rect, other.rect);
        if (overlap.right - overlap.left > 1 && overlap.bottom - overlap.top > 1)
          errors.push(`${tile.getAttribute('data-game') ?? ''}: overlapping copy text`);
      }
      if (!strongLine) errors.push(`${tile.getAttribute('data-game') ?? ''}: ghost-only tile`);
      // D-107: on expand and collapse the two layouts sit either side of one boundary, so a
      // title may show once in each; text from the two copies must still never overlap.
      if (change === 'focus' && titles.size > 1) errors.push(`${tile.getAttribute('data-game') ?? ''}: duplicate strong title`);
    }
    return errors;
  }, change);
  assert.deepEqual(errors, [], 'Every strip frame clips text to its tile and has at most one strong title');
}

/** Compare original text ranges, before clipping, with the tile padding box.
 * @param {import('playwright').Page} page */
async function unclippedTileText(page) {
  assert.deepEqual(await page.locator('[data-game]').evaluateAll(tiles => {
    const errors = [];
    for (const tile of tiles) {
      const box = tile.getBoundingClientRect();
      const css = getComputedStyle(tile);
      const scale = box.width / (tile instanceof HTMLElement ? tile.offsetWidth : box.width);
      const walker = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode;
        if (!text.textContent?.trim() || text.parentElement?.closest('[aria-hidden="true"]')) continue;
        const range = document.createRange(); range.selectNodeContents(text);
        for (const r of range.getClientRects())
          if (r.left < box.left + parseFloat(css.paddingLeft) * scale - 1 ||
              r.right > box.right - parseFloat(css.paddingRight) * scale + 1 ||
              r.top < box.top + parseFloat(css.paddingTop) * scale - 1 ||
              r.bottom > box.bottom - parseFloat(css.paddingBottom) * scale + 1)
            errors.push(text.textContent);
      }
    }
    return errors;
  }), [], 'Original text fits the tile padding box without clipping');
}
