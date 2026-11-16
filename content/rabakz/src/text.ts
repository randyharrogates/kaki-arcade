// Text helpers shared by the validator, the builder and the loader. Pure.

/**
 * Length as a player sees it: one per Unicode code point, two for an emoji (about twice the
 * width of a letter), none for the emoji variation selector.
 */
export function displayLength(text: string): number {
  let length = 0;
  for (const char of text) {
    if (char === '️') continue;
    length += /\p{Extended_Pictographic}/u.test(char) ? 2 : 1;
  }
  return length;
}

/** Size of a string once written as UTF-8. */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/**
 * Lower case, with accents removed from Latin letters only and apostrophes dropped. Marks that
 * belong to other scripts (a Tamil vowel sign) and symbols are left alone: they carry meaning.
 */
function foldLatin(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .normalize('NFKC')
    .replace(/['‘’]/g, '')
    .toLowerCase();
}

/**
 * The key two options share when a player could not tell them apart: compatibility forms
 * folded, case ignored, spacing collapsed. Nothing else: "C", "C++" and "C#" differ, as do
 * "-5" and "5", "+" and "-", and "resume" and "résumé".
 */
export function optionKey(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
}

/**
 * The key two prompts share when they are the same prompt entered twice: Latin accents, case,
 * apostrophes, spacing and sentence punctuation ignored. Symbols and the marks `- # % & * / @`
 * are kept, so "What is 5 + 3?" and "What is 5 - 3?" differ.
 * "What's the Capital of  Perú?" becomes "whats the capital of peru".
 */
export function promptKey(text: string): string {
  return foldLatin(text)
    .replace(/(?:(?![-#%&*/@])[\p{P}\p{Z}\p{Cc}])+/gu, ' ')
    .trim();
}

/**
 * Words only, for finding a word or phrase inside a text: as `promptKey`, but everything that
 * is not a letter, a digit or a mark becomes a space.
 */
export function wordFold(text: string): string {
  return foldLatin(text)
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .trim();
}

/** True when `phrase` appears in `text` as whole words, in order. */
export function containsPhrase(text: string, phrase: string): boolean {
  const needle = wordFold(phrase);
  return needle.length > 0 && ` ${wordFold(text)} `.includes(` ${needle} `);
}

/**
 * The pieces a renderer cannot break: split at spaces and at hyphens, dashes and slashes, with
 * the brackets and punctuation around each piece taken off, since "(Constantinople)" is no
 * wider a word than "Constantinople" in any way that matters. A non-breaking hyphen (U+2011)
 * does not split. Non-breaking spaces never reach here: `textFault` rejects them.
 */
export function words(text: string): string[] {
  return text
    .split(/[ \-/\u2010\u2012-\u2015]+/u)
    .map((word) => word.replace(/^[\p{P}]+|[\p{P}]+$/gu, ''))
    .filter((word) => word.length > 0);
}

const SCRIPT_NAMES: readonly (readonly [RegExp, string])[] = [
  [/\p{Script=Cyrillic}/u, 'Cyrillic'],
  [/\p{Script=Han}/u, 'Chinese'],
  [/\p{Script=Tamil}/u, 'Tamil'],
  [/\p{Script=Hiragana}|\p{Script=Katakana}/u, 'Japanese'],
  [/\p{Script=Hangul}/u, 'Korean'],
  [/\p{Script=Arabic}/u, 'Arabic'],
  [/\p{Script=Devanagari}/u, 'Devanagari'],
  [/\p{Script=Thai}/u, 'Thai'],
];

function scriptOf(char: string): string {
  if (/\p{Script=Latin}/u.test(char)) return 'Latin';
  if (/\p{Script=Greek}/u.test(char)) return 'Greek';
  return SCRIPT_NAMES.find(([pattern]) => pattern.test(char))?.[1] ?? 'another script';
}

/** Letters that belong to no one script (the micro sign, the okina): neutral in any word. */
const NEUTRAL_LETTER = /[\p{Script=Common}\p{Script=Inherited}]/u;

/**
 * Greek letters that pass for a Latin one at a glance. Only these are suspect inside a Latin
 * word; "\u03C0r", "k\u03A9" and "2\u03C0r" are ordinary science.
 */
const GREEK_LOOKALIKES = new Set('\u0391\u0392\u0395\u0396\u0397\u0399\u039A\u039C\u039D\u039F\u03A1\u03A4\u03A5\u03A7\u03B1\u03B9\u03BA\u03BD\u03BF\u03C1\u03C5\u03C7');

const hex = (char: string): string =>
  `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * The script rules: Latin and Greek letters only. A word may not mix Latin with another
 * alphabet, and may mix Latin with Greek only when no Greek letter in it is a Latin look-alike.
 */
function scriptFault(text: string): string | null {
  for (const word of text.match(/[\p{L}\p{M}]+/gu) ?? []) {
    const scripts = new Set<string>();
    let foreign: string | null = null;
    let lookalike = false;
    for (const char of word) {
      if (!/\p{L}/u.test(char) || NEUTRAL_LETTER.test(char)) continue;
      const script = scriptOf(char);
      scripts.add(script);
      if (script !== 'Latin' && script !== 'Greek') foreign ??= char;
      if (GREEK_LOOKALIKES.has(char)) lookalike = true;
    }
    const latinAndGreekOnly = foreign === null;
    if (scripts.size > 1 && (!latinAndGreekOnly || lookalike)) {
      return `mixes ${[...scripts].join(' and ')} letters in the word "${word}"; a look-alike letter from another alphabet is the usual cause`;
    }
    if (foreign !== null) {
      return `has "${foreign}" (${scriptOf(foreign)}); only Latin and Greek letters are accepted, because the length limits were measured for Latin text`;
    }
  }
  return null;
}

/**
 * Why a text is not fit to show, or null. A text must be trimmed, single-spaced with ordinary
 * spaces, in NFC form, on one line, in Latin (or Greek) letters, and free of HTML entities
 * (dataset exports often carry `&quot;`) and of anything that reads as a tag.
 */
export function textFault(text: string): string | null {
  if (text.length === 0) return 'is empty';
  if (text !== text.trim()) return 'has a space at the start or the end';
  if (/[\n\r\t\v\f]/.test(text)) return 'has a line break or a tab';
  const space = /[^\S ]/u.exec(text);
  if (space !== null) {
    return `has a non-breaking or other special space (${hex(space[0])}); use an ordinary space`;
  }
  if (text.includes('‍')) {
    return 'has a zero-width joiner (U+200D), as a joined emoji does; use a single emoji or a word';
  }
  const hidden = /[\p{Cc}\p{Cf}]/u.exec(text);
  if (hidden !== null) return `has an invisible control or format character (${hex(hidden[0])})`;
  if (text.includes('  ')) return 'has two spaces in a row';
  if (text !== text.normalize('NFC')) return 'is not in NFC form';
  // Real HTML entities only: "AT&T", "R&B" and "Q&A" are ordinary text.
  if (
    /&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i.test(text) ||
    /&(?:amp|lt|gt|quot|apos|nbsp)(?![a-z0-9])/i.test(text) ||
    /&#\d/.test(text)
  ) {
    return 'has an HTML entity (such as "&amp;" or "&#39;"); write the character itself';
  }
  if (/<[\p{L}/!?]/u.test(text)) {
    return 'has "<" directly before a letter, which reads as an HTML tag; put a space after "<"';
  }
  return scriptFault(text);
}

/** The first key that appears twice in one object of a JSON text, or null. */
export function duplicateJsonKey(text: string): string | null {
  // One set of keys per open object; null for an open array.
  const open: (Set<string> | null)[] = [];
  let at = 0;
  const readString = (): string => {
    const start = at;
    at += 1;
    while (at < text.length && text[at] !== '"') at += text[at] === '\\' ? 2 : 1;
    at += 1;
    try {
      return JSON.parse(text.slice(start, at)) as string;
    } catch {
      return text.slice(start, at);
    }
  };
  while (at < text.length) {
    const char = text[at];
    if (char === '{') open.push(new Set());
    else if (char === '[') open.push(null);
    else if (char === '}' || char === ']') open.pop();
    else if (char === '"') {
      const value = readString();
      let next = at;
      while (next < text.length && /\s/.test(text[next] ?? '')) next += 1;
      const keys = open.at(-1);
      if (text[next] === ':' && keys !== null && keys !== undefined) {
        if (keys.has(value)) return value;
        keys.add(value);
      }
      continue;
    }
    at += 1;
  }
  return null;
}
