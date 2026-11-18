import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { chromium } from 'playwright';
import { build } from 'vite';
import { rabakzBank } from '@kaki/content-rabakz/vite';
import { readFile } from 'node:fs/promises';

it('PP-030 PP-031 console follows public phases with no fetch or decode during play', async () => {
  const path = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const entry = path('./p06-fixture.tsx');
  const bundle = await build({ configFile: false, build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] }, rolldownOptions: { output: { inlineDynamicImports: true } } }, plugins: [rabakzBank(), {
    name: 'p06-fixture', resolveId(id) { if (id === entry) return id; return undefined; },
    load(id) {
      if (id !== entry) return;
      return `
        import {render,h} from 'preact';
        import {SessionSurface} from '${path('./host-route.tsx')}';
        import {sessionDisplayStore} from '${path('./session-display.ts')}';
        import {ConsoleScreen} from '${path('../../../games/peek-poker/host/console.ts')}';
        import {scenario} from '${path('../../../games/peek-poker/host/scenarios.ts')}';
        import {peekPoker} from '${path('../../../games/peek-poker/src/index.ts')}';
        import {createRoom,initialPicker} from '@kaki/platform';
        let started=false;const late=[];let release;const gate=new Promise(resolve=>release=resolve);window.p06Release=release;
        const ids=['card-back',...Array.from({length:5},(_,i)=>'card-flip-'+i),...'a23456789tjqk'.split('').flatMap(r=>'shdc'.split('').map(s=>'card-'+(r==='t'?'10':r)+s))];
        const sprite='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="'+(ids.length*176)+'" height="231">'+ids.map((id,i)=>'<rect x="'+(i*176)+'" width="176" height="231" fill="'+(id==='card-back'?'blue':id.includes('flip')?'white':'red')+'"/>').join('')+'</svg>');
        window.fetch=async url=>{await gate;if(started)late.push('fetch:'+url);return new Response(JSON.stringify({atlases:[{set:'peek-poker-cards',full:{file:sprite},frames:Object.fromEntries(ids.map((id,i)=>[id,{rect:[i*176,0,176,231],sourceSize:[176,231],trim:[0,0],anchor:[88,115.5],anchors:{centre:[88,115.5]}}]))}]}));};
        const decode=HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode=function(){if(started)late.push('decode');return decode.call(this);};
        const displays=sessionDisplayStore();const room=createRoom();
        const publish=phase=>displays.publish({gameId:'peek-poker',Screen:ConsoleScreen,view:peekPoker.publicView(scenario(phase)),...(!started?{ready:error=>{if(error)throw error;started=true;window.p06Ready=true;}}:{})});
        const warm=ConsoleScreen.mount;let releaseWarm;const warmGate=new Promise(resolve=>releaseWarm=resolve);window.p06WarmRelease=releaseWarm;
        ConsoleScreen.mount=(...args)=>{const mounted=warm(...args);return {...mounted,ready:mounted.ready.then(()=>{window.p06Warmed=true;return warmGate;})};};
        publish('memorise');
        render(h(SessionSurface,{sound:{play(){},setLevel(){},getLevel(){return 0;}},displays,room,picker:{...initialPicker([]),screen:'starting',focus:'peek-poker'},lobby:null,teamSetup:null,startTeams(){},back(){},again(){},continued(){}}),document.body);
        window.p06Phase=publish;window.p06Late=late;
      `;
    },
  }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw Error('bundle');
  const chunk = output.output.find(c => c.type === 'chunk'); if (!chunk) throw Error('chunk');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.route('http://p06.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
    await page.goto('http://p06.test/');
    await page.addStyleTag({ content: await readFile(path('../../../packages/ui/tokens.css'), 'utf8') });
    await page.addStyleTag({ content: await readFile(path('./style.css'), 'utf8') });
    await page.addStyleTag({ content: await readFile(path('../../../games/peek-poker/host/screen.css'), 'utf8') });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    const assertStarting = async () => {
      for (const selector of ['.picker-screen h1', '.picker-screen [data-game="peek-poker"][data-expanded="true"]']) {
        expect(await page.locator(selector).last().evaluate(element => {
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
          return hit !== null && element.contains(hit);
        })).toBe(true);
      }
    };
    await page.getByText('Starting…', { exact: true }).waitFor();
    await page.clock.install();
    for (let frame = 0; frame < 4; frame++) { await page.clock.runFor(250); await assertStarting(); }
    expect(await page.getByText('Loading game', { exact: true }).count()).toBe(0);
    await page.evaluate(() => { (Reflect.get(window, 'p06Release') as () => void)(); });
    await page.clock.resume();
    await page.waitForFunction(() => Reflect.get(window, 'p06Warmed') === true);
    // Ready has completed actual mounted warm-up while its opaque picker covers it.
    expect(await page.locator('.mounted-game-preparation').evaluate(element =>
      getComputedStyle(element).visibility === 'visible' && getComputedStyle(element).opacity === '1')).toBe(true);
    expect(await page.locator('.pp-table canvas').evaluate(element => {
      const canvas = element as HTMLCanvasElement;
      const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels?.some((value, index) => index % 4 === 3 && value > 0) ?? false;
    })).toBe(true);
    for (let frame = 0; frame < 4; frame++) { await page.clock.runFor(250); await assertStarting(); }
    await page.evaluate(() => { (Reflect.get(window, 'p06WarmRelease') as () => void)(); });
    await page.waitForFunction(() => Reflect.get(window, 'p06Ready') === true);
    await page.clock.runFor(1000);
    await page.clock.resume();
    await page.getByText('Starting…', { exact: true }).waitFor({ state: 'detached' });
    for (const [phase, expected] of [['memorise', 'memorise'], ['picking', 'pick'], ['reveal', 'reveal']] as const) {
      await page.evaluate(value => { (Reflect.get(window, 'p06Phase') as (phase: string) => void)(value); }, phase);
      await page.locator(`.pp-table[data-phase="${expected}"]`).waitFor();
      await expect.poll(async () => page.locator('.pp-table canvas').evaluate(canvas => {
        const context = (canvas as HTMLCanvasElement).getContext('2d');
        if (!context) throw Error('context');
        const grid = canvas.closest('.pp-table')?.querySelector('.pp-grid');
        if (!grid) throw Error('grid');
        const box = grid.getBoundingClientRect(), surface = canvas.getBoundingClientRect();
        const scale = (canvas as HTMLCanvasElement).width / surface.width;
        const pixels = context.getImageData((box.x - surface.x) * scale, (box.y - surface.y) * scale, box.width * scale, box.height * scale).data;
        let faces = 0, backs = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] === 255 && pixels[i + 1] === 0 && pixels[i + 2] === 0) faces++;
          if (pixels[i] === 0 && pixels[i + 1] === 0 && pixels[i + 2] === 255) backs++;
        }
        return { faces: faces > 0, backs: backs > 0 };
      })).toEqual({ faces: expected !== 'pick', backs: expected === 'pick' });
      expect(await page.getByText('Loading game', { exact: true }).count()).toBe(0);
      expect(await page.getByText('This game’s screen is not built yet').count()).toBe(0);
    }
    expect(await page.evaluate(() => Reflect.get(window, 'p06Late') as unknown)).toEqual([]);
  } finally { await browser.close(); }
}, 30000);
