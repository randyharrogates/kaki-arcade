import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RADIUS_PILLS,
  RADIUS_SCALE,
  SPACING_SCALE,
  collectFiles,
  formatFinding,
  lintSource,
  lintTree,
  run,
} from './lint_design.mjs';

const rules = (file: string, text: string) => lintSource(file, text).map((f) => f.rule);
const at = (file: string, text: string) => lintSource(file, text).map((f) => [f.line, f.rule]);

describe('code that cannot draw', () => {
  const maths = 'export const GOLDEN = 0x9e3779b9;\nexport const tile = { gap: 1, padding: 2 };\n';

  it.each([
    'packages/sim-core/src/rng.ts',
    'packages/protocol/src/codec.ts',
    'packages/netcode/src/seq.ts',
    'games/tabao-rush/src/rules/items.ts',
    'games/tabao-rush/src/levels/level1.ts',
    'games/rabakz/src/sim/score.ts',
  ])('is not linted: %s', (file) => {
    expect(lintSource(file, maths)).toEqual([]);
  });

  it.each(['games/tabao-rush/src/view/hud.ts', 'packages/platform/src/lobby.ts', 'apps/web/src/rules.ts'])(
    'is still linted: %s',
    (file) => {
      expect(lintSource(file, maths).length).toBeGreaterThan(0);
    },
  );
});

describe('scales', () => {
  it('keeps hairline steps and pills for radii only', () => {
    expect([...SPACING_SCALE]).toEqual([0, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]);
    expect(RADIUS_SCALE.filter((value) => !SPACING_SCALE.includes(value))).toEqual([1, 2, 3]);
    expect(SPACING_SCALE.every((value) => RADIUS_SCALE.includes(value))).toBe(true);
    expect([...RADIUS_PILLS]).toEqual([999, 9999]);
  });
});

describe('spacing in CSS', () => {
  it('accepts values on the scale in every watched property', () => {
    const css = `
.card {
  padding: 13px 21px;
  padding-inline-start: 5px;
  margin: 0 auto 34px;
  margin-top: -8px;
  scroll-margin-top: 55px;
  scroll-padding: 8px;
  gap: 8px;
  row-gap: 5px;
  column-gap: 13px;
  grid-gap: 21px;
  grid-row-gap: 8px;
  outline-offset: 5px;
  inset: 0px;
  inset-block: 55px;
  top: 0;
  right: 89px;
  bottom: 144px;
  left: 233px;
  width: 50vw;
  margin-left: 10%;
}`;
    expect(lintSource('games/rabakz/src/card.css', css)).toEqual([]);
  });

  it.each([
    ['padding', 'padding: 4px;'],
    ['padding side', 'padding-left: 10px;'],
    ['margin', 'margin: 16px;'],
    ['negative margin', 'margin-top: -4px;'],
    ['gap', 'gap: 12px;'],
    ['row-gap', 'row-gap: 6px;'],
    ['column-gap', 'column-gap: 24px;'],
    ['grid-gap', 'grid-gap: 10px;'],
    ['grid-column-gap', 'grid-column-gap: 10px;'],
    ['scroll-margin', 'scroll-margin: 10px;'],
    ['scroll-margin side', 'scroll-margin-top: 10px;'],
    ['scroll-padding', 'scroll-padding: 4px;'],
    ['scroll-padding logical side', 'scroll-padding-inline-start: 4px;'],
    ['outline-offset', 'outline-offset: 4px;'],
    ['inset', 'inset: 7px;'],
    ['inset-inline', 'inset-inline: 20px;'],
    ['top', 'top: 4px;'],
    ['right', 'right: 4px;'],
    ['bottom', 'bottom: 4px;'],
    ['left', 'left: 4px;'],
    ['fractional value', 'padding: 0.5px;'],
    ['value inside calc', 'margin: calc(100% - 4px);'],
    ['1px, which only radii may use', 'padding: 1px;'],
    ['2px, which only radii may use', 'gap: 2px;'],
    ['3px, which only radii may use', 'top: 3px;'],
    ['999px, which only radii may use', 'padding: 999px;'],
  ])('rejects an off-scale %s', (_name, declaration) => {
    expect(rules('apps/web/src/a.css', `.a { ${declaration} }`)).toEqual(['spacing-scale']);
  });

  it('reports each off-scale value in a shorthand, with line and column', () => {
    const findings = lintSource('apps/web/src/a.css', '.a {\n  padding: 4px 8px 6px;\n}');
    expect(findings.map((f) => [f.line, f.column, f.rule])).toEqual([
      [2, 12, 'spacing-scale'],
      [2, 20, 'spacing-scale'],
    ]);
    expect(findings[0]?.message).toBe(
      '4px in "padding" is not on the spacing scale (0, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377)',
    );
  });

  it('follows a value across lines', () => {
    expect(at('apps/web/src/a.css', '.a {\n  margin:\n    4px\n    8px;\n}')).toEqual([
      [3, 'spacing-scale'],
    ]);
  });

  it('does not lint CSS comments', () => {
    const css = '/* padding: 4px; color: #fff; */\n.a { gap: 8px /* was 6px */; }';
    expect(lintSource('apps/web/src/a.css', css)).toEqual([]);
  });

  it('leaves properties it does not watch alone', () => {
    const css = '.a { width: 100px; height: 44px; font-size: 14px; border: 4px solid; line-height: 18px; }';
    expect(lintSource('apps/web/src/a.css', css)).toEqual([]);
  });

  it('applies inside packages/ui as well', () => {
    expect(rules('packages/ui/src/tokens.css', '.a { padding: 4px; }')).toEqual(['spacing-scale']);
  });
});

