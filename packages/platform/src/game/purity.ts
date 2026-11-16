// A text search of a game's rules folder for anything that would make its simulation depend
// on the clock, the device or chance (PLAT-032): `Math.random`, calendar dates, timers,
// locale-dependent sorting and the like, and imports from outside the allowed packages.
//
// Adapted from the scan in `packages/sim-core/src/purity.test.ts`, with its two known faults
// fixed: comments and the contents of strings are skipped (a comment may say "no timers
// here"), and every `Math` member that gives the same answer each time is allowed (`Math.PI`,
// `Math.hypot`, `Math.sin` and so on), while `Math.random` and any other use of `Math` as a
// value (`const m = Math`, `Math['random']`) is refused.
//
// Also refused, because each has made a simulation differ between two runs or two devices:
// `fetch`, `navigator` and `process`; `async` and `await` (a step that waits is not a step);
// a `let` or `var` at the top level of a module (state that lives outside the state); and
// `.sort()` or `.toSorted()` with no comparator (it sorts numbers as text).
//
// A FALSE POSITIVE (a field that really is called `performance`) is excused by a comment on
// the same line that says why: `// purity-ok: a field of the level table, not the clock`.
// The reason is required.
//
// THIS CATCHES ACCIDENTS, NOT INTENT. A determined author can get round a text search. The
// proof that a game is deterministic is the kit's replay checks; this scan only says where
// to look when they fail, and stops a clock creeping into code the scenarios do not reach.
export interface SourceFile {
  /** Path relative to the scanned folder, with forward slashes. */
  readonly path: string;
  readonly text: string;
}
export interface PurityFinding {
  readonly file: string;
  readonly line: number;
  readonly what: string;
}
export interface PurityOptions {
  /**
   * Packages a rules folder may import besides its own files. `@kaki/sim-core` and
   * `@kaki/platform` are always allowed.
   */
  readonly allowImports?: readonly string[];
}
const REGEX_AFTER_WORD = new Set([
  'return',
  'typeof',
  'case',
  'do',
  'else',
  'in',
  'of',
  'void',
  'throw',
  'new',
  'delete',
  'yield',
  'await',
  'instanceof',
]);
const REGEX_AFTER_CHAR = '(,=:[!&|?{};+-*%<>~^';
function isWordChar(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch);
}
/**
 * The same text with every comment and the inside of every string, template literal and
 * regular expression replaced by spaces. Quotes, line breaks and the code inside `${...}` are
 * kept, so positions and line numbers still match the original.
 */
