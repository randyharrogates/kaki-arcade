import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, expect } from 'vitest';
import type { Browser, Page } from 'playwright';
import { Harness } from './harness.js';

it('collects errors per page, scopes expectations, and persists failing steps without claiming review (NFR-TEST)', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'kaki-uat-unit-'));
  class FakePage extends EventEmitter { url() { return 'http://localhost'; } evaluate() { return Promise.resolve(); } isClosed() { return false; } screenshot({ path }: { path: string }) { return writeFile(path, 'screenshot'); } setDefaultTimeout() { /* No browser in this test. */ } setDefaultNavigationTimeout() { /* No browser in this test. */ } }
  const host = new FakePage(); const phone = new FakePage();
  const pages = [host, phone];
  const fakeBrowser = { newContext: () => Promise.resolve({ newPage: () => Promise.resolve(pages.shift()) }) } as unknown as Browser;
  const network = { stopSignal: () => Promise.resolve(), startSignal: () => Promise.resolve(), resetSignal: () => Promise.resolve() };
  try {
    const harness = new Harness(fakeBrowser, 'http://localhost', folder, 'F-07', 1, network);
    await harness.init(); await harness.newPhone();
    harness.maxBytes = 1; await expect(harness.assertSize()).rejects.toThrow('exceeds --max-mb');
    harness.maxBytes = 12 * 1024 * 1024;
    await harness.step('outage', async () => {
      await Promise.resolve();
      harness.expectError('deliberate outage', 'host', 'http://localhost:9001/rooms');
      host.emit('console', { type: () => 'error', text: () => 'deliberate outage', location: () => ({ url: 'http://localhost:9001/rooms' }) });
    });
    harness.maxBytes = 12 * 1024 * 1024;
    expect(() => { harness.assertNoUnexpectedErrors(); }).not.toThrow();
    host.emit('console', { type: () => 'log', text: () => 'ignored log', location: () => ({ url: '' }) });
    phone.emit('console', { type: () => 'error', text: () => 'deliberate outage', location: () => ({ url: '' }) });
    phone.emit('pageerror', new Error('render broke'));
    expect(harness.errors.map(e => [e.page, e.kind, e.expected])).toEqual([['host', 'console', true], ['phone1', 'console', false], ['phone1', 'pageerror', false]]);
    expect(() => { harness.assertNoUnexpectedErrors(); }).toThrow('render broke');
    await expect(harness.step('bad action', () => Promise.reject(new Error('failed action')))).rejects.toThrow('failed action');
    const run = JSON.parse(await readFile(join(folder, 'run.json'), 'utf8')) as { steps: { name: string; status: string; ms: number }[]; files: { file: string; bytes: number }[]; totalBytes: number };
    const actual = await Promise.all(run.files.map(async file => { const bytes = (await stat(join(folder, file.file))).size; expect(file.bytes).toBe(bytes); return bytes; }));
    expect(run.totalBytes).toBe(actual.reduce((a, b) => a + b, 0));
    expect(run.steps[1]).toMatchObject({ name: 'bad action', status: 'failed' });
    expect(run.steps[1]?.ms).toBeGreaterThanOrEqual(0);
    expect(await readFile(join(folder, 'REPORT.md'), 'utf8')).toContain('Visual review and acceptance decisions are pending');
  } finally { await rm(folder, { recursive: true, force: true }); }
});

