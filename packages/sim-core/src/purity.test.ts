// PLAT-032: the simulation has no access to rendering, network or wall-clock time. The
// library's tsconfig already makes the DOM, Node and `console` type errors. This test covers
// what the type checker cannot: globals that exist in plain ECMAScript or in every runtime.
// It reads the library's source files (not tests) and fails on any mention, comments included.
//
// THIS CATCHES ACCIDENTS, NOT INTENT. It is a text search: someone determined can get past it
// (a string built at run time, a value handed in from outside). The proof that a simulation
// is deterministic is behavioural: the same seed and inputs give the same state hashes, which
// `replay` checks and which every game must pass in the conformance kit (F-04).

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Each pattern is run over the WHOLE file text, so a name and its member may sit on different
// lines. `Math` may only appear as `Math.<one of the pure functions>`: that also refuses
// `Math.random`, `Math['random']`, `const m = Math`, `const { random } = Math` and passing
// `Math` to something. `Date` and the rest may not appear at all, in code or in a comment.
const PURE_MATH = 'abs|ceil|clz32|floor|fround|imul|max|min|round|sign|sqrt|trunc';
const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  { name: 'Math used other than as Math.<pure function>', pattern: new RegExp(`\\bMath\\b(?!\\s*\\.\\s*(?:${PURE_MATH})\\b)`, 'g') },
  { name: 'Date', pattern: /\bDate\b/g },
  { name: 'performance', pattern: /\bperformance\b/g },
  { name: 'setTimeout', pattern: /\bsetTimeout\b/g },
  { name: 'setInterval', pattern: /\bsetInterval\b/g },
  { name: 'setImmediate', pattern: /\bsetImmediate\b/g },
  { name: 'queueMicrotask', pattern: /\bqueueMicrotask\b/g },
  { name: 'requestAnimationFrame', pattern: /\brequestAnimationFrame\b/g },
  { name: 'requestIdleCallback', pattern: /\brequestIdleCallback\b/g },
  { name: 'crypto', pattern: /\bcrypto\b/g },
  { name: 'globalThis', pattern: /\bglobalThis\b/g },
  { name: 'Intl', pattern: /\bIntl\b/g },
  { name: 'Reflect', pattern: /\bReflect\b/g },
  // Any mention: `eval(x)`, `(0, eval)(x)`, `const e = eval`, `Function('...')`, `new Function`.
  { name: 'eval', pattern: /\beval\b/g },
  { name: 'Function', pattern: /\bFunction\b/g },
  // Results depend on the device's language settings or on when the garbage collector runs.
  { name: 'localeCompare', pattern: /\blocaleCompare\b/g },
  { name: 'toLocale...', pattern: /\btoLocale\w*/g },
  { name: 'WeakRef', pattern: /\bWeakRef\b/g },
  { name: 'FinalizationRegistry', pattern: /\bFinalizationRegistry\b/g },
  // A side-effect import runs code on load and names nothing, so nothing shows where it is used.
  { name: 'bare import', pattern: /\bimport\s*['"]/g },
];

interface Finding {
  file: string;
  line: number;
  name: string;
}

function scan(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  for (const { name, pattern } of FORBIDDEN) {
    for (const match of text.matchAll(pattern)) {
      const line = text.slice(0, match.index).split('\n').length;
      findings.push({ file, line, name });
    }
  }
  return findings.sort((a, b) => a.line - b.line);
}

/** Every module a file imports from, whatever the form of the import. */
function importsOf(text: string): string[] {
  const targets: string[] = [];
  const forms = /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(forms)) {
    const target = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (target !== undefined) targets.push(target);
  }
  return targets;
}

function libraryFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...libraryFiles(path));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) files.push(path);
  }
  return files.sort();
}

const SRC = dirname(fileURLToPath(import.meta.url));

