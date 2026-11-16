#!/usr/bin/env node
// S-01 network spike: unattended run. THROWAWAY CODE.
//
// Starts the signalling server, the web server and one headless Chrome, then for 1, 4 and 8
// emulated phones (each in its own browser context, 844 x 390, scripted input) measures
// input delay for 30 s and writes uat/evidence/S-01-network-spike/results.json plus
// screenshots. Everything stays on 127.0.0.1. No npm dependencies: Chrome is driven over
// the DevTools protocol with Node's built-in WebSocket.
//
// Usage: node spikes/s01-network/run.mjs [--seconds 30] [--quick]

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir, cpus, totalmem } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const EVIDENCE = join(REPO, 'uat', 'evidence', 'S-01-network-spike');
const WEB_PORT = 4550;
const SIGNAL_PORT = 4551;
const DEBUG_PORT = 4553;
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const SECONDS = Number(args.includes('--seconds') ? args[args.indexOf('--seconds') + 1] : QUICK ? 5 : 30);
const BASE = `http://127.0.0.1:${WEB_PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const children = [];
const log = (...a) => console.log('[run]', ...a);

function start(name, cmd, cmdArgs) {
  const child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => process.stdout.write(`[${name}] ${d}`.replace(/\n(?=.)/g, `\n[${name}] `)));
  child.stderr.on('data', (d) => { if (name !== 'chrome') process.stderr.write(`[${name}] ${d}`); });
  children.push(child);
  return child;
}

async function waitFor(fn, what, timeoutMs = 20000, everyMs = 100) {
  const end = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < end) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (e) { lastError = e; }
    await sleep(everyMs);
  }
  throw new Error(`timed out waiting for ${what}${lastError ? `: ${lastError.message}` : ''}`);
}

// ---- DevTools protocol -----------------------------------------------------------------

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.waiting = new Map();
    this.pageErrors = [];
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.waiting.has(msg.id)) {
        const { resolve, reject } = this.waiting.get(msg.id);
        this.waiting.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
      }
    };
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('cdp connect failed')); });
    return new Cdp(ws);
  }
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
}

async function openPage(cdp, url, { width, height, mobile }) {
  const { browserContextId } = await cdp.send('Target.createBrowserContext');
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId, width, height, newWindow: true });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }, sessionId);
  if (mobile) await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Page.navigate', { url }, sessionId);
  const page = {
    targetId, sessionId, browserContextId,
    // Not JavaScript eval(): runs a fixed expression from this file in the spike's own page
    // through the DevTools protocol, to read its numbers.
    async eval(expression) {
      const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async shot(file, clip) {
      const r = await cdp.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }, sessionId);
      if (file) await writeFile(join(EVIDENCE, file), Buffer.from(r.data, 'base64'));
      return r.data;
    },
    async close() {
      await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
      await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
    },
  };
  return page;
}

const HOST_VIEW = { width: 1920, height: 1080, mobile: false };
const PHONE_VIEW = { width: 844, height: 390, mobile: true };

async function openRoom(cdp, phoneCount, phoneQuery) {
  const host = await openPage(cdp, `${BASE}/host.html`, HOST_VIEW);
  const code = await waitFor(() => host.eval('window.__spike && window.__spike.roomCode()'), 'room code');
  const phones = [];
  for (let i = 0; i < phoneCount; i++) {
    phones.push(await openPage(cdp, `${BASE}/phone.html?room=${code}&${phoneQuery}&name=bot${i + 1}`, PHONE_VIEW));
  }
  await waitFor(async () => (await host.eval('window.__spike.count()')) === phoneCount, `${phoneCount} phones connected`, 30000);
  return { host, phones, code };
}

async function closeRoom(room) {
  for (const p of room.phones) await p.close();
  await room.host.close();
}

/** Connect, let the clock estimate settle, measure for `seconds`, return the numbers. */
async function measure(cdp, name, phoneCount, phoneQuery, seconds, during) {
  log(`${name}: ${phoneCount} phone(s), ${seconds} s, ${phoneQuery}`);
  const room = await openRoom(cdp, phoneCount, phoneQuery);
  await sleep(4000); // 12 quick pings at 250 ms, plus link statistics
  await room.host.eval('window.__spike.reset()');
  const began = Date.now();
  if (during) await during(room);
  await sleep(Math.max(0, seconds * 1000 - (Date.now() - began)));
  const snapshot = await room.host.eval('window.__spike.snapshot()');
  const result = { name, phoneCount, phoneQuery, measuredSeconds: seconds, ...snapshot };
  const t = snapshot.all.total;
  log(`  touch→step p50 ${t.p50} p95 ${t.p95} p99 ${t.p99} max ${t.max} ms (n=${t.n}); ` +
      `send→received p95 ${snapshot.all.net.p95} ms; lost ${snapshot.phones.reduce((a, p) => a + p.lost, 0)}; ` +
      `paths ${[...new Set(snapshot.phones.map((p) => p.path))].join(',')}; host ${snapshot.host.framesPerSecond} fps`);
  return { room, result };
}

async function frameStrip(cdp, room, file) {
  const clip = await room.host.eval(`(() => { const r = document.getElementById('arena').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
  const frames = [];
  for (let i = 0; i < 8; i++) {
    frames.push(await room.host.shot(null, clip));
    await sleep(375); // 8 frames across one 3 s circle
  }
  const cellW = 470;
  const cellH = Math.round((cellW * clip.height) / clip.width);
  const gap = 8;
  const width = cellW * 4 + gap * 5;
  const height = cellH * 2 + gap * 3;
  const page = await openPage(cdp, 'about:blank', { width, height, mobile: false });
  await sleep(300);
  await page.eval(`(async () => {
    document.body.style.margin = '0';
    const c = document.createElement('canvas'); c.width = ${width}; c.height = ${height};
    c.style.display = 'block'; document.body.appendChild(c);
    const g = c.getContext('2d'); g.fillStyle = 'white'; g.fillRect(0, 0, c.width, c.height);
    const frames = ${JSON.stringify(frames)};
    for (let i = 0; i < frames.length; i++) {
      const img = new Image(); img.src = 'data:image/png;base64,' + frames[i]; await img.decode();
      const x = ${gap} + (i % 4) * ${cellW + gap}, y = ${gap} + Math.floor(i / 4) * ${cellH + gap};
      g.drawImage(img, x, y, ${cellW}, ${cellH});
      g.fillStyle = 'black'; g.font = '700 21px sans-serif'; g.fillText('t = ' + (i * 0.375).toFixed(2) + ' s', x + 13, y + 26);
    }
    return true;
  })()`);
  await page.shot(file);
  await page.close();
}

/** One phone driven by real touch events from the DevTools protocol: drag the stick round. */
async function touchDrive(cdp, phone, seconds) {
  const box = await phone.eval(`(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; })()`);
  const point = (a) => [{ x: box.cx + Math.cos(a) * 60, y: box.cy + Math.sin(a) * 60, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(0) }, phone.sessionId);
  const began = Date.now();
  while (Date.now() - began < seconds * 1000) {
    const a = ((Date.now() - began) / 3000) * Math.PI * 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(a) }, phone.sessionId);
    await sleep(12);
  }
  return async () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, phone.sessionId);
}

