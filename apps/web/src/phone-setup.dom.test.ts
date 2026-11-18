import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import preact from '@preact/preset-vite';

it('PLAT-006/025 keeps setup watchers identified and their message within both landscape screens', async () => {
  const route = fileURLToPath(new URL('./phone-route.tsx', import.meta.url));
  const fixture = fileURLToPath(new URL('./phone-setup-dom-fixture.tsx', import.meta.url));
  const phone = fileURLToPath(new URL('./phone.ts', import.meta.url));
  const bundle = await build({ configFile: false, define: { 'import.meta.env.DEV': 'false' }, plugins: [preact(), {
    name: 'watcher-phone-state',
    resolveId: id => id === fixture ? id : undefined,
    load(id) {
      if (id === fixture) return `import {render} from 'preact'; import {PhonePage} from '${route}'; render(<PhonePage/>, document.body);`;
      if (id.endsWith('/phone-browser.ts')) return 'export const phoneBrowserDependencies = () => ({});';
      if (id.endsWith('/phone-demo.ts')) return 'export const phoneDemo = () => null;';
      if (id !== phone) return;
      return `const view = {connected:true,seat:2,name:'Watcher',leader:false,phase:'lobby',theme:'light',title:'',detail:'',
        picker:{screen:'start',leaderName:'Alexandertan',reason:null},
        teamSetup:{screen:'choice',players:[],settings:{fields:[]}}};
        let presentView;
        window.leaderSetup = () => { Object.assign(view,{seat:1,leader:true,teamSetup:{screen:'choice',enabled:false,teamsOffered:true,teamsReason:null,players:[],settings:{fields:[{kind:'choice',id:'length',label:'Questions',help:null,options:[{value:10,label:'10',chosen:true,reason:null},{value:30,label:'30',chosen:false,reason:null}]}]}}}); presentView({...view}); };
        const input = () => { document.body.dataset.inputs = String(Number(document.body.dataset.inputs || 0) + 1); };
        export const phoneView = () => view;
        export const phoneController = () => null;
        export const offersTeamChoice = v => v.leader && v.teamSetup?.screen === 'choice' && v.teamSetup.teamsOffered;
        export const createPhone = (_deps, _code, present) => { presentView = present; present(view); return {settingInput:input,pickerInput:input,teamInput:input,stop(){},leave(){document.body.dataset.left='true';}}; };`;
    },
  }], build: { write: false, minify: false, lib: { entry: fixture, formats: ['es'] }, rolldownOptions: { output: { codeSplitting: false } } } });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing watcher bundle');
  const chunk = output.output.find(item => item.type === 'chunk');
  const css = output.output.filter(item => item.type === 'asset');
  if (!chunk) throw new Error('Missing watcher code');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const asset of css) {
      if (asset.fileName.endsWith('.css')) await page.addStyleTag({ content: String(asset.source) });
    }
    // Load the same global reset, tokens and setup styling as the app.
    const { readFile } = await import('node:fs/promises');
    for (const path of ['../../../packages/ui/tokens.css', './style.css', './game-setup.css']) {
      await page.addStyleTag({ content: await readFile(fileURLToPath(new URL(path, import.meta.url)), 'utf8') });
    }
    await page.addScriptTag({ type: 'module', content: chunk.code });
    for (const [width, height] of [[667, 375], [844, 390]] as const) {
      await page.setViewportSize({ width, height });
      const header = page.locator('.phone-id');
      await expect.poll(() => header.isVisible()).toBe(true);
      expect(await header.locator('.phone-badge').innerText()).toBe('2');
      expect(await header.locator('strong').innerText()).toBe('Watcher');
      expect(await header.getByRole('img', { name: 'Connected', exact: true }).isVisible()).toBe(true);
      expect(await header.getByRole('button', { name: 'Leave', exact: true }).isVisible()).toBe(true);
      expect(await page.locator('.picker-status h2').innerText()).toBe('Alexandertan is setting up');
      expect(await page.locator('.picker-status p').innerText()).toBe('Watch the TV.');
      expect(await page.locator('.picker-status h2').evaluate(el => el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).fontSize) * 1.5)).toBe(true);
      expect(await page.locator('.phone-page, .phone-id, .phone-picker, .picker-status, .picker-status h2, .picker-status p').evaluateAll(nodes => nodes.flatMap(el => {
        const r = el.getBoundingClientRect();
        const fitsContent = el.tagName === 'H2'
          ? getComputedStyle(el).overflow === 'visible' && getComputedStyle(el.parentElement ?? el).overflow === 'visible'
          : el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1;
        return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && fitsContent
          ? [] : [el.getAttribute('class') ?? el.tagName];
      }))).toEqual([]);
    }
    // The watcher can leave; then the same page becomes the leader's setup.
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    expect(await page.locator('body').getAttribute('data-left')).toBe('true');
    // Exercise the real PhonePage callbacks, including an ordinary setting tap.
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'vibrate', {configurable:true,value:() => {document.body.dataset.vibrations = String(Number(document.body.dataset.vibrations ?? 0) + 1); return true;}});
      (Reflect.get(window, 'leaderSetup') as () => void)();
    });
    for (const name of ['30', 'Start', 'Back']) await page.getByRole('button', {name,exact:true}).click();
    expect(await page.locator('body').getAttribute('data-vibrations')).toBe('3');
    expect(await page.locator('body').getAttribute('data-inputs')).toBe('3');
  } finally { await browser.close(); }
}, 120000);
