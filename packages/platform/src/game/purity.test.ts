import * as fs from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importsOf, readSources, scanSource, scanSources, stripCommentsAndStrings } from './kit';
import type { FolderReader } from './kit';
const HERE = dirname(fileURLToPath(import.meta.url));
const scan = (text: string, allowImports: string[] = []): string[] =>
  scanSource({ path: 'rules/step.ts', text }, { allowImports }).map(
    (finding) => `${String(finding.line)}: ${finding.what}`,
  );
describe('stripCommentsAndStrings', () => {
  it('blanks comments and string contents and keeps every position', () => {
    const text =
      "const a = 'Date.now()'; // setTimeout here\n/* Math.random\n * " + 'again */ const b = "x";';
    const code = stripCommentsAndStrings(text);
    expect(code).toHaveLength(text.length);
    expect(code.split('\n')).toHaveLength(3);
    expect(code).not.toMatch(/Date|setTimeout|Math|again/);
    expect(code).toMatch(/const a = ' {10}';/);
    expect(code).toMatch(/const b = " ";/);
  });
  it('keeps the code inside a template placeholder and blanks the text round it', () => {
    const code = stripCommentsAndStrings(
      'const s = `Date ${Math.random() + `inner ${Date.now()} text`.length} performance`;',
    );
    expect(code).toMatch(/Math\.random\(\)/);
    expect(code).toMatch(/Date\.now\(\)/);
    expect(code).not.toMatch(/inner|text|performance|`Date/);
  });
  it('copes with escapes, braces in placeholders, regular expressions and division', () => {
    expect(stripCommentsAndStrings("const q = 'it\\'s Date'; const d = Date;")).toMatch(
      /const d = Date;/,
    );
    expect(stripCommentsAndStrings("const q = 'it\\'s Date'; const d = 1;")).not.toMatch(/Date/);
    expect(stripCommentsAndStrings('const t = `${{ a: 1 }.a} Date`; const z = 2;')).toMatch(
      /const z = 2;$/,
    );
    expect(stripCommentsAndStrings('const t = `${{ a: 1 }.a} Date`;')).not.toMatch(/Date/);
    expect(stripCommentsAndStrings("const r = /Date['\"]\\/[/]x/g; const y = 'Intl';")).not.toMatch(
      /Date|Intl/,
    );
    expect(stripCommentsAndStrings('const half = total / 2; const d = Date; // x / y')).toMatch(
      /const d = Date;/,
    );
    expect(stripCommentsAndStrings("const u = 'a'; // it's fine\nconst d = Date;")).toMatch(
      /const d = Date;/,
    );
    expect(stripCommentsAndStrings("const open = 'never closed\nconst d = Date;")).toMatch(
      /const d = Date;/,
    );
  });
});
describe('scanSource', () => {
  it('catches every forbidden thing (so a clean result means something)', () => {
    const samples = [
      'const r = Math.random();',
      'const r = Math . random ()',
      'const r = Math\n  .random();',
      'const r = Math\n  // a comment in between\n  .random();',
      "const r = Math['random']();",
      'const m = Math;\nconst r = m.random();',
      'const { random } = Math;',
      'const roll = pickFrom(Math);',
      'const r = Math?.random();',
      'const s = `${Math.random()}`;',
      'const t = Date.now();',
      'const d = new Date();',
      'const { now } = Date;',
      'const t = performance.now();',
      'setTimeout(tick, 16);',
      'const id = setInterval(tick, 16);',
      'setImmediate(tick);',
      'queueMicrotask(tick);',
      'requestAnimationFrame(frame);',
      'requestIdleCallback(work);',
      'crypto.getRandomValues(bytes);',
      'globalThis.Math.random();',
      'const text = new Intl.DateTimeFormat().format();',
      "const roll = Reflect.get(host, 'random');",
      "const f = eval('1');",
      "const f = new Function('return 1');",
      'const order = names.sort((a, b) => a.localeCompare(b));',
      'const text = score.toLocaleString();',
      'const ref = new WeakRef(cook);',
      'const registry = new FinalizationRegistry(cleanUp);',
      "import './install-clock';",
      "import { x } from 'left-pad';",
      "import { readFileSync } from 'node:fs';",
      "import { room } from '../../platform/room';",
      "const lazy = await import('some-package');",
      "const old = require('node:path');",
    ];
    for (const sample of samples) expect(scan(sample), sample).not.toEqual([]);
  });
  it(
    'allows deterministic Math, and the bare words in comments and ' +
      'strings (the two faults of the sim-core scan)',
    () => {
      const fine = [
        'const a = Math.PI * Math.SQRT2 + Math.hypot(x, y) + Math.atan2(y, ' +
          'x) + Math.sin(a) + Math.cos(a) + Math.floor(v);',
        'const b = Math.max(Math.min(v, 1), -1) + Math.abs(q) + ' +
          'Math.round(r) + Math.trunc(t) + Math.sqrt(2) + Math.pow(2, 3) + ' +
          'Math.E;',
        'const c = Math\n  .floor(v);',
        '// No Date, no Math.random, no setTimeout: all time comes from dtMs.',
        '/* performance matters here; see Intl notes; eval the Function of crypto */',
        'const label = \'Date night\'; const note = "Math.random is banned"; ' +
          'const words = `no setInterval ${count} or Reflect`;',
        'const updated = state.lastUpdate; const performanceScore = 3; ' +
          'const cryptoLabel = 1; const myMath = 2;',
        'function evaluate(x: number) {} const fn = () => 1; type F = (x: number) => number;',
        "import { createRng } from '@kaki/sim-core';",
        "import type { GameModule } from '@kaki/platform';",
        "import { deal } from './deal';",
        "import { table } from '../levels/table';",
        "export { c } from './c';",
      ];
      for (const sample of fine) expect(scan(sample), sample).toEqual([]);
    },
  );
  it('reports the line, once per place, with Math.random named as itself', () => {
    expect(scan('ok\nok\nsetTimeout(x)')).toEqual(['3: setTimeout (a timer)']);
    expect(scan('const r = Math.random();')).toEqual(['1: Math.random']);
    expect(scan('const m = Math;')).toEqual([
      '1: Math used other than as Math.<a pure function or constant>',
    ]);
    expect(scan("// Date\nconst a = 'Date';\nconst d = Date.now();")).toEqual([
      '3: Date (a clock)',
    ]);
  });
  it('keeps imports to the folder, the two core packages and what the caller allows', () => {
    expect(scan("import { q } from '@kaki/content-rabakz';")).toEqual([
      '1: an import of "@kaki/content-rabakz", which is not on the allowed list',
    ]);
    expect(scan("import { q } from '@kaki/content-rabakz';", ['@kaki/content-rabakz'])).toEqual([]);
    expect(scan("import { q } from '@kaki/sim-core/extra';")).toEqual([]);
    expect(scan("import { q } from '@kaki/sim-core-evil';")).not.toEqual([]);
    expect(scan("import { q } from '../../../outside';")).toEqual([
      '1: an import from outside the scanned folder ("../../../outside")',
    ]);
    expect(scan("import { q } from '../sibling';")).toEqual([]);
    expect(scan('const text = "import x from \'left-pad\'";')).toEqual([]);
  });
  it('reads every form of import', () => {
    const text = [
      "import { a } from './a';",
      "import type { B } from '../b';",
      "export * from 'pkg';",
      "import 'side';",
      "const l = await import('./lazy');",
      "const o = require('old');",
      "import {\n  c,\n} from\n  './multi';",
    ].join('\n');
    expect(importsOf(text).map((found) => found.target)).toEqual([
      './a',
      '../b',
      'pkg',
      'side',
      './lazy',
      'old',
      './multi',
    ]);
    expect(importsOf(text).at(-1)?.line).toBe(9);
  });
});
describe('readSources', () => {
  const tree: Record<string, string[] | string> = {
    '/game': ['rules', 'view.tsx', 'notes.md', 'node_modules', 'zeta.ts', 'alpha.test.ts'],
    '/game/rules': ['step.ts', 'step.test.ts', 'deal.ts'],
    '/game/node_modules': ['x.ts'],
    '/game/rules/step.ts': 'export const step = 1;',
    '/game/rules/deal.ts': 'const t = Date.now();',
    '/game/rules/step.test.ts': 'Math.random();',
    '/game/view.tsx': 'export const view = 1;',
    '/game/zeta.ts': 'export const z = 1;',
    '/game/alpha.test.ts': 'setTimeout(() => 1, 1);',
    '/game/node_modules/x.ts': 'Date.now();',
  };
  const fake: FolderReader = {
    readdirSync: (path) =>
      (tree[path] as string[]).map((name) => ({
        name,
        isDirectory: () => Array.isArray(tree[`${path}/${name}`]),
      })),
    readFileSync: (path) => tree[path] as string,
  };
  it('walks a folder in a fixed order, leaving out tests, packages and other file types', () => {
    expect(readSources(fake, '/game/').map((file) => file.path)).toEqual([
      'rules/deal.ts',
      'rules/step.ts',
      'view.tsx',
      'zeta.ts',
    ]);
    expect(readSources(fake, '/game', { includeTests: true }).map((file) => file.path)).toContain(
      'rules/step.test.ts',
    );
    expect(scanSources(readSources(fake, '/game'))).toEqual([
      { file: 'rules/deal.ts', line: 1, what: 'Date (a clock)' },
    ]);
  });
  it('takes the real node:fs', () => {
    const files = readSources(fs, HERE);
    expect(files.map((file) => file.path)).toEqual([
      'conformance.ts',
      'drive.ts',
      'index.ts',
      'json.ts',
      'kit.ts',
      'layout.ts',
      'purity.ts',
      'settings.ts',
      'types.ts',
    ]);
  });
});
describe('the game interface itself is pure', () => {
  it('has no clock, timer or unseeded randomness, and imports only sim-core', () => {
    expect(
      scanSources(readSources(fs, HERE).filter((file) => file.path !== 'conformance.ts')),
    ).toEqual([]);
  });
});
it(
  'review scan: device access, async work, module state, comparator ' + 'and a justified escape',
  () => {
    for (const code of [
      'fetch(url)',
      'navigator.language',
      'process.env.TZ',
      'async function step() {}',
      'await work()',
      'let counter = 0',
      'export let state = 0',
      'rows.sort()',
      'rows.toSorted()',
    ]) {
      expect(scanSource({ path: 'rules.ts', text: code }), code).not.toEqual([]);
    }
    expect(
      scanSource({
        path: 'rules.ts',
        text: 'const level = { performance: 3 }; // purity-ok: a numeric level field',
      }),
    ).toEqual([]);
    expect(
      scanSource({ path: 'rules.ts', text: 'const level = { performance: 3 }; // purity-ok:' }),
    ).not.toEqual([]);
    expect(
      scanSource({
        path: 'rules.ts',
        text:
          'function step() { let local = 0; return local; }\nconst sorted = ' +
          'rows.sort((a, b) => a - b);',
      }),
    ).toEqual([]);
  },
);
it(
  'round 2 refuses browser access and string-literal excuses, while ' + 'allowing pure maths',
  () => {
    for (const text of [
      'window.innerWidth',
      'document.title',
      'self.x',
      'globalThis.location',
      'localStorage.getItem(key)',
      'location.href',
      'new WebSocket(url)',
      'new XMLHttpRequest()',
      'typeof window !== "undefined"',
      "Math.random(); const excuse = '// purity-ok: only a string';",
    ]) {
      expect(scanSource({ path: 'rules.ts', text }), text).not.toEqual([]);
    }
    const text =
      'Math.sin(x) + Math.cos(x) + Math.exp(x) + Math.pow(x, 2) + ' +
      'Math.atan2(x, y) + Math.hypot(x, y)';
    expect(scanSource({ path: 'rules.ts', text })).toEqual([]);
    expect(
      scanSource({ path: 'rules.ts', text: 'globalThis.JSON.stringify(globalThis.Number(x))' }),
    ).toEqual([]);
  },
);
