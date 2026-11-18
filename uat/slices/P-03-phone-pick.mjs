// PP-005, PP-020. Integrator: run separately with --phones 1, 2 and 8.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function phonePick(h) {
  assert.ok([1, 2, 8].includes(h.maxPhones), 'Use 1, 2 or 8 phones');
  /** @type {import('playwright').Page[]} */
  const phones = [];
  /** @type {{seat:number,phase:string,message:import('../../packages/protocol/src/channel.ts').HostMessage}[]} */
  const received = [];
  /** @type {Map<number,string>} */
  const phases = new Map();
  // Capture the actual decoded messages at the phone transport boundary. The
  // host trace adds authoritative phase and connection identity to game sends.
  await h.host.route('**/src/session-adapter.ts', async route => {
    const response = await route.fetch(); const source = await response.text();
    const publicRe = /publicView\(view\)\s*\{/;
    const resultsRe = /if\s*\(event\.type\s*===\s*["']results["']\)\s*\{/;
    const transportRe = /transport:\s*\{\s*\.\.\.o\.transport,\s*subscribe\(receive\)/;
    assert.ok(publicRe.test(source), 'session-adapter hook not found: publicView');
    assert.ok(resultsRe.test(source), 'session-adapter hook not found: results');
    assert.ok(transportRe.test(source), 'session-adapter hook not found: transport');
    await route.fulfill({ response, body: source
      .replace(publicRe, `publicView(view) {
        window.__p03Phase = view.phase;
        (window.__p03Public ??= []).push(structuredClone(view));`)
      // Hold only the shell results hand-off: P-05 has not supplied a final screen.
      // Rules still finish normally and send the real over view.
      .replace(resultsRe, "if (event.type === 'results') { window.__p03Finished = true; return; } if (event.type === 'results') {")
      .replace(transportRe, `transport: { ...o.transport,
        sendLayout(connection, layout) {
          (window.__p03Sends ??= []).push({phase:window.__p03Phase,seat:latestRoom.players.find(p=>p.connectionId===connection)?.seat,kind:'layout',payload:structuredClone(layout)});
          return o.transport.sendLayout(connection,layout);
        },
        sendPrivateView(connection, view) {
          (window.__p03Sends ??= []).push({phase:window.__p03Phase,seat:latestRoom.players.find(p=>p.connectionId===connection)?.seat,kind:'view',payload:structuredClone(view)});
          return o.transport.sendPrivateView(connection,view);
        }, subscribe(receive)`)
    });
  });
  await h.host.addInitScript(() => {
    /** @type {{text:string,hands:string}[]} */
    const frames = [];
    Reflect.set(window, '__p03Frames', frames);
    const frame = () => {
      if (Reflect.get(window, '__p03Phase') === 'pick') frames.push({ text: document.body.innerText,
        hands: document.querySelector('.pp-hands')?.textContent ?? '' });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  try {
    await h.createRoom();
    for (let index = 0; index < h.maxPhones; index++) {
      const phone = await h.newPhone(); phones.push(phone);
      await phone.exposeFunction('p03Received', /** @param {import('../../packages/protocol/src/channel.ts').HostMessage} message */ message => {
        const seat = index + 1;
        if (message.t === 'layout') {
          const layout = /** @type {import('../../packages/platform/src/game/layout.ts').ControllerLayout} */ (/** @type {unknown} */ (message.layout));
          const title = layout.controls.find(c => c.kind === 'text');
          phases.set(seat, layout.controls.some(c => c.kind === 'grid') ? 'pick' :
            title?.kind === 'text' ? title.text : layout.controls.length === 0 ? 'reveal' : 'other');
        }
        received.push({ seat, phase: phases.get(seat) ?? 'lobby', message });
      });
      await phone.route('**/src/phone-browser.ts', async route => {
        const response = await route.fetch(); const source = await response.text();
        const marker = /onControl:\s*\(?message\)?\s*=>\s*\{\s*options\.onControl\(message\);?\s*\}/;
        assert.ok(marker.test(source), 'Phone transport seam still matches');
        await route.fulfill({ response, body: source.replace(marker,
          'onControl: message => { window.p03Received(message); options.onControl(message); }') });
      });
      await phone.setViewportSize({ width: index % 2 ? 844 : 667, height: index % 2 ? 390 : 375 });
      const name = `Player ${String(index + 1)}`;
      await h.openJoin(phone, name);
      await phone.getByRole('button', { name: 'Join', exact: true }).click();
      await h.waitSeated(phone, name);
    }
    const leader = phones[0]; assert.ok(leader);
    await leader.getByRole('button', { name: 'Pick a game', exact: true }).click();
    await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
    await leader.getByRole('button', { name: 'Next', exact: true }).click();
    await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
    await leader.getByRole('button', { name: 'Select', exact: true }).click();
    await leader.getByRole('button', { name: 'Start', exact: true }).click();
    // The console does not load Peek Poker's TV table yet (STATUS, P-04), so phases are read from
    // the host's own public view captured above, not from the TV's markup.
    await h.host.waitForFunction(() => Reflect.get(window, '__p03Phase') === 'memorise', undefined, { timeout: 30000 });
    await h.host.clock.install();
    await h.host.clock.pauseAt(await h.host.evaluate(() => new Date(Date.now() + 100)));
    /** @param {string} label */
    const shots = async label => {
      for (const width of [667, 844]) {
        await leader.setViewportSize({ width, height: width === 667 ? 375 : 390 });
        await leader.waitForFunction(() => {
          const play = document.querySelector('.ka-controller-play')?.getBoundingClientRect();
          const engine = document.querySelector('.ka-layout-engine:not(.ka-layout-ghost)')?.getBoundingClientRect();
          if (!play || !engine) return false;
          return play.width === innerWidth && engine.width === play.width && engine.height === play.height;
        });
        await h.shot(`${label}-${String(width)}`, leader);
      }
      // The TV's clock is frozen to step the game's timers, so its animation frames never run; take the TV still without waiting for them to settle.
      const still = await h.shot(`${label}-tv`, h.host, undefined, false);
      const record = h.shotStates.find(row => row.file === still.file);
      if (record) record.unsettled = true; // not settled (frozen clock)
    };
    /** @param {string} phase */
    const advance = async phase => {
      for (let second = 0; second < 65; second++) {
        if (await h.host.evaluate(target => Reflect.get(window, '__p03Phase') === target, phase)) return;
        await h.host.clock.runFor(1000);
      }
      throw Error(`Did not reach ${phase}`);
    };
    await h.step('Phone memorise, pick, lock and reveal', async () => {
      await leader.getByText('Watch the TV', { exact: true }).waitFor();
      await shots('memorise');
      await advance('pick');
      await leader.getByRole('button', { name: 'Card 1', exact: true }).waitFor();
      await shots('picking-0');
      const measurements = [];
      for (const size of [{ width: 667, height: 375 }, { width: 844, height: 390 }, { width: 932, height: 430 }]) {
        const { width, height } = size;
        await leader.setViewportSize(size);
        await leader.waitForFunction(({ width, height }) => {
          const play = document.querySelector('.ka-controller-play')?.getBoundingClientRect();
          const engine = document.querySelector('.ka-layout-engine:not(.ka-layout-ghost)');
          const bounds = engine?.getBoundingClientRect();
          const targets = [...document.querySelectorAll('.ka-layout-grid .ka-layout-target, [data-target="lock:go"]')];
          if (!play || !bounds) return false;
          return innerWidth === width && innerHeight === height &&
            bounds.width === play.width && bounds.height === play.height && targets.length === 17 &&
            targets.every(node => { const r = node.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= width && r.bottom <= height; });
        }, size);
        /** @type {{width:number,height:number,inside:boolean}[]} */
        const geometry = await leader.locator('.ka-layout-grid .ka-layout-target').evaluateAll(nodes => nodes.map(node => {
          const r = node.getBoundingClientRect(); return { width: r.width, height: r.height,
            inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight };
        }));
        assert.equal(geometry.length, 16);
        assert.ok(geometry.every(r => r.width >= 89 && r.height >= 68 && r.inside));
        const lock = await leader.getByRole('button', { name: 'Lock in', exact: true }).boundingBox();
        assert.ok(lock && lock.width >= 144 && lock.height >= 144 && lock.x >= 0 && lock.y >= 0 && lock.x + lock.width <= width && lock.y + lock.height <= height);
        assert.equal(await leader.locator('.ka-layout-engine:not(.ka-layout-ghost)').getAttribute('data-fits'), 'true');
        const cover = await leader.locator('.phone-game-page').boundingBox();
        assert.deepEqual(cover, { x: 0, y: 0, width, height });
        measurements.push({ width, height, cells: geometry, lock });
      }
      assert.equal(new Set(measurements.map(m => JSON.stringify({ cells: m.cells, lock: m.lock }))).size, 3, 'Each viewport has distinct settled geometry');
      await writeFile(join(h.evidence, 'measurements.json'), JSON.stringify(measurements, null, 2));
      await leader.getByRole('button', { name: 'Card 1', exact: true }).click();
      await h.host.clock.runFor(100);
      await leader.locator('[data-target="grid:0"][data-state="selected"]').waitFor();
      await shots('picking-1');
      await leader.getByRole('button', { name: 'Card 9', exact: true }).click();
      await h.host.clock.runFor(100);
      await leader.locator('[data-target="grid:8"][data-state="selected"]').waitFor();
      await shots('picking-2');
      // Every other phone selects a distinct pair but leaves it unlocked.
      for (const [index, phone] of phones.entries()) if (index > 0) {
        await phone.getByRole('button', { name: `Card ${String(index + 1)}`, exact: true }).click();
        await h.host.clock.runFor(100);
        await phone.locator(`[data-target="grid:${String(index)}"][data-state="selected"]`).waitFor();
        await phone.getByRole('button', { name: `Card ${String(index + 9)}`, exact: true }).click();
        await h.host.clock.runFor(100);
        await phone.locator(`[data-target="grid:${String(index + 8)}"][data-state="selected"]`).waitFor();
      }
      await leader.getByRole('button', { name: 'Lock in', exact: true }).click();
      await h.host.clock.runFor(100);
      if (phones.length > 1) {
        await leader.getByText('Watch the TV for the reveal', { exact: true }).waitFor();
        await shots('locked');
      }
      await advance('reveal');
      await leader.locator('.ka-private-panel:not(.ka-private-ghost) .ka-layout-card-face').first().waitFor();
      await shots('reveal-own-hand');
      for (const [index, phone] of phones.entries()) await h.shot(`reveal-seat-${String(index + 1)}`, phone);
      await advance('scoreboard');
      await leader.getByText('Scores on the TV', { exact: true }).waitFor();
      await shots('scoreboard');
    }, 240000);
    await h.step('Random fill and finish the real match', async () => {
      await advance('memorise'); await advance('pick'); await advance('reveal');
      await leader.getByText('Missing picks were filled at random', { exact: true }).waitFor();
      await shots('random-fill');
      for (let second = 0; second < 400; second++) {
        if (await h.host.evaluate(() => Reflect.get(window, '__p03Finished') === true)) break;
        await h.host.clock.runFor(1000);
      }
      await leader.getByText('Match over', { exact: true }).waitFor();
      await shots('over');
    }, 240000);
    const trace = await h.host.evaluate(() => {
      const capture = /** @type {{__p03Public:unknown,__p03Sends:unknown,__p03Frames:unknown}} */ (/** @type {unknown} */ (window));
      return { public: capture.__p03Public, sends: capture.__p03Sends, frames: capture.__p03Frames };
    });
    await writeFile(join(h.evidence, 'payloads.json.gz'), gzipSync(JSON.stringify({ ...trace, received })));
    const captured = /** @type {{public:{phase:string,players:{picks:unknown}[],hands:unknown[]}[],sends:{phase:string,seat:number,kind:string,payload:import('../../packages/platform/src/game/layout.ts').ControllerLayout|import('../../packages/platform/src/game/layout.ts').PrivateView|null}[],frames:{text:string,hands:string}[]}} */
    (/** @type {unknown} */ (trace));
    assert.ok(received.length && captured.frames.length && captured.sends.length);
    for (const view of captured.public) if (['memorise', 'swap', 'pick'].includes(view.phase)) {
      assert.ok(view.players.every(p => p.picks === null)); assert.deepEqual(view.hands, []);
    }
    for (const send of captured.sends) if (['memorise', 'swap', 'pick'].includes(send.phase) && send.payload) {
      assert.ok(!JSON.stringify(send.payload).includes('"picks"'));
      if ('blocks' in send.payload) assert.ok(send.payload.blocks.every(b => b.kind !== 'cards'));
      if ('controls' in send.payload) for (const control of send.payload.controls) if (control.kind === 'grid') {
        assert.equal(control.cells.length, 16);
        for (const [index, cell] of control.cells.entries()) {
          assert.equal(cell.faceDown, true); assert.equal(cell.label, undefined); assert.equal('mark' in cell, false);
          if (cell.state === 'selected') assert.ok([send.seat - 1, send.seat + 7].includes(index), 'Only the recipient’s own picks');
        }
      }
    }
    for (const row of received) {
      if (row.message.t === 'layout') {
        const layout = /** @type {import('../../packages/platform/src/game/layout.ts').ControllerLayout} */ (/** @type {unknown} */ (row.message.layout));
        for (const control of layout.controls) if (control.kind === 'grid') {
          for (const [index, cell] of control.cells.entries()) if (cell.state === 'selected') {
            assert.ok([row.seat - 1, row.seat + 7].includes(index), 'Received selection belongs to this phone');
          }
        }
      }
      if (row.message.t === 'view' && row.message.view !== null && row.phase !== 'reveal') {
        assert.ok(!JSON.stringify(row.message.view).includes('"cards"'), 'No hand cards received before the reveal');
      }
    }
    for (const frame of captured.frames) assert.equal(frame.hands, '', `Early TV hand: ${frame.text}`);
  } finally { for (const phone of phones) await phone.close(); }
}