describe('border radius', () => {
  it('accepts the radius scale, pills and percentages', () => {
    const css = `.a { border-radius: 1px; border-top-left-radius: 2px; border-start-end-radius: 3px;
  border-radius: 13px 999px; border-radius: 9999px; border-radius: 50%; }`;
    expect(lintSource('apps/web/src/a.css', css)).toEqual([]);
    expect(lintSource('apps/web/src/a.ts', "const s = { borderRadius: '999px', borderTopLeftRadius: 2 };")).toEqual([]);
  });

  it.each([
    ['border-radius', 'border-radius: 4px;'],
    ['corner radius', 'border-top-left-radius: 6px;'],
    ['a pill that is not one of the two', 'border-radius: 1000px;'],
  ])('rejects an off-scale %s', (_name, declaration) => {
    const findings = lintSource('apps/web/src/a.css', `.a { ${declaration} }`);
    expect(findings.map((f) => f.rule)).toEqual(['spacing-scale']);
    expect(findings[0]?.message).toContain('is not on the radius scale (0, 1, 2, 3, 5,');
    expect(findings[0]?.message).toContain('or 999 or 9999 for a pill');
  });
});

describe('rem and em', () => {
  it.each([
    ['rem in padding', 'padding: 1rem;'],
    ['em in margin', 'margin: 0.5em auto;'],
    ['rem in gap', 'gap: 2rem;'],
    ['em in border-radius', 'border-radius: 1em;'],
    ['rem in top', 'top: 1rem;'],
  ])('rejects %s', (_name, declaration) => {
    const findings = lintSource('apps/web/src/a.css', `.a { ${declaration} }`);
    expect(findings.map((f) => f.rule)).toEqual(['spacing-unit']);
    expect(findings[0]?.message).toContain('not rem or em');
  });

  it('rejects rem in a style object and leaves other units and other properties alone', () => {
    expect(rules('apps/web/src/a.ts', "const s = { padding: '1rem' };")).toEqual(['spacing-unit']);
    const css = '.a { font-size: 1rem; width: 10em; padding: 2vw 5%; margin: 1vh; gap: 1fr; }';
    expect(lintSource('apps/web/src/a.css', css)).toEqual([]);
  });
});