export function stripCommentsAndStrings(
  text: string,
  comments: {
    text: string;
    index: number;
  }[] = [],
): string {
  const out: string[] = [];
  const n = text.length;
  // One counter per open `${`: how many `{` are open inside it.
  const templates: number[] = [];
  let i = 0;
  let lastChar = '';
  let lastWord = '';
  let word = '';
  const blank = (ch: string): string => (ch === '\n' ? '\n' : ' ');
  const at = (index: number): string => text.charAt(index);
  /** From just after a backtick or a closing `}`: blanks template text up to `${` or the end. */
  const templateText = (): void => {
    while (i < n) {
      const ch = at(i);
      if (ch === '\\' && i + 1 < n) {
        out.push(' ', blank(at(i + 1)));
        i += 2;
      } else if (ch === '`') {
        out.push('`');
        i += 1;
        return;
      } else if (ch === '$' && at(i + 1) === '{') {
        out.push('$', '{');
        i += 2;
        templates.push(0);
        return;
      } else {
        out.push(blank(ch));
        i += 1;
      }
    }
  };
  while (i < n) {
    const ch = at(i);
    const next = at(i + 1);
    if (ch === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      comments.push({ text: text.slice(i, end < 0 ? n : end), index: i });
      while (i < n && at(i) !== '\n') {
        out.push(' ');
        i += 1;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      out.push(' ', ' ');
      i += 2;
      while (i < n && !(at(i) === '*' && at(i + 1) === '/')) {
        out.push(blank(at(i)));
        i += 1;
      }
      if (i < n) {
        out.push(' ', ' ');
        i += 2;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      out.push(ch);
      i += 1;
      while (i < n && at(i) !== ch && at(i) !== '\n') {
        if (at(i) === '\\' && i + 1 < n) {
          out.push(' ', blank(at(i + 1)));
          i += 2;
        } else {
          out.push(' ');
          i += 1;
        }
      }
      if (i < n && at(i) === ch) {
        out.push(ch);
        i += 1;
      }
      lastChar = ch;
      word = '';
      continue;
    }
    if (ch === '`') {
      out.push('`');
      i += 1;
      templateText();
      lastChar = '`';
      word = '';
      continue;
    }
    if (ch === '/') {
      const afterWord = isWordChar(lastChar)
        ? REGEX_AFTER_WORD.has(lastWord)
        : lastChar === '' || REGEX_AFTER_CHAR.includes(lastChar);
      if (afterWord) {
        out.push('/');
        i += 1;
        let inClass = false;
        while (i < n && at(i) !== '\n' && (inClass || at(i) !== '/')) {
          if (at(i) === '\\' && i + 1 < n) {
            out.push(' ', ' ');
            i += 2;
            continue;
          }
          if (at(i) === '[') inClass = true;
          else if (at(i) === ']') inClass = false;
          out.push(' ');
          i += 1;
        }
        if (i < n && at(i) === '/') {
          out.push('/');
          i += 1;
        }
        lastChar = '/';
        word = '';
        continue;
      }
    }
    if (templates.length > 0) {
      const top = templates.length - 1;
      if (ch === '{') templates[top] = (templates[top] ?? 0) + 1;
      else if (ch === '}') {
        if (templates[top] === 0) {
          templates.pop();
          out.push('}');
          i += 1;
          templateText();
          lastChar = '`';
          word = '';
          continue;
        }
        templates[top] = (templates[top] ?? 0) - 1;
      }
    }
    out.push(ch);
    i += 1;
    if (isWordChar(ch)) {
      word += ch;
      lastWord = word;
      lastChar = ch;
    } else {
      word = '';
      if (!/\s/.test(ch)) lastChar = ch;
    }
  }
  return out.join('');
}
// Every `Math` member that returns the same answer for the same arguments. Not `random`.
const PURE_MATH = [
  'abs|acos|acosh|asin|asinh|atan|atan2|atanh|cbrt|ceil|clz32|cos|co' +
    'sh|exp|expm1|floor|fround|hypot|imul',
  'log|log10|log1p|log2|max|min|pow|round|sign|sin|sinh|sqrt|tan|tanh|trunc',
  'E|LN10|LN2|LOG10E|LOG2E|PI|SQRT1_2|SQRT2',
].join('|');
const FORBIDDEN: readonly {
  what: string;
  pattern: RegExp;
}[] = [
  { what: 'Math.random', pattern: /\bMath\s*\??\.\s*random\b/g },
  {
    what: 'Math used other than as Math.<a pure function or constant>',
    pattern: new RegExp(
      `\\bMath\\b(?!\\s*\\.\\s*(?:${PURE_MATH})\\b)(?!\\s*\\??\\.\\s*random\\b)`,
      'g',
    ),
  },
  { what: 'Date (a clock)', pattern: /\bDate\b/g },
  { what: 'performance (a clock)', pattern: /\bperformance\b/g },
  { what: 'setTimeout (a timer)', pattern: /\bsetTimeout\b/g },
  { what: 'setInterval (a timer)', pattern: /\bsetInterval\b/g },
  { what: 'setImmediate (a timer)', pattern: /\bsetImmediate\b/g },
  { what: 'queueMicrotask (a timer)', pattern: /\bqueueMicrotask\b/g },
  { what: 'requestAnimationFrame (a timer)', pattern: /\brequestAnimationFrame\b/g },
  { what: 'requestIdleCallback (a timer)', pattern: /\brequestIdleCallback\b/g },
  { what: 'crypto (unseeded randomness)', pattern: /\bcrypto\b/g },
  {
    what: 'browser environment',
    pattern: /\b(?:window|document|self|localStorage|location|WebSocket|XMLHttpRequest)\b/g,
  },
  {
    what: 'globalThis environment',
    pattern: /\bglobalThis\b(?!\s*\.\s*(?:Math|JSON|Number|String|Boolean|Array|Object)\b)/g,
  },
  { what: 'Intl (depends on the device)', pattern: /\bIntl\b/g },
  { what: 'Reflect', pattern: /\bReflect\b/g },
  { what: 'eval', pattern: /\beval\b/g },
  { what: 'Function', pattern: /\bFunction\b/g },
  { what: 'localeCompare (depends on the device)', pattern: /\blocaleCompare\b/g },
  { what: 'toLocale... (depends on the device)', pattern: /\btoLocale\w*/g },
  { what: 'WeakRef (depends on the garbage collector)', pattern: /\bWeakRef\b/g },
  {
    what: 'FinalizationRegistry (depends on the garbage collector)',
    pattern: /\bFinalizationRegistry\b/g,
  },
  { what: 'an import for its side effects', pattern: /\bimport\s*['"`]/g },
  { what: 'fetch (the network)', pattern: /\bfetch\b/g },
  { what: 'navigator (the device)', pattern: /\bnavigator\b/g },
  { what: 'process (the runtime)', pattern: /\bprocess\b/g },
  { what: 'async (a step cannot wait)', pattern: /\basync\b/g },
  { what: 'await (a step cannot wait)', pattern: /\bawait\b/g },
  {
    what: 'sort with no comparator (it sorts numbers as text)',
    pattern: /\.\s*(?:sort|toSorted)\s*\(\s*\)/g,
  },
];
const ALWAYS_ALLOWED = ['@kaki/sim-core', '@kaki/platform'];
function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}
/** Every module the file imports from, with the line, whatever the form of the import. */
export function importsOf(text: string): {
  target: string;
  line: number;
}[] {
  const code = stripCommentsAndStrings(text);
  const found: {
    target: string;
    line: number;
  }[] = [];
  const forms =
    /\bfrom\s*(['"])|\bimport\s*(['"])|\bimport\s*\(\s*(['"`])|\brequire\s*\(\s*(['"`])/g;
  for (const match of code.matchAll(forms)) {
    const quote = match[1] ?? match[2] ?? match[3] ?? match[4] ?? '"';
    const start = match.index + match[0].length;
    const end = text.indexOf(quote, start);
    if (end > start)
      found.push({ target: text.slice(start, end), line: lineOf(text, match.index) });
  }
  return found;
}
/** Does `target`, written in `file`, stay inside the scanned folder? */
function staysInside(file: string, target: string): boolean {
  const parts = file.split('/').slice(0, -1);
  for (const piece of target.split('/')) {
    if (piece === '.' || piece === '') continue;
    if (piece === '..') {
      if (parts.length === 0) return false;
      parts.pop();
    } else parts.push(piece);
  }
  return true;
}
/** Positions of every `let` or `var` that is not inside any bracket: module-level variables. */
function topLevelVariables(code: string): number[] {
  const found: number[] = [];
  let depth = 0;
  const words = /[{}()[\]]|\b(?:let|var)\b/g;
  for (const match of code.matchAll(words)) {
    const token = match[0];
    if (token === '{' || token === '(' || token === '[') depth += 1;
    else if (token === '}' || token === ')' || token === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0) found.push(match.index);
  }
  return found;
}
const EXCUSE = /\/\/\s*purity-ok:\s*\S/;
/** Everything in one file that the rules of a game may not use. */
export function scanSource(file: SourceFile, options: PurityOptions = {}): PurityFinding[] {
  const comments: {
    text: string;
    index: number;
  }[] = [];
  const code = stripCommentsAndStrings(file.text, comments);
  const all: PurityFinding[] = [];
  for (const { what, pattern } of FORBIDDEN) {
    for (const match of code.matchAll(pattern))
      all.push({ file: file.path, line: lineOf(code, match.index), what });
  }
  for (const index of topLevelVariables(code)) {
    all.push({
      file: file.path,
      line: lineOf(code, index),
      what: 'a module-level let or var (state outside the state; use const)',
    });
  }
  // A finding is excused by a `purity-ok:` comment with a reason, on its own line.
  const excuses = new Set(
    comments
      .filter((comment) => EXCUSE.test(comment.text))
      .map((comment) => lineOf(file.text, comment.index)),
  );
  const findings = all.filter((finding) => !excuses.has(finding.line));
  const allowed = [...ALWAYS_ALLOWED, ...(options.allowImports ?? [])];
  for (const { target, line } of importsOf(file.text)) {
    if (target.startsWith('.')) {
      if (!staysInside(file.path, target))
        findings.push({
          file: file.path,
          line,
          what: `an import from outside the scanned folder ("${target}")`,
        });
    } else if (!allowed.some((name) => target === name || target.startsWith(`${name}/`))) {
      findings.push({
        file: file.path,
        line,
        what: `an import of "${target}", which is not on the allowed list`,
      });
    }
  }
  // One finding per place: `Math.random` is also "Math used other than...", keep the clearer one.
  const seen = new Set<string>();
  return findings
    .sort((a, b) => a.line - b.line)
    .filter((finding) => {
      const key = `${String(finding.line)}:${finding.what.split(' ')[0] ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
export function scanSources(
  files: readonly SourceFile[],
  options: PurityOptions = {},
): PurityFinding[] {
  return files.flatMap((file) => scanSource(file, options));
}
/** The part of `node:fs` that `readSources` uses. Pass the real module: `import * as fs from 'node:fs'`. */
export interface FolderReader {
  readdirSync(
    path: string,
    options: {
      withFileTypes: true;
    },
  ): {
    name: string;
    isDirectory(): boolean;
  }[];
  readFileSync(path: string, encoding: 'utf8'): string;
}
/**
 * Reads every `.ts` and `.tsx` file under a folder, in a fixed order. Test files are left
 * out unless `includeTests` is set. This package's library code has no file access of its
 * own, so the caller (a test) hands in `node:fs`.
 */
export function readSources(
  fs: FolderReader,
  folder: string,
  options: {
    includeTests?: boolean;
  } = {},
): SourceFile[] {
  const files: SourceFile[] = [];
  const walk = (dir: string, prefix: string): void => {
    const entries = [...fs.readdirSync(dir, { withFileTypes: true })].sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist')
          walk(`${dir}/${entry.name}`, `${prefix}${entry.name}/`);
      } else if (
        /\.tsx?$/.test(entry.name) &&
        (options.includeTests === true || !/\.test\.tsx?$/.test(entry.name))
      ) {
        files.push({
          path: `${prefix}${entry.name}`,
          text: fs.readFileSync(`${dir}/${entry.name}`, 'utf8'),
        });
      }
    }
  };
  walk(folder.replace(/\/+$/, ''), '');
  return files;
}
