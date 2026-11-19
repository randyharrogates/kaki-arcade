// RZ-001–016, RZ-020, RZ-026, RZ-030–034, PLAT-025/033.
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { countUpDuration, STAGGER_MS } from '../../packages/ui/src/index';

/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function fullMatch(h) {
  assert.ok([1, 8].includes(h.maxPhones), 'Use --phones 1 or --phones 8');
  const teams = process.env.R08_TEAMS === '1';
  assert.ok(!teams || h.maxPhones === 8, 'R08_TEAMS=1 requires --phones 8');
  try { await access(new URL('../../content/rabakz/generated/', import.meta.url)); }
  catch { throw new Error('Missing content/rabakz/generated/. Before starting dev, run pnpm --filter @kaki/content-rabakz build; R-08 does not build content.'); }
  // Reuse C-17's read-only public-view observation seam. Never inspect simulation secrets.
  await h.host.route('**/src/session-adapter.ts', async route => {
    const response = await route.fetch(), source = await response.text();
    assert.ok(source.includes('runner = next;'), 'C-17 observation seam changed');
    await route.fulfill({ response, body: source.replace('runner = next;', `runner = next;
      Reflect.set(window, 'r08Public', () => runner === next && next.state ? loaded.game.publicView(next.state) : null);`) });
  });
  /** @typedef {ReturnType<typeof import('../../games/rabakz/src/rules/views').publicView>} Public */
  const view = () => h.host.evaluate(() => {
    /** @type {unknown} */
    const candidate = Reflect.get(window, 'r08Public');
    const read = /** @type {() => Public} */ (candidate);
    return read();
  });
  /** @type {import('playwright').Page[]} */
  const phones = [];
  const names = Array.from({ length: h.maxPhones }, (_, i) => `R08Guest${String(i + 1)}`);
  /** @param {import('playwright').Page} page */
  async function observe(page) {
    // Passive browser transport capture, installed before pairing and again on reload.
    // Retain only received private views; no bank or host state goes to a phone.
    await page.addInitScript(() => {
      Reflect.set(window, 'r08Private', []);
      const Original = RTCPeerConnection;
      window.RTCPeerConnection = class extends Original {
        /** @param {RTCConfiguration} [configuration] */
        constructor(configuration) {
          super(configuration);
          this.addEventListener('datachannel', event => {
            event.channel.addEventListener('message', message => {
              if (typeof message.data !== 'string') return;
              try {
                /** @type {unknown} */
                const raw = JSON.parse(message.data);
                const value = /** @type {{t?:string;view?:unknown}} */ (raw);
                if (value.t === 'view') {
                  /** @type {unknown} */
                  const captured = Reflect.get(window, 'r08Private');
                  const received = /** @type {unknown[]} */ (captured);
                  received.push(value.view);
                }
              } catch { /* Non-JSON data is outside the private-view protocol. */ }
            });
          });
        }
      };
    });
  }
  await h.createRoom();
  // Seat seven at 8 phones in both modes, so the joiner has a free seat (teams: held for the lobby, D-202).
  for (const name of names.slice(0, h.maxPhones === 8 ? 7 : h.maxPhones)) {
    const phone = await h.newPhone(); await observe(phone); phones.push(phone);
    await h.openJoin(phone, name); await phone.getByRole('button', { name: 'Join', exact: true }).click();
    await h.waitSeated(phone, name);
  }
  /** @template T @param {T | undefined} value @param {string} what @returns {T} */
  const required = (value, what) => { if (value === undefined) throw new Error(`Missing ${what}`); return value; };
  const leader = required(phones[0], 'leader phone');
  /** @param {string} name */
  const click = async name => leader.getByRole('button', { name, exact: true }).click();
  /** @param {() => Promise<boolean>} ready @param {string} label */
  async function until(ready, label) {
    for (let i = 0; i < 90; i++) {
      if (await ready()) return;
      await h.host.clock.runFor(500); await leader.waitForTimeout(30);
    }
    assert.fail(`Timed out: ${label}`);
  }
  /** @param {string} name @param {import('playwright').Page} [page] */
  async function shot(name, page = h.host) {
    let expired = false;
    const settled = async () => {
      let quiet = 0;
      while (quiet < 2 && !expired) {
        const count = await page.evaluate(async () => {
          const running = document.getAnimations().filter(a =>
            (a.playState === 'running' || a.pending) && a.effect?.getComputedTiming().iterations !== Infinity);
          await Promise.all(running.map(a => a.finished.catch(() => undefined)));
          return running.length;
        });
        quiet = count === 0 ? quiet + 1 : 0;
        // Runner time: host page timers are deliberately paused.
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    };
    let timer;
    try {
      await Promise.race([settled(), new Promise((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error(`Still ${name}: finite animations did not settle within 3000 ms`));
        }, 3000);
      })]);
    } finally { clearTimeout(timer); }
    await h.shot(name, page, undefined, false);
  }
  /** @param {string} label @param {boolean} [host] */
  async function shots(label, host = true) {
    await h.host.clock.runFor(800);
    if (host) await shot(`${label}-tv`, h.host);
    for (const [i, phone] of phones.entries()) await shot(`${label}-phone${String(i + 1)}`, phone);
  }
  async function assertIncomingTitle(podium = false) {
    assert.ok(await h.host.evaluate(podium => {
      // Hit-testing skips inert subtrees, so lift `inert` from the outgoing layers while probing: wherever an
      // incoming title or podium content is drawn, the topmost element there must not belong to an outgoing layer.
      const blocks = [...document.querySelectorAll('.rz-block')];
      const previous = blocks.map(block => block.getAttribute('style'));
      const olds = [...document.querySelectorAll('[inert]')];
      try {
        for (const block of blocks) if (block instanceof HTMLElement) block.style.pointerEvents = 'auto';
        olds.forEach(o => { o.removeAttribute('inert'); o.setAttribute('data-outgoing', ''); });
        const titles = [...document.querySelectorAll('h1')].filter(h => !h.closest('[data-outgoing]')).map(h => h.getBoundingClientRect());
        const titleOnTop = titles.length > 0 && titles.every(r => [0.1, 0.5, 0.9].every(f => {
          const hit = document.elementFromPoint(r.x + r.width * f, r.y + r.height / 2);
          return !!hit && hit.closest('[data-outgoing]') === null;
        }));
        const targets = [...document.querySelectorAll('.rz-step, .rz-podium-name')].filter(element => !element.closest('[data-outgoing]'));
        return titleOnTop && (!podium || targets.length > 0 && targets.every(element => {
          const r = element.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return r.width > 0 && r.height > 0 && !!hit && hit.closest('[data-outgoing]') === null;
        }));
      } finally {
        olds.forEach(o => { o.setAttribute('inert', ''); o.removeAttribute('data-outgoing'); });
        blocks.forEach((block, i) => { const style = previous[i]; if (style === null || style === undefined) block.removeAttribute('style'); else block.setAttribute('style', style); });
      }
    }, podium), 'Incoming title and, on the podium, every step and name paint above the outgoing screen');
  }
  /** @param {string} label */
  async function strip(label) {
    if (label === 'podium') await h.host.evaluate(() => {
      for (const animation of document.getAnimations()) if (animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element && animation.effect.target.classList.contains('rz-block')) animation.pause();
    });
    await h.frameStrip(label, h.host, { frames: 6, everyMs: 80, checkFrame: async index => {
      if (label === 'podium') {
        await h.host.evaluate(index => {
          for (const animation of document.getAnimations()) if (animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element && animation.effect.target.classList.contains('rz-block')) animation.currentTime = Number(animation.effect.getTiming().duration) * index / 5;
        }, index);
        if (index === 5) await assertIncomingTitle(true);
      } else await h.host.clock.runFor(80);
    } });
    if (label === 'podium') await h.host.evaluate(() => { for (const animation of document.getAnimations()) if (animation.playState === 'paused') animation.play(); });
  }
  /** @param {Public} current */
  async function secrecy(current) {
    assert.equal(current.correct, null, 'TV public view hides the correct index');
    assert.deepEqual(current.winners, []);
    assert.ok(current.players.every(p => p.pick === null && p.answers === null), 'TV hides individual choices before reveal');
    assert.equal(await h.host.locator('.rz-frame[data-reveal="true"]').count(), 0);
    for (const [i, phone] of phones.entries()) {
      const dom = await phone.locator('body').evaluate(el => el.outerHTML);
      const received = await phone.evaluate(() => JSON.stringify(Reflect.get(window, 'r08Private')));
      assert.notEqual(received, '[]', 'Private-view capture must receive real wire messages');
      for (const [j, name] of names.entries()) if (i !== j) {
        assert.ok(!dom.includes(name), `Other identity ${name} absent from phone DOM`);
        // The shell's team-setup roster names every player (it is on the TV too); game views must not.
        /** @type {unknown} */
        const parsed = JSON.parse(received);
        const carrier = /** @type {(Record<string, unknown> | null)[]} */ (parsed).find(m => m !== null && m.kind !== 'team-setup' && JSON.stringify(m).includes(name));
        assert.ok(!carrier, `Other identity ${name} absent from received private views: ${carrier ? JSON.stringify(carrier).slice(0,600) : ''}`);
      }
      // Public option labels are allowed; attributed choices/players are not.
      const messages = await phone.evaluate(() => {
        /** @type {unknown} */
        const captured = Reflect.get(window, 'r08Private');
        return /** @type {(Record<string, unknown> | null)[]} */ (captured);
      });
      // The room message's `players` is a head count; only a list could carry other seats.
      // The shell's team-setup message lists teams before play (public on the TV); only game views can carry answers.
      for (const m of messages.filter(/** @param {Record<string, unknown> | null} m @returns {m is Record<string, unknown>} */ m => m !== null && m.kind !== 'team-setup')) assert.ok(!['players','answers','winners'].some(k => Array.isArray(m[k]) && m[k].length > 0), `No other-player answer collection on private wire: ${JSON.stringify(m).slice(0,600)}`);
    }
  }
  await click('Pick a game');
  for (const id of ['peek-poker', 'rabakz']) {
    await click('Next'); await h.host.locator(`[data-game="${id}"][data-focused="true"]`).waitFor();
  }
  await click('Select'); await leader.getByRole('region', { name: 'Game settings' }).waitFor();
  if (teams) await click('Teams');
  // Independent oracle from shipped content, on the host only (R-06 pattern).
  const answers = await h.host.evaluate(async () => {
    const path = '/@id/__x00__virtual:rabakz-bank';
    /** @type {unknown} */
    const imported = await import(path);
    const loaded = /** @type {{default:{files:{text:string}[]}}} */ (imported);
    return Object.fromEntries(loaded.default.files.flatMap(file => {
      /** @type {unknown} */
      const raw = JSON.parse(file.text);
      const data = /** @type {{questions?:{prompt:string;options:string[];correct:number}[]}} */ (raw);
      return (data.questions ?? []).map(q => [q.prompt, q.options[q.correct]]);
    }));
  });
  assert.ok(Object.keys(answers).length >= 10, 'Built bank supplies default match');
  await h.host.clock.install();
  await click('Start');
  if (teams) {
    await leader.getByRole('region', { name: 'Pick a side' }).waitFor();
    await shot('team-setup-tv'); await shot('team-setup-phone', leader); await click('Start');
  }
  await h.host.locator('.rz-question').waitFor();
  await h.host.clock.pauseAt(await h.host.evaluate(() => Date.now()) + 50);
  /** @type {string[]} */
  const prompts = [];
  const expected = new Map(names.map(name => [name, 0]));
  let streak = 0;
  /** @type {import('playwright').Page | undefined} */
  let joiner;
  for (let round = 1; round <= 10; round++) await h.step(`Question ${String(round)}: privacy, inputs, reveal and scores`, async () => {
    await until(async () => { const v = await view(); return v.round === round && v.phase === 'question'; }, `question ${String(round)}`);
    let current = await view(); assert.equal(current.length, 10);
    const q = current.question; assert.ok(q); assert.ok(!prompts.includes(q.prompt)); prompts.push(q.prompt);
    const right = answers[q.prompt]; assert.ok(right);
    const wrong = q.options.find(option => option !== right); assert.ok(wrong);
    await leader.getByRole('button', { name: right, exact: true }).waitFor();
    await secrecy(current);
    if (round === 1) await shots('question');
    if (teams) {
      assert.ok(current.players.every(p => p.team === 0 || p.team === 1));
      if (round === 1) await h.step('KNOWN GAP PLAT-025: no team colour on phones or TV during play', async () => {
        /** @param {import('playwright').Page} page @param {string} selector */
        const appearance = (page, selector) => page.evaluate(selector => ({
          text: document.body.innerText,
          teamNameText: document.body.innerText.match(/(?:Red|Blue)(?: team)?/g) ?? [],
          seatColours: Array.from(document.querySelectorAll(selector), el => ({
            text: el.textContent, colour: getComputedStyle(el).backgroundColor,
          })),
        }), selector);
        const observations = [];
        for (const [i, phone] of phones.entries()) {
          const player = current.players.find(p => p.name === names[i]); assert.ok(player);
          observations.push({ name: names[i], team: player.team, ...await appearance(phone, '.ka-controller-seat') });
        }
        await writeFile(join(h.evidence, 'known-gap-PLAT-025.json'), JSON.stringify({
          gap: 'PLAT-025: no team colour on phones or TV during play', round,
          phones: observations, tv: await appearance(h.host, '.rz-seat-number'),
        }, null, 2) + '\n');
      });
    }
    if (round === 2 && h.maxPhones === 8) {
      joiner = await h.newPhone(); await observe(joiner);
      await h.openJoin(joiner, 'R08Newcomer'); await joiner.getByRole('button', { name: 'Join', exact: true }).click();
      if (teams) await joiner.getByRole('heading', { name: 'Waiting for the lobby', exact: true }).waitFor();
      else {
        await until(async () => (await view()).players.some(p => p.name === 'R08Newcomer'), 'new player admitted');
        await joiner.getByText('You join at the next question', { exact: true }).waitFor();
        const p = (await view()).players.find(p => p.name === 'R08Newcomer'); assert.ok(p); assert.ok(p.waiting); assert.equal(p.score, 0);
        phones.push(joiner); names[names.length - 1] = 'R08Newcomer'; expected.set('R08Newcomer', 0);
      }
      await shot('joiner-waiting-phone', joiner); await shot('joiner-waiting-tv');
    }
    if (round === 3 && joiner && !teams) {
      await joiner.getByRole('button', { name: right, exact: true }).waitFor();
      const p = (await view()).players.find(p => p.name === 'R08Newcomer'); assert.ok(p, 'Newcomer is in the view'); assert.equal(p.waiting, false); assert.equal(p.score, 0);
      await shot('joiner-entered-phone', joiner); await shot('joiner-entered-tv');
    }
    if (round === 4 && h.maxPhones === 8) {
      const phone = leader;
      const seat = await phone.locator('.ka-controller-seat').innerText();
      const before = (await view()).players.find(p => p.name === names[0])?.score;
      await shot('reload-before-phone', phone); await phone.reload();
      await phone.getByRole('button', { name: right, exact: true }).waitFor();
      assert.equal(await phone.locator('.ka-controller-seat').innerText(), seat);
      assert.equal((await view()).players.find(p => p.name === names[0])?.score, before);
      await shot('reload-after-phone', phone);
    }
    // 1–3 leader streak, 4 nobody right, 5 skip, 6 wrong/lock-out then another winner,
    // 7–10 leader wins again, including the doubled final question.
    let winner = 0;
    if (round === 6) {
      await click(wrong); await until(async () => (await view()).phase === 'reveal' || (await view()).players[0]?.lockedOut === true, 'wrong acknowledgement');
      if (h.maxPhones === 8) {
        await leader.getByText('Locked out', { exact: true }).waitFor(); await secrecy(await view()); await shots('lock-out');
        winner = 1; const other = phones[1]; assert.ok(other); await other.getByRole('button', { name: right, exact: true }).click();
      } else { winner = -1; await shots('lock-out-solo-first-wrong'); }
      streak = 0;
    } else if (round === 4) { winner = -1; }
    else if (round === 5) { await click('Skip'); winner = -1; }
    else await click(right);
    if (winner === 0) streak++;
    const award = winner < 0 ? 0 : (100 + (winner === 0 && streak >= 3 ? 50 : 0)) * (round === 10 ? 2 : 1);
    if (winner >= 0) { const name = names[winner]; assert.ok(name); expected.set(name, (expected.get(name) ?? 0) + award); }
    await until(async () => (await view()).phase === 'reveal', 'reveal');
    current = await view();
    assert.equal(current.correct, q.options.indexOf(right));
    for (const p of current.players) assert.equal(p.score, expected.get(p.name) ?? 0, `Score for ${p.name}, question ${String(round)}`);
    if (round === 10 && h.maxPhones === 8) {
      assert.equal(await h.host.locator('.rz-block:not([inert]) .rz-double-chip').innerText(), 'Double points');
      await shot('final-question-reveal-double-points-tv');
    }
    if (round === 1) { await strip('reveal'); await shots('reveal'); }
    if (round === 5) {
      await until(async () => (await view()).phase === 'scoreboard', 'five-question scoreboard');
      if (teams) assert.equal(await h.host.locator('.rz-team-panel').count(), 2);
      await shots('scoreboard-5'); await click('Continue');
    }
    if (round === 9) {
      // Approach the boundary in one simulation step so entrance frames are retained.
      while ((await view()).phase !== 'final') await h.host.clock.runFor(16);
      await h.step('RZ-009 final-round card and double-points header', async () => {
        const card = h.host.locator('.rz-final-panel');
        await card.waitFor();
        // Freeze the mounted boundary before phone assertions or screenshot setup.
        const freezeBoundary = () => h.host.evaluate(() => {
          for (const animation of document.getAnimations()) if (animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element && animation.effect.target.classList.contains('rz-block')) animation.pause();
        });
        await freezeBoundary();
        assert.match(await card.innerText(), /Final round/);
        assert.match(await card.innerText(), /The last question scores double/);
        assert.match(await card.innerText(), /×2/);
        for (const phone of phones) await phone.getByText('Final round · Double points', { exact: true }).waitFor();
        const panelBox = await card.boundingBox(); assert.ok(panelBox);
        const centre = { x: Math.floor(panelBox.x + panelBox.width / 2), y: Math.floor(panelBox.y + panelBox.height / 2), width: 1, height: 1 };
        /** @param {string} name */
        async function cardStrip(name) {
          await h.frameStrip(name, h.host, { frames: 8, everyMs: 0, checkFrame: async index => {
            await h.host.evaluate(index => {
              for (const animation of document.getAnimations()) if (animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element && animation.effect.target.classList.contains('rz-block')) {
                animation.currentTime = Number(animation.effect.getTiming().duration) * index / 7;
              }
            }, index);
            // Paired crossfade (DESIGN §4 4A): one screen stays fully drawn under the panel centre in every frame,
            // so the frame background never shows through. The centre colour itself blends, by design.
            // .rz-block has pointer-events: none, which elementsFromPoint skips, so test each block's box.
            const opaque = await h.host.evaluate(point => Math.max(0, ...[...document.querySelectorAll('.rz-block')]
              .filter(block => { const r = block.getBoundingClientRect(); return point.x >= r.left && point.x < r.right && point.y >= r.top && point.y < r.bottom; })
              .map(block => Number(getComputedStyle(block).opacity))), centre);
            if (name === 'final-round-card-in' && index === 7) await assertIncomingTitle();
            assert.ok(opaque >= 0.99, `${name}: no fully drawn screen under the panel centre (max opacity ${String(opaque)})`);
          } });
          await h.host.evaluate(() => { for (const animation of document.getAnimations()) if (animation.playState === 'paused') animation.play(); });
        }
        try {
          await cardStrip('final-round-card-in');
          await h.host.setViewportSize({ width: 1920, height: 1080 });
          await shot('final-round-card-1920-tv');
          await h.host.setViewportSize({ width: 1280, height: 720 });
          await shot('final-round-card-1280-tv');
          await h.host.setViewportSize({ width: 1440, height: 900 });
          await shot('final-round-card-1440-letterbox-tv');
          await shots('final-round-double-points', false);
          await h.host.setViewportSize({ width: 1920, height: 1080 });
          while ((await view()).phase !== 'question') await h.host.clock.runFor(16);
          await freezeBoundary();
          await cardStrip('final-round-card-out');
          for (const phone of phones) assert.equal(await phone.getByText('Final round · Double points', { exact: true }).count(), 0);
          assert.equal(await h.host.locator('.rz-double-chip').innerText(), 'Double points');
          for (const [width, height] of [[1920, 1080], [1280, 720]]) {
            assert.ok(width && height); await h.host.setViewportSize({ width, height });
            assert.ok(await h.host.locator('.rz-header').evaluate(header => {
              const box = header.getBoundingClientRect();
              const chip = header.querySelector('.rz-double-chip')?.getBoundingClientRect();
              const category = header.querySelector('.rz-header-detail > .rz-copy')?.getBoundingClientRect();
              const best = header.querySelector('.rz-play-best')?.getBoundingClientRect();
              return !!chip && !!category && chip.left >= box.left && chip.top >= box.top && chip.right <= box.right && chip.bottom <= box.bottom && chip.right <= category.left && (!best || chip.right <= best.left);
            }), 'Double points chip fits the header without overlapping category or solo best');
            await shot(`final-question-double-points-${String(width)}-tv`);
          }
          await h.host.setViewportSize({ width: 1920, height: 1080 });
        } finally { await h.host.setViewportSize({ width: 1920, height: 1080 }); }
      });
    }
    if (teams && joiner) assert.ok(await joiner.getByRole('heading', { name: 'Waiting for the lobby', exact: true }).count());
  }, 180000);
  // Advance one simulation step at a time to retain the outgoing reveal for the strip.
  for (let step = 0; (await view()).phase !== 'over' && step < 1000; step++) await h.host.clock.runFor(16);
  assert.equal((await view()).phase, 'over', 'final podium');
  await strip('podium');
  const finalTotals = await view();
  // Score in the Rabakz host uses countUpDuration + index * STAGGER_MS.
  // Allow every player/team row's stagger and two animation frames for the RAF start/end.
  await h.host.clock.runFor(countUpDuration() + (finalTotals.players.length + finalTotals.teamScores.length) * STAGGER_MS + 2 * 16);
  const finalScreen = h.host.locator('.rz-block:not([inert]) .rz-results[data-final="true"]');
  if (h.maxPhones === 1) {
    assert.equal(await finalScreen.locator('.rz-solo-total').innerText(), `${String(required(finalTotals.players[0], 'solo player').score)} pts`);
  } else {
    const expected = teams
      ? [...[0, 1].map(team => ({ name: team === 0 ? 'Red team' : 'Blue team', score: finalTotals.teamScores[team] ?? 0 })), ...finalTotals.players]
      : finalTotals.players;
    const actual = await finalScreen.locator('.rz-podium-player, .rz-rank').evaluateAll(rows => rows.map(row => ({
      name: row.querySelector('.rz-rank-name')?.textContent,
      score: Number(row.querySelector('.rz-total')?.textContent.replace(/ pts$/, '')),
    })));
    const byName = (/** @type {{name: string}} */ a, /** @type {{name: string}} */ b) => a.name.localeCompare(b.name);
    assert.deepEqual(actual.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')), expected.map(({ name, score }) => ({ name, score })).sort(byName), 'TV final totals match the public view');
  }
  await shots('podium');
  if (h.maxPhones === 1) {
    await h.host.locator('.rz-solo').waitFor();
    assert.match(await h.host.locator('.rz-solo').innerText(), /(?:Best|best)/);
  } else if (teams) {
    assert.match(await h.host.locator('.rz-results[data-final="true"]').innerText(), /Red team|Blue team/);
    const final = await view();
    for (const team of [0, 1]) assert.equal(final.teamScores[team], final.players.filter(p => p.team === team).reduce((sum, p) => sum + p.score, 0));
  }
  await h.host.clock.resume();
}