describe('spacing in script files', () => {
  it('checks px strings on camelCase and quoted keys', () => {
    const ts = `
export const style = {
  paddingTop: '4px',
  marginInlineStart: "10px",
  rowGap: \`6px\`,
  borderRadius: '12px',
  scrollMarginTop: '7px',
  outlineOffset: '4px',
  'padding-left': '4px',
  top: '4px',
};`;
    expect(at('games/peek-poker/src/view.ts', ts)).toEqual(
      [3, 4, 5, 6, 7, 8, 9, 10].map((line) => [line, 'spacing-scale']),
    );
  });

  it('checks bare numbers as pixels', () => {
    const ts = 'const s = {\n  padding: 4,\n  gap: 12,\n  borderRadius: 6,\n  marginTop: -4,\n  rowGap: 1.5\n};';
    const findings = lintSource('games/rabakz/src/s.ts', ts);
    expect(findings.map((f) => [f.line, f.column, f.rule])).toEqual([
      [2, 12, 'spacing-scale'],
      [3, 8, 'spacing-scale'],
      [4, 17, 'spacing-scale'],
      [5, 15, 'spacing-scale'],
      [6, 11, 'spacing-scale'],
    ]);
    expect(findings[0]?.message).toContain('4 in "padding" is not on the spacing scale');
    expect(findings[2]?.message).toContain('6 in "borderRadius" is not on the radius scale');
  });

  it('checks a one-line style object in TSX', () => {
    const tsx = '<div style={{ padding: 4, gap: 12, borderRadius: 6 }} />';
    expect(rules('apps/web/src/A.tsx', tsx)).toEqual(['spacing-scale', 'spacing-scale', 'spacing-scale']);
  });

  it('accepts on-scale strings and numbers', () => {
    const tsx = `
export const Card = () => (
  <div style={{ padding: '13px 21px', marginTop: '-8px', gap: 8, borderRadius: 3, margin: 0 }} />
);`;
    expect(lintSource('apps/web/src/Card.tsx', tsx)).toEqual([]);
  });

  it('does not treat a bare number in top, right, bottom or left as pixels', () => {
    const ts = 'const DIRECTION = { top: 0, right: 1, bottom: 2, left: 3 };\nconst tile = { left: 4, top: 7 };';
    expect(lintSource('games/tabao-rush/src/grid.ts', ts)).toEqual([]);
    expect(lintSource('apps/web/src/A.tsx', '<Box top={4} left="7" />')).toEqual([]);
  });

  it('only treats a number as a value when it is the whole value', () => {
    const ts = 'const s = { padding: 4 * unit, gap: 12 + n, margin: n, rowGap: count };\ntype T = { padding: number };';
    expect(lintSource('games/rabakz/src/s.ts', ts)).toEqual([]);
  });

  it('checks JSX attributes written as strings, braced strings and numbers', () => {
    const tsx = [
      '<Stack gap="12px" />',
      '<Stack padding={"4px"} />',
      "<Stack padding={'4px'} />",
      '<Stack padding={`4px`} />',
      '<Stack padding={4} />',
      '<Stack gap={ 12 } />',
      '<Stack gap="12" />',
      '<Stack borderRadius={6} />',
      '<Stack margin="1rem" />',
    ].join('\n');
    expect(at('apps/web/src/A.tsx', tsx)).toEqual([
      [1, 'spacing-scale'],
      [2, 'spacing-scale'],
      [3, 'spacing-scale'],
      [4, 'spacing-scale'],
      [5, 'spacing-scale'],
      [6, 'spacing-scale'],
      [7, 'spacing-scale'],
      [8, 'spacing-scale'],
      [9, 'spacing-unit'],
    ]);
  });

  it('accepts on-scale JSX attributes and ignores other attributes and comparisons', () => {
    const tsx = [
      '<Stack gap="13px" padding={8} margin={"5px 8px"} borderRadius={2} width={4} size="12px" />',
      "if (padding === '4px' || gap == 12) {}",
      'const total = gap + 12;',
    ].join('\n');
    expect(lintSource('apps/web/src/A.tsx', tsx)).toEqual([]);
  });

  it('checks a spacing value kept in a variable named after the property', () => {
    expect(rules('apps/web/src/a.ts', "const padding = '4px';")).toEqual(['spacing-scale']);
  });

  it('checks writes to element.style', () => {
    const ts = [
      "el.style.padding = '4px';",
      'el.style.marginTop = `6px`;',
      "node.style['padding-left'] = '4px';",
      "el.style.setProperty('gap', '12px');",
      "el.style.borderRadius = '4px';",
      "el.style.top = '1rem';",
    ].join('\n');
    expect(at('packages/platform/src/dom.ts', ts)).toEqual([
      [1, 'spacing-scale'],
      [2, 'spacing-scale'],
      [3, 'spacing-scale'],
      [4, 'spacing-scale'],
      [5, 'spacing-scale'],
      [6, 'spacing-unit'],
    ]);
  });

  it('accepts on-scale writes to element.style and writes to other properties', () => {
    const ts = "el.style.padding = '8px';\nel.style.width = '4px';\nel.style.setProperty('gap', '13px');\nconst y = rect.top;";
    expect(lintSource('packages/platform/src/dom.ts', ts)).toEqual([]);
  });

  it('checks CSS written inside a template string', () => {
    const ts = ['const b = css`', '  margin: 16px;', '  gap: 8px;', '  padding: 0 auto;', '`;'].join('\n');
    expect(at('packages/ui/src/a.ts', ts)).toEqual([[2, 'spacing-scale']]);
  });

  it('does not read past the end of a style value', () => {
    const ts = "const s = { padding: '8px', fontSize: '14px', width: '100px', lineHeight: '18px' };";
    expect(lintSource('games/rabakz/src/s.ts', ts)).toEqual([]);
  });

  it('scans .js, .mjs and .jsx like TypeScript', () => {
    for (const file of ['games/rabakz/a.js', 'games/rabakz/a.mjs', 'games/rabakz/a.jsx']) {
      expect(rules(file, "export const s = { padding: 4, color: '#fff' };")).toEqual([
        'spacing-scale',
        'raw-colour',
      ]);
    }
  });
});

