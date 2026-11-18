import assert from 'node:assert/strict';
import { rename } from 'node:fs/promises';
import { join } from 'node:path';
/** PLAT-024 / CTRL-009. Run by the integrator with two phones. */
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function hostKeyboard(h) {
  await h.createRoom();
  await h.host.setViewportSize({ width: 1920, height: 1080 });
  await h.host.goto(h.origin);
  // Wait for the page to draw before pressing keys; a key sent before then is lost.
  const hostLink = h.host.getByRole('link', { name: 'Host a room', exact: true });
  await hostLink.waitFor();
  // The link can draw a moment before its key listener attaches; retry like a person would.
  for (let i = 0; i < 20 && !(await h.host.evaluate(() => document.activeElement?.textContent === 'Host a room')); i++) {
    await h.host.keyboard.press('ArrowRight'); await h.host.waitForTimeout(100);
  }
  await h.host.waitForFunction(() => document.activeElement?.textContent === 'Host a room');
  await namedShot('01-host-landing-focus');
  await h.host.keyboard.press('Enter');
  await h.host.getByRole('main', { name: 'Host lobby' }).waitFor();
  await h.host.keyboard.press('ArrowRight');
  await h.host.getByText('J: join from this keyboard', { exact: true }).waitFor();
  await checkSafe();
  await namedShot('02-host-lobby-focus');
  await smallShot('18-host-lobby-720p');
  const seatsTop = await h.host.locator('.lobby .seats').evaluate(el => el.getBoundingClientRect().top);
  await h.host.evaluate(() => {
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [{ index: 0, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) }] });
    window.dispatchEvent(new Event('gamepadconnected'));
  });
  await h.host.getByText('Start on a game pad: join', { exact: true }).waitFor();
  await checkSafe(); await namedShot('13-host-lobby-pad-hint');
  assert.equal(await h.host.locator('.lobby .seats').evaluate(el => el.getBoundingClientRect().top), seatsTop, 'Pad connection does not move seats');
  await smallShot('19-host-lobby-pad-720p');
  await h.host.evaluate(() => { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] }); window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: { index: 0 } })); });
  await h.host.keyboard.press('Enter');
  assert.equal(await h.host.getByRole('main', { name: 'Host lobby' }).count(), 1);
  await h.host.keyboard.press('KeyJ');
  await h.host.getByText('Player 1', { exact: true }).waitFor();
  await h.host.getByText('L: leave', { exact: true }).waitFor();
  await checkSafe();
  await namedShot('11-host-lobby-hint-joined');
  const localSeatBeforeQuit = await h.host.locator('.lobby .seat[data-empty="false"]').evaluate(el => ({ seat: el.querySelector('.seat-number')?.textContent, name: el.querySelector('.nickname')?.textContent, leader: el.querySelector('.leader')?.textContent }));
  /** @param {string} name */
  async function activate(name) {
    /** @type {Record<string, string>} */
    const keys = { 'Pick a game': 'Enter', Next: 'ArrowRight', Previous: 'ArrowLeft', Select: 'Enter', Start: 'Enter', Back: 'Escape', 'Teams off': 'KeyT' };
    const key = keys[name];
    if (key && !(name === 'Start' && await h.host.getByRole('main', { name: 'Team setup' }).count())) {
      await h.host.keyboard.press(key); await h.host.waitForTimeout(600); return;
    }
    /** @type {string[]} */
    const trail = [];
    // Wait for the screen that holds the control, as a person would, before stepping to it.
    await h.host.getByRole('button', { name, exact: true }).first().waitFor({ state: 'visible' });
    for (let i = 0; i < 20; i++) {
      if (await h.host.evaluate(label => document.activeElement?.textContent === label, name)) {
        // Assert focus immediately before activation, including Start after both phones join.
        assert.equal(await h.host.evaluate(() => document.activeElement?.textContent), name);
        await h.host.keyboard.press('Enter'); return;
      }
      await h.host.keyboard.press('ArrowRight');
      trail.push(await h.host.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}:${(a.textContent).trim().slice(0, 24)}:${String(a.isConnected)}` : 'none'; }));
    }
    await h.shot(`unreachable-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`);
    const seen = await h.host.evaluate(() => Array.from(document.querySelectorAll('button, a[href]')).map(node => node.textContent.trim()).join(' | '));
    throw new Error(`Keyboard could not reach ${name}; controls on screen: ${seen}; focus after each arrow: ${trail.join(' > ')}`);
  }
  await activate('Pick a game');
  await h.host.getByRole('main', { name: 'Game picker' }).waitFor();
  await h.host.keyboard.press('ArrowRight');
  await checkSafe();
  await namedShot('03-host-picker-focus');
  await smallShot('20-host-picker-720p');
  await activate('Select');
  await h.host.waitForTimeout(600);
  assert.equal(await h.host.locator('.picker-screen .host-hints').textContent(), 'Enter: startEsc: back');
  await checkSafe();
  await namedShot('10-host-picker-heading');
  await activate('Start');
  await h.host.locator('.session-placeholder').waitFor();
  await namedShot('05-host-keyboard-start');
  await h.host.keyboard.press('Escape');
  await h.host.waitForFunction(() => document.activeElement?.textContent === 'Resume');
  assert.equal(await h.host.evaluate(() => document.activeElement?.textContent), 'Resume');
  await checkSafe();
  await namedShot('06-host-pause-panel');
  await activate('Quit to picker');
  await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
  await activate('Back');
  await h.host.getByRole('main', { name: 'Host lobby' }).waitFor();
  const firstSeat = h.host.locator('.incoming .seat').first();
  assert.match((await firstSeat.textContent()) ?? '', /Player 1/);
  assert.match((await firstSeat.textContent()) ?? '', /Leader/);
  assert.deepEqual(await firstSeat.evaluate(el => ({ seat: el.querySelector('.seat-number')?.textContent, name: el.querySelector('.nickname')?.textContent, leader: el.querySelector('.leader')?.textContent })), localSeatBeforeQuit, 'Quit preserves the same local seat and leadership');
  await namedShot('12-host-quit-keeps-seat');
  for (const name of ['WWWWWWWWWWWW', 'Phone Two']) {
    const phone = await h.newPhone(); await h.openJoin(phone, name);
    await phone.getByRole('button', { name: 'Join', exact: true }).click();
    await h.waitSeated(phone, name);
  }
  await h.host.keyboard.press('KeyJ');
  assert.equal(await h.host.locator('.seat[data-empty="false"]').count(), 3);
  await namedShot('07-host-local-and-two-phones');
  await h.host.keyboard.press('KeyJ');
  await activate('Pick a game'); await activate('Select'); await activate('Start');
  await h.host.locator('.session-placeholder').waitFor();
  await h.host.keyboard.press('Escape'); await activate('Quit to picker');
  await activate('Back');
  await h.host.keyboard.press('KeyL');
  await h.host.evaluate(() => {
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [{ index: 0, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) }] });
    window.dispatchEvent(new Event('gamepadconnected'));
  });
  await h.host.locator('.lobby header[data-crowded="true"]').waitFor();
  await checkSafe(); await namedShot('23-host-lobby-crowded-1080p');
  await smallShot('24-host-lobby-crowded-720p');
  await h.host.evaluate(() => { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [] }); window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: { index: 0 } })); });
  await activate('Pick a game'); await activate('Select');
  await h.host.getByRole('heading', { name: 'WWWWWWWWWWWW starts on their phone', exact: true }).waitFor();
  await checkSafe(); await namedShot('14-host-picker-long-name');
  await activate('Back'); await activate('Back');
  await h.host.keyboard.press('KeyJ');
  if (h.maxPhones === 8) {
    await h.host.keyboard.press('KeyL');
    for (let i = 2; i < 8; i++) {
      const phone = await h.newPhone(); await h.openJoin(phone, `Phone ${String(i + 1)}`);
      await phone.getByRole('button', { name: 'Join', exact: true }).click(); await h.waitSeated(phone, `Phone ${String(i + 1)}`);
    }
    await activate('Pick a game');
    // The picker remembers its last focus, so step until Rabakz (the game with teams) is focused.
    for (let i = 0; i < 4 && !(await h.host.locator('.picker-screen header').innerText()).includes('Rabakz'); i++) await activate('Next');
    assert.match(await h.host.locator('.picker-screen header').innerText(), /Rabakz/);
    await activate('Select');
    await checkSafe(); await namedShot('21-host-start-8-wide-1080p');
    await smallShot('22-host-start-8-wide-720p');
    await activate('Teams off'); await activate('Start');
    await h.host.getByRole('main', { name: 'Team setup' }).waitFor();
    assert.equal(await h.host.locator('.team-screen footer [role="status"]').innerText(), 'Tap your side on your phone. WWWWWWWWWWWW starts.');
    assert.match(await h.host.locator('.team-keyboard-hints').innerText(), /Arrows and Enter: choose/);
    await h.host.keyboard.press('ArrowRight'); await checkSafe(); await namedShot('07-host-team-setup-8');
    await activate('Start');
  } else {
    await activate('Pick a game'); await activate('Next'); await activate('Next'); await activate('Select'); await activate('Start');
  }
  let clockInstalled = false;
  await finishRound();
  await h.host.keyboard.press('Enter');
  await h.host.getByRole('main', { name: 'Results', exact: true }).waitFor();
  await h.host.waitForTimeout(600);
  await h.host.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await h.host.keyboard.press('Enter');
  // Play again starts immediately, or restores team setup before starting.
  await h.host.locator('.rz-question, .team-screen').first().waitFor();
  if (await h.host.getByRole('main', { name: 'Team setup' }).count()) await activate('Start');
  await finishRound();
  for (const phone of h.phones) await phone.close();
  await h.host.waitForTimeout(11000);
  await namedShot('16-host-host-before-results-enter');
  await h.host.keyboard.press('Enter');
  await h.host.getByRole('main', { name: 'Results', exact: true }).waitFor();
  await h.host.waitForTimeout(600);
  await namedShot('09-host-results-no-leader');
  await h.host.keyboard.press('ArrowRight');
  await checkSafe(); await namedShot('08-host-results-keys');
  await h.host.keyboard.press('Escape');
  await h.host.getByRole('main', { name: 'Game picker', exact: true }).waitFor();
  async function finishRound() {
    await h.host.locator('.rz-question').waitFor();
    if (!clockInstalled) { await h.host.clock.install(); clockInstalled = true; }
    for (let second = 0; second < 400; second++) {
      await h.host.clock.runFor(1000);
      if (await h.host.locator('.game-final-hint').count()) break;
    }
    await h.host.clock.resume();
  }
  /** @param {string} name */
  async function smallShot(name) {
    await h.host.setViewportSize({ width: 1280, height: 720 });
    await h.host.waitForTimeout(600); await checkSafe(); await namedShot(name);
    await h.host.setViewportSize({ width: 1920, height: 1080 }); await h.host.waitForTimeout(600);
  }
  /** @param {string} name */
  async function namedShot(name) {
    const { file } = await h.shot(name);
    const target = `${name}.jpg`;
    await rename(join(h.evidence, file), join(h.evidence, target));
    h.screenshots[h.screenshots.indexOf(file)] = target;
    const state = h.shotStates.find(shot => shot.file === file);
    if (state) state.file = target;
  }
  async function checkSafe() {
    // The heading's drawn text and the subtitle under it must not touch (round 10 found them overlapping).
    const clash = await h.host.evaluate(() => {
      const header = document.querySelector('.picker-screen header .incoming'); if (!header) return '';
      const heading = header.querySelector('h1'), sub = header.querySelector('p:not(.host-hints):not(.host-pad-hint)');
      if (!heading || !sub?.textContent.trim()) return '';
      const range = (/** @type {Node} */ node) => { const r = document.createRange(); r.selectNodeContents(node); return r.getBoundingClientRect(); };
      const a = range(heading), b = range(sub);
      const stage = document.querySelector('.picker-stage');
      const gap = 21 * Math.min(innerWidth / 1920, innerHeight / 1080);
      if (stage && b.bottom + gap > stage.getBoundingClientRect().top + 0.5) return 'subtitle is within 21 scaled px of the stage';
      return a.bottom > b.top + 0.5 && a.left < b.right && a.right > b.left ? `heading ${String(Math.round(a.top))}–${String(Math.round(a.bottom))} overlaps subtitle ${String(Math.round(b.top))}–${String(Math.round(b.bottom))}` : '';
    });
    assert.equal(clash, '', 'Picker heading and subtitle must not overlap');
    const violations = await h.host.evaluate(() => {
      const seats = Array.from(document.querySelectorAll('.incoming .seat, .incoming .team-player')).map(el => el.getBoundingClientRect());
      return Array.from(document.querySelectorAll('.lobby .seat, .lobby .join-panel, .lobby header h1, .picker-screen header h1, .picker-screen .player-count, .host-hints span, .team-keyboard-hints span, .results-hints > span, .results-keyboard, .host-pause section, .host-pause button')).flatMap(el => {
        const textRange = document.createRange(); textRange.selectNodeContents(el);
        // A heading is measured by its drawn letters: the text box includes the font's space above the
        // tallest glyph, so move its top down to the ink using the font's own metrics.
        const ink = (/** @type {Element} */ node, /** @type {DOMRect} */ box) => {
          const style = getComputedStyle(node); const ctx = document.createElement('canvas').getContext('2d');
          if (!ctx) return box;
          ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const m = ctx.measureText(node.textContent);
          const scaleY = box.height / (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent || box.height);
          return new DOMRect(box.left, box.top + (m.fontBoundingBoxAscent - m.actualBoundingBoxAscent) * scaleY, box.width, box.height);
        };
        const r = el.matches('header h1') ? ink(el, textRange.getBoundingClientRect()) : el.getBoundingClientRect();
        if (!r.width || el.closest('.outgoing')) return [];
        const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
        // The TV stage is laid out at 1920 × 1080 and scaled, so design distances scale with it.
        const margin = 55 * scale; const gap = 21 * scale;
        const outside = r.left < margin - 0.5 || r.top < margin - 0.5 || r.right > innerWidth - margin + 0.5 || r.bottom > innerHeight - margin + 0.5;
        const content = el.closest('.lobby, .picker-screen')?.querySelectorAll('header h1, header p:not(.host-hints):not(.host-pad-hint), header .ka-chip, header .player-count, .join-panel, .picker-stage');
        // Measure what is drawn: text elements by their text, not by a box that may span the header.
        const drawn = (/** @type {Element} */ node) => { if (node.matches('header h1, header p')) { const range = document.createRange(); range.selectNodeContents(node); return range.getBoundingClientRect(); } return node.getBoundingClientRect(); };
        const tooClose = el.matches('.host-pad-hint, .host-hints span') && Array.from(content ?? []).some(node => {
          const s = drawn(node);
          return s.width && !node.closest('.outgoing') && r.left < s.right + gap && r.right > s.left - gap && r.top < s.bottom + gap && r.bottom > s.top - gap;
        });
        const overlap = !el.matches('.seat, .join-panel') && seats.some(s => r.left < s.right && r.right > s.left && r.top < s.bottom + gap && r.bottom > s.top - gap);
        const near = Array.from(content ?? []).find(node => { const s = drawn(node); return s.width && !node.closest('.outgoing') && r.left < s.right + gap && r.right > s.left - gap && r.top < s.bottom + gap && r.bottom > s.top - gap; });
        const why = outside ? 'outside the 55 px margin' : overlap ? 'within 21 px of a seat' : near ? `within 21 px of ${near.className || near.tagName} (hint ${String(Math.round(r.top))}–${String(Math.round(r.bottom))}, it ${String(Math.round(drawn(near).top))}–${String(Math.round(drawn(near).bottom))})` : '';
        const headingCrowded = el.matches('.picker-screen header h1') && Array.from(el.closest('header')?.querySelectorAll('.host-hints, .player-count') ?? []).some(node => r.right + gap > node.getBoundingClientRect().left);
        return outside || overlap || tooClose || headingCrowded ? [`${el.textContent}: ${why}`] : [];
      });
    });
    if (violations.length) await h.shot('unsafe-hints');
    assert.deepEqual(violations, [], 'Hints and pause panel stay within safe area and clear of seats');
  }
}
