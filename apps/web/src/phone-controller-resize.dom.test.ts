import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { build } from 'vite';
import { rabakzBank } from '@kaki/content-rabakz/vite';
import { expect, it } from 'vitest';

it('TR-020 resizes the mounted controller from 844 × 390 to 932 × 430 with clear rings', async () => {
  const path = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const entry = path('./phone-controller-resize-fixture.ts');
  const bundle = await build({ configFile: false, esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
    build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] }, rolldownOptions: { output: { inlineDynamicImports: true } } }, plugins: [rabakzBank(), {
      name: 'phone-controller-resize', resolveId(id) { if (id === entry) return id; return undefined; },
      load(id) { if (id !== entry) return; return `
        import {h,render} from 'preact';
        import {GameController} from '${path('./phone-route.tsx')}';
        import {phoneView} from '${path('./phone.ts')}';
        const stale=document.createElement('div');stale.className='ka-controller-play';
        stale.style.cssText='position:absolute;width:844px;height:322px';document.body.append(stale);
        const app=document.createElement('div');document.body.append(app);
        const controls=[{kind:'stick',id:'move'},...['bottom','right','left','top'].map((face,i)=>({kind:'button',id:['cross','circle','square','triangle'][i],button:'face-'+face,label:['Pick up','Act','Dash','Throw'][i]}))];
        const view={...phoneView('lobby',{seat:1,leader:true,phase:'playing'}),connected:true,gameLayout:{revision:1,controls},gamePrivateView:null};
        render(h(GameController,{controller:{seat:1,name:'Cook',theme:'tabao-rush',link:'connected'},view,send(){},sessionCommand(){}}),app);
      `; },
    }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw Error('Missing bundle');
  const chunk = output.output.find(c => c.type === 'chunk');
  if (!chunk) throw Error('Missing script');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    for (const css of ['../../../packages/ui/tokens.css', './style.css']) await page.addStyleTag({ content: await readFile(path(css), 'utf8') });
    for (const asset of output.output) if (asset.type === 'asset' && asset.fileName.endsWith('.css')) await page.addStyleTag({ content: String(asset.source) });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    // The first transition is the reported regression; subsequent steps cover the interval and rotation.
    for (const [width,height] of [[844,390],[932,430],[900,415],[875,400],[800,385],[667,375],[390,844],[844,390]] as const) {
      await page.setViewportSize({ width,height });
      if (width < height) continue;
      await page.waitForSelector('.ka-layout-engine[data-fits="true"]');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => { resolve(null); }))));
      await page.waitForFunction(() => {
        const engine = document.querySelector('.ka-layout-engine')?.getBoundingClientRect();
        const play = document.querySelector('.phone-game-controls')?.closest('.ka-controller-play')?.getBoundingClientRect();
        if (!engine || !play) return false;
        return engine.width === play.width && engine.height === play.height;
      });
      const geometry = await page.locator('.phone-game-controls').evaluate(node => {
        const play = node.closest('.ka-controller-play')?.getBoundingClientRect();
        if (!play) throw Error('Missing play area');
        return [...node.querySelectorAll('.ka-layout-face, .ka-stick')].map(control => {
          const box = control.getBoundingClientRect();
          return { face: control.classList.contains('ka-layout-face'), width: box.width, height: box.height,
            clearances: [box.left-play.left,box.top-play.top,play.right-box.right,play.bottom-box.bottom] };
        });
      });
      expect(geometry.filter(box => box.face)).toHaveLength(4);
      for (const box of geometry) {
        for (const clearance of box.clearances) expect(clearance).toBeGreaterThanOrEqual(13);
        if (box.face) {
          expect(box.width).toBeGreaterThanOrEqual(width >= 844 ? 110 : 89);
          expect(box.height).toBeGreaterThanOrEqual(width >= 844 ? 110 : 89);
        }
      }
    }
  } finally { await browser.close(); }
}, 120_000);