describe('sim-core source is pure', () => {
  it('finds the library files', () => {
    const names = libraryFiles(SRC).map((file) => relative(SRC, file));
    expect(names).toEqual(['hash.ts', 'index.ts', 'input.ts', 'replay.ts', 'rng.ts', 'snapshot.ts', 'timestep.ts']);
  });

  it('never mentions a clock, a timer or an unseeded random source', () => {
    const findings = libraryFiles(SRC).flatMap((file) => scan(relative(SRC, file), readFileSync(file, 'utf8')));
    expect(findings).toEqual([]);
  });

  it('imports nothing but its own files', () => {
    const outside: string[] = [];
    for (const file of libraryFiles(SRC)) {
      for (const target of importsOf(readFileSync(file, 'utf8'))) {
        if (!target.startsWith('./')) outside.push(`${relative(SRC, file)}: ${target}`);
      }
    }
    expect(outside).toEqual([]);
  });

  it('the scanner catches each forbidden thing (so a clean result means something)', () => {
    const samples = [
      'const r = Math.random();',
      'const r = Math . random ()',
      'const r = Math\n  .random();',
      'const r = Math\n  // a comment in between\n  .random();',
      "const r = Math['random']();",
      'const m = Math;\nconst r = m.random();',
      'const { random } = Math;',
      'const { random: roll } = Math;',
      'const roll = pickFrom(Math);',
      'const r = Math.sin(x);',
      'const r = Math?.random();',
      'const t = Date.now();',
      'const d = new Date();',
      'const d = new  Date(0);',
      'const s = Date();',
      'const D = Date;\nconst t = D.now();',
      'const { now } = Date;',
      'const t = Date\n  .now();',
      'const t = performance.now();',
      'const m = performance.mark("x");',
      'const { now } = performance;',
      'const p = performance;',
      'setTimeout(tick, 16);',
      'const id = setInterval(tick, 16);',
      'setImmediate(tick);',
      'queueMicrotask(tick);',
      'requestAnimationFrame(frame);',
      'requestIdleCallback(work);',
      'crypto.getRandomValues(bytes);',
      'const { randomUUID } = crypto;',
      'globalThis.Math.random();',
      'const text = new Intl.DateTimeFormat().format();',
      'const sorted = names.sort(new Intl.Collator().compare);',
      "const roll = Reflect.get(host, 'random');",
      "const f = eval('Ma' + 'th.random');",
      "const f = new Function('return 1');",
      "const f = Function('return 1');",
      "const f = (0, eval)('1');",
      'const e = eval;',
      'const order = names.sort((a, b) => a.localeCompare(b));',
      'const text = score.toLocaleString();',
      'const upper = name.toLocaleUpperCase();',
      'const day = when.toLocaleDateString();',
      'const ref = new WeakRef(cook);',
      'const registry = new FinalizationRegistry(cleanUp);',
      "import './install-clock';",
      'import "./side-effects";',
      "import'node:timers';",
    ];
    for (const sample of samples) {
      expect(scan('sample.ts', sample), sample).not.toEqual([]);
    }
    const fine = [
      'const x = Math.imul(a, b) + Math.floor(c);',
      'const y = Math\n  .floor(c);',
      'const z = Math.max(Math.min(v, 1), -1) + Math.abs(q) + Math.round(r) + Math.trunc(t);',
      'const updated = state.lastUpdate;',
      'function validate(x: number) {}',
      'const performanceScore = 3;',
      'const cryptoLabel = "x";',
      'const mathHelper = 1; const myMath = 2;',
      "import { a } from './a';",
      "import type { B } from './b';",
      "export { c } from './c';",
      '// important: reimport nothing',
      'function evaluate(x: number) {} const fn = () => 1; type F = (x: number) => number;',
      'const weak = new WeakSet<object>(); const m = new WeakMap<object, number>();',
      'const upper = name.toUpperCase(); const ordered = a < b ? -1 : 1;',
    ];
    for (const sample of fine) {
      expect(scan('sample.ts', sample), sample).toEqual([]);
    }
    expect(scan('f.ts', 'ok\nok\nsetTimeout(x)')).toEqual([{ file: 'f.ts', line: 3, name: 'setTimeout' }]);
    // A finding is reported on the line the name is on, even when its member is further down.
    expect(scan('f.ts', 'ok\nconst r = Math\n\n  .random();')).toEqual([
      { file: 'f.ts', line: 2, name: 'Math used other than as Math.<pure function>' },
    ]);
  });

  it('the import reader sees every form of import', () => {
    const text = [
      "import { a } from './a';",
      "import type { B } from '../outside';",
      "export * from 'some-package';",
      "import 'node:fs';",
      "import './side';",
      "const lazy = await import('./lazy');",
      "const old = require('node:path');",
      "import {\n  c,\n  d,\n} from\n  './multi';",
    ].join('\n');
    expect(importsOf(text)).toEqual(['./a', '../outside', 'some-package', 'node:fs', './side', './lazy', 'node:path', './multi']);
  });
});
