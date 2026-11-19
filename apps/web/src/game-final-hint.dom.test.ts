import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'vite';
import { expect, it } from 'vitest';
import { crossfade } from '@kaki/ui';

it('PLAT-022 starts and finishes the final hint entrance, or skips it under reduced motion', async () => {
  const path = (name: string) => fileURLToPath(new URL(name, import.meta.url));
  const entry = path('./c28-fixture.tsx');
  const bundle = await build({ configFile: false,
    resolve: { alias: [{ find: /^preact$/, replacement: createRequire(import.meta.url).resolve('preact') }] },
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
    build: { write: false, target: 'esnext', lib: { entry, formats: ['es'] } },
    plugins: [{ name: 'c28', resolveId: id => id === entry ? id : undefined, load: id => id === entry ? `
      import { h, render } from 'preact';
      import { GameFinalHint } from '${path('./game-final-hint.tsx')}';
      window.draw = keyboard => render(h(GameFinalHint, { keyboard }), document.body);
    ` : undefined }],
  });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!output || !('output' in output)) throw Error('Missing bundle');
  const chunk = output.output.find((item): item is Extract<typeof item, { type: 'chunk' }> => item.type === 'chunk' && item.isEntry);
  if (!chunk) throw Error('Missing fixture');
  const browser = await chromium.launch({ headless: true });
  try {
    for (const reduced of [false, true]) {
      const page = await browser.newPage({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await page.addStyleTag({ content: await readFile(path('./style.css'), 'utf8') });
      await page.addScriptTag({ type: 'module', content: chunk.code });
      await page.waitForFunction(() => Reflect.has(window, 'draw'));
      const result = await page.evaluate(async () => {
        const draw = Reflect.get(window, 'draw') as (keyboard: boolean) => void;
        draw(false);
        const layer = document.querySelector<HTMLElement>('.game-final-layer');
        if (!layer) throw Error('Missing hint');
        const animations = layer.getAnimations();
        const animation = animations[0];
        const effect = animation?.effect;
        const frames = effect instanceof KeyframeEffect ? effect.getKeyframes().map(frame => frame.opacity) : undefined;
        const timing = animation?.effect?.getTiming();
        draw(true);
        const sameEntranceOnRedraw = document.querySelector('.game-final-layer') === layer
          && layer.getAnimations().length === animations.length
          && layer.getAnimations()[0] === animation;
        // ready resolves only once the browser has assigned a start time.
        if (animation) await animation.ready;
        const started = animation ? !animation.pending && animation.startTime !== null : false;
        if (animation) await animation.finished;
        const finished = animation?.playState;
        const opacity = getComputedStyle(layer).opacity;
        draw(true);
        const sameAnimation = layer.getAnimations()[0] === animation;
        animation?.cancel();
        return { count: animations.length, frames, duration: timing?.duration, easing: timing?.easing,
          iterations: timing?.iterations, sameEntranceOnRedraw, started, finished, opacity, resting: getComputedStyle(layer).opacity, sameAnimation };
      });
      expect(result.count).toBe(reduced ? 0 : 1);
      expect(result.sameEntranceOnRedraw).toBe(true);
      expect(result.opacity).toBe('1');
      expect(result.resting).toBe('1');
      if (!reduced) {
        expect(result.frames).toEqual(['0', '1']);
        expect(result.duration).toBe(crossfade({ reduced: false }).incoming.options.duration);
        const bezierValues = (easing: string | undefined) => easing?.match(/-?\d*\.?\d+/g)?.map(Number);
        expect(bezierValues(result.easing)).toEqual(bezierValues(crossfade({ reduced: false }).incoming.options.easing));
        expect(result.iterations).toBe(1);
        expect(result.started).toBe(true);
        expect(result.finished).toBe('finished');
        expect(result.sameAnimation).toBe(true);
      }
      await page.close();
    }
  } finally { await browser.close(); }
}, 30000);
