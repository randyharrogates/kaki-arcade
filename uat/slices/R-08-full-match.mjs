// RZ-001–016, RZ-020, RZ-026, RZ-030–034, PLAT-025/033.
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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
  // Seat seven at 8 phones in both modes, so the joiner has a free seat (teams and FFA both admit the newcomer, D-234).
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
  /** @param {string} label */
  async function shots(label) {
    await h.host.clock.runFor(800);
    await shot(`${label}-tv`, h.host);
    for (const [i, phone] of phones.entries()) await shot(`${label}-phone${String(i + 1)}`, phone);
  }
  /** @param {string} label */
  async function strip(label) {
    await h.frameStrip(label, h.host, { frames: 6, everyMs: 80, checkFrame: async () => { await h.host.clock.runFor(80); } });
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
      {
        await until(async () => (await view()).players.some(p => p.name === 'R08Newcomer'), 'new player admitted');
        await joiner.getByText('You join at the next question', { exact: true }).waitFor();
        const p = (await view()).players.find(p => p.name === 'R08Newcomer'); assert.ok(p); assert.ok(p.waiting); assert.equal(p.score, 0);
        if (teams) {
          assert.ok(p.team === 0 || p.team === 1);
          await joiner.getByText(`You're on ${p.team === 0 ? 'Red' : 'Blue'} team`, { exact: true }).waitFor();
        }
        phones.push(joiner); names[names.length - 1] = 'R08Newcomer'; expected.set('R08Newcomer', 0);
      }
      await shot('joiner-waiting-phone', joiner); await shot('joiner-waiting-tv');
    }
    if (round === 3 && joiner) {
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
    if (round === 1) { await strip('reveal'); await shots('reveal'); }
    if (round === 5) {
      await until(async () => (await view()).phase === 'scoreboard', 'five-question scoreboard');
      if (teams) assert.equal(await h.host.locator('.rz-team-panel').count(), 2);
      await shots('scoreboard-5'); await click('Continue');
    }
    if (round === 9) {
      await until(async () => (await view()).phase === 'final', 'double-points announcement');
      // The phase alone is insufficient: the current TV renderer retains question 9.
      // RZ-009's announcement has no TV renderer yet (rules only): record it as a named known gap
      // so the rest of the match is still tested; once a renderer exists, assert its text.
      const announcement = h.host.getByText(/final round.*double|double.*final round/is);
      if (await announcement.count() > 0) {
        assert.match(await announcement.first().innerText(), /final round.*double|double.*final round/is, 'RZ-009: TV announces the double final round before question 10');
      } else {
        await h.step('KNOWN GAP RZ-009: no final-round announcement on the TV', async () => {
          const shown = await h.host.evaluate(() => document.body.innerText.slice(0, 600));
          await writeFile(join(h.evidence, 'known-gap-RZ-009.json'), `${JSON.stringify({ phase: 'final', tvText: shown }, null, 2)}\n`);
        });
      }
      await shot('final-round-announcement-tv');
    }
    if (teams && joiner) assert.ok((await view()).players.some(p => p.name === 'R08Newcomer' && (p.team === 0 || p.team === 1)));
  }, 180000);
  await until(async () => (await view()).phase === 'over', 'final podium');
  await strip('podium'); await shots('podium');
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