describe('custom properties', () => {
  it('checks px values outside packages/ui', () => {
    const css = ':root {\n  --gap: 4px;\n  --card-radius: 6px;\n  --hairline: 1px;\n  --ok-gap: 8px;\n  --ok-radius: 2px;\n  --text: 1rem;\n}';
    expect(at('games/rabakz/src/a.css', css)).toEqual([
      [2, 'spacing-scale'],
      [3, 'spacing-scale'],
      [4, 'spacing-scale'],
    ]);
  });

  it('checks custom properties set from script', () => {
    const ts = "const s = { '--gap': '4px' };\nel.style.setProperty('--pad', '6px');\nel.style.setProperty('--pad', '8px');";
    expect(at('games/rabakz/src/a.ts', ts)).toEqual([
      [1, 'spacing-scale'],
      [2, 'spacing-scale'],
    ]);
  });

  it('leaves the tokens package free to define any value', () => {
    const css = ':root { --space-0: 4px; --radius-odd: 6px; }';
    expect(lintSource('packages/ui/src/tokens.css', css)).toEqual([]);
  });
});

describe('markup files', () => {
  it('checks inline styles, style blocks and attributes in HTML', () => {
    const html = [
      '<style>.a { padding: 4px; }</style>',
      '<div style="margin: 6px; gap: 8px">',
      '<kaki-stack gap="12px"></kaki-stack>',
      '<p style="color: #fff">x</p>',
      '<!-- padding: 4px; #fff -->',
    ].join('\n');
    expect(at('apps/web/index.html', html)).toEqual([
      [1, 'spacing-scale'],
      [2, 'spacing-scale'],
      [3, 'spacing-scale'],
      [4, 'raw-colour'],
    ]);
  });

  it('checks colours in SVG and leaves link targets alone', () => {
    const svg = [
      '<svg><defs><linearGradient id="abc"/></defs>',
      '<rect fill="#ff0000" stroke="rgb(0,0,0)"/>',
      '<rect fill="url(#abc)" clip-path="url(#fade)"/>',
      '<use href="#abc"/><use xlink:href="#bed"/>',
      '</svg>',
    ].join('\n');
    expect(at('games/rabakz/art/icon.svg', svg)).toEqual([
      [2, 'raw-colour'],
      [2, 'raw-colour'],
    ]);
  });
});

