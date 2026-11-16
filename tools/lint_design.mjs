#!/usr/bin/env node
// Design lint (docs/DESIGN.md §1 and §4, docs/WORKFLOW.md step 2). No dependencies.
//
// Scans .css, .ts, .tsx, .js, .mjs, .jsx, .html and .svg files under apps/, packages/ and
// games/ (test files included) and reports:
//
//   spacing-scale  a length in a spacing declaration that is not on its scale.
//   spacing-unit   rem or em in a spacing declaration. Screens are fixed-size: use px tokens.
//   raw-colour     a raw colour literal outside packages/ui/, where the design tokens live.
//   ignore-reason  a design-lint-ignore marker with no reason.
//
// WHAT COUNTS AS A SPACING DECLARATION
//   Properties, by CSS name or camelCase style key:
//     SPACING_SCALE  padding*, margin*, scroll-padding*, scroll-margin*, gap, row-gap,
//                    column-gap, grid-gap, grid-row-gap, grid-column-gap, outline-offset,
//                    inset*, top, right, bottom, left
//     RADIUS_SCALE   border-radius and the corner radii. Also allows the pill values 999px
//                    and 9999px. Percentages are never checked, so 50% passes.
//   Forms:
//     name: value            CSS, CSS inside a string, style objects, quoted keys
//     name="…" name={"…"}    JSX, HTML and SVG attributes, and `const padding = '4px'`
//     name={4}               JSX attribute with a number
//     style.name = '…'       also style['name'] = '…' and setProperty('name', '…')
//     --custom: 4px          custom properties outside packages/ui/ (a token defined outside
//                            the tokens package is itself suspect). A name containing
//                            "radius" uses RADIUS_SCALE, any other name SPACING_SCALE.
//   Values: every px length in the value is checked. In script files a bare number
//   (`{ padding: 4 }`, `gap={12}`, `gap="12"`) is checked as pixels, except for top, right,
//   bottom and left, where a bare number is far more often a rectangle or a direction than a
//   style. vw, vh, %, fr and the like are left alone.
//
// WHAT COUNTS AS A RAW COLOUR
//   #rgb #rgba #rrggbb #rrggbbaa · 0xRRGGBB 0xRRGGBBAA · rgb( rgba( hsl( hsla( oklch( oklab(
//   lab( lch( hwb( color-mix( · color( followed by a colour space or `from`.
//   Named colours are not detected.
//   Not treated as colours:
//     - a link target: href="#abc", xlink:href="#abc", url(#abc);
//     - a CSS id selector directly before `{`;
//     - in script files, a #name in code position, that is outside any string, template
//       literal or comment: there it is a private class member (this.#add, static #fade,
//       #bed in obj);
//     - an all-digit #123 inside a comment, or straight after one of the words see, issue,
//       PR, pull, bug, ticket, fix, fixes, close, closes, ref, refs, player, no., number.
//
// COMMENTS
//   CSS comments, and HTML and SVG comments, are not linted. Comments in script files ARE
//   linted like code (apart from the all-digit rule above).
//
// ESCAPE HATCH
//   A marker excuses findings on its own line. It must be inside a comment (/* … */, // …,
//   {/* … */}, <!-- … -->); a marker in a string does nothing. A reason is required.
//     design-lint-ignore: <reason>        excuses ONE finding on the line, the leftmost
//     design-lint-ignore-line: <reason>   excuses every finding on the line
//
// KNOWN LIMITS
//   - In script files a `name: value` is read to the end of its string, or to the end of the
//     line; in CSS it is read to the closing `;` or `}` and may span lines.
//   - The script reader is a small scanner, not a parser. It tracks strings, template
//     literals with ${…}, comments and most regular expressions.
//   - 0x literals of 6 or 8 digits that are not colours (hash constants, bit masks) are
//     reported and need the escape hatch.
//
// Usage: node tools/lint_design.mjs [root]   (root defaults to the repository root)

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {object} Finding
 * @property {string} file Path relative to the scan root, with forward slashes.
 * @property {number} line 1-based line number.
 * @property {number} column 1-based column number.
 * @property {'spacing-scale' | 'spacing-unit' | 'raw-colour' | 'ignore-reason'} rule
 * @property {string} message
 */

