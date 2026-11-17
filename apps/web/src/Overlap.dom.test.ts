import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import { readFile } from 'node:fs/promises';

it('NN-5 keeps a mounted screen when its keyed layer becomes outgoing', async () => {
  const fixture = fileURLToPath(new URL('./c16-dom-fixture.tsx', import.meta.url));
  const bundle = await build({ configFile: false, build: { target: 'esnext', write: false, minify: false, lib: { entry: fixture, formats: ['es'], name: 'fixture' } }, esbuild: { jsx: 'automatic', jsxImportSource: 'preact' }, plugins: [{
    name: 'overlap-dom-fixture',
    resolveId(id) { return id === fixture ? id : undefined; },
    load(id) {
      if (id !== fixture) return;
      return `import { render } from 'preact';
        import { useLayoutEffect } from 'preact/hooks';
        import { Overlap } from '${fileURLToPath(new URL('./Overlap.tsx', import.meta.url))}';
        let mounts = 0;
        function Screen() { useLayoutEffect(() => { mounts++; }, []); return <div class="rz-viewport">Plum screen</div>; }
        const root = document.createElement('div'); document.body.append(root);
        render(<Overlap fade surface identity="game"><Screen/></Overlap>, root);
        render(<Overlap fade surface identity="results"><main>Results</main></Overlap>, root);
        await new Promise(resolve => setTimeout(resolve, 20));
        const probe = document.createElement('div'); probe.className = 'ka-surface'; document.body.append(probe);
        window.overlapResult = { mounts, outgoing: !!root.querySelector('.outgoing .rz-viewport'), keyframes: root.querySelector('.outgoing').getAnimations()[0].effect.getKeyframes().map(frame => frame.opacity), opacity: getComputedStyle(root.querySelector('.outgoing')).opacity, opaque: getComputedStyle(root.querySelector('.incoming')).backgroundColor === getComputedStyle(probe).backgroundColor && !getComputedStyle(probe).backgroundColor.includes('rgba'), treated: getComputedStyle(root.querySelector('.incoming')).backgroundImage !== 'none' };
      `;
    },
  }] });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const output = Array.isArray(bundle) ? bundle[0] : bundle;
    if (!output || !('output' in output)) throw new Error('Missing fixture bundle');
    const chunk = output.output.find(item => item.type === 'chunk');
    if (!chunk) throw new Error('Missing fixture code');
    await page.addStyleTag({ content: await readFile(fileURLToPath(new URL('../../../packages/ui/tokens.css', import.meta.url)), 'utf8') });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    await page.waitForFunction(() => 'overlapResult' in window);
    expect(await page.evaluate(() => Reflect.get(window, 'overlapResult') as unknown)).toEqual({ mounts: 1, outgoing: true, keyframes: ['1', '1'], opacity: '1', opaque: true, treated: true });
  } finally { await browser.close(); }
}, 30000);
