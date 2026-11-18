/// <reference lib="dom" />

import { mkdir, writeFile, readFile, stat, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import type { Browser, Page, BrowserContext } from 'playwright';
import { deadline, errorMessage, evidenceName, hostPresets, phonePresets, matchesError, reportSkeleton, safeName } from './core.js';
import type { ErrorRecord } from './core.js';
import { thumbs } from './thumb.js';

export class Harness {
  host!: Page;
  phones: Page[] = [];
  code = '';
  maxBytes = 12 * 1024 * 1024;
  command = '';
  commit = '';
  readonly viewports = new Set<string>();
  private joinUrl = '';
  readonly errors: ErrorRecord[] = [];
  readonly steps: { name: string; ms: number; status: string; error?: string }[] = [];
  readonly joins: { name: string; ms: number }[] = [];
  readonly screenshots: string[] = [];
  private expected: { pattern: string | RegExp; page: string; url?: string | RegExp }[] = [];
  keepFrames = false;
  signalOrigin = '';
  private rejectStep: ((error: Error) => void) | undefined;
  private labels = new Map<Page, string>();
  private hostStorage: Record<string, string> = {};
  private hostUrl = '';
  private motion = false;
  private sequence = 0;
  activeStep: string | undefined;
  evaluateTimeoutMs = 15000;
  private aborted = false;
  private stepStart = 0;
  private isAborted() { return this.aborted; }
  abort(error: Error) {
    this.aborted = true; this.rejectStep?.(error);
    if (this.activeStep) this.steps.push({ name: this.activeStep, ms: performance.now() - this.stepStart, status: 'failed', error: errorMessage(error) });
  }
  private hostContext!: BrowserContext;
  readonly browser: Browser;
  readonly origin: string;
  readonly evidence: string;
  readonly slice: string;
  readonly maxPhones: number;
  readonly network: { stopSignal(): Promise<void>; startSignal(): Promise<void>; resetSignal(): Promise<void> };
  constructor(browser: Browser, origin: string, evidence: string, slice: string, maxPhones: number,
    network: { stopSignal(): Promise<void>; startSignal(): Promise<void>; resetSignal(): Promise<void> }) {
    this.browser = browser; this.origin = origin; this.evidence = evidence; this.slice = slice; this.maxPhones = maxPhones; this.network = network;
  }

  async init() {
    await mkdir(this.evidence, { recursive: true });
    this.hostContext = await this.browser.newContext({ viewport: hostPresets['1080p'], deviceScaleFactor: 1 });
    this.host = await this.hostContext.newPage(); this.observe(this.host, 'host');
  }
  private observe(page: Page, label: string) {
    this.boundEvaluations(page);
    page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000); this.labels.set(page, label);
    const record = (kind: ErrorRecord['kind'], text: string, url = '') => {
      const favicon404 = kind === 'console' && url === new URL('/favicon.ico', this.origin).href &&
        text === 'Failed to load resource: the server responded with a status of 404 (Not Found)';
      this.errors.push({ page: label, kind, text, url, expected: favicon404 || kind !== 'crash' && !(kind === 'requestfailed' && new URL(url).origin === this.origin) && this.expected.some(e => { const where = e.url; return e.page === label && matchesError(text, e.pattern) && (!where || matchesError(url, where) || (text.match(/(?:https?|wss?):\/\/[^\s'"]+/g) ?? []).some(named => matchesError(named, where))); }) });
    };
    page.on('console', message => { if (message.type() === 'error') record('console', message.text(), message.location().url); });
    page.on('crash', () => { record('crash', 'Page crashed', page.url()); this.rejectStep?.(new Error(`${label} crashed`)); });
    page.on('requestfailed', request => { const url = request.url(); if ([this.origin, this.signalOrigin].includes(new URL(url).origin)) record('requestfailed', request.failure()?.errorText ?? 'Request failed', url); });
    page.on('pageerror', error => { record('pageerror', error.message, page.url()); });
  }
  /** Register before the action; match exact strings or narrowly scoped patterns. */
  expectError(pattern: string | RegExp, page: string, url?: string | RegExp) {
    if (!this.activeStep) throw new Error('Expected errors must be registered inside a step');
    this.expected.push({ pattern, page, ...(url ? { url } : {}) });
  }
  expectSignalError(pattern: string | RegExp, page = 'host') {
    this.expectError(pattern, page, new RegExp('^' + this.signalOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/^http/, '(?:https?|wss?)') + '(?:/|$)'));
  }
  private boundEvaluations(page: Page) {
    const evaluate = page.evaluate.bind(page);
    page.evaluate = ((...args: Parameters<Page['evaluate']>) =>
      deadline(evaluate(...args), this.evaluateTimeoutMs, `page.evaluate (${this.activeStep ?? 'setup'})`)) as Page['evaluate'];
  }
  async failureShots() {
    await Promise.allSettled([...this.labels].filter(([page]) => !page.isClosed()).map(async ([page, label]) => {
      const file = evidenceName(++this.sequence, label, 'failure');
      await deadline(page.screenshot({ path: join(this.evidence, file), timeout: 5000 }), 6000, 'Failure screenshot');
      this.screenshots.push(file); await this.assertSize();
    }));
  }
  async step<T>(name: string, action: () => Promise<T>, timeoutMs = 60000): Promise<T> {
    if (this.aborted) throw new Error('UAT run already aborted');
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Step timeout must be positive');
    const start = performance.now(); this.stepStart = start; this.activeStep = name;
    try { const result = await deadline(Promise.race([Promise.resolve().then(action), new Promise<never>((_, reject) => { this.rejectStep = reject; })]), timeoutMs, `Step "${name}"`); this.assertNoUnexpectedErrors(); if (!this.isAborted()) this.steps.push({ name, ms: performance.now() - start, status: 'completed' }); return result; }
    catch (error) { if (!this.isAborted()) this.steps.push({ name, ms: performance.now() - start, status: 'failed', error: errorMessage(error) }); if (!this.isAborted()) await this.failureShots(); throw error; }
    finally { this.expected = []; this.rejectStep = undefined; this.activeStep = undefined; if (!this.isAborted()) await this.assertSize(this.steps.at(-1)?.status === 'failed' ? 'failed' : 'running'); }
  }
  async createRoom() {
    return this.step('Create room through host page', async () => {
      await this.host.goto(`${this.origin}/host`);
      const code = this.host.getByLabel(/^Room code /);
      await code.waitFor();
      this.code = (await code.getAttribute('aria-label') ?? '').replace(/^Room code /, '').replace(/\s/g, '');
      if (!/^[A-Z0-9]{8}$/.test(this.code)) throw new Error('Host did not expose an eight-character room code');
      const qrLabel = await this.host.getByRole('img', { name: /^Join at / }).getAttribute('aria-label');
      this.joinUrl = /^Join at (.+)\. Room code /.exec(qrLabel ?? '')?.[1] ?? '';
      const joinLink = new URL(this.joinUrl);
      if (joinLink.origin !== this.origin || joinLink.pathname !== '/play' || joinLink.searchParams.get('code') !== this.code) throw new Error('Host QR join link does not match the local room');
      return this.code;
    });
  }
  async newPhone(preset: keyof typeof phonePresets = 'landscape') {
    // Allow one overflow phone for the room-full test, also in an isolated context.
    if (this.phones.length >= this.maxPhones + 1) throw new Error('Phone context limit reached');
    const context = await this.browser.newContext({ viewport: phonePresets[preset], hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1', deviceScaleFactor: 3, reducedMotion: this.motion ? 'reduce' : 'no-preference' });
    const page = await context.newPage(); this.phones.push(page); this.observe(page, `phone${String(this.phones.length)}`); return page;
  }
  async joinPhone(name: string) {
    if (this.phones.length >= this.maxPhones) throw new Error('--phones limit exceeded');
    return this.step(`Join ${name}`, async () => {
      const page = await this.newPhone();
      await this.openJoin(page, name);
      const start = performance.now(); await page.getByRole('button', { name: /^Join$/ }).click();
      await this.waitSeated(page, name);
      const ms = performance.now() - start; this.joins.push({ name, ms }); return { page, ms };
    });
  }
  async openJoin(page: Page, name: string) {
    if (!this.joinUrl) throw new Error('Create a room before joining');
    await page.goto(this.joinUrl);
    await page.locator('input[name="nickname"]').fill(name);
    const input = page.locator('input[name="code"]'); if (await input.count() && await input.isVisible()) await input.fill(this.code);
  }
  async waitSeated(page: Page, name: string, timeout?: number) {
    // A host seat alone cannot prove that the phone received its acknowledgement.
    await page.getByRole('heading', { name: /You.re in/ }).waitFor(timeout === undefined ? undefined : { timeout });
    await this.hostSeat(name).waitFor(timeout === undefined ? undefined : { timeout });
  }
  hostSeatContent() { return this.host.getByRole('list', { name: 'Player seats' }).locator('[data-held]:not([aria-hidden="true"]):not([aria-hidden="true"] *)'); }
  hostSeat(name: string) {
    const text = name.replace(/\s/g, '').split('').map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
    return this.hostSeatContent().filter({ has: this.host.locator('.nickname').filter({ hasText: new RegExp('^\\s*' + text + '\\s*$') }) });
  }
  hostText() { return this.host.locator('body').innerText(); }
  phoneText(page: Page | undefined = this.phones[0]) { if (!page) throw new Error('No phone'); return page.locator('body').innerText(); }
  thumbs(page: Page) { return thumbs(page); }
  readonly shotStates: { file: string; unsettled: boolean }[] = [];
  async shot(name: string, target: Page = this.host, clip?: { x: number; y: number; width: number; height: number }, settle = true, allowUnsettled = false) {
    // A still is taken once the page's transitions have ended, so it shows the state its name claims; strips pass settle = false.
    const unsettled = settle ? await deadline(target.evaluate(async () => {
      // A transition starts a frame or two after the change that causes it, so look again until two looks in a row find nothing running.
      const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
      const end = performance.now() + 3000; let quiet = 0;
      while (quiet < 2 && performance.now() < end) {
        await frame(); await frame();
        const running = document.getAnimations().filter(a => a.playState === 'running' || a.pending);
        if (running.length === 0) quiet += 1;
        else { quiet = 0; await Promise.race([Promise.all(running.map(a => a.finished.catch(() => undefined))), new Promise(resolve => setTimeout(resolve, Math.max(0, end - performance.now())))]); }
      }
      return quiet < 2;
    }), 5000, 'Settling before a screenshot') : false;
    const viewport = target.viewportSize(); if (viewport) this.viewports.add(`${String(viewport.width)}×${String(viewport.height)}`);
    // Preserve lossless 4K reference captures; compact the remaining evidence for git.
    const lossless = !clip && viewport?.width === hostPresets['4K'].width;
    const file = evidenceName(++this.sequence, this.labels.get(target) ?? 'page', name).replace(/\.png$/, lossless ? '.png' : '.jpg');
    await target.screenshot({ path: join(this.evidence, file), ...(lossless ? { type: 'png' as const } : { type: 'jpeg' as const, quality: 90 }), ...(clip ? { clip } : {}) });
    this.screenshots.push(file); this.shotStates.push({ file, unsettled }); await this.assertSize();
    if (unsettled && !allowUnsettled) throw new Error(`Screenshot ${file} unsettled after 3000 ms`);
    return { file, unsettled };
  }
  async frameStrip(name: string, target: Page = this.host, { frames = 6, everyMs = 100, clip, checkFrame }: { checkFrame?: (index: number) => Promise<void>; frames?: number; everyMs?: number; clip?: { x: number; y: number; width: number; height: number } } = {}) {
    if (!Number.isInteger(frames) || frames < 2 || frames > 12 || everyMs < 0) throw new Error('Invalid frame strip');
    safeName(name); const images: string[] = []; const times: number[] = []; const start = performance.now();
    const background = await target.evaluate(() => getComputedStyle(document.body).backgroundColor);
    for (let i = 0; i < frames; i++) {
      await delay(Math.max(0, start + i * everyMs - performance.now()));
      await checkFrame?.(i);
      times.push(Math.round(performance.now() - start));
      const captureStart = this.screenshots.length;
      try {
        const { file } = await this.shot(`${name}-frame${String(i + 1).padStart(2, '0')}`, target, clip, false);
        images.push(`data:image/${file.endsWith('.png') ? 'png' : 'jpeg'};base64,${(await readFile(join(this.evidence, file))).toString('base64')}`);
      } finally {
        // Also discard a frame when the post-capture byte check rejects it.
        if (!this.keepFrames) for (const file of this.screenshots.splice(captureStart)) await rm(join(this.evidence, file), { force: true });
      }
    }
    // A separate page avoids disturbing or injecting anything into the app under test.
    const context = await this.browser.newContext(); const page = await context.newPage(); this.boundEvaluations(page);
    try {
      const data = await page.evaluate(async ({ sources, times, background }) => {
        const decoded = await Promise.all(sources.map(async source => { const image = new Image(); image.src = source; await image.decode(); return image; }));
        const first = decoded[0]; if (!first) throw new Error('No frames');
        // Keep captured pixels intact; choose fewer columns for wider frames.
        const columns = Math.max(1, Math.min(3, decoded.length, Math.floor(1920 / first.width)));
        const width = first.width; const height = first.height;
        const canvas = document.createElement('canvas'); canvas.width = width * columns; canvas.height = (height + 28) * Math.ceil(decoded.length / columns);
        const context = canvas.getContext('2d'); if (!context) throw new Error('No canvas context');
        context.fillStyle = background || 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
        decoded.forEach((image, i) => { const x = (i % columns) * width; const y = Math.floor(i / columns) * (height + 28);
          context.drawImage(image, x, y, width, height);
          context.fillStyle = 'white'; context.fillRect(x, y + height, width, 28);
          context.fillStyle = 'black'; context.font = '18px sans-serif'; context.fillText(String(times[i]) + ' ms', x + 8, y + height + 21); }); return canvas.toDataURL('image/jpeg', 0.9).split(',')[1] ?? '';
      }, { sources: images, times, background });
      const file = evidenceName(++this.sequence, 'strip', name).replace(/\.png$/, '.jpg'); await writeFile(join(this.evidence, file), Buffer.from(data, 'base64'));
      this.screenshots.push(file); await this.assertSize(); return file;
    } finally { await context.close(); }
  }
  async reducedMotion(on: boolean) { this.motion = on; await Promise.all([this.host, ...this.phones].filter(p => !p.isClosed()).map(p => p.emulateMedia({ reducedMotion: on ? 'reduce' : 'no-preference' }))); }
  async slowMotion(factor: number, path = '/host?demo=0&change=join') {
    if (!Number.isFinite(factor) || factor < 1) throw new Error('Invalid slow motion factor');
    const url = new URL(path, this.origin); url.searchParams.set('slow', String(factor)); await this.host.goto(url.href);
  }
  async closeHost() {
    this.hostUrl = this.host.url();
    this.hostStorage = await this.host.evaluate(() => Object.fromEntries(Object.entries(sessionStorage)));
    await this.host.close();
  }
  async reopenHost() {
    this.host = await this.hostContext.newPage(); this.observe(this.host, 'host');
    // New tabs have new sessionStorage. Restore the captured closed-tab storage before app code.
    await this.host.goto(this.origin);
    await this.host.evaluate(storage => { for (const [key, value] of Object.entries(storage)) sessionStorage.setItem(key, value); }, this.hostStorage);
    await this.host.goto(this.hostUrl || `${this.origin}/host`);
    return this.host;
  }
  reloadPhone(page: Page) { return page.reload(); }
  async fileSizes() {
    const names = (await readdir(this.evidence, { withFileTypes: true })).filter(file => file.isFile() && file.name !== 'run.json').map(file => file.name);
    const files = await Promise.all(names.map(async file => ({ file, bytes: await stat(join(this.evidence, file)).then(s => s.size).catch(() => 0) })));
    return files;
  }
  async assertSize(status = 'running', error?: unknown) {
    await this.save(status, error);
    const files = await this.fileSizes();
    const total = files.reduce((n, f) => n + f.bytes, 0) + (await stat(join(this.evidence, 'run.json'))).size;
    if (total > this.maxBytes) throw new Error(`Evidence size ${(total / 1048576).toFixed(2)} MB exceeds --max-mb ${String(this.maxBytes / 1048576)}; reduce captures or raise --max-mb`);
  }
  async save(status = 'running', error?: unknown) {
    const meta = { command: this.command, commit: this.commit, viewports: [...this.viewports], steps: this.steps, joins: this.joins, errors: this.errors, shotStates: this.shotStates };
    await writeFile(join(this.evidence, 'REPORT.md'), reportSkeleton(this.slice, this.screenshots, meta));
    const files = await this.fileSizes();
    const manifest = { slice: this.slice, status, ...(error ? { error: errorMessage(error) } : {}), ...meta, screenshots: this.screenshots, files, totalBytes: 0, maxBytes: this.maxBytes };
    files.push({ file: 'run.json', bytes: 0 });
    for (let i = 0; i < 5; i++) {
      const own = files.at(-1); if (own) own.bytes = Buffer.byteLength(JSON.stringify(manifest, null, 2) + '\n');
      manifest.totalBytes = files.reduce((n, f) => n + f.bytes, 0);
    }
    await writeFile(join(this.evidence, 'run.json'), JSON.stringify(manifest, null, 2) + '\n');
  }
  assertNoUnexpectedErrors() { const errors = this.errors.filter(e => !e.expected); if (errors.length) throw new Error(`Unexpected browser errors: ${JSON.stringify(errors)}`); }
}