/** @typedef {'css' | 'markup' | 'script'} Kind */
/** @typedef {'spacing' | 'radius'} Scale */

/** Allowed px values for padding, margin, gap, inset and position declarations. */
export const SPACING_SCALE = Object.freeze([0, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]);

/** Allowed px values for border radii: the spacing scale plus hairline steps. */
export const RADIUS_SCALE = Object.freeze([0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]);

/** Extra border-radius values that mean "fully rounded". */
export const RADIUS_PILLS = Object.freeze([999, 9999]);

/** Top-level folders that are scanned. */
export const SCAN_DIRS = Object.freeze(['apps', 'packages', 'games']);

/** File extensions that are scanned. */
export const SCAN_EXTENSIONS = Object.freeze(['.css', '.ts', '.tsx', '.js', '.mjs', '.jsx', '.html', '.svg']);

/** Raw colour literals are allowed only under this path prefix. */
export const COLOUR_HOME = 'packages/ui/';

/**
 * Code that cannot draw is not linted at all: the shared logic packages, and any `rules/`,
 * `sim/` or `levels/` folder inside a game. Hash constants (`0x9e3779b9`) and tile-unit data
 * (`{ gap: 1 }`) there are numbers, not colours or spacing. Purity of these folders is
 * enforced by their tsconfig (no DOM types), so nothing visible can be written in them.
 */
export const LOGIC_PATHS = /^(?:packages\/(?:sim-core|protocol|netcode)\/|games\/[^/]+\/src\/(?:rules|sim|levels)\/)/;

const SKIPPED_FOLDERS = new Set(['node_modules', 'dist', 'coverage']);

const CODE = 0;
const TEXT = 1;
const COMMENT = 2;

const SIDE = '(?:-(?:top|right|bottom|left)|-(?:inline|block)(?:-(?:start|end))?)?';
const POSITION = /^(?:top|right|bottom|left)$/;
const SPACING_PROPERTY = new RegExp(
  '^(?:' +
    [
      `(?:scroll-)?(?:padding|margin)${SIDE}`,
      '(?:grid-)?(?:row-|column-)?gap',
      'outline-offset',
      'inset(?:-(?:inline|block)(?:-(?:start|end))?)?',
      'top|right|bottom|left',
    ].join('|') +
    ')$',
);
const RADIUS_PROPERTY = /^border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius$/;

