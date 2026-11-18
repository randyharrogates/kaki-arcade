import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';
import { contrastRatio } from '@kaki/ui';

it.each(['phrases', 'words', 'tokens', 'mentsuyu', 'short', 'short-resize', 'contrast-light', 'contrast-dark'] as const)(
  'RZ-003 RZ-005 phone fit and private status AA: %s', async scenario => {
  const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
  // Take the longest actual bank options as well as the integrator's wider fixture.
  const questionFiles = await readdir(path('../../../content/rabakz/src/questions/'));
  const bank = await Promise.all(questionFiles.filter(file => file.endsWith('.json')).map(async file => {
    const data = JSON.parse(await readFile(path(`../../../content/rabakz/src/questions/${file}`), 'utf8')) as
      { questions: { options: string[] }[] };
    return data.questions.flatMap(question => question.options);
  }));
  const longest = bank.flat().sort((a,b) => b.length - a.length).slice(0,3);
  const longestWord = bank.flat().flatMap(option => option.match(/\p{L}+/gu) ?? [])
    .sort((a,b) => b.length - a.length)[0];
  if (!longestWord) throw new Error('Missing bank words');
  const longestToken = bank.flat().flatMap(option => option.split(/\s+/u)).sort((a,b) => b.length - a.length)[0];
  if (!longestToken) throw new Error('Missing bank tokens');
  const mentsuyuOptions = ['Wasabi','Mentsuyu','Karashi','Ponzu'];
  const longOptions = [...longest, 'A lovely hot bowl of noodles with prawns'];
  const selectedOptions = { phrases:longOptions, words:[...longest, longestWord], tokens:[...longest, longestToken], mentsuyu:mentsuyuOptions, short:['Christopher Walken','David Hasselhoff','Jerry Springer','Patrick Swayze'] };
  const short = scenario === 'short' || scenario === 'short-resize';
  const fixture = path('./rabakz-contrast-fixture.ts');
  const bundle = await build({ configFile: false, build: { target: 'esnext', write: false, minify: false,
    lib: { entry: fixture, formats: ['es'], name: 'fixture' } }, plugins: [{
    name: 'rabakz-contrast-fixture',
    resolveId(id) { return id === fixture ? id : undefined; },
    load(id) {
      if (id !== fixture) return;
      return `import { h, render } from 'preact';
        import { ControllerShell, LayoutEngine } from '${path('../../../packages/controller-kit/src/index.ts')}';
        import { measureLabelLineWidth, measureLabelGroup } from '${path('../../../packages/controller-kit/src/layout-label.ts')}';
        window.measureLabels = (button,label) => {
          const buttons = [...button.parentElement.querySelectorAll(':scope > button')];
          measureLabelGroup(buttons,{width:button.offsetWidth,height:button.offsetHeight});
          return {width:measureLabelLineWidth(button,label),step:Number(button.dataset.labelStep)};
        };
        import { rabakz, questionData, QUESTION_DATA } from '${path('../../../games/rabakz/src/index.ts')}';
        window.drawStatus = (phase, pick, theme, eligible = true, options = ${JSON.stringify(longOptions)}) => {
        const initial = rabakz.init(42, [{id:'one',name:'Player 1',seat:1,colour:'seat-1'}],
          {length:10,difficulty:'mixed'}, {saved:null,teams:false,data:{[QUESTION_DATA]:questionData(
            Array.from({length:10},(_,i)=>({id:String(i),prompt:'Which?',options,
              correct:0,category:'General',difficulty:'easy',type:'multiple-choice',region:'general'})))}});
          const state = {...initial,phase,wrong:pick === 1 ? [1] : [],players:initial.players.map(p=>({...p,eligible,pick,answers:pick === null ? [] : [pick]}))};
          render(h(ControllerShell,{seat:1,name:'Player 1',link:'connected',theme},
            h(LayoutEngine,{layout:rabakz.controllerLayout(state,'one'),privateView:rabakz.privateView(state,'one'),
              area:{width:innerWidth,height:innerHeight - 68},viewport:{width:innerWidth,height:innerHeight},isLeader:${String(!short)},onOutput:()=>{}})),document.body);
        };`;
    },
  }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing bundle');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing fixture code');
  const css = (await Promise.all([
    '../../../packages/ui/tokens.css', '../../../packages/controller-kit/src/shell.css',
    '../../../packages/controller-kit/src/layout.css',
    '../../../games/rabakz/controller.css',
  ].map(file => readFile(path(file), 'utf8')))).join('\n');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width:844, height:390 } });
    await page.addStyleTag({ content:css });
    await page.addScriptTag({ type:'module', content:chunk.code });
    await page.waitForFunction(() => 'drawStatus' in window);
    await page.emulateMedia({ reducedMotion:'reduce' });
    if (scenario === 'short-resize') {
      // Keep the same keyed targets across the resize; no font or animation waits.
      for (const [width,height] of [[667,375],[844,390]] as const) {
        await page.setViewportSize({width,height});
        await page.evaluate(options => {
          const draw = Reflect.get(window,'drawStatus') as (phase:string,pick:null,theme:string,eligible:boolean,options:string[]) => void;
          draw('question',null,'rabakz',true,options);
        },selectedOptions.short);
        const labels = page.locator('.ka-layout-engine > [data-part="answer"] button > span');
        await expect.poll(() => labels.count()).toBe(4);
        if (width === 844) await expect.poll(() => labels.evaluateAll(nodes =>
          nodes.map(label => parseFloat(getComputedStyle(label).fontSize)))).toEqual([34,34,34,34]);
      }
    }
    // RZ-003 / RZ-005: exercise the shipped option renderer after its font and
    // placement effects settle, including the exact 667 x 375 Continue failure.
    // Landscape only: in portrait the controller shows "Turn your phone sideways" instead of the
    // controls (packages/controller-kit/src/shell.css; proved in uat/slices/K-01-controller-shell.mjs).
    if (scenario !== 'contrast-light' && scenario !== 'contrast-dark') for (const [width,height] of [[667,375],[844,390],[932,430]] as const) {
      await page.setViewportSize({width,height});
      for (const optionSet of [selectedOptions[scenario === 'short-resize' ? 'short' : scenario]]) for (const [state,phase,pick,eligible] of [
        ['question','question',null,true], ['scoreboard','scoreboard',null,true],
        ['answered','question',0,true], ['locked-out','question',1,true],
        ['waiting','question',null,false],
      ] as const) {
        if (short && (phase !== 'question' || !eligible)) continue;
        await page.evaluate(({phase,pick,eligible,optionSet}) => {
          const draw = Reflect.get(window,'drawStatus') as (phase:string,pick:number | null,theme:string,eligible:boolean,options:string[]) => void;
          draw(phase,pick,'rabakz',eligible,optionSet);
        },{phase,pick,eligible,optionSet});
        const options = page.locator('.ka-layout-engine > .ka-layout-part .ka-layout-options > button');
        await expect.poll(() => options.count()).toBe(phase === 'question' && eligible ? (short ? 4 : 5) : 1);
        await page.evaluate(() => document.fonts.ready);
        await expect.poll(() => options.evaluateAll((buttons, width) => buttons.every(button => {
          const label = button.querySelector('span');
          if (!label) return false;
          const css = getComputedStyle(label), box = button.getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(label);
          const text = range.getBoundingClientRect();
          return [21,34].includes(parseFloat(css.fontSize)) &&
            label.scrollWidth <= label.clientWidth && label.scrollHeight <= label.clientHeight &&
            label.clientHeight <= Math.ceil(3 * parseFloat(css.lineHeight)) &&
            text.left >= box.left && text.right <= box.right && text.top >= box.top && text.bottom <= box.bottom &&
            box.width >= (width >= 844 && button.closest('[data-part="answer"]') ? 110 : 89) && box.height >= (width >= 844 && button.closest('[data-part="answer"]') ? 110 : 68);
        }), width),{message:`${String(width)} x ${String(height)} ${state}, eligible=${String(eligible)}`}).toBe(true);
        if (phase === 'question' && eligible) {
          const labels = page.locator('[data-part="answer"] button > span');
          if (short && width === 844) {
            const fitting = await labels.evaluateAll(nodes => nodes.map(label => {
              const button = label.parentElement as HTMLButtonElement;
              const part = button.closest<HTMLElement>('[data-part="answer"]');
              if (!part) throw new Error('Missing answer part');
              const css = getComputedStyle(button);
              const savedButton = button.style.cssText, savedLabel = (label as HTMLElement).style.cssText;
              const savedStep = button.dataset.labelStep;
              const renderedStep = parseFloat(getComputedStyle(label).fontSize);
              try {
                button.dataset.labelStep = '34';
                button.style.fontSize = 'var(--ka-phone-type-34)';
                const span = label as HTMLElement;
                Object.assign(span.style,{flex:'none',width:'max-content',whiteSpace:'nowrap'});
                const natural = {width:span.getBoundingClientRect().width,height:span.getBoundingClientRect().height};
                const iconWidth = button.querySelector('svg')?.getBoundingClientRect().width ?? 0;
                const available = {
                  width:button.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight)-iconWidth-parseFloat(css.columnGap),
                  height:button.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom),
                };
                Object.assign(span.style,{width:`${String(available.width)}px`,whiteSpace:'normal'});
                return {label:span.textContent,renderedStep,part:{width:part.offsetWidth,height:part.offsetHeight},
                  button:{width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height},
                  available,natural,wrapped:{width:span.getBoundingClientRect().width,height:span.getBoundingClientRect().height},
                  scroll:{width:span.scrollWidth,height:span.scrollHeight},client:{width:span.clientWidth,height:span.clientHeight}};
              } finally {
                button.style.cssText = savedButton;
                (label as HTMLElement).style.cssText = savedLabel;
                if (savedStep === undefined) delete button.dataset.labelStep; else button.dataset.labelStep = savedStep;
              }
            }));
            expect(fitting.map(item => item.renderedStep),JSON.stringify(fitting)).toEqual([34,34,34,34]);
            const measured = await labels.first().evaluate(label => {
              const button = label.parentElement as HTMLButtonElement;
              const measure = Reflect.get(window,'measureLabels') as (button:HTMLButtonElement,label:HTMLElement) => {width:number;step:number};
              button.style.transform = 'scale(1)';
              const normal = measure(button,label as HTMLElement);
              button.style.transform = 'scale(0.97)';
              const pressed = measure(button,label as HTMLElement);
              button.style.transform = '';
              return {normal,pressed};
            });
            expect(measured.normal.step).toBe(34);
            expect(measured.normal.width).toBeGreaterThan(0);
            expect(measured.pressed).toEqual(measured.normal);
          }
          // The same four options, in whatever order the round deals them.
          expect((await labels.allTextContents()).sort()).toEqual([...optionSet].sort());
          if (width === 667 && !short && optionSet !== mentsuyuOptions) {
            expect(await labels.evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize))))
              .toEqual(expect.arrayContaining([21]));
          }
        }
        if (state === 'answered' || state === 'locked-out') {
          const status = page.locator('.ka-private-panel:not(.ka-private-ghost) .ka-layout-title > span');
          await expect.poll(() => status.textContent()).toBe(state === 'answered' ? 'Locked in' : 'Locked out');
          expect(await status.isVisible()).toBe(true);
          const strip = await page.locator('.ka-private-panel:not(.ka-private-ghost)').boundingBox();
          const grid = await page.locator('[data-part="answer"]').boundingBox();
          expect(strip && grid && strip.y + strip.height <= grid.y).toBe(true);
        }
        if (phase === 'scoreboard') expect(await options.getAttribute('aria-label')).toBe('Continue');
      }
    }
    if (scenario === 'contrast-light' || scenario === 'contrast-dark') {
      const colorScheme = scenario === 'contrast-light' ? 'light' : 'dark';
      await page.emulateMedia({ colorScheme });
      for (const width of [667,844]) for (const theme of ['console','rabakz','peek-poker','tabao-rush']) for (const [label, phase, pick] of [
        ['Locked out', 'question', 1], ['Locked in', 'question', 0],
        ['Right', 'reveal', 0], ['Wrong', 'reveal', 1], ['Skipped', 'reveal', null],
      ] as const) {
        await page.setViewportSize({width,height:width === 667 ? 375 : 390});
        await page.evaluate(({ phase, pick, theme }) => {
          const draw = Reflect.get(window, 'drawStatus') as (phase: string, pick: number | null, theme: string) => void;
          draw(phase, pick, theme);
        }, { phase, pick, theme });
        // During the crossfade the old and new pills overlap; check the new one.
        const pill = page.locator('.ka-private-panel .ka-layout-title > span').filter({ hasText: label }).last();
        await expect.poll(() => pill.textContent()).toBe(label);
        const bounds = await pill.evaluate(node => {
          const range = document.createRange(); range.selectNodeContents(node);
          const text = range.getBoundingClientRect(), box = node.getBoundingClientRect();
          return {left:text.left-box.left,right:box.right-text.right,overflow:node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight};
        });
        expect(bounds.left).toBeGreaterThanOrEqual(13);
        expect(bounds.right).toBeGreaterThanOrEqual(13);
        expect(bounds.overflow).toBe(false);
        const colours = await pill.evaluate(node => {
          const style = getComputedStyle(node);
          return { ink:style.color, background:style.backgroundImage };
        });
        const hex = (rgb: string) => {
          const values = rgb.match(/[\d.]+/g)?.slice(0,3);
          if (values?.length !== 3) throw new Error(`Unsupported colour ${rgb}`);
          return `#${values.map(value => Number(value).toString(16).padStart(2,'0')).join('')}`;
        };
        const paints = colours.background.match(/rgb\([^)]+\)/g);
        expect(paints).toHaveLength(2);
        for (const paint of paints ?? []) {
          expect(contrastRatio(hex(colours.ink), hex(paint)), `${colorScheme}: ${label} on ${paint}`).toBeGreaterThanOrEqual(4.5);
        }
      }

    }
  } finally { await browser.close(); }
}, 30000);
