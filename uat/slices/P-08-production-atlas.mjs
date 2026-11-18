// PP-030, PP-031, PERF-020. Direct execution always builds and previews production.
// node uat/slices/P-08-production-atlas.mjs
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Node executes this slice directly; resolve the UI source's extensionless TS imports.
const uiSource = new URL('../../packages/ui/src/', import.meta.url).href;
const themeHook = registerHooks({ resolve(specifier, context, nextResolve) {
  const url = new URL(specifier, context.parentURL ?? import.meta.url);
  return nextResolve(url.href.startsWith(uiSource) && !/\.[^/]+$/.test(url.pathname) ? url.href + '.ts' : specifier, context);
} });
const themeModule = /** @type {unknown} */ (await import(new URL('../../packages/ui/src/themes.ts', import.meta.url).href));
const { THEMES } = /** @type {typeof import('../../packages/ui/src/themes')} */ (themeModule);
themeHook.deregister();
/** @param {import('../../tools/uat/harness.ts').Harness} h */
export default async function productionAtlas(h) {
  assert.equal(h.maxPhones, 1, 'Use one phone');
  // Prevent an accidental dev-server run from passing this production regression.
  const html = await (await h.host.request.get(h.origin)).text();
  assert.ok(!html.includes('/@vite/client') && html.includes('/assets/'), 'Production HTML required');
  await h.createRoom();
  const phone = await h.newPhone();
  await phone.setViewportSize({ width: 844, height: 390 });
  await h.openJoin(phone, 'Player 1');
  await phone.getByRole('button', { name: 'Join', exact: true }).click();
  await h.waitSeated(phone, 'Player 1');
  await phone.getByRole('button', { name: 'Pick a game', exact: true }).click();
  await h.host.locator('[data-game="tabao-rush"][data-focused="true"]').waitFor();
  await phone.getByRole('button', { name: 'Next', exact: true }).click();
  await h.host.locator('[data-game="peek-poker"][data-focused="true"]').waitFor();
  await phone.getByRole('button', { name: 'Select', exact: true }).click();
  await h.host.locator('[data-game="peek-poker"][data-expanded="true"]').waitFor();
  await phone.getByRole('button', { name: 'Start', exact: true }).click();
  await h.host.locator('.pp-table[data-phase="memorise"]').waitFor();
  // Shoot settled frames: wait until finite animations (the Starting crossfade, the phone theme change) end.
  /** @param {import('playwright').Page} page */
  const settled = page => page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity));
  await settled(h.host); await settled(phone);
  await phone.getByText('Watch the TV', { exact: true }).waitFor();
  const paint = await phone.locator('.ka-layout-engine:not(.ka-layout-ghost) > .ka-layout-surface').evaluate((surface, expected) => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = expected.colour; probe.style.backgroundImage = expected.treatment.image;
    document.body.append(probe);
    const reference = getComputedStyle(probe);
    const expectedColour = reference.backgroundColor, expectedImage = reference.backgroundImage;
    probe.remove();
    const css = getComputedStyle(surface);
    /** @param {string} colour */
    const luminance = colour => {
      const channels = (colour.match(/[\d.]+/g) ?? []).map(Number);
      if (channels.length < 3 || (channels.length > 3 && channels[3] !== 1)) throw Error(`Expected opaque RGB colour: ${colour}`);
      return channels.slice(0, 3).reduce((sum, c, i) => {
        const v = c / 255;
        return sum + (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4) * ([0.2126, 0.7152, 0.0722][i] ?? 0);
      }, 0);
    };
    const background = luminance(css.backgroundColor);
    const texts = [...document.querySelectorAll('.ka-layout-engine:not(.ka-layout-ghost) .ka-layout-text, .ka-layout-engine:not(.ka-layout-ghost) .ka-private-stat-label, .ka-layout-engine:not(.ka-layout-ghost) .ka-private-stat-value')];
    return { colour: css.backgroundColor, image: css.backgroundImage, expectedColour, expectedImage,
      texts: texts.map(el => {
        const foreground = luminance(getComputedStyle(el).color);
        return { text: el.textContent, contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) };
      }) };
  }, THEMES['peek-poker'].background);
  // K1 Green baize: the same base and weave painted by development tokens.css.
  assert.equal(paint.colour, paint.expectedColour, 'Phone must paint the development felt colour');
  assert.equal(paint.image, paint.expectedImage, 'Phone must paint the felt weave');
  assert.ok(paint.texts.some(t => t.text === 'Watch the TV') && paint.texts.some(t => t.text === 'Seconds') && paint.texts.some(t => /^\d+$/.test(t.text)), 'All memorise text must be checked');
  for (const text of paint.texts) assert.ok(text.contrast >= 4.5, `${text.text}: contrast ${String(text.contrast)} must be at least 4.5:1`);
  await h.shot('production-tv-memorise', h.host, undefined, false);
  await h.shot('production-phone', phone, undefined, false);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Same Node 24 source-specifier hook as tools/uat/run.mjs.
  const library = new URL('../../tools/uat/', import.meta.url).href;
  registerHooks({ resolve(specifier, context, nextResolve) {
    const url = new URL(specifier, context.parentURL ?? import.meta.url);
    return nextResolve(url.href.startsWith(library) && url.pathname.endsWith('.js') ? url.href.replace(/\.js$/, '.ts') : specifier, context);
  } });
  const entry = new URL('../../tools/uat/runner.ts', import.meta.url).href;
  const loaded = /** @type {unknown} */ (await import(entry));
  const { run } = /** @type {typeof import('../../tools/uat/runner.js')} */ (loaded);
  await run(['P-08-production-atlas', '--phones', '1', ...process.argv.slice(2)], {
    production: true, command: ['node uat/slices/P-08-production-atlas.mjs', ...process.argv.slice(2)].join(' '), script: fileURLToPath(import.meta.url), execute: productionAtlas,
  });
}
