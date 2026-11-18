import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';

it('RZ-033 changes, saves and previews Effects inside the TV pause panel at both sizes', async () => {
  const source = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const fixture = source('./r07-dom-fixture.tsx');
  const bundle = await build({ configFile: false, build: { target: 'esnext', write: false, minify: false, lib: { entry: fixture, formats: ['es'], name: 'fixture' }, rolldownOptions: { output: { codeSplitting: false } } }, esbuild: { jsx: 'automatic', jsxImportSource: 'preact' }, plugins: [{
    name: 'pause-level-fixture',
    resolveId(id) { return id === fixture ? id : undefined; },
    load(id) {
      if (id !== fixture) return;
      return `import { render } from 'preact';
        import { PausePanel } from '${source('./pause-panel.tsx')}';
        import { hostSound } from '${source('./host-sound.ts')}';
        import { hostKeyboard, hostKeyboardControls } from '${source('./host-keyboard.ts')}';
        localStorage.setItem('kaki.sound.levels', JSON.stringify({ effects: 70, music: 55 }));
        const audio = hostSound();
        window.cues = 0;
        const play = audio.sound.play;
        audio.sound.play = (...args) => { window.cues++; play(...args); };
        const keyboard = hostKeyboard({ state: () => ({ phase: 'paused', teams: false }), controls: hostKeyboardControls, active: () => document.activeElement, join() {}, leave() {}, command() {} });
        window.addEventListener('keydown', keyboard.key);
        window.openPause = () => render(<PausePanel paused sound={audio.sound} resume={() => {}} quit={() => {}}/>, document.getElementById('app'));
        window.addEventListener('keydown', event => { if (event.key === 'Escape') window.openPause(); });
      `;
    },
  }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing fixture bundle');
  const chunk = output.output.find(item => item.type === 'chunk' && item.isEntry);
  if (chunk?.type !== 'chunk') throw new Error('Missing fixture code');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }]) {
      const page = await browser.newPage({ viewport });
      await page.route('http://localhost/', route => route.fulfill({ contentType: 'text/html', body: '<html><body><div id="app"></div></body></html>' }));
      await page.goto('http://localhost/');
      await page.addStyleTag({ content: await readFile(source('../../../packages/ui/tokens.css'), 'utf8') });
      await page.addStyleTag({ content: await readFile(source('./style.css'), 'utf8') });
      await page.evaluate(async () => {
        document.documentElement.style.setProperty('--screen-scale', String(Math.min(innerWidth / 1920, innerHeight / 1080)));
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => { resolve(); })));
      });
      await page.addScriptTag({ type: 'module', content: chunk.code });
      await page.waitForFunction(() => 'openPause' in window);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Resume', exact: true }).waitFor();
      await page.keyboard.press('ArrowDown');
      const effects = page.getByRole('slider', { name: 'Effects' });
      expect(await effects.evaluate(node => node === document.activeElement)).toBe(true);
      await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
      expect(await effects.getAttribute('aria-valuenow')).toBe('90');
      expect(await effects.locator('.pause-level-value').textContent()).toBe('90');
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kaki.sound.levels') ?? '{}') as unknown)).toEqual({ effects: 90, music: 55 });
      expect(await page.evaluate(() => Reflect.get(window, 'cues') as unknown)).toBe(2);
      // A game-pad d-pad uses this same bubbling keydown on the focused row.
      await effects.evaluate(node => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true, cancelable: true })));
      expect(await effects.getAttribute('aria-valuenow')).toBe('80');
      expect(await effects.evaluate(node => node === document.activeElement)).toBe(true);
      expect(await page.evaluate(() => Reflect.get(window, 'cues') as unknown)).toBe(3);
      await effects.evaluate(node => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true, repeat: true })));
      expect(await effects.getAttribute('aria-valuenow')).toBe('80');
      expect(await page.evaluate(() => Reflect.get(window, 'cues') as unknown)).toBe(3);
      await page.keyboard.press('ArrowDown');
      const music = page.getByRole('slider', { name: 'Music' });
      await page.keyboard.press('ArrowRight');
      expect(await music.getAttribute('aria-valuenow')).toBe('65');
      expect(await page.evaluate(() => Reflect.get(window, 'cues') as unknown)).toBe(3);
      await page.keyboard.press('ArrowUp');
      for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowRight');
      expect(await effects.getAttribute('aria-valuenow')).toBe('100');
      const upperSaved = await page.evaluate(() => localStorage.getItem('kaki.sound.levels'));
      await page.getByRole('button', { name: 'Raise effects' }).click();
      expect(await effects.getAttribute('aria-valuenow')).toBe('100');
      expect(await page.evaluate(() => localStorage.getItem('kaki.sound.levels'))).toBe(upperSaved);
      expect(await page.evaluate(() => Reflect.get(window, 'cues') as unknown)).toBe(5);
      for (let i = 0; i < 10; i++) await page.getByRole('button', { name: 'Lower effects' }).click();
      expect(await effects.getAttribute('aria-valuenow')).toBe('0');
      const lowerSaved = await page.evaluate(() => localStorage.getItem('kaki.sound.levels'));
      await page.getByRole('button', { name: 'Lower effects' }).click();
      expect(await effects.getAttribute('aria-valuenow')).toBe('0');
      expect(await page.evaluate(() => localStorage.getItem('kaki.sound.levels'))).toBe(lowerSaved);
      // The step that lands on 0 is silent (zero stays silent), so ten lowerings add nine cues.
      expect(await page.evaluate(() => Reflect.get(window, 'cues') as unknown)).toBe(14);
      expect(await effects.evaluate(node => node.classList.contains('ka-pressable'))).toBe(false);
      expect(await effects.locator('button').evaluateAll(nodes => nodes.every(node => node.matches('.ka-panel.ka-pressable')))).toBe(true);
      await page.waitForTimeout(300);
      expect(await page.locator('.host-pause section').evaluate(panel => {
        const p = panel.getBoundingClientRect(), margin = 55 * Math.min(innerWidth / 1920, innerHeight / 1080);
        return p.left >= margin && p.right <= innerWidth - margin && p.top >= margin && p.bottom <= innerHeight - margin && [...panel.querySelectorAll('.pause-level, button')].every(node => {
          const r = node.getBoundingClientRect(); return r.left >= p.left && r.right <= p.right && r.top >= p.top && r.bottom <= p.bottom;
        });
      })).toBe(true);
      await page.close();
    }
  } finally { await browser.close(); }
}, 30000);
