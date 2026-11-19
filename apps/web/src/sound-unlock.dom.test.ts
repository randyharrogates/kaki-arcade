import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';

it('RZ-033 / TR-063 landing unlocks synchronously without reload and blocked rows follow state', async () => {
  const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));
  const fixture = source('./sound-unlock-fixture.tsx');
  const built = await build({ configFile: false, plugins: [preact(), {
    name: 'sound-unlock-fixture', resolveId: id => id === fixture ? id : undefined,
    load: id => id === fixture ? `import { render } from 'preact';
      import { Landing } from '${source('./landing-route.tsx')}';
      import { SoundHint } from '${source('./sound-hint.tsx')}';
      import { PausePanel } from '${source('./pause-panel.tsx')}';
      let running = false; const listeners = new Set();
      const sound = { running: () => running, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); }, getLevel: () => 100, setLevel() {}, play() {} };
      window.showBlocked = () => render(<><p class="host-hints"><SoundHint sound={sound}><span>J: join from this keyboard</span></SoundHint></p><PausePanel paused sound={sound} resume={() => {}} quit={() => {}}/></>, document.getElementById('app'));
      window.block = () => { running = false; listeners.forEach(fn => fn()); };
      window.unlock = () => { running = true; listeners.forEach(fn => fn()); };
      render(<Landing/>, document.getElementById('app'));
      document.addEventListener('click', event => { window.intercepted = event.defaultPrevented; event.preventDefault(); });
      window.addEventListener('popstate', () => { window.navigated = location.pathname; });` : undefined,
  }], build: { write: false, target: 'esnext', minify: false, lib: { entry: fixture, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } } });
  const output = Array.isArray(built) ? built[0] : built;
  if (!output || !('output' in output)) throw new Error('Missing fixture');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing fixture code');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1920, height: 1080 } });
    await page.route('http://localhost/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="app"></div>' }));
    await page.goto('http://localhost/');
    await page.evaluate(() => {
      Reflect.set(window, 'AudioContext', class extends EventTarget {
        state = 'suspended'; currentTime = 0; destination = {};
        createGain() { return { gain: { value: 1 }, connect() { /* Fake graph. */ } }; }
        createDynamicsCompressor() { return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() { /* Fake graph. */ } }; }
        resume() { document.body.dataset.resumePath = location.pathname; this.state = 'running'; this.dispatchEvent(new Event('statechange')); return Promise.resolve(); }
        close() { return Promise.resolve(); }
      });
    });
    await page.addStyleTag({ content: await readFile(source('../../../packages/ui/tokens.css'), 'utf8') });
    await page.addStyleTag({ content: await readFile(source('./style.css'), 'utf8') });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    const link = page.getByRole('link', { name: 'Host a game', exact: true });
    await link.waitFor();
    for (const extra of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      expect(await link.evaluate((node, init) => { node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init })); return Reflect.get(window, 'intercepted') as boolean; }, extra)).toBe(false);
      expect(new URL(page.url()).pathname).toBe('/');
    }
    for (const activation of ['click', 'Enter', 'Space']) {
      await page.evaluate(() => { history.replaceState(null, '', '/'); });
      await link.focus();
      if (activation === 'click') await link.click(); else await page.keyboard.press(activation);
      expect(new URL(page.url()).pathname).toBe('/host');
      expect(await page.evaluate(() => Reflect.get(window, 'navigated') as unknown)).toBe('/host');
      expect(await link.count()).toBe(1); // Same mounted document survived.
    }
    expect(await page.locator('body').getAttribute('data-resume-path')).toBe('/');
    await page.evaluate(() => { (Reflect.get(window, 'showBlocked') as () => void)(); });
    await expect.poll(() => page.locator('.host-hints').textContent()).toBe('Click or press a key on this screen to turn on sound');
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => { (Reflect.get(window, 'block') as () => void)(); });
      await expect.poll(() => page.locator('.pause-level-value').allTextContents()).toEqual(['', '']);
      const rects = () => page.locator('.host-pause section, .host-pause button').evaluateAll(nodes => nodes.map(node => { const { x, y, width, height } = node.getBoundingClientRect(); return { x, y, width, height }; }));
      const blocked = await rects();
      expect(blocked).toHaveLength(7); // Panel, Resume, four level buttons, Quit.
      expect(await page.getByRole('slider', { name: 'Effects' }).getAttribute('aria-valuetext')).toBe('Sound is off');
      expect(await page.locator('.pause-level-off').first().evaluate(node => getComputedStyle(node).fontFamily)).toContain('DM Sans');
      await page.evaluate(() => { (Reflect.get(window, 'unlock') as () => void)(); });
      await expect.poll(() => page.locator('.pause-level-value').allTextContents()).toEqual(['100', '100']);
      expect(await rects()).toEqual(blocked);
      expect(await page.getByRole('slider', { name: 'Effects' }).getAttribute('aria-valuetext')).toBeNull();
      expect(await page.locator('.pause-level-value').evaluateAll(nodes => nodes.every(node => {
        const text = node.firstElementChild?.getBoundingClientRect();
        const column = node.getBoundingClientRect();
        return node.scrollWidth <= node.clientWidth && text && text.left >= column.left && text.right <= column.right && text.top >= column.top && text.bottom <= column.bottom;
      }))).toBe(true);
    }
    await expect.poll(() => page.locator('.host-hints').textContent()).toBe('J: join from this keyboard');
  } finally { await browser.close(); }
}, 30000);