// ---- main ------------------------------------------------------------------------------

async function portFree(port) {
  try { await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) }); return false; } catch (e) { return e.name !== 'TimeoutError'; }
}

let profileDir;
async function shutdown() {
  for (const c of children) { try { c.kill('SIGTERM'); } catch { /* gone */ } }
  await sleep(800);
  for (const c of children) { try { c.kill('SIGKILL'); } catch { /* gone */ } }
  if (profileDir) await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}

async function main() {
  for (const port of [WEB_PORT, SIGNAL_PORT, DEBUG_PORT]) {
    if (!(await portFree(port))) throw new Error(`port ${port} is already in use`);
  }
  await mkdir(EVIDENCE, { recursive: true });
  profileDir = await mkdtemp(join(tmpdir(), 's01-chrome-'));
  start('signal', process.execPath, [join(HERE, 'signal-server.mjs'), '--port', String(SIGNAL_PORT)]);
  start('web', process.execPath, [join(HERE, 'web-server.mjs'), '--port', String(WEB_PORT), '--signal-port', String(SIGNAL_PORT)]);
  start('chrome', CHROME, [
    '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    // nine pages must all keep their timers and frames running, as nine real devices would
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-default-apps',
    'about:blank',
  ]);
  const version = await waitFor(async () => (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(), 'Chrome');
  await waitFor(async () => (await fetch(`${BASE}/host.html`)).ok, 'web server');
  await waitFor(async () => (await fetch(`http://127.0.0.1:${SIGNAL_PORT}/health`)).ok, 'signalling server');
  const cdp = await Cdp.connect(version.webSocketDebuggerUrl);
  log(`Chrome ${version.Browser}`);

  const scenarios = [];
  const checks = {};

  // 1 and 4 phones at a fixed 60 Hz
  for (const n of [1, 4]) {
    const { room, result } = await measure(cdp, `${n}-phone-60hz`, n, 'bot=1&hz=60', SECONDS);
    scenarios.push(result);
    await room.host.shot(`0${n === 1 ? 1 : 2}-host-${n}-phone${n > 1 ? 's' : ''}.png`);
    await closeRoom(room);
  }

  // 8 phones at a fixed 60 Hz, with the screenshots, the ninth joiner and a phone leaving
  {
    const { room, result } = await measure(cdp, '8-phone-60hz', 8, 'bot=1&hz=60', SECONDS, async (r) => {
      await sleep(Math.min(3000, SECONDS * 300));
      await frameStrip(cdp, r, 'strip-host-8-dots.png');
    });
    scenarios.push(result);
    await room.host.shot('03-host-8-phones.png');
    await room.phones[0].shot('04-phone1-bot.png');

    const ninth = await openPage(cdp, `${BASE}/phone.html?room=${room.code}&name=ninth&bot=1`, PHONE_VIEW);
    const ninthText = await waitFor(async () => {
      const t = await ninth.eval(`document.getElementById('state').textContent`);
      return /full/i.test(t) ? t : null;
    }, 'ninth phone to be refused', 8000).catch((e) => `NOT REFUSED: ${e.message}`);
    await sleep(500);
    checks.ninthJoiner = { phoneSays: ninthText, hostCount: await room.host.eval('window.__spike.count()'), pass: /full/i.test(ninthText) };
    checks.ninthJoiner.pass &&= checks.ninthJoiner.hostCount === 8;
    await ninth.shot('05-phone9-refused.png');
    await ninth.close();

    const wrong = await openPage(cdp, `${BASE}/phone.html?room=ZZZZ`, PHONE_VIEW);
    const wrongText = await waitFor(async () => {
      const t = await wrong.eval(`document.getElementById('state').textContent`);
      return /No room/.test(t) ? t : null;
    }, 'wrong code to be refused', 8000).catch((e) => `NOT REFUSED: ${e.message}`);
    checks.wrongCode = { phoneSays: wrongText, pass: /No room/.test(wrongText) };
    await wrong.close();

    // a phone closes its page: the host should drop its dot and free the place
    const leftAt = Date.now();
    await room.phones.pop().close();
    const dropped = await waitFor(async () => (await room.host.eval('window.__spike.count()')) === 7, 'host to drop the closed phone', 20000).then(() => true, () => false);
    checks.phoneLeaves = { hostDroppedIt: dropped, afterMs: Date.now() - leftAt, pass: dropped };
    if (dropped) {
      const again = await openPage(cdp, `${BASE}/phone.html?room=${room.code}&name=rejoin&bot=1`, PHONE_VIEW);
      const back = await waitFor(async () => (await room.host.eval('window.__spike.count()')) === 8, 'freed place to be taken', 15000).then(() => true, () => false);
      checks.phoneLeaves.placeReusable = back;
      checks.phoneLeaves.pass &&= back;
      room.phones.push(again);
      await sleep(1500);
      await room.host.shot('06-host-after-leave-and-rejoin.png');
    }
    await closeRoom(room);
  }

  // comparisons for the C-04 recommendation (shorter)
  const short = Math.max(5, Math.round(SECONDS / 2));
  for (const [name, query] of [['8-phone-30hz', 'bot=1&hz=30'], ['8-phone-60hz-eager', 'bot=1&hz=60&eager=1'], ['8-phone-30hz-eager', 'bot=1&hz=30&eager=1']]) {
    const { room, result } = await measure(cdp, name, 8, query, short);
    scenarios.push(result);
    await closeRoom(room);
  }

  // one phone driven by real touch events (pointer events on the stick), then released:
  // first sending on the 60 Hz tick only, then also straight away on each touch event
  for (const [name, query, shots] of [['1-phone-touch-60hz', 'hz=60&name=touch', true], ['1-phone-touch-60hz-eager', 'hz=60&eager=1&name=touch', false]]) {
    const room = await openRoom(cdp, 1, query);
    await sleep(4000);
    await room.host.eval('window.__spike.reset()');
    const seconds = Math.min(10, SECONDS);
    log(`${name}: real touch events for ${seconds} s`);
    const release = await touchDrive(cdp, room.phones[0], seconds);
    const held = await room.host.eval('window.__spike.snapshot()');
    if (shots) {
      await room.phones[0].shot('07-phone1-touch-held.png');
      await room.host.shot('08-host-touch-phone.png');
    }
    await release();
    await sleep(500);
    const after = await room.host.eval('window.__spike.snapshot()');
    // how long the browser took to hand each touch event to the page (part of the total)
    const lag = await room.phones[0].eval(`(() => { const s = Float64Array.from(window.__phone.handlerLag).sort(); const at = (p) => Math.round(s[Math.max(0, Math.ceil(p / 100 * s.length) - 1)] * 100) / 100; return { n: s.length, p50: at(50), p95: at(95), max: at(100) }; })()`);
    scenarios.push({ name, phoneCount: 1, phoneQuery: `${query} (touch events from the DevTools protocol)`, measuredSeconds: seconds, touchEventToHandlerMs: lag, ...held });
    const stick = after.phones[0].stick;
    const ok = stick.x === 0 && stick.y === 0 && after.phones[0].buttons === 0 && held.phones[0].total.n > 50;
    if (shots) checks.releaseArrives = { stickAfterRelease: stick, samplesWhileHeld: held.phones[0].total.n, pass: ok };
    log(`  touch→step p50 ${held.all.total.p50} p95 ${held.all.total.p95} p99 ${held.all.total.p99} ms (n=${held.all.total.n}); event→handler p50 ${lag.p50} p95 ${lag.p95} ms; stick after release ${JSON.stringify(stick)}`);
    await closeRoom(room);
  }

  const signal = await (await fetch(`http://127.0.0.1:${SIGNAL_PORT}/health`)).json();
  const eight = scenarios.find((s) => s.name === '8-phone-60hz');
  const worstP95 = Math.max(...scenarios.filter((s) => /-60hz$/.test(s.name)).map((s) => s.all.total.p95));
  const worstScenario = scenarios.filter((s) => /-60hz$/.test(s.name)).find((s) => s.all.total.p95 === worstP95)?.name;
  const results = {
    issue: 'S-01',
    takenAt: new Date().toISOString(),
    caveat: 'Emulated phones: headless Chrome pages on the same Mac as the host, over loopback. No radio, no router, no phone CPU. This is a best case and does not prove PERF-010 on real Wi-Fi.',
    machine: { cpu: cpus()[0]?.model, cores: cpus().length, memoryGb: Math.round(totalmem() / 2 ** 30), chrome: version.Browser, node: process.version },
    method: {
      delay: 'touch→step: host clock time of the 60 Hz simulation step that applies an input, minus the phone clock time of the touch event (scripted events for bots), mapped to the host clock by the ping/pong offset.',
      clock: 'ping/pong on the unreliable channel; offset = (t0 + t1)/2 − phone time; the sample with the lowest round trip of the last 16 is used.',
      channels: 'input: ordered=false, maxRetransmits=0. control: ordered, reliable.',
      iceServers: 'none (local addresses only; no external service contacted)',
      inputMessageBytes: 24,
    },
    budgets: {
      'PERF-010': { budget: 'direct, same Wi-Fi: p95 ≤ 50 ms', measuredWorstP95Ms: worstP95, worstScenario, measuredOn: 'loopback, emulated phones, every fixed-60 Hz scenario including the touch-driven one', within: worstP95 <= 50, proven: false, why: 'needs real phones on real Wi-Fi' },
      'PERF-011': { budget: 'relayed: p95 ≤ 120 ms', measured: null, proven: false, why: 'no relay run: needs TURN credentials and Randy (README)' },
    },
    allPathsDirect: scenarios.every((s) => s.phones.every((p) => p.path === 'direct')),
    eightPhoneBytesPerPhonePerSecond: eight?.phones.map((p) => p.bytes),
    scenarios,
    checks,
    signallingServer: signal.counters,
    pageErrors: cdp.pageErrors,
  };
  await writeFile(join(EVIDENCE, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  log(`wrote ${join(EVIDENCE, 'results.json')}`);
  log(`checks: ${JSON.stringify(checks)}`);
  if (cdp.pageErrors.length) log(`PAGE ERRORS: ${cdp.pageErrors.join(' | ')}`);
  await cdp.send('Browser.close').catch(() => {});
}

process.on('SIGINT', async () => { await shutdown(); process.exit(130); });
try {
  await main();
  await shutdown();
  process.exit(0);
} catch (e) {
  console.error('[run] FAILED:', e);
  await shutdown();
  process.exit(1);
}
