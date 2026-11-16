import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COLOUR_TOKEN_NAMES, COLOUR_TOKENS } from './colour';
import { renderTokensCss } from './css';
import { renderSpecimenHtml } from './specimen';
import { THEME_NAMES } from './themes';

const read = (name: string): string => readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8');
const REBUILD = 'out of date: run `node packages/ui/scripts/build.mjs`';

describe('generated files', () => {
  it('tokens.css is exactly what the typed tokens produce', () => {
    expect(read('tokens.css') === renderTokensCss(), REBUILD).toBe(true);
  });

  it('specimen.html is exactly what the typed tokens produce', () => {
    expect(read('specimen.html') === renderSpecimenHtml(), REBUILD).toBe(true);
  });

  it('builds the same text every time', () => {
    expect(renderTokensCss()).toBe(renderTokensCss());
    expect(renderSpecimenHtml()).toBe(renderSpecimenHtml());
  });
});

describe('tokens.css', () => {
  const css = renderTokensCss();

  it('has a block per theme, with the console as the default', () => {
    expect(css).toContain(':root,\n[data-theme="console"] {');
    for (const name of THEME_NAMES) expect(css).toContain(`[data-theme="${name}"] {`);
  });

  it('exposes every named colour token', () => {
    for (const name of COLOUR_TOKEN_NAMES) expect(css).toContain(`--ka-${name}: ${COLOUR_TOKENS[name]};`);
  });

  it('exposes the motion tokens', () => {
    for (const line of [
      '--ka-seat-numeral: #2B2118;',
      '--ka-team-text-weight: 700;',
      '--ka-phone-type-89: 89px;',
      '--ka-duration-fast: 144ms;',
      '--ka-duration-base: 233ms;',
      '--ka-duration-slow: 377ms;',
      '--ka-duration-fast-exit: 115ms;',
      '--ka-duration-base-exit: 186ms;',
      '--ka-duration-slow-exit: 302ms;',
      '--ka-ease-out: cubic-bezier(.16,1,.3,1);',
      '--ka-ease-in-out: cubic-bezier(.65,0,.35,1);',
      '--ka-stagger: 30ms;',
      '--ka-press-scale: 0.97;',
      '--ka-popover-start-scale: 0.95;',
      '--ka-knob-stretch: 0.12;',
      '--ka-tv-safe-margin: 55px;',
      '--ka-button-face-floor: 110px;',
      '--ka-button-in-play-width-floor: 89px;',
      '--ka-button-in-play-height-floor: 68px;',
      '--ka-button-minimum-floor: 55px;',
    ]) {
      expect(css).toContain(line);
    }
  });

  it('collapses every duration and delay under reduced motion, and keeps the pressed state', () => {
    const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf('\n}\n', start));
    const timed = [...css.slice(0, start).matchAll(/(--ka-(?:duration-[a-z-]+|stagger)): \d+ms;/g)].map((m) => m[1]);
    expect(timed.length).toBeGreaterThanOrEqual(9);
    for (const property of timed) expect(block).toContain(`${String(property)}: 0ms;`);
    expect(block).not.toContain('--ka-press-scale');
  });

  it('presses instantly and eases release; sizes use the long side with a vh fallback', () => {
    expect(css).toContain('.ka-pressable {\n  transition: transform var(--ka-duration-fast) var(--ka-ease-out);');
    expect(css).toContain('.ka-pressable[data-pressed="true"] {\n  transition: none;\n  transform: scale(var(--ka-press-scale));');
    expect(css).toContain('calc(max(100vw, 100vh) * 110 / 844)');
    expect(css).toContain('calc(min(100vw, 100vh) * 110 / 390)');
    expect(css).toContain('@supports (height: 100svh)');
    expect(css).toContain('calc(max(100vw, 100svh) * 110 / 844)');
    expect(css).toContain('calc(min(100vw, 100svh) * 110 / 390)');
  });

  it('loads nothing from the network', () => {
    expect(css).not.toMatch(/https?:|@import|url\(/);
  });
});

describe('specimen.html', () => {
  const html = renderSpecimenHtml();

  it('uses D-056 tokens for seat badges, team text and stick outlines', () => {
    expect(html).toContain('color: var(--ka-seat-numeral)');
    expect(html).toContain('font-weight: var(--ka-team-text-weight)');
    expect(html).toContain('border: 3px dashed var(--ka-stick-outline)');
  });

  it('is self-contained', () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/<link|src=|@import/);
  });

  it('embeds each motion twice: as it moves, and as reduced motion', () => {
    const match = /<script type="application\/json" id="motions">(.*?)<\/script>/s.exec(html);
    expect(match).not.toBeNull();
    const data = JSON.parse(match?.[1] ?? '{}') as Record<
      'normal' | 'reduced',
      { steps: Record<string, { motion: { options: { duration: number; delay: number } } }[]>; count: { values: number[] } }
    >;
    const names = ['press', 'menu', 'stagger', 'expand', 'arc', 'pulse', 'crossfade', 'card'];
    expect(Object.keys(data.normal.steps)).toEqual(names);
    expect(Object.keys(data.reduced.steps)).toEqual(names);
    for (const name of names) {
      for (const step of data.reduced.steps[name] ?? []) {
        expect(step.motion.options).toMatchObject({ duration: 0, delay: 0 });
      }
      expect((data.normal.steps[name] ?? []).some((step) => step.motion.options.duration > 0)).toBe(true);
    }
    expect(data.normal.count.values.at(-1)).toBe(1250);
    expect(data.reduced.count.values).toEqual([1250]);
  });
});