it('uses separate browser contexts and landscape touch emulation for each phone (NFR-TEST)', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'kaki-uat-context-'));
  const contexts: unknown[] = [];
  const fakeBrowser = { newContext: (options: unknown) => { contexts.push(options); return Promise.resolve({ newPage: () => Promise.resolve({ evaluate: () => Promise.resolve(), setDefaultTimeout() { /* No browser in this test. */ }, setDefaultNavigationTimeout() { /* No browser in this test. */ }, on() { /* No browser events in this test. */ } } as unknown as Page) }); } } as unknown as Browser;
  const network = { stopSignal: () => Promise.resolve(), startSignal: () => Promise.resolve(), resetSignal: () => Promise.resolve() };
  try {
    const harness = new Harness(fakeBrowser, '', folder, 'F-07', 2, network); await harness.init();
    const first = await harness.newPhone(); const second = await harness.newPhone('portrait');
    expect(first).not.toBe(second); expect(contexts).toHaveLength(3);
    expect(contexts[1]).toMatchObject({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    expect(contexts[2]).toMatchObject({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  } finally { await rm(folder, { recursive: true, force: true }); }
});


it('bounds a never-resolving step and evaluation, captures every page, and persists the step name (NFR-TEST)', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'kaki-uat-timeout-'));
  const captured: string[] = [];
  const fakeBrowser = { newContext: () => Promise.resolve({ newPage: () => Promise.resolve({
    evaluate: () => new Promise(() => { /* Deliberately hung browser promise. */ }),
    isClosed: () => false,
    screenshot: async ({ path }: { path: string }) => { captured.push(path); await import('node:fs/promises').then(fs => fs.writeFile(path, 'screenshot')); },
    setDefaultTimeout() { /* Fake page. */ }, setDefaultNavigationTimeout() { /* Fake page. */ }, on() { /* Fake page. */ },
  }) }) } as unknown as Browser;
  const network = { stopSignal: () => Promise.resolve(), startSignal: () => Promise.resolve(), resetSignal: () => Promise.resolve() };
  try {
    const h = new Harness(fakeBrowser, '', folder, 'F-07', 1, network);
    await h.init(); await h.newPhone(); h.evaluateTimeoutMs = 10;
    await expect(h.host.evaluate(() => new Promise(() => { /* Never resolves. */ }))).rejects.toThrow('page.evaluate (setup) timed out');
    await expect(h.step('stuck seat', () => new Promise(() => { /* Never resolves. */ }), 10)).rejects.toThrow('Step "stuck seat" timed out');
    expect(captured).toHaveLength(2);
    const run = JSON.parse(await readFile(join(folder, 'run.json'), 'utf8')) as { steps: unknown[]; screenshots: string[] };
    expect(run.steps[0]).toMatchObject({ name: 'stuck seat', status: 'failed' });
    expect(run.screenshots).toHaveLength(2);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

it('expires step expectations and requires the page and location; records crashes and failed requests (NFR-TEST)', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'uat-errors-'));
  class FakePage extends EventEmitter {
    evaluate() { return Promise.resolve(); } isClosed() { return true; } url() { return 'http://localhost:8000/host'; }
    setDefaultTimeout() { /* Fake page. */ } setDefaultNavigationTimeout() { /* Fake page. */ }
  }
  const host = new FakePage(); const phone = new FakePage(); const pages = [host, phone];
  const browser = { newContext: () => Promise.resolve({ newPage: () => Promise.resolve(pages.shift()) }) } as unknown as Browser;
  const network = { stopSignal: () => Promise.resolve(), startSignal: () => Promise.resolve(), resetSignal: () => Promise.resolve() };
  const consoleError = (url: string) => ({ type: () => 'error', text: () => 'offline', location: () => ({ url }) });
  const failed = (url: string) => ({ url: () => url, failure: () => ({ errorText: 'offline' }) });
  try {
    const h = new Harness(browser, 'http://localhost:8000', folder, 'F-07', 1, network); h.signalOrigin = 'http://localhost:8001';
    await h.init(); await h.newPhone();
    await h.step('expected outage', async () => {
      h.expectSignalError('offline');
      host.emit('console', consoleError('http://localhost:8001/rooms'));
      host.emit('requestfailed', failed('http://localhost:8001/rooms'));
      await Promise.resolve();
    });
    await expect(h.step('later fault', async () => {
      h.expectSignalError('offline');
      phone.emit('requestfailed', failed('http://localhost:8001/rooms'));
      host.emit('requestfailed', failed('http://localhost:8000/asset'));
      host.emit('console', consoleError('http://localhost:8000/404'));
      await Promise.resolve();
    })).rejects.toThrow('Unexpected browser errors');
    host.emit('console', consoleError('http://localhost:8001/rooms'));
    host.emit('crash');
    expect(h.errors.map(e => e.expected)).toEqual([true, true, false, false, false, false, false]);
    expect(h.errors.at(-1)?.kind).toBe('crash');
  } finally { await rm(folder, { recursive: true, force: true }); }
});