describe('raw colours', () => {
  it.each([
    ['#rgb', 'color: #fff;'],
    ['#rgba', 'color: #fff8;'],
    ['#rrggbb', 'background: #1A2b3C;'],
    ['#rrggbbaa', 'background: #1a2b3c80;'],
    ['an all-digit hex', 'color: #123456;'],
    ['rgb(', 'color: rgb(0 0 0);'],
    ['rgba(', 'color: rgba(0, 0, 0, 0.5);'],
    ['hsl(', 'color: hsl(120 50% 50%);'],
    ['hsla(', 'color: HSLA(120, 50%, 50%, 0.5);'],
    ['oklch(', 'color: oklch(70% 0.1 120);'],
    ['oklab(', 'color: oklab(70% 0.1 0.1);'],
    ['lab(', 'color: lab(50% 40 59);'],
    ['lch(', 'color: lch(50% 70 60);'],
    ['hwb(', 'color: hwb(120 0% 0%);'],
    ['color-mix(', 'color: color-mix(in srgb, var(--a), var(--b));'],
    ['color(', 'color: color(display-p3 1 0 0);'],
    ['relative color(', 'color: color(from var(--a) srgb r g b);'],
  ])('rejects %s outside packages/ui', (_name, declaration) => {
    expect(rules('games/tabao-rush/src/a.css', `.a { ${declaration} }`)).toEqual(['raw-colour']);
  });

  it('rejects numeric colour literals', () => {
    const ts = 'sprite.tint = 0xff0000;\nconst a = 0xFF000080;\ng.fill(0x1a2b3c);';
    expect(at('games/tabao-rush/src/draw.ts', ts)).toEqual([
      [1, 'raw-colour'],
      [2, 'raw-colour'],
      [3, 'raw-colour'],
    ]);
  });

  it('does not treat other hex numbers as colours', () => {
    const ts = 'const a = 0xff; const b = 0x1234; const c = 0x12345; const d = 0x1234567; const e = 0x123456789;';
    expect(lintSource('packages/sim-core/src/rng.ts', ts)).toEqual([]);
  });

  it('rejects colour literals in strings, template strings and script comments', () => {
    const ts = "const ink = '#102030';\nconst glow = `rgba(${r}, 0, 0, 1)`;\n// was #fff\nconst css = `a { color: #abc; }`;";
    expect(at('packages/platform/src/a.ts', ts)).toEqual([
      [1, 'raw-colour'],
      [2, 'raw-colour'],
      [3, 'raw-colour'],
      [4, 'raw-colour'],
    ]);
    expect(rules('apps/web/src/A.tsx', '<p style={{ color: "#abc" }} />')).toEqual(['raw-colour']);
  });

  it('still scans test files', () => {
    expect(rules('games/rabakz/src/view.test.ts', "expect(colour).toBe('#ff0000');")).toEqual(['raw-colour']);
    expect(rules('games/rabakz/src/view.test.tsx', "expect(colour).toBe('#ff0000');")).toEqual(['raw-colour']);
  });

  it('allows colour literals inside packages/ui', () => {
    const css = ':root { --ink: #102030; --glow: rgba(0, 0, 0, 0.5); --leaf: oklch(70% 0.1 120); }';
    expect(lintSource('packages/ui/src/tokens.css', css)).toEqual([]);
    expect(lintSource('packages/ui/src/tokens.ts', "export const ink = '#102030'; const n = 0xff0000;")).toEqual([]);
    expect(lintSource('packages\\ui\\src\\tokens.ts', "export const ink = '#102030';")).toEqual([]);
  });

  it('does not treat a look-alike folder as packages/ui', () => {
    expect(rules('packages/ui-extra/src/a.ts', "const c = '#fff';")).toEqual(['raw-colour']);
    expect(rules('games/rabakz/packages/ui/a.ts', "const c = '#fff';")).toEqual(['raw-colour']);
  });

  it('does not treat private class members as colours', () => {
    const ts = [
      'class Deck {',
      '  #add = 1;',
      '  static #fade = 2;',
      '  readonly #bed: number;',
      '  #cab;',
      '  #dad() { return this.#add + Deck.#fade; }',
      '  has(o: object) { return #bed in o && o?.#cab; }',
      '}',
    ].join('\n');
    expect(lintSource('games/peek-poker/src/deck.ts', ts)).toEqual([]);
  });

  it('still sees a colour in a string next to private members and inside ${}', () => {
    const ts = "class A { #add = '#add'; paint() { return `${this.#add} ${'#fff'} #abc`; } }";
    expect(lintSource('games/peek-poker/src/a.ts', ts).map((f) => f.column)).toEqual([19, 60, 67]);
  });

  it('is not thrown by quotes inside comments and regular expressions', () => {
    const ts = [
      "// don't",
      "const a = '#fff';",
      "const quote = /'/;",
      'class B { #abc = 1; }',
      "const b = x.replace(/[\"'`]/g, '') + '#abc';",
      '/* it`s */ class C { #def = 2; }',
    ].join('\n');
    expect(lintSource('games/peek-poker/src/a.ts', ts).map((f) => [f.line, f.column])).toEqual([
      [2, 12],
      [5, 38],
    ]);
  });

  it('does not treat link targets or CSS id selectors as colours', () => {
    const tsx = '<a href="#abc">x</a>;\nconst u = \'url(#fade)\';\n<use href={"#bed"} xlinkHref=\'#cab\' />';
    expect(lintSource('apps/web/src/A.tsx', tsx)).toEqual([]);
    const css = '#abc { gap: 8px; }\n#fade\n{ gap: 8px; }\n.a { mask: url(#bed); fill: url("#cab"); }';
    expect(lintSource('apps/web/src/a.css', css)).toEqual([]);
  });

  it('skips an all-digit #123 in a comment or after a reference word', () => {
    const ts = [
      '// fixed in #4821, and #100 too',
      '/* #123 */',
      "const a = 'see #123';",
      "const b = 'Issue #4821';",
      "const c = 'PR #123456';",
      "const d = 'Player #100';",
      "const e = 'No. #123';",
      "const f = 'no #123';",
    ].join('\n');
    expect(lintSource('games/rabakz/src/a.ts', ts)).toEqual([]);
  });

  it('still reports an all-digit colour in a string, and a lettered one in a comment', () => {
    const ts = "const a = '#123';\nconst b = { fill: '#000000' };\n// was #12f";
    expect(at('games/rabakz/src/a.ts', ts)).toEqual([
      [1, 'raw-colour'],
      [2, 'raw-colour'],
      [3, 'raw-colour'],
    ]);
  });

  it('ignores other things that only look like colours', () => {
    const ts = [
      "const a = 'var(--ink)';",
      "const b = '#12345';", // five digits is not a colour
      "const c = '#1234567';", // nor seven
      "const d = 'page#abc';", // URL fragment
      "const e = '&#123;';", // character reference
      "const g = '#header-top';",
      'const h = argb(1); const i = myhsl(2); const j = color(d); const k = theme.color(1);',
    ].join('\n');
    expect(lintSource('games/rabakz/src/a.ts', ts)).toEqual([]);
  });
});

