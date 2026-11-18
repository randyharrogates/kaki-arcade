import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';

it('PLAT-024 / CTRL-009 keeps board 3 controls absent through 24 phone updates and names the local leader', async () => {
  const source = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const fixture = source('./c12-dom-fixture.tsx');
  const bundle = await build({ configFile: false, define: { 'import.meta.env.KAKI_JOIN_ORIGIN': JSON.stringify('') }, build: { target: 'esnext', write: false, minify: false, lib: { entry: fixture, formats: ['es'], name: 'fixture' }, rolldownOptions: { output: { codeSplitting: false } } }, esbuild: { jsx: 'automatic', jsxImportSource: 'preact' }, plugins: [{
    name: 'host-keyboard-dom-fixture',
    resolveId(id) { return id === fixture ? id : undefined; },
    async load(id) {
      if (id === source('./host.ts')) return (await readFile(id, 'utf8')).replace('export function createHost(', 'function fixtureHost(') + `\nexport function createHost(...args) { const host = fixtureHost(...args); window.mountedHost = host; return host; }`;
      // Setup needs the real metadata, without loading a game's content bank or renderer.
      if (id === source('./game-registry.ts')) return `
        import { meta as tabao } from '${source('../../../games/tabao-rush/src/meta.ts')}';
        import { meta as poker } from '${source('../../../games/peek-poker/src/meta.ts')}';
        import { meta as rabakz } from '${source('../../../games/rabakz/src/meta.ts')}';
        export const gameMetas = [tabao, poker, rabakz];
        export const sessionRegistrations = {};
        export const loadGame = async () => { throw new Error("No fixture game session"); };
        export const validGameSelection = () => false;
      `;
      if (id === source('./browser.ts')) return `
        export function browserDependencies() {
          return {
            clock: { now: () => Date.now(), schedule: (fn, ms) => setTimeout(fn, ms), cancel: timer => clearTimeout(timer) },
            storage: { getItem: () => null, setItem() {}, removeItem() {} },
            mintToken: () => crypto.randomUUID(),
            dial: async (_, callbacks) => {
              window.phoneCallbacks = callbacks;
              return { credentials: { code: 'H7KQ9MXR', hostToken: 'a'.repeat(32) }, reopened: false, stop() {} };
            }
          };
        }
      `;
      if (id !== fixture) return;
      return `
        import { render } from 'preact';
        import { gamepadPoll } from '${source('./gamepad-poll.ts')}';
        import { Results } from '${source('./results.tsx')}';
        import { createHost } from '${source('./host.ts')}';
        import { GamePicker } from '${source('./picker-route.tsx')}';
        import { localPlayer } from '${source('./local-player.ts')}';
        import { browserDependencies } from '${source('./browser.ts')}';
        import { HostLobby } from '${source('./host-route.tsx')}';
        let pads = [];
        Object.defineProperty(navigator, 'getGamepads', { value: () => pads });
        const root = document.createElement('div'); document.body.append(root);
        render(<HostLobby/>, root);
        const settle = () => new Promise(resolve => setTimeout(resolve, 250));
        const key = (key, code = key) => window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }));
        window.__step = 'rendered'; await settle();
        key('Enter'); await settle();
        const emptyHint = !document.querySelector('.lobby .host-hints')?.textContent.includes('Enter:');
        pads = [{ index: 0, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) }];
        window.dispatchEvent(new Event('gamepadconnected'));
        await settle();
        const padHint = document.querySelector('.host-pad-hint')?.textContent;
        const zeroStaysLobby = !!document.querySelector('.lobby') && !document.querySelector('.picker-screen');
        key('j', 'KeyJ'); await settle(); window.__step = 'joined';
        const hintJoined = document.querySelector('.lobby .host-hints')?.textContent.includes('L: leave');
        pads = [{ index: 0, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 9 })) }];
        await settle(); await settle();
        pads[0].buttons[9].pressed = false;
        const sharedSeat = document.querySelectorAll('.seat[data-empty="false"]').length === 1;

        for (const name of ['Phone One', 'Phone Two']) {
          window.phoneCallbacks.peer(name, { sendHost: () => true, bindIdentity() {}, close() {} });
          window.phoneCallbacks.control(name, { v: 1, t: 'hello', name });
        }
        await settle();
        window.__step = 'phones'; key('Enter'); await new Promise(resolve => setTimeout(resolve, 250));
        // Screen crossfades last 377 ms; outgoing hints remain painted but are inert/aria-hidden.
        const currentHint = () => [...document.querySelectorAll('.picker-screen .host-hints')].find(node => !node.closest('.outgoing, [aria-hidden="true"], [inert]'))?.textContent;
        for (let attempt = 0; attempt < 20 && currentHint() === undefined; attempt++) await settle();
        const pickerHint = currentHint();
        key('Enter'); await new Promise(resolve => setTimeout(resolve, 50));
        const bands = [...document.querySelectorAll('.picker-screen header > .overlap > .incoming, .picker-screen header > .overlap > .outgoing')];
        const equalHeaderBands = bands.length === 2 && Math.abs(bands[0].getBoundingClientRect().height - bands[1].getBoundingClientRect().height) <= 0.5;
        await settle(); await settle(); key('Escape'); await settle(); await settle();
        key('ArrowRight'); await new Promise(resolve => setTimeout(resolve, 250)); key('Enter'); await settle();
        const startHint = currentHint();
        key('Escape'); await settle(); key('ArrowRight'); await settle(); key('Enter'); await settle();
        const teamsHint = currentHint();
        key('t', 'KeyT'); await settle(); key('Enter'); await settle();
        const teamStatus = document.querySelector('.team-screen footer [role="status"]')?.textContent;
        const teamHint = document.querySelector('.team-keyboard-hints')?.textContent;
        key('Escape'); await settle(); key('ArrowLeft'); await settle(); key('Enter'); await settle();
        let stable = true;
        for (let update = 0; update < 24; update++) {
          window.phoneCallbacks.quality('Phone One', { quality: update % 2 ? 'weak' : 'good', path: 'direct', medianMs: update, p95Ms: update, loss: 0 });
          await settle();
          stable &&= document.querySelectorAll('.picker-controls, .lobby header button').length === 0;
        }
        const padHeading = document.querySelector('.picker-screen header .incoming h1')?.textContent;
        key('Escape'); await settle(); key('Escape'); await settle(); key('j', 'KeyJ');
        key('Enter'); await settle(); key('Enter'); await settle();
        const localHeading = document.querySelector('.picker-screen header .incoming h1')?.textContent;
        key('l', 'KeyL'); await settle();
        const phoneHeading = document.querySelector('.picker-screen header .incoming h1')?.textContent;
        // Keep HostLobby's real window listener installed alongside Results.
        const mounted = window.mountedHost;
        const resultRoot = document.createElement('div'); document.body.append(resultRoot);
        let integratedResults = true;
        for (const mode of ['Escape', 'Enter', 'pad']) {
          mounted.sessionEvent({ type: 'results' });
          render(<Results session={{ gameId: 'peek-poker', results: { players: [] } }} room={mounted.room} keyboard={true} again={() => mounted.playAgain()} back={() => mounted.returnToPicker()}/>, resultRoot);
          await settle(); document.activeElement?.blur();
          if (mode === 'pad') {
            const pad = { index: 0, mapping: 'standard', buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 1 })) };
            for (const action of gamepadPoll([], [pad], 0, 'results')) if (action.type === 'key') key(action.key);
          } else key(mode);
          await settle();
          integratedResults &&= mounted.room.phase === 'lobby' && (mode === 'Enter' ? ['start', 'starting'].includes(mounted.picker.screen) : mounted.picker.screen === 'picker');
          render(null, resultRoot); await settle(); await settle();
          integratedResults &&= !!root.querySelector('.picker-screen');
        }
        resultRoot.remove();
        render(null, root); await settle();
        const resultsHost = createHost(browserDependencies(), () => {});
        await resultsHost.start();
        resultsHost.sessionEvent({ type: 'results' });
        let again = 0, back = 0;
        render(<Results session={{ gameId: 'peek-poker', results: { players: [] } }} room={{ players: [] }} keyboard={true} again={() => { again++; resultsHost.playAgain(); }} back={() => { back++; resultsHost.returnToPicker(); }}/>, root);
        await settle();
        const hints = root.querySelectorAll('.results-hints [role="button"]');
        const enter = node => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
        hints[1].focus(); enter(hints[1]);
        const focusedBack = back === 1 && again === 0 && resultsHost.room.phase === 'lobby' && resultsHost.picker.screen === 'picker';
        resultsHost.sessionEvent({ type: 'results' });
        hints[0].focus(); enter(hints[0]);
        const focusedAgain = back === 1 && again === 1 && resultsHost.room.phase === 'lobby' && resultsHost.picker.screen === 'start';
        resultsHost.sessionEvent({ type: 'results' });
        hints[0].blur(); enter(window);
        const unfocusedAgain = again === 2 && resultsHost.room.phase === 'lobby' && resultsHost.picker.screen === 'start';
        resultsHost.joinLocal(localPlayer());
        const longRoom = { ...resultsHost.room, players: resultsHost.room.players.map(player => ({ ...player, name: 'Abcdefghijkl' })) };
        render(<GamePicker state={{ ...resultsHost.picker, screen: 'start' }} room={longRoom} localDevice="controller"/>, root);
        await settle();
        const longHeading = root.querySelector('header .incoming h1');
        const headingRange = document.createRange(); headingRange.selectNodeContents(longHeading);
        const headingBox = headingRange.getBoundingClientRect();
        const hintBox = root.querySelector('.host-hints').getBoundingClientRect();
        const countBox = root.querySelector('.player-count').getBoundingClientRect();
        const longHeadingSafe = longHeading.textContent === 'Abcdefghijkl starts with the controller' &&
          headingBox.right + 21 <= Math.min(hintBox.left, countBox.left) &&
          headingBox.left >= 55 && headingBox.right <= innerWidth - 55;
        // Expose real picker renders for the viewport safety matrix below.
        window.renderSafetyScreen = screen => render(<GamePicker state={{ ...resultsHost.picker, screen }} room={{ ...longRoom, players: longRoom.players.map(player => ({ ...player, name: 'WWWWWWWWWWWW', connectionId: 'phone-leader' })) }}/>, root);
        resultsHost.stop();
        window.hostKeyboardResult = { equalHeaderBands, integratedResults, longHeadingSafe, emptyHint, padHint, pickerHint, startHint, teamsHint, teamStatus, teamHint, stable, localHeading, phoneHeading, zeroStaysLobby, hintJoined, sharedSeat, padHeading, focusedBack, focusedAgain, unfocusedAgain };
      `;
    },
  }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing fixture bundle');
  const chunk = output.output.find(item => item.type === 'chunk' && item.isEntry);
  if (chunk?.type !== 'chunk') throw new Error('Missing fixture code');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    // Fail fast with the page's own error instead of waiting for a result that never comes.
    const errors: string[] = [];
    page.on('pageerror', error => { errors.push(error.message); });
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('http://localhost/', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
    await page.goto('http://localhost/');
    await page.addStyleTag({ content: await readFile(source('../../../packages/ui/tokens.css'), 'utf8') });
    await page.addStyleTag({ content: await readFile(source('./style.css'), 'utf8') });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    await page.waitForFunction(() => 'hostKeyboardResult' in window, undefined, { timeout: 20000 }).catch(async (error: unknown) => {
      const state = await page.evaluate(() => `step ${String(Reflect.get(window, '__step'))}; controls ${[...document.querySelectorAll('.host-shell button')].map(node => node.textContent).join(' | ')}`);
      throw new Error(`Fixture did not finish (${state}): ${errors.join('; ') || String(error)}`);
    });
    expect(await page.evaluate(() => Reflect.get(window, 'hostKeyboardResult') as unknown)).toEqual({
      equalHeaderBands: true, integratedResults: true, longHeadingSafe: true, emptyHint: true, padHint: 'Start on a game pad: join', pickerHint: 'Left and Right: chooseEnter: selectEsc: back', startHint: 'Enter: startEsc: back', teamsHint: 'Enter: startEsc: backT: teams', teamStatus: 'Tap your side on your phone. Player 1 starts.', teamHint: 'Arrows and Enter: chooseEsc: back',
      stable: true, focusedBack: true, focusedAgain: true, unfocusedAgain: true, zeroStaysLobby: true, hintJoined: true, sharedSeat: true, padHeading: 'Player 1 starts with the controller',
      localHeading: 'Player 1 starts with the keyboard', phoneHeading: 'Phone One starts on their phone',
    });
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => { document.documentElement.style.setProperty('--screen-scale', String(Math.min(innerWidth / 1920, innerHeight / 1080))); });
      for (const screen of ['picker', 'start']) {
        await page.evaluate(screen => { (Reflect.get(window, 'renderSafetyScreen') as (screen: string) => void)(screen); }, screen);
        await page.waitForFunction(screen => document.querySelector('.picker-screen header .incoming h1')?.textContent === (screen === 'picker' ? 'Pick a game' : 'WWWWWWWWWWWW starts on their phone'), screen);
        // Wait for crossfade removal and the font fitter's layout effects.
        await page.waitForTimeout(600);
        const measurements = await page.evaluate(() => {
          const header = document.querySelector('.picker-screen header');
          const heading = header?.querySelector('.incoming h1');
          const count = header?.querySelector('.player-count');
          const hint = header?.querySelector('.host-hints');
          const stage = document.querySelector('.picker-stage');
          if (!heading || !count || !hint || !stage) throw new Error('Missing picker safety elements');
          const drawn = (node: Element) => {
            const range = document.createRange(); range.selectNodeContents(node);
            return range.getBoundingClientRect();
          };
          const h = drawn(heading), c = count.getBoundingClientRect(), k = hint.getBoundingClientRect();
          const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
          const margin = 55 * scale, gap = 21 * scale;
          const inside = (r: DOMRect) => r.left >= margin - 0.5 && r.top >= margin - 0.5 && r.right <= innerWidth - margin + 0.5 && r.bottom <= innerHeight - margin + 0.5;
          const spans = [...hint.querySelectorAll('span')].map(node => node.getBoundingClientRect());
          return {
            headingSafe: inside(h), countSafe: inside(c), hintsSafe: spans.every(inside),
            countGap: k.top - c.bottom >= gap - 0.5,
            headingGap: [c, k].every(r => h.right + gap <= r.left + 0.5),
            rightAligned: Math.abs(k.right - c.right) <= 0.5,
            subtitleGap: (() => { const sub = header?.querySelector('.incoming p'); return !sub || drawn(sub).bottom + gap <= stage.getBoundingClientRect().top + 0.5; })(),
            stageTop: stage.getBoundingClientRect().top / scale,
          };
        });
        expect(measurements, `${screen} at ${String(viewport.width)}`).toMatchObject({ subtitleGap: true, headingSafe: true, countSafe: true, hintsSafe: true, countGap: true, headingGap: true, rightAligned: true });
        expect(measurements.stageTop).toBeCloseTo(264.2, 0); // Round 11: the 21 px inset now occupies real layout space.
      }
    }
  } finally { await browser.close(); }
}, 30000);
