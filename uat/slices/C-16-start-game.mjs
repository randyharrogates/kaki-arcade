// PLAT-022, PLAT-023, PLAT-030, PLAT-031, PLAT-033, NN-1, NN-2.
import assert from 'node:assert/strict';
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function startGame(h) {
  if (h.maxPhones < 2) throw new Error('C-16 requires --phones 2');
  // Read real screenshot pixels in memory; never write extra captures to evidence.
  const decoder = await h.browser.newPage();
  /** @type {number[]} */
  let cream = [];
  const sample = async () => {
    // Empty right column below the results table; also clear of quiz text and dots.
    const png = await h.host.screenshot({ clip: { x: 1800, y: 1020, width: 1, height: 1 } });
    return decoder.evaluate(async source => {
      const image = new Image(); image.src = source; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d'); if (!context) throw new Error('No pixel context'); context.drawImage(image, 0, 0);
      return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    }, `data:image/png;base64,${png.toString('base64')}`);
  };
  /** @param {number[]} from @param {number[]} to */
  const ramp = (from, to) => {
    let previous = from;
    /** @param {number[]} pixel */
    return pixel => {
      pixel.forEach((channel, index) => {
        const end = to[index]; const start = from[index]; const prior = previous[index];
        assert.ok(end !== undefined && start !== undefined && prior !== undefined);
        const direction = Math.sign(end - start);
        assert.ok(direction * (channel - prior) >= -1, 'Surface pixel moves monotonically toward the incoming colour');
        assert.ok(channel >= Math.min(start, end) - 1 && channel <= Math.max(start, end) + 1, 'Surface pixel stays between endpoints');
      });
      previous = pixel;
    };
  };
  /** @param {number[][]} pixels */
  const assertRamp = pixels => {
    const first = pixels[0] ?? [], last = pixels.at(-1) ?? [];
    pixels.forEach(ramp(first, last));
    assert.ok(pixels.some(pixel => pixel.some((channel, index) =>
      Math.abs(channel - (first[index] ?? channel)) > 13 && Math.abs(channel - (last[index] ?? channel)) > 13)),
    'Crossfade contains a sampled colour strictly between its measured endpoints');
  };
  /** @param {number[] | undefined} pixel @param {number[]} colour */
  const atColour = (pixel, colour) => { assert.ok(pixel); pixel.forEach((channel, index) => { const expected = colour[index]; assert.ok(expected !== undefined); assert.ok(Math.abs(channel - expected) <= 1, 'Surface finishes at the incoming colour'); }); };
  const phones = [await h.newPhone(), await h.newPhone()];
  const names = ['Cloud Noodle', 'Pebble Puff'];
  for (const phone of phones) await phone.setViewportSize({ width: 844, height: 390 });
  try {
  // Isolated presentation fixtures exercise results combinations without changing a live match.
  const fixture = await h.browser.newPage();
  try {
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
      await fixture.setViewportSize(viewport);
      await fixture.goto(`${h.origin}/host`);
      for (const scenario of [
        { id: 'ajay', name: 'Ajay Kumar', keyboard: true, mode: 'players', count: 1, expectedSize: 144 },
        { id: 'qiyu', name: 'Qi', secondName: 'Yu', keyboard: true, mode: 'players', count: 2, expectedSize: 144 },
        { id: 'jumpy-gigi', name: 'jumpy', secondName: 'gigi', keyboard: true, mode: 'players', count: 2 },
        { id: 'ahbeng-siewling', name: 'Ah Beng', secondName: 'Siew Ling', keyboard: true, mode: 'players', count: 2 },
        { id: 'noodle', name: '🍜 Noodle', keyboard: true, mode: 'players', count: 1 },
        { id: 'emoji', name: '😀😀😀', keyboard: true, mode: 'players', count: 1 },
        { id: 'long-winner', name: 'Cloud Noodle', keyboard: false, mode: 'players', count: 1 },
        { id: 'long-winner-keyboard', name: 'Cloud Noodle', keyboard: true, mode: 'players', count: 1 },
        { id: 'single-word-winner', name: 'W'.repeat(12), // the nickname limit, widest glyph
          keyboard: true, mode: 'players', count: 1 },
        { id: 'cuneiform-winner-keyboard', name: '𒀱'.repeat(12), keyboard: true, mode: 'players', count: 1 },
        { id: 'team-result', name: 'Cloud Noodle', keyboard: false, mode: 'teams', count: 2 },
        { id: 'two-way-tie-keyboard', name: 'Cloud Noodle', secondName: 'Pebble Puff', keyboard: true, mode: 'players', count: 2 },
        { id: 'wide-tie', name: 'W'.repeat(12), secondName: '麗'.repeat(12), keyboard: false, mode: 'players', count: 2 },
        { id: 'wide-tie-keyboard', name: 'W'.repeat(12), secondName: '麗'.repeat(12), keyboard: true, mode: 'players', count: 2 },
        { id: 'team-tie-keyboard', name: 'Cloud Noodle', keyboard: true, mode: 'teams', teamTie: true, count: 2 },
        { id: 'eight-player-teams', name: 'Cloud Noodle', keyboard: true, mode: 'teams', count: 8 },
        { id: 'tamil-tie-keyboard', name: 'ஸ்ரீ'.repeat(6), secondName: 'ஷௌ'.repeat(12), keyboard: true, mode: 'players', count: 2 },
        { id: 'cuneiform-ligature-tie', name: '𒀱'.repeat(12), secondName: 'ﷺ'.repeat(12), keyboard: true, mode: 'players', count: 2 },
        { id: 'ligature-cuneiform-tie', name: 'ﷺ'.repeat(12), secondName: '𒀱'.repeat(12), keyboard: true, mode: 'players', count: 2, fallback: '2 players share first' },
        { id: 'ligature-tamil-tie', name: 'ﷺ'.repeat(12), secondName: 'ஷௌ'.repeat(12), keyboard: true, mode: 'players', count: 2, fallback: '2 players share first' },
        { id: 'ligature-winner', name: 'ﷺ'.repeat(12), keyboard: true, mode: 'players', count: 1 }, // fits with the name, so no fallback (D-131)
        { id: 'eight-wide-two-way-tie', name: 'ஸ்ரீ'.repeat(6), secondName: 'ஷௌ'.repeat(12), mixedWide: true, twoWay: true, keyboard: true, mode: 'players', count: 8 },
        { id: 'eight-wide-team-tie', name: 'ஸ்ரீ'.repeat(6), secondName: 'ஷௌ'.repeat(12), mixedWide: true, teamTie: true, keyboard: true, mode: 'teams', count: 8 },
        { id: 'five-way-tie-keyboard', name: 'Cloud Noodle', keyboard: true, mode: 'players', count: 5 },
        { id: 'eight-way-tie-keyboard', name: 'Cloud Noodle', keyboard: true, mode: 'players', count: 8 },
        { id: 'three-way-tie', name: 'Cloud Noodle', keyboard: false, mode: 'players', count: 3 },
      ]) {
        await fixture.evaluate(async scenario => {
          // Vite serves these source modules only in the development UAT environment.
          // Use the exact Preact URL Vite wrote into results.tsx, so the fixture shares its one
          // Preact instance (a second copy would break hooks).
          const source = await (await fetch('/src/results.tsx')).text();
          const preactUrl = /from\s*["']([^"']*\/preact_hooks\.js[^"']*)["']/.exec(source)?.[1]?.replace('preact_hooks.js', 'preact.js');
          if (!preactUrl) throw new Error('Missing Preact import in results.tsx');
          /** @type {unknown} */
          const preactModule = await import(preactUrl);
          const { h, render } = /** @type {{ h: (component: unknown, props: object) => unknown, render: (tree: unknown, root: Element) => void }} */ (preactModule);
          const resultsUrl = '/src/results.tsx';
          /** @type {unknown} */
          const resultsModule = await import(resultsUrl);
          const { Results } = /** @type {{ Results: unknown }} */ (resultsModule);
          const root = document.getElementById('app');
          if (!root) throw new Error('Missing fixture root');
          const players = Array.from({ length: scenario.count }, (_, index) => ({ seat: index + 1, name: index ? (index === 1 && scenario.secondName ? scenario.secondName : scenario.mixedWide ? ['𒀱'.repeat(12), 'ﷺ'.repeat(12), 'ஸ்ரீ'.repeat(6), 'ஷௌ'.repeat(12)][index % 4] : `Player ${String(index + 1)}`) : scenario.name }));
          render(h(Results, { room: { players }, session: { gameId: 'rabakz', results: {
            mode: scenario.mode === 'teams' ? 'teams' : 'players', players: players.map((player, index) => ({ id: `seat-${String(player.seat)}`, score: scenario.twoWay && index > 1 ? 5 : 10, place: scenario.twoWay && index > 1 ? 3 : 1, joinedMidGame: false })),
            teams: scenario.mode === 'teams' ? [{ team: 0, score: 20, place: 1 }, { team: 1, score: scenario.teamTie ? 20 : 10, place: scenario.teamTie ? 1 : 2 }] : undefined,
          } }, keyboard: scenario.keyboard, back() { return; }, again() { return; } }), root);
          await document.fonts.ready;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }, scenario);
        for (const selector of ['.results-winner', '.results-ranking']) {
          assert.ok(await fixture.locator(selector).evaluate(column => {
            const screen = column.closest('.screen');
            if (!screen || !column.firstElementChild || !column.lastElementChild) return false;
            const bounds = screen.getBoundingClientRect();
            const scale = bounds.height / screen.clientHeight;
            const padding = getComputedStyle(screen);
            const top = bounds.top + parseFloat(padding.paddingTop) * scale;
            const bottom = bounds.bottom - parseFloat(padding.paddingBottom) * scale;
            const left = bounds.left + parseFloat(padding.paddingLeft) * scale;
            const right = bounds.right - parseFloat(padding.paddingRight) * scale;
            const rect = column.getBoundingClientRect();
            return rect.left >= left - 1 && rect.right <= right + 1 && column.firstElementChild.getBoundingClientRect().top >= top &&
              column.lastElementChild.getBoundingClientRect().bottom <= bottom;
          }), `${scenario.id}: ${selector} starts and ends inside the safe margin`);
        }
        assert.ok(await fixture.locator('.results-winner').evaluate(column => {
          const screen = column.closest('.screen');
          const ranking = screen?.querySelector('.results-ranking');
          const badges = column.querySelector('.winner-badges');
          if (!screen || !ranking || !badges) return false;
          const winnerBounds = column.getBoundingClientRect();
          const rankingBounds = ranking.getBoundingClientRect();
          const badgeBounds = badges.getBoundingClientRect();
          const expectedWidth = (winnerBounds.width + rankingBounds.width) / 2.618;
          return Math.abs(winnerBounds.width - expectedWidth) <= 1 &&
            badgeBounds.left >= winnerBounds.left - 1 && badgeBounds.right <= winnerBounds.right + 1 &&
            [...badges.children].every(badge => {
              const rect = badge.getBoundingClientRect();
              return rect.left >= winnerBounds.left - 1 && rect.right <= winnerBounds.right + 1;
            });
        }), `${scenario.id}: golden-ratio winner share and badges remain inside the winner column`);
        const namedHeadline = scenario.mode === 'teams'
          ? scenario.teamTie ? 'Red team and Blue team share first' : 'Red team wins!'
          : scenario.count === 1 ? `${scenario.name} wins!`
          : scenario.count === 2 || scenario.twoWay ? `${scenario.name} and ${scenario.secondName ?? ''} share first`
          : `${String(scenario.count)} players share first`;
        const title = fixture.locator('.results-winner h1');
        const actualHeadline = await title.innerText();
        const headlineSize = await title.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        const boundedHeadline = scenario.count === 1 ? 'Player 1 wins!' : `${String(scenario.twoWay ? 2 : scenario.count)} players share first`;
        // Compare in the decoder page and return only a count: shipping two full-screen RGBA
        // arrays to Node for every candidate made one scenario take minutes.
        /** @param {Buffer} first @param {Buffer} second @param {{ left: number, right: number, top: number, bottom: number } | null} skip @param {number} [threshold] levels a channel may differ by (0 = exact) */
        const changedPixels = (first, second, skip, threshold = 24) => decoder.evaluate(async ({ a, b, skip, threshold }) => {
          /** @param {string} source */
          const read = async source => {
            const image = new Image(); image.src = source; await image.decode();
            const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
            const context = canvas.getContext('2d'); if (!context) throw new Error('No pixel context');
            context.drawImage(image, 0, 0);
            return { width: image.width, data: context.getImageData(0, 0, image.width, image.height).data };
          };
          const one = await read(a), two = await read(b);
          let changed = 0;
          for (let i = 0; i < one.data.length; i += 4) {
            const x = (i / 4) % one.width, y = Math.floor(i / 4 / one.width);
            if (skip && x >= skip.left && x + 1 <= skip.right && y >= skip.top && y + 1 <= skip.bottom) continue;
            const delta = Math.max(Math.abs((one.data[i] ?? 0) - (two.data[i] ?? 0)), Math.abs((one.data[i + 1] ?? 0) - (two.data[i + 1] ?? 0)), Math.abs((one.data[i + 2] ?? 0) - (two.data[i + 2] ?? 0)));
            if (delta > threshold) changed += 1;
          }
          return changed;
        }, { a: `data:image/png;base64,${first.toString('base64')}`, b: `data:image/png;base64,${second.toString('base64')}`, skip, threshold });
        // Independent pixel oracle: lay out each candidate with all paint visible.
        // This supplies an exact expected sentence and size at EACH viewport, rather
        // than accepting any bounded sentence or any of the three size steps.
        /** @param {string} text @param {number} size */
        const fits = async (text, size) => {
          await title.evaluate((element, candidate) => {
            element.textContent = candidate.text; element.style.fontSize = `${String(candidate.size)}px`;
            element.style.clipPath = 'none'; element.style.overflow = 'visible';
          }, { text, size });
          const bounds = await title.evaluate(element => {
            const column = element.parentElement, screen = column?.closest('.screen');
            const chip = element.previousElementSibling, badges = element.nextElementSibling;
            if (!column || !screen || !chip || !badges) throw new Error('Missing results bounds');
            const s = screen.getBoundingClientRect(), c = column.getBoundingClientRect();
            const scale = s.height / screen.clientHeight, style = getComputedStyle(element);
            const gap = parseFloat(style.getPropertyValue('--ka-space-5')) * scale;
            const margin = parseFloat(style.getPropertyValue('--ka-space-34')) * scale;
            const padding = getComputedStyle(screen);
            return { left: Math.max(s.left, c.left - margin), right: Math.min(s.right, c.right + margin),
              top: chip.getBoundingClientRect().bottom + gap, bottom: badges.getBoundingClientRect().top - gap,
              columnFits: (column.firstElementChild?.getBoundingClientRect().top ?? -Infinity) >= s.top + parseFloat(padding.paddingTop) * scale &&
                (column.lastElementChild?.getBoundingClientRect().bottom ?? Infinity) <= s.bottom - parseFloat(padding.paddingBottom) * scale };
          });
          if (!bounds.columnFits) return false;
          const shown = await fixture.screenshot();
          await title.evaluate(element => { element.style.visibility = 'hidden'; });
          const hidden = await fixture.screenshot();
          await title.evaluate(element => { element.style.visibility = ''; });
          return await changedPixels(shown, hidden, bounds) === 0;
        };
        const savedStyle = await title.getAttribute('style');
        let expectedHeadline = namedHeadline, expectedSize = 0;
        for (const text of namedHeadline === boundedHeadline || scenario.mode === 'teams' ? [namedHeadline] : [namedHeadline, boundedHeadline]) {
          for (const size of [144, 89, 55]) {
            if (await fits(text, size)) { expectedHeadline = text; expectedSize = size; break; }
          }
          if (expectedSize) break;
        }
        assert.ok(expectedSize, `${scenario.id}: a candidate fits`);
        assert.equal(actualHeadline, expectedHeadline, `${scenario.id}/${String(viewport.width)}: exact largest-fitting sentence`);
        assert.equal(headlineSize, expectedSize, `${scenario.id}/${String(viewport.width)}: exact largest-fitting size`);
        if (viewport.width === 1920) {
          if (scenario.expectedSize) assert.equal(expectedSize, scenario.expectedSize);
          if (scenario.id === 'ligature-winner') assert.equal(expectedSize, 89);
          if (scenario.id === 'cuneiform-winner-keyboard') { assert.equal(expectedHeadline, 'Player 1 wins!'); assert.equal(expectedSize, 144); }
        }
        // The oracle exhausted larger steps and named 55 before allowing fallback.
        // Compare all pixels, including chip/badges, with clipping restored.
        await title.evaluate((element, saved) => { element.textContent = saved.text; element.setAttribute('style', saved.style ?? ''); }, { text: actualHeadline, style: savedStyle });
        const clipped = await fixture.screenshot();
        await title.evaluate(element => { element.style.clipPath = 'none'; element.style.overflow = 'visible'; });
        const unclipped = await fixture.screenshot();
        // Measured: clipping the headline puts it on its own compositing layer, which shifts the chip's
        // anti-aliased edge by up to 4 levels (2 pixels at most, long-winner at 1920). Hidden ink would
        // change far more than that, so allow 4 levels and nothing beyond.
        assert.equal(await changedPixels(unclipped, clipped, null, 4), 0, `${scenario.id}: clip hides no accepted ink`);
        assert.ok(await fits(actualHeadline, headlineSize), `${scenario.id}: visible ink clears chip, badges and paint bounds`);
        await title.evaluate((element, style) => { element.setAttribute('style', style ?? ''); }, savedStyle);
        if (!scenario.fallback || viewport.width === 1920) await h.shot(`results-fit-${scenario.id}-${String(viewport.width)}`, fixture);
      }
    }
  } finally { await fixture.close(); }
  for (const game of ['rabakz', 'tabao-rush']) {
    // Independent real rooms: no leader quit control exists in C-16. Retain both real
    // browser contexts, clear only this app's stored room/seat between the two cases.
    if (game === 'tabao-rush') {
      await h.host.evaluate(() => { sessionStorage.clear(); });
      for (const phone of phones) await phone.evaluate(() => { sessionStorage.clear(); });
    }
    await h.createRoom();
    cream = await h.host.evaluate(() => {
      const probe = document.createElement('span'); probe.style.color = 'var(--ka-bg)'; document.body.append(probe);
      const rgb = (getComputedStyle(probe).color.match(/\d+/g) ?? []).slice(0, 3).map(Number); probe.remove(); return rgb;
    });
    await h.step(`Seat two phones for ${game}`, async () => {
      for (const [index, phone] of phones.entries()) {
        await h.openJoin(phone, names[index] ?? 'Guest');
        await phone.getByRole('button', { name: 'Join', exact: true }).click();
        await h.waitSeated(phone, names[index] ?? 'Guest');
      }
    });
    const leader = phones[0]; assert.ok(leader);
    await h.step(`Leader starts ${game}; TV and both shells follow`, async () => {
      await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
      await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
      if (game === 'rabakz') {
        for (const target of ['peek-poker', 'rabakz']) {
          await leader.getByRole('button', { name: 'Next', exact: true }).click();
          await h.host.locator(`[data-game="${target}"][data-focused="true"]`).waitFor();
        }
      }
      await h.host.evaluate(() => {
        const url = new URL(location.href); url.searchParams.set('slow', '10'); history.replaceState(null, '', url);
      });
      const header = await h.host.locator('.picker-screen header').boundingBox();
      assert.ok(header);
      let overlapSeen = false;
      await Promise.all([
        h.frameStrip(`${game}-header-crossfade`, h.host, { frames: 12, everyMs: 150, clip: header, checkFrame: async () => {
          overlapSeen ||= await h.host.locator('.picker-screen header > .overlap').evaluate(element => {
            /** @param {string} selector */
            const visible = (selector) => Array.from(element.querySelectorAll(selector)).some(layer => Number(getComputedStyle(layer).opacity) > 0 && layer.textContent.trim());
            return visible('.outgoing') && visible('.incoming');
          });
        } }),
        leader.getByRole('button', { name: 'Select', exact: true }).click(),
      ]);
      assert.ok(overlapSeen, 'Header strip contains both outgoing and incoming headings');
      await h.host.locator(`[data-game="${game}"][data-expanded="true"]`).waitFor();
      await h.shot(`${game}-before-start`);
      // Slow only the TV's shell crossfade, allowing the frame strip to show the boundary.
      await h.host.evaluate(() => {
        const url = new URL(location.href); url.searchParams.set('slow', '10'); history.replaceState(null, '', url);
      });
      /** @type {number[][]} */
      const startPixels = [];
      await Promise.all([h.frameStrip(`${game}-start-crossfade`, h.host, { frames: 9, everyMs: 600, checkFrame: async () => { startPixels.push(await sample()); } }), (async () => {
        await leader.getByRole('button', { name: 'Start', exact: true }).click();
        if (game === 'rabakz') {
          await h.host.locator('.rz-question').waitFor();
          assert.ok((await h.host.locator('.rz-question').innerText()).trim().length, 'Real question is visible');
        } else await h.host.getByRole('heading', { name: 'This game’s screen is not built yet', exact: true }).waitFor();
        for (const [index, phone] of phones.entries()) {
          const shell = phone.getByRole('main', { name: 'Controller', exact: true });
          await shell.waitFor();
          assert.equal(await shell.locator('.ka-controller-seat').innerText(), String(index + 1));
          assert.equal(await shell.locator('.ka-controller-player strong').innerText(), names[index]);
          assert.equal(await shell.locator('.ka-controller-word').innerText(), 'Connected');
          assert.equal(await shell.locator('.ka-controller-play').innerText(), '');
        }
      })()]);
      if (game === 'rabakz') {
        const plum = await h.host.locator('.rz-viewport').evaluate(element => (getComputedStyle(element).backgroundColor.match(/\d+/g) ?? []).slice(0, 3).map(Number));
        atColour(await sample(), plum);
        // Endpoints are the pixels measured in the first and last frames: the sample point may sit on
        // surface detail (card shading, dot texture) rather than the flat background colour.
        assertRamp(startPixels); atColour(startPixels.at(-1), plum);
        assert.ok(plum.some((channel, index) => Math.abs(channel - (cream[index] ?? channel)) > 1), 'Start reaches the game surface');
      }
      for (const [index, phone] of phones.entries()) await h.shot(`${game}-controller-${String(index + 1)}`, phone);
      await h.shot(`${game}-running`);
      if (game === 'tabao-rush') for (const name of names) assert.ok((await h.host.locator('.session-placeholder .picker-players').innerText()).includes(name));
      if (game === 'rabakz') {
        // Existing browser test clock seam: run the real ten-question match to its idle end.
        // No game state, answer, settings or production timer is replaced.
        await h.host.clock.install();
        for (let second = 0; second < 400; second++) {
          await h.host.clock.runFor(1000);
          if (await leader.getByRole('button', { name: 'Continue', exact: true }).count()) break;
        }
        await h.host.clock.resume();
        await h.shot('rabakz-game-final');
        let outgoingSeen = false; let resultsFrame = 0;
        /** @type {number[][]} */
        const resultsPixels = []; let resultsPixel;
        await Promise.all([
          h.frameStrip('rabakz-results-crossfade', h.host, { frames: 9, everyMs: 600, checkFrame: async () => {
            resultsPixel = await sample(); resultsPixels.push(resultsPixel);
            const visible = await h.host.locator('.host-shell > .overlap > .outgoing .rz-viewport').evaluateAll(elements => elements.some(element => {
              const layer = element.closest('.outgoing');
              return layer && Number(getComputedStyle(layer).opacity) > 0 && element.getBoundingClientRect().width > 0;
            }));
            if (resultsFrame++ < 3) outgoingSeen ||= visible;
          } }),
          leader.getByRole('button', { name: 'Continue', exact: true }).click(),
        ]);
        const first = resultsPixels[0] ?? [], last = resultsPixels.at(-1) ?? [];
        assertRamp(resultsPixels);
        assert.ok(first.some((channel, index) => Math.abs(channel - (last[index] ?? channel)) > 13), 'Results change the surface from the game to the console');
        assert.ok(outgoingSeen, 'The first transition frames retain the visible outgoing Rabakz viewport');
        await h.host.getByRole('main', { name: 'Results', exact: true }).waitFor();
        await leader.getByRole('heading', { name: 'Results', exact: true }).waitFor();
        await h.shot('rabakz-results-tv');
        await h.shot('rabakz-results-leader', leader);
        await h.shot('rabakz-results-phone2', phones[1]);
        // Back to normal speed: the slowed crossfade above would outlast the still's settle limit.
        await h.host.evaluate(() => {
          const url = new URL(location.href); url.searchParams.delete('slow'); history.replaceState(null, '', url);
        });
        await leader.getByRole('button', { name: 'Back to game picker', exact: true }).click();
        await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
        await h.shot('rabakz-returned-picker');
        assert.equal(await h.host.locator('.player-count').innerText(), '2 of 8 players');
        for (const [index, phone] of phones.entries()) {
          assert.equal(await phone.locator('.phone-id strong').innerText(), names[index]);
          await h.shot(`rabakz-returned-picker-phone${String(index + 1)}`, phone);
        }
        await leader.getByRole('button', { name: 'Select', exact: true }).click();
        await leader.getByRole('button', { name: 'Start', exact: true }).click();
        await h.host.locator('.rz-question').waitFor();
        for (const [index, phone] of phones.entries()) {
          await phone.getByRole('main', { name: 'Controller', exact: true }).waitFor();
          await h.shot(`rabakz-restarted-controller-${String(index + 1)}`, phone);
        }
      }
    // A full ten-question match is fast-forwarded in this step, which takes longer than the default limit.
    }, game === 'rabakz' ? 240000 : undefined);
  }
  } finally { await decoder.close(); }
}
