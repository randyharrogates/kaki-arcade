import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';
it('CTRL-004 the same landscape tap requests fullscreen and outputs one control press', async () => {
  const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
  const entry = path('./fullscreen-dom.fixture.ts');
  const result = await build({ configFile: false, build: { write: false, lib: { entry, formats: ['es'] } }, plugins: [{
    name: 'fullscreen-dom', resolveId: id => id === entry ? id : undefined,
    load: id => id === entry ? `
      import {installPhoneFullscreen} from '${path('./phone-fullscreen.ts')}';
      import {bindControlEvents} from '${path('../../../packages/controller-kit/src/button-input.ts')}';
      installPhoneFullscreen(document,window,()=>true,'/play');
      const button=document.querySelector('button');
      bindControlEvents(button,window,document,{hit:()=> 'test',onPress:()=>{button.dataset.outputs=String(Number(button.dataset.outputs)+1)},onRelease:()=>{}});
      button.dataset.ready='true';
    ` : undefined,
  }] });
  const output = Array.isArray(result) ? result[0] : result;
  if (!output || !('output' in output)) throw Error('bundle');
  const chunk = output.output.find(item => item.type === 'chunk'); if (!chunk) throw Error('chunk');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
    await page.setContent('<button data-outputs="0">Press</button>');
    // Stub only the optional API: exercise trusted pointer routing in the real browser.
    await page.evaluate(() => {
      Object.defineProperty(document, 'fullscreenEnabled', { value: true });
      document.documentElement.requestFullscreen = () => { document.documentElement.dataset.requests = String(Number(document.documentElement.dataset.requests ?? 0) + 1); return Promise.resolve(); };
    });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    await page.waitForFunction(() => document.querySelector('button')?.dataset.ready === 'true');
    await page.getByRole('button').tap();
    expect(await page.locator('html').getAttribute('data-requests')).toBe('1');
    expect(await page.getByRole('button').getAttribute('data-outputs')).toBe('1');
  } finally { await browser.close(); }
}, 30000);