// `name: value`. The lookbehind rejects member access (`rect.top`) and the tail of a longer name.
const DECLARATION = /(?<![\w$.-])(--[\w-]+|[A-Za-z][A-Za-z-]*)['"]?[ \t]*:[ \t]*/g;
// `name=value`, as an attribute or an assignment.
const ATTRIBUTE = /(?<![\w$.-])([A-Za-z][A-Za-z-]*)[ \t]*=[ \t]*(?=["'`{])/g;
// `style.name = value`, `style['name'] = value` and `setProperty('name', value)`.
const STYLE_WRITES = [
  /\bstyle\.([A-Za-z]+)[ \t]*=[ \t]*(?=["'`])/g,
  /\bstyle\[\s*["'](--[\w-]+|[\w-]+)["']\s*\][ \t]*=[ \t]*(?=["'`])/g,
  /\bsetProperty\(\s*["'](--[\w-]+|[\w-]+)["']\s*,\s*(?=["'`])/g,
];

const PX_VALUE = /(?<![\w.])(\d*\.?\d+)px(?![\w-])/gi;
const RELATIVE_VALUE = /(?<![\w.])\d*\.?\d+(?:rem|em)(?![\w-])/gi;
const BARE_NUMBER_VALUE = /^-?(\d*\.?\d+)[ \t]*(?=[,;})\r\n]|$)/;
const BARE_NUMBER_STRING = /^\s*-?(\d*\.?\d+)\s*$/;

const HEX_COLOUR = /(?<![\w&.])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
const NUMERIC_COLOUR = /(?<![\w.$])0x(?:[0-9a-f]{8}|[0-9a-f]{6})(?!\w)/gi;
const COLOUR_FUNCTION = /(?<![\w-])(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix)\(/gi;
const COLOR_FUNCTION = /(?<![\w-])color\((?=\s*(?:from\b|srgb|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz))/gi;
const LINK_TARGET_BEFORE = /(?:href\s*=\s*\{?\s*["'`]?|url\(\s*["']?)$/i;
const REFERENCE_WORD_BEFORE = /(?:\b(?:see|issues?|pr|pull|bug|ticket|fix(?:es)?|closes?|refs?|player|number)|\bno\.?)\s*$/i;
const IGNORE_MARKER = /design-lint-ignore(-line)?(?![\w-])/g;
const ONE_ONLY_HINT = ' (design-lint-ignore excuses one finding; use design-lint-ignore-line for the whole line)';

/**
 * @param {string} path
 * @returns {Kind}
 */
function kindOf(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.html') || lower.endsWith('.svg')) return 'markup';
  return 'script';
}

/**
 * Marks every character as code, text (string, template literal, regular expression) or
 * comment. For CSS and markup only comments are marked.
 * @param {string} text
 * @param {Kind} kind
 * @returns {Uint8Array}
 */
function classify(text, kind) {
  const state = new Uint8Array(text.length);
  if (kind !== 'script') {
    const comments = kind === 'css' ? /\/\*[\s\S]*?\*\//g : /<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g;
    for (const comment of text.matchAll(comments)) {
      state.fill(COMMENT, comment.index, comment.index + comment[0].length);
    }
    return state;
  }

  const size = text.length;
  /** @type {number[]} Brace depth to return to for each open `${`. */
  const templateReturns = [];
  let depth = 0;
  let inTemplate = false;
  let previous = '';
  let i = 0;

  while (i < size) {
    const ch = text.charAt(i);
    const next = text.charAt(i + 1);

    if (inTemplate) {
      if (ch === '\\') {
        state.fill(TEXT, i, Math.min(i + 2, size));
        i += 2;
      } else if (ch === '$' && next === '{') {
        templateReturns.push(depth);
        depth += 1;
        inTemplate = false;
        previous = '{';
        i += 2;
      } else {
        state[i] = TEXT;
        if (ch === '`') {
          inTemplate = false;
          previous = '`';
        }
        i += 1;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      const newline = text.indexOf('\n', i);
      const end = newline === -1 ? size : newline;
      state.fill(COMMENT, i, end);
      i = end;
      continue;
    }
    if (ch === '/' && next === '*') {
      const close = text.indexOf('*/', i + 2);
      const end = close === -1 ? size : close + 2;
      state.fill(COMMENT, i, end);
      i = end;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < size && text.charAt(j) !== ch && text.charAt(j) !== '\n') {
        j += text.charAt(j) === '\\' ? 2 : 1;
      }
      const end = Math.min(text.charAt(j) === ch ? j + 1 : j, size);
      state.fill(TEXT, i, end);
      previous = ch;
      i = end;
      continue;
    }
    if (ch === '`') {
      state[i] = TEXT;
      inTemplate = true;
      i += 1;
      continue;
    }
    if (ch === '/' && (previous === '' || '(,=:[!&|?{;+-*%~^'.includes(previous))) {
      let j = i + 1;
      let inClass = false;
      while (j < size && text.charAt(j) !== '\n' && (inClass || text.charAt(j) !== '/')) {
        const c = text.charAt(j);
        if (c === '\\') j += 1;
        else if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        j += 1;
      }
      if (text.charAt(j) === '/') {
        state.fill(TEXT, i, j + 1);
        previous = ')';
        i = j + 1;
        continue;
      }
    }

    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (templateReturns.at(-1) === depth) {
        templateReturns.pop();
        inTemplate = true;
        i += 1;
        continue;
      }
    }
    if (ch.trim() !== '') previous = ch;
    i += 1;
  }
  return state;
}

/**
 * Turns a CSS property or a camelCase style key into its lower-case kebab form.
 * @param {string} name
 * @param {Kind} kind
 * @returns {string}
 */
function toKebab(name, kind) {
  if (kind === 'css' || name.startsWith('--')) return name.toLowerCase();
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).toLowerCase();
}

/**
 * Finds the end of a quoted value.
 * @param {string} text
 * @param {number} start Index of the opening quote.
 * @returns {number} Index of the closing quote, or of the line end for an unclosed ' or ".
 */
function quotedEnd(text, start) {
  const quote = text.charAt(start);
  for (let i = start + 1; i < text.length; i += 1) {
    const ch = text.charAt(i);
    if (ch === '\\') i += 1;
    else if (ch === quote || (ch === '\n' && quote !== '`')) return i;
  }
  return text.length;
}

/**
 * Finds where the value of a `name: value` declaration ends.
 * @param {string} text
 * @param {number} start Index of the first character of the value.
 * @param {Kind} kind
 * @returns {number} Index one past the last character of the value.
 */
function valueEnd(text, start, kind) {
  if (kind !== 'script') {
    const stops = kind === 'css' ? ';}{' : ';}{"\'<>';
    for (let i = start; i < text.length; i += 1) {
      if (stops.includes(text.charAt(i))) return i;
    }
    return text.length;
  }

  const first = text.charAt(start);
  if (first === "'" || first === '"' || first === '`') return quotedEnd(text, start);

  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text.charAt(i);
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (ch === ';' || ch === '}' || ch === '\n') return i;
    else if (ch === ',' && depth <= 0) return i;
  }
  return text.length;
}

/**
 * Lints one file's text. Pure: no file system, no process state.
 * @param {string} file Path relative to the repository root. Either slash style is accepted.
 * @param {string} text The file's contents.
 * @returns {Finding[]} Findings in source order.
 */
export function lintSource(file, text) {
  const path = file.replaceAll('\\', '/').replace(/^\.\//, '');
  if (LOGIC_PATHS.test(path)) return [];
  const kind = kindOf(path);
  const state = classify(text, kind);
  const coloursAllowed = path.startsWith(COLOUR_HOME);

  /** @type {number[]} */
  const lineStarts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text.charAt(i) === '\n') lineStarts.push(i + 1);
  }

  /**
   * @param {number} index
   * @returns {{ line: number, column: number }}
   */
  const locate = (index) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if ((lineStarts[mid] ?? 0) <= index) low = mid;
      else high = mid - 1;
    }
    return { line: low + 1, column: index - (lineStarts[low] ?? 0) + 1 };
  };

  /** @param {number} index */
  const inComment = (index) => state[index] === COMMENT;
  /** Comments are not linted in CSS and markup. @param {number} index */
  const unlinted = (index) => kind !== 'script' && inComment(index);

  /** @type {Map<string, Finding & { index: number }>} */
  const found = new Map();

  /**
   * @param {number} index
   * @param {Finding['rule']} rule
   * @param {string} message
   */
  const report = (index, rule, message) => {
    if (unlinted(index)) return;
    const key = `${String(index)}:${rule}`;
    if (!found.has(key)) found.set(key, { file: path, ...locate(index), rule, message, index });
  };

  /**
   * @param {string} name A property name as written.
   * @returns {Scale | null}
   */
  const scaleFor = (name) => {
    const kebab = toKebab(name, kind);
    if (kebab.startsWith('--')) {
      if (coloursAllowed) return null;
      return kebab.includes('radius') ? 'radius' : 'spacing';
    }
    if (RADIUS_PROPERTY.test(kebab)) return 'radius';
    return SPACING_PROPERTY.test(kebab) ? 'spacing' : null;
  };

  /**
   * @param {number} index
   * @param {string} shown The value as written, for the message.
   * @param {number} amount
   * @param {string} name
   * @param {Scale} scale
   */
  const checkAmount = (index, shown, amount, name, scale) => {
    const allowed = scale === 'radius' ? RADIUS_SCALE : SPACING_SCALE;
    if (allowed.includes(amount)) return;
    if (scale === 'radius' && RADIUS_PILLS.includes(amount)) return;
    const pills = scale === 'radius' ? `, or ${RADIUS_PILLS.join(' or ')} for a pill` : '';
    report(
      index,
      'spacing-scale',
      `${shown} in "${name}" is not on the ${scale} scale (${allowed.join(', ')}${pills})`,
    );
  };

  /**
   * Checks every length in a value.
   * @param {number} start
   * @param {number} end
   * @param {string} name
   * @param {Scale} scale
   */
  const checkLengths = (start, end, name, scale) => {
    const value = text.slice(start, end);
    for (const px of value.matchAll(PX_VALUE)) {
      checkAmount(start + px.index, px[0], Number(px[1]), name, scale);
    }
    if (name.startsWith('--')) return;
    for (const unit of value.matchAll(RELATIVE_VALUE)) {
      report(
        start + unit.index,
        'spacing-unit',
        `${unit[0]} in "${name}": use px values from the ${scale} scale, not rem or em`,
      );
    }
  };

  /**
   * Checks a bare number that stands for pixels. Positions are skipped: see the header.
   * @param {number} index
   * @param {string | undefined} digits
   * @param {string} name
   * @param {Scale} scale
   */
  const checkBareNumber = (index, digits, name, scale) => {
    if (digits === undefined || name.startsWith('--') || POSITION.test(toKebab(name, kind))) return;
    checkAmount(index, digits, Number(digits), name, scale);
  };

  /**
   * Checks a quoted value that starts at `start`.
   * @param {number} start Index of the opening quote.
   * @param {string} name
   * @param {Scale} scale
   * @param {boolean} bareNumbers Whether a string holding only a number counts as pixels.
   */
  const checkQuoted = (start, name, scale, bareNumbers) => {
    const end = quotedEnd(text, start);
    checkLengths(start + 1, end, name, scale);
    if (!bareNumbers) return;
    const bare = BARE_NUMBER_STRING.exec(text.slice(start + 1, end));
    if (bare) checkBareNumber(start + 1 + bare[0].indexOf(bare[1] ?? ''), bare[1], name, scale);
  };

  // (a) name: value
  for (const declaration of text.matchAll(DECLARATION)) {
    const name = declaration[1] ?? '';
    const scale = scaleFor(name);
    if (scale === null || unlinted(declaration.index)) continue;
    const start = declaration.index + declaration[0].length;
    checkLengths(start, valueEnd(text, start, kind), name, scale);
    if (kind !== 'script') continue;
    const bare = BARE_NUMBER_VALUE.exec(text.slice(start, start + 32));
    if (bare) checkBareNumber(start + bare[0].indexOf(bare[1] ?? ''), bare[1], name, scale);
  }

  // (b) name="value", name={"value"}, name={4}
  if (kind !== 'css') {
    for (const attribute of text.matchAll(ATTRIBUTE)) {
      const name = attribute[1] ?? '';
      const scale = scaleFor(name);
      if (scale === null || unlinted(attribute.index)) continue;
      let start = attribute.index + attribute[0].length;
      if (text.charAt(start) === '{') {
        start += 1;
        while (text.charAt(start) === ' ' || text.charAt(start) === '\t') start += 1;
        const bare = /^-?(\d*\.?\d+)\s*\}/.exec(text.slice(start, start + 32));
        if (bare) {
          checkBareNumber(start + bare[0].indexOf(bare[1] ?? ''), bare[1], name, scale);
          continue;
        }
        if (!/^["'`]/.test(text.charAt(start))) continue;
      }
      checkQuoted(start, name, scale, true);
    }
  }

  // (c) style.name = value
  if (kind !== 'css') {
    for (const pattern of STYLE_WRITES) {
      for (const write of text.matchAll(pattern)) {
        const name = write[1] ?? '';
        const scale = scaleFor(name);
        if (scale === null || unlinted(write.index)) continue;
        checkQuoted(write.index + write[0].length, name, scale, false);
      }
    }
  }

  // (d) Raw colour literals outside the tokens package.
  if (!coloursAllowed) {
    for (const hex of text.matchAll(HEX_COLOUR)) {
      const index = hex.index;
      const before = text.slice(Math.max(0, index - 48), index);
      const after = text.slice(index + hex[0].length, index + hex[0].length + 16);
      if (kind === 'script' && state[index] === CODE) continue; // private class member
      if (LINK_TARGET_BEFORE.test(before)) continue;
      if (/^\s*\{/.test(after)) continue; // CSS id selector
      if (/^#\d+$/.test(hex[0]) && (inComment(index) || REFERENCE_WORD_BEFORE.test(before))) continue;
      report(index, 'raw-colour', `raw colour ${hex[0]} outside ${COLOUR_HOME}; use a design token`);
    }
    for (const numeric of text.matchAll(NUMERIC_COLOUR)) {
      report(
        numeric.index,
        'raw-colour',
        `raw colour ${numeric[0]} outside ${COLOUR_HOME}; use a design token`,
      );
    }
    for (const pattern of [COLOUR_FUNCTION, COLOR_FUNCTION]) {
      for (const colour of text.matchAll(pattern)) {
        report(
          colour.index,
          'raw-colour',
          `raw colour ${colour[0]}…) outside ${COLOUR_HOME}; use a design token`,
        );
      }
    }
  }

  // Escape markers. Only a marker inside a comment counts, and it needs a reason.
  /** @type {Map<number, { single: number, wholeLine: boolean }>} */
  const excuses = new Map();
  /** @type {Finding[]} */
  const badMarkers = [];
  for (const marker of text.matchAll(IGNORE_MARKER)) {
    if (!inComment(marker.index)) continue;
    const { line, column } = locate(marker.index);
    const after = text.slice(marker.index + marker[0].length).split('\n', 1)[0] ?? '';
    const reason = after.startsWith(':')
      ? after.slice(1).replace(/(\*\/|-->|design-lint-ignore).*$/, '').trim()
      : '';
    if (reason === '') {
      badMarkers.push({
        file: path,
        line,
        column,
        rule: 'ignore-reason',
        message: `${marker[0]} needs a reason: "${marker[0]}: <reason>"`,
      });
      continue;
    }
    const excuse = excuses.get(line) ?? { single: 0, wholeLine: false };
    if (marker[1] === undefined) excuse.single += 1;
    else excuse.wholeLine = true;
    excuses.set(line, excuse);
  }

  /** @type {Finding[]} */
  const kept = [...badMarkers];
  const ordered = [...found.values()].sort((a, b) => a.index - b.index);
  for (const entry of ordered) {
    /** @type {Finding} */
    const finding = {
      file: entry.file,
      line: entry.line,
      column: entry.column,
      rule: entry.rule,
      message: entry.message,
    };
    const excuse = excuses.get(finding.line);
    if (excuse === undefined) {
      kept.push(finding);
    } else if (excuse.wholeLine) {
      continue;
    } else if (excuse.single > 0) {
      excuse.single -= 1;
    } else {
      kept.push({ ...finding, message: finding.message + ONE_ONLY_HINT });
    }
  }

  return kept.sort((a, b) => a.line - b.line || a.column - b.column);
}

/**
 * Lists the files to scan under a root, relative to it, with forward slashes, sorted.
 * @param {string} root
 * @returns {string[]}
 */
export function collectFiles(root) {
  /** @type {string[]} */
  const files = [];

  /** @param {string} folder */
  const walk = (folder) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const full = join(folder, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !SKIPPED_FOLDERS.has(entry.name)) walk(full);
      } else if (entry.isFile() && SCAN_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        files.push(relative(root, full).split(sep).join('/'));
      }
    }
  };

  for (const top of SCAN_DIRS) {
    const folder = join(root, top);
    if (statSync(folder, { throwIfNoEntry: false })?.isDirectory()) walk(folder);
  }
  return files.sort();
}

/**
 * Lints every scanned file under a root.
 * @param {string} root
 * @returns {{ files: number, findings: Finding[] }}
 */
export function lintTree(root) {
  const files = collectFiles(root);
  const findings = files.flatMap((file) => lintSource(file, readFileSync(join(root, file), 'utf8')));
  return { files: files.length, findings };
}

/**
 * @param {Finding} finding
 * @returns {string}
 */
export function formatFinding(finding) {
  return `${finding.file}:${String(finding.line)}:${String(finding.column)}  ${finding.rule}  ${finding.message}`;
}

/**
 * Runs the lint and prints the result.
 * @param {string} root
 * @returns {number} The process exit code: 0 when clean, 1 on any finding.
 */
export function run(root) {
  const { files, findings } = lintTree(root);
  for (const finding of findings) console.error(formatFinding(finding));
  if (findings.length > 0) {
    console.error(`design lint failed: ${String(findings.length)} finding(s) in ${String(files)} file(s) scanned`);
    return 1;
  }
  console.log(`design lint passed: ${String(files)} file(s) scanned`);
  return 0;
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && resolve(process.argv[1]) === thisFile) {
  process.exit(run(resolve(process.argv[2] ?? join(dirname(thisFile), '..'))));
}
