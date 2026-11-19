import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
it('PERF-002 PERF-023 draws off-screen and waits for half decode before Ready', async () => {
  const entry = fileURLToPath(new URL('./c25-fixture.ts', import.meta.url));
  const module = fileURLToPath(new URL('./detail-preparation.ts', import.meta.url));
  const bundle = await build({ configFile: false, build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] } }, plugins: [{ name: 'c25', resolveId: id => id === entry ? id : undefined, load: id => id === entry ? `
    import {prepareDetail,setDetailSetting} from '${module}';
    let release; window.releaseHalf=()=>release(); let frames=0;
    const scene={loadBenchmarkAssets:async detail=>{if(detail==='half'){window.halfRequested=true;await new Promise(r=>release=r);}return {};},
    benchmarkScene:(target,options)=>{const canvas=document.createElement('canvas');canvas.width=options.width;canvas.height=options.height;target.append(canvas);return {draw(){frames++;if(target.isConnected)throw Error('visible target');},destroy(){window.drawn=frames;}};}};
    window.start=()=>prepareDetail('fake',scene).then(mode=>{window.ready=mode;});
    window.lower=()=>{setDetailSetting(localStorage,'lower');return window.start();};
  ` : undefined }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw Error('bundle');
  const chunk = output.output.find(item => item.type === 'chunk'); if (!chunk) throw Error('chunk');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('http://c25.test/**', route => route.fulfill({ contentType: 'text/html', body: '<body><h1>Starting…</h1></body>' }));
    await page.goto('http://c25.test'); await page.addScriptTag({ content: chunk.code, type: 'module' });
    await page.waitForFunction('typeof window.start === "function"');
    const before = await page.locator('body').innerHTML();
    await page.evaluate('window.start()');
    expect(await page.evaluate('window.ready')).toBe('full');
    expect(await page.evaluate('window.drawn')).toBeGreaterThan(5);
    expect(await page.locator('body').innerHTML()).toBe(before);
    await page.evaluate('window.ready=null;void window.lower()');
    await page.waitForFunction('window.halfRequested');
    expect(await page.evaluate('window.ready')).toBeNull();
    await page.evaluate('window.releaseHalf()');
    await page.waitForFunction('window.ready === "lower"');
    expect(await page.locator('body').innerHTML()).toBe(before);
  } finally { await browser.close(); }
}, 20000);