describe('design-lint-ignore', () => {
  it('excuses one finding on its line when a reason is given, in every comment style', () => {
    const cases: [string, string][] = [
      ['apps/web/src/a.css', '.a { padding: 4px; } /* design-lint-ignore: matches the 4px sprite grid */'],
      ['games/rabakz/src/a.ts', "const c = '#fff'; // design-lint-ignore: test fixture"],
      ['games/rabakz/src/a.ts', "const c = '#fff'; /* design-lint-ignore: test fixture */"],
      ['apps/web/src/A.tsx', '<Stack gap={12} /> {/* design-lint-ignore: legacy embed */}'],
      ['apps/web/index.html', '<p style="color: #fff"> <!-- design-lint-ignore: email markup -->'],
    ];
    for (const [file, text] of cases) expect(lintSource(file, text)).toEqual([]);
  });

  it('excuses only the leftmost finding, and says so on the rest', () => {
    const css = '.b { color: #fff; margin: 6px; } /* design-lint-ignore: third-party embed */';
    const findings = lintSource('apps/web/src/a.css', css);
    expect(findings.map((f) => [f.column, f.rule])).toEqual([[27, 'spacing-scale']]);
    expect(findings[0]?.message).toContain('use design-lint-ignore-line for the whole line');
  });

  it('lets two markers excuse two findings', () => {
    const css = '.b { color: #fff; margin: 6px; } /* design-lint-ignore: a */ /* design-lint-ignore: b */';
    expect(lintSource('apps/web/src/a.css', css)).toEqual([]);
  });

  it('excuses the whole line with design-lint-ignore-line', () => {
    const css = '.b { color: #fff; margin: 6px 7px; } /* design-lint-ignore-line: third-party embed */';
    expect(lintSource('apps/web/src/a.css', css)).toEqual([]);
    const ts = "const s = { padding: 4, color: '#fff' }; // design-lint-ignore-line: fixture";
    expect(lintSource('games/rabakz/src/a.ts', ts)).toEqual([]);
  });

  it('does not excuse other lines', () => {
    const css = '/* design-lint-ignore-line: only this line */\n.a { padding: 4px; }';
    expect(at('apps/web/src/a.css', css)).toEqual([[2, 'spacing-scale']]);
  });

  it('does nothing when the marker is in a string rather than a comment', () => {
    const cases: [string, string][] = [
      ['games/rabakz/src/a.ts', "const c = '#fff', why = 'design-lint-ignore: not a comment';"],
      ['games/rabakz/src/a.ts', "const c = '#fff', why = `design-lint-ignore-line: not a comment`;"],
      ['apps/web/src/a.css', '.a::after { content: "design-lint-ignore: no"; padding: 4px; }'],
      ['apps/web/index.html', '<p title="design-lint-ignore: no" style="padding: 4px">'],
    ];
    for (const [file, text] of cases) expect(lintSource(file, text)).toHaveLength(1);
  });

  it.each([
    ['no colon', '.a { padding: 4px; } /* design-lint-ignore */'],
    ['an empty reason', '.a { padding: 4px; } /* design-lint-ignore: */'],
    ['a blank reason', '.a { padding: 4px; } /* design-lint-ignore:    */'],
    ['no reason on the line form', '.a { padding: 4px; } /* design-lint-ignore-line: */'],
  ])('reports a marker with %s and excuses nothing', (_name, css) => {
    expect(rules('apps/web/src/a.css', css)).toEqual(['spacing-scale', 'ignore-reason']);
  });
});

