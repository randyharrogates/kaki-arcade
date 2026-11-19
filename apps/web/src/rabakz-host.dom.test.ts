import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';

it.each([false, true])('RZ-009 host card, paired transitions and header fit (reduced=%s)', async reduced => {
  const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
  const entry = path('./rabakz-final-card-fixture.tsx');
  const bundle = await build({ configFile: false, build: { write: false, target: 'esnext',
    lib: { entry, formats: ['es'] } }, plugins: [{ name: 'final-card-fixture',
    resolveId: id => id === entry ? id : undefined,
    load: id => id === entry ? `import { h, render } from 'preact';
      import { RabakzScreen } from '${path('../../../games/rabakz/host/Screen.tsx')}';
      import { scenario } from '${path('../../../games/rabakz/host/scenarios.ts')}';
      import { rabakz } from '${path('../../../games/rabakz/src/index.ts')}';
      window.draw = (length, phase, finalRound) => render(h(RabakzScreen, {
        view: {...rabakz.publicView(scenario('open')), length, phase, finalRound, soloBest: 999999, question: {...rabakz.publicView(scenario('open')).question, category:'singapore-arts-and-sport'}},
        width:innerWidth, height:innerHeight, reduced:${String(reduced)}
      }), document.body);` : undefined,
  }] });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw new Error('Missing output');
  const chunk = output.output.find(item => item.type === 'chunk');
  if (!chunk) throw new Error('Missing fixture');
  const css = (await Promise.all(['../../../packages/ui/tokens.css', '../../../games/rabakz/host/screen.css'].map(file => readFile(path(file), 'utf8')))).join('\n');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addStyleTag({ content: `body { margin:0; } ${css}` });
    await page.addScriptTag({ type: 'module', content: chunk.code });
    await page.waitForFunction(() => 'draw' in window);
    // Exercise card entry, card exit and podium entry with the outgoing layer kept opaque.
    await page.evaluate(() => { const draw = Reflect.get(window, 'draw') as (length: number, phase: string, final: boolean) => void; draw(10, 'question', false); });
    for (const phase of ['final', 'question', 'over']) {
      const frames = await page.evaluate(async phase => {
        const draw = Reflect.get(window, 'draw') as (length: number, phase: string, final: boolean) => void;
        draw(10, phase, true);
        await new Promise(resolve => requestAnimationFrame(resolve));
        const blocks = document.getAnimations().filter(animation =>
          animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element && animation.effect.target.classList.contains('rz-block'));
        const keyframes = blocks.map(animation => (animation.effect as KeyframeEffect).getKeyframes().map(frame => frame.opacity));
        const old = document.querySelector('.rz-block[inert]');
        const oldOpacity = old ? getComputedStyle(old).opacity : null;
        // Hold the last entrance frame while both screen layers are mounted.
        for (const animation of blocks) {
          animation.pause();
          animation.currentTime = Number(animation.effect?.getTiming().duration);
        }
        const layers = [...document.querySelectorAll<HTMLElement>('.rz-block')];
        const previous = layers.map(layer => layer.style.pointerEvents);
        let titleOnTop: boolean;
        let podiumOnTop: boolean;
        const isolated = layers.every(layer => getComputedStyle(layer).isolation === 'isolate');
        try {
          for (const layer of layers) layer.style.pointerEvents = 'auto';
          // Hit-testing skips inert subtrees, so lift `inert` from the outgoing layers while probing: wherever an
          // incoming title or podium content is drawn, the topmost element there must not belong to an outgoing layer.
          const olds = [...document.querySelectorAll<HTMLElement>('[inert]')];
          olds.forEach(o => { o.removeAttribute('inert'); o.dataset.outgoing = ''; });
          try {
            const titles = [...document.querySelectorAll('h1')].filter(h => !h.closest('[data-outgoing]')).map(h => h.getBoundingClientRect());
            titleOnTop = titles.length > 0 && titles.every(r => [0.1, 0.5, 0.9].every(f => {
              const hit = document.elementFromPoint(r.x + r.width * f, r.y + r.height / 2);
              return !!hit && hit.closest('[data-outgoing]') === null;
            }));
            const podium = [...document.querySelectorAll('.rz-step, .rz-podium-name')].filter(element => !element.closest('[data-outgoing]'));
            podiumOnTop = phase !== 'over' || podium.length > 0 && podium.every(element => {
              const r = element.getBoundingClientRect();
              const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
              return r.width > 0 && r.height > 0 && !!hit && hit.closest('[data-outgoing]') === null;
            });
          } finally { olds.forEach(o => { o.setAttribute('inert', ''); delete o.dataset.outgoing; }); }
        } finally { layers.forEach((layer, i) => { layer.style.pointerEvents = previous[i] ?? ''; }); }
        for (const animation of blocks) animation.play();
        await Promise.all(document.getAnimations().map(a => a.finished.catch(() => undefined)));
        return { keyframes, oldOpacity, isolated, titleOnTop, podiumOnTop };
      }, phase);
      expect(frames.podiumOnTop, `${phase} podium steps and names paint above the outgoing screen`).toBe(true);
      expect(frames.isolated).toBe(true);
      expect(frames.titleOnTop).toBe(true);
      if (reduced) { expect(frames.keyframes).toEqual([]); expect(frames.oldOpacity).toBeNull(); }
      else {
        expect(frames.keyframes).toContainEqual(['0', '1']);
        expect(frames.oldOpacity).toBe('1');
      }
    }
    for (const [width, height] of [[1920,1080], [1280,720]] as const) {
      await page.setViewportSize({ width, height });
      for (const [length, line] of [[10, 'The last question scores double'], [30, 'The last 3 questions score double'], [50, 'The last 5 questions score double']] as const) {
        await page.evaluate(length => { const draw = Reflect.get(window, 'draw') as (length: number, phase: string, final: boolean) => void; draw(length, 'final', true); }, length);
        await page.evaluate(async () => { await Promise.all(document.getAnimations().map(a => a.finished.catch(() => undefined))); });
        const panel = page.locator('.rz-final-panel');
        expect(await panel.innerText()).toContain(line);
        expect(await panel.evaluate(element => {
          const box = element.getBoundingClientRect();
          return box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight &&
            element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight;
        })).toBe(true);
      }
      for (const final of [true, false]) {
        await page.evaluate(final => { const draw = Reflect.get(window, 'draw') as (length: number, phase: string, final: boolean) => void; draw(10, 'question', final); }, final);
        await page.evaluate(async () => { await Promise.all(document.getAnimations().map(a => a.finished.catch(() => undefined))); });
        expect(await page.locator('.rz-double-chip').count()).toBe(final ? 1 : 0);
        if (final) expect(await page.locator('.rz-header').evaluate(header => {
          const box = header.getBoundingClientRect();
          const chip = header.querySelector('.rz-double-chip')?.getBoundingClientRect();
          const category = header.querySelector('.rz-header-detail > .rz-copy')?.getBoundingClientRect();
          const best = header.querySelector('.rz-play-best')?.getBoundingClientRect();
          return !!chip && !!category && !!best && chip.left >= box.left && chip.top >= box.top && chip.right <= box.right && chip.bottom <= box.bottom && chip.right <= category.left && chip.right <= best.left && best.right <= box.right;
        })).toBe(true);
      }
    }
  } finally { await browser.close(); }
}, 30000);