it('checks each capture against the cap and retains strip frames only on request (NFR-TEST)', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'uat-captures-'));
  const sources: string[] = [];
  const image = Buffer.from([255, 216, 255, 217]);
  const page = {
    evaluate: (_action: unknown, data?: { sources: string[] }) => { if (!data) return Promise.resolve(undefined); sources.push(...data.sources); return Promise.resolve(image.toString('base64')); },
    viewportSize: () => ({ width: 390, height: 844 }),
    screenshot: ({ path }: { path: string }) => writeFile(path, image),
    setDefaultTimeout() { /* Fake page. */ }, setDefaultNavigationTimeout() { /* Fake page. */ }, on() { /* Fake page. */ },
  };
  const browser = { newContext: () => Promise.resolve({ newPage: () => Promise.resolve(page), close: () => Promise.resolve() }) } as unknown as Browser;
  const network = { stopSignal: () => Promise.resolve(), startSignal: () => Promise.resolve(), resetSignal: () => Promise.resolve() };
  try {
    const h = new Harness(browser, '', folder, 'F-07', 1, network); await h.init();
    const sheet = await h.frameStrip('compact', h.host, { frames: 2, everyMs: 0 });
    expect(sheet.endsWith('.jpg')).toBe(true); expect(h.screenshots).toEqual([sheet]);
    expect(sources.every(source => source.startsWith('data:image/jpeg;base64,'))).toBe(true);
    const fs = await import('node:fs/promises');
    expect((await fs.readdir(folder)).filter(file => file.includes('frame'))).toEqual([]);
    h.keepFrames = true; await h.frameStrip('retained', h.host, { frames: 2, everyMs: 0 });
    expect((await fs.readdir(folder)).filter(file => file.includes('frame'))).toHaveLength(2);
    h.keepFrames = false; h.maxBytes = 1;
    await expect(h.frameStrip('oversize-strip', h.host, { frames: 2, everyMs: 0 })).rejects.toThrow('exceeds --max-mb');
    expect((await fs.readdir(folder)).filter(file => file.includes('oversize-strip'))).toEqual([]);
    await expect(h.shot('oversize')).rejects.toThrow('exceeds --max-mb');
    await expect(h.assertSize('failed', new Error('capture failed'))).rejects.toThrow('exceeds --max-mb');
    expect(JSON.parse(await readFile(join(folder, 'run.json'), 'utf8')) as unknown).toMatchObject({ status: 'failed', error: expect.stringContaining('capture failed') as unknown });
  } finally { await rm(folder, { recursive: true, force: true }); }
});

it('matches a pairing address named in console text but rejects an APP address (NFR-TEST)', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'uat-named-origin-'));
  class FakePage extends EventEmitter {
    evaluate() { return Promise.resolve(); } isClosed() { return true; }
    setDefaultTimeout() { /* Fake page. */ } setDefaultNavigationTimeout() { /* Fake page. */ }
  }
  const host = new FakePage();
  const browser = { newContext: () => Promise.resolve({ newPage: () => Promise.resolve(host) }) } as unknown as Browser;
  const network = { stopSignal: () => Promise.resolve(), startSignal: () => Promise.resolve(), resetSignal: () => Promise.resolve() };
  try {
    const h = new Harness(browser, 'http://localhost:8000', folder, 'F-07', 1, network);
    h.signalOrigin = 'http://localhost:8001'; await h.init();
    const emit = (address: string) => host.emit('console', { type: () => 'error', text: () => `WebSocket connection to '${address}' failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED`, location: () => ({ url: 'http://localhost:8000/src/browser.ts' }) });
    await h.step('pairing named in message', async () => {
      h.expectSignalError(/^WebSocket connection to .* failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED$/);
      emit('ws://localhost:8001/rooms/TEST/host'); await Promise.resolve();
    });
    await expect(h.step('APP named in message', async () => {
      h.expectSignalError(/^WebSocket connection to .* failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED$/);
      emit('ws://localhost:8000/rooms/TEST/host'); await Promise.resolve();
    })).rejects.toThrow('Unexpected browser errors');
    expect(h.errors.map(e => e.expected)).toEqual([true, false]);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

it('records unsettled shots, fails their step, and permits explicit opt-in (NFR-TEST)', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'uat-unsettled-'));
  const page = {
    evaluate: () => Promise.resolve(true), viewportSize: () => ({ width: 100, height: 100 }), isClosed: () => true,
    screenshot: ({ path }: { path: string }) => writeFile(path, 'image'),
    on() { /* Fake page. */ }, setDefaultTimeout() { /* Fake page. */ }, setDefaultNavigationTimeout() { /* Fake page. */ },
  };
  const browser = { newContext: () => Promise.resolve({ newPage: () => Promise.resolve(page) }) } as unknown as Browser;
  const network = { stopSignal: () => Promise.resolve(), startSignal: () => Promise.resolve(), resetSignal: () => Promise.resolve() };
  try {
    const h = new Harness(browser, '', folder, 'F-07', 1, network); await h.init();
    await expect(h.step('unsettled still', async () => { await h.shot('moving'); })).rejects.toThrow('unsettled after 3000 ms');
    expect(await h.shot('allowed', h.host, undefined, true, true)).toMatchObject({ unsettled: true });
    const run = JSON.parse(await readFile(join(folder, 'run.json'), 'utf8')) as { shotStates: { unsettled: boolean }[] };
    expect(run.shotStates).toHaveLength(2); expect(run.shotStates.every(s => s.unsettled)).toBe(true);
    expect(await readFile(join(folder, 'REPORT.md'), 'utf8')).toContain('UNSETTLED');
  } finally { await rm(folder, { recursive: true, force: true }); }
});