describe('scanning a tree', () => {
  const roots: string[] = [];
  const makeTree = (files: Record<string, string>) => {
    const root = mkdtempSync(join(tmpdir(), 'lint-design-'));
    roots.push(root);
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
    return root;
  };

  afterEach(() => {
    vi.restoreAllMocks();
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it('scans the listed extensions under apps, packages and games only', () => {
    const bad = '.a { padding: 4px; color: #fff; }';
    const root = makeTree({
      'apps/web/src/a.css': bad,
      'apps/web/index.html': '<p></p>',
      'packages/ui/src/b.ts': 'export {};',
      'games/rabakz/src/c.tsx': 'export {};',
      'games/rabakz/src/c.test.ts': 'export {};',
      'games/rabakz/src/d.js': 'export {};',
      'games/rabakz/src/e.mjs': 'export {};',
      'games/rabakz/src/f.jsx': 'export {};',
      'games/rabakz/art/g.svg': '<svg/>',
      'games/rabakz/src/notes.md': bad,
      'games/rabakz/src/data.json': bad,
      'games/rabakz/dist/e.css': bad,
      'games/rabakz/node_modules/x/f.css': bad,
      'games/rabakz/.cache/g.css': bad,
      'tools/h.css': bad,
      'docs/i.css': bad,
      'j.css': bad,
    });
    expect(collectFiles(root)).toEqual([
      'apps/web/index.html',
      'apps/web/src/a.css',
      'games/rabakz/art/g.svg',
      'games/rabakz/src/c.test.ts',
      'games/rabakz/src/c.tsx',
      'games/rabakz/src/d.js',
      'games/rabakz/src/e.mjs',
      'games/rabakz/src/f.jsx',
      'packages/ui/src/b.ts',
    ]);
    const result = lintTree(root);
    expect(result.files).toBe(9);
    expect(result.findings.map(formatFinding)).toEqual([
      expect.stringMatching(/^apps\/web\/src\/a\.css:1:15 {2}spacing-scale {2}/),
      expect.stringMatching(/^apps\/web\/src\/a\.css:1:27 {2}raw-colour {2}/),
    ]);
  });

  it('passes on a tree with none of the scanned folders', () => {
    expect(lintTree(makeTree({ 'README.md': 'hello' }))).toEqual({ files: 0, findings: [] });
  });

  it('run() returns 0 and prints a summary when the tree is clean', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const root = makeTree({ 'games/rabakz/src/a.css': '.a { padding: 8px; }' });
    expect(run(root)).toBe(0);
    expect(log.mock.calls).toEqual([['design lint passed: 1 file(s) scanned']]);
    expect(error).not.toHaveBeenCalled();
  });

  it('run() returns 1 and prints file:line:column for each finding', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const root = makeTree({
      'games/rabakz/src/a.css': '.a {\n  padding: 4px;\n}',
      'games/rabakz/src/b.ts': 'export {};',
    });
    expect(run(root)).toBe(1);
    expect(error.mock.calls.map((call) => String(call[0]))).toEqual([
      'games/rabakz/src/a.css:2:12  spacing-scale  4px in "padding" is not on the spacing scale (0, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377)',
      'design lint failed: 1 finding(s) in 2 file(s) scanned',
    ]);
    expect(log).not.toHaveBeenCalled();
  });
});
