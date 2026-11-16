// What a nickname or a team name may be. One function, used by the join form on the phone,
// by room state on the host and by the message validators, so all three agree.
//
// "12 characters" (PLAT-004) is read as 12 characters as a player sees them: a letter with its
// accents, a Tamil syllable, or an emoji built from several joined parts each count as one.
//
// Two layers:
//   - What a name may contain (`checkNameContent`): size in code points, forbidden characters,
//     where joiners and tag characters may sit, stacked accents, and that something shows.
//     This looks only at code points, so every browser gives the same answer.
//   - How many visible characters it has (`checkName`, `checkNickname`): counted with
//     `Intl.Segmenter`, or roughly where a browser has none. The rough count is approximate
//     and never lower than the real one, so two devices can disagree about a name near the
//     limit. THE HOST'S COUNT IS THE AUTHORITY: the host decides with `checkNickname`, and
//     the names it then sends (`seat`, team names in `room`) are checked on the phone for
//     content only, so a phone can never refuse a name its host accepted.
//
// A name that passes is still just text. `<script>` passes. Whoever shows a name must put it
// on the page as text, never as HTML.

import { MAX_NAME_CODE_POINTS, MAX_NICKNAME_CHARS, MAX_TEAM_NAME_CHARS } from './limits';

/**
 * Why a name is refused.
 *
 * - `blank`           nothing in it that shows: empty, only spaces, only marks or punctuation;
 *                     it needs at least one letter, number or emoji
 * - `too-long`        more characters than allowed
 * - `bad-characters`  control characters, characters that change the direction of text,
 *                     invisible characters where they do not belong, or accents stacked more
 *                     than three deep
 */
export const NAME_PROBLEMS = ['blank', 'too-long', 'bad-characters'] as const;
export type NameProblem = (typeof NAME_PROBLEMS)[number];
export type NameCheck = 'ok' | NameProblem;

const ZWNJ = '\u200c';
const ZWJ = '\u200d';
const BLACK_FLAG = '\u{1f3f4}';
const TAG_END = '\u{e007f}';

// Controls, line and paragraph separators, lone surrogates; and every invisible formatting
// character (text-direction controls, zero-width space, byte-order mark, soft hyphen and the
// rest) except the joiner, the non-joiner and the tag characters, which are allowed in the
// few places checked one by one below.
const FORBIDDEN = /[\p{Cc}\p{Zl}\p{Zp}\p{Cs}]|(?![\u{e0020}-\u{e007f}\u200c\u200d])\p{Cf}/u;

const LETTER = /^\p{L}$/u;
const LETTER_OR_MARK = /^[\p{L}\p{M}]$/u;
const PICTOGRAPH = /^\p{Extended_Pictographic}$/u;
const EMOJI_TRAILER = /^[\p{Emoji_Modifier}\ufe0f]$/u;
const TAG = /^[\u{e0020}-\u{e007f}]$/u;
const TAG_LETTER = /^[\u{e0020}-\u{e007e}]$/u;
// Combining marks, not counting variation selectors (which pick an emoji's or a glyph's style).
const ACCENT = /^(?![\ufe00-\ufe0f\u{e0100}-\u{e01ef}])\p{M}$/u;
const MAX_ACCENTS_IN_A_ROW = 3;

// Characters that are letters or symbols by category but draw nothing: the Hangul fillers and
// the blank Braille pattern.
const DRAWS_NOTHING = /[\u115f\u1160\u3164\uffa0\u2800]/gu;
const SHOWS = /[\p{L}\p{N}\p{Extended_Pictographic}\p{Regional_Indicator}]/u;

// What follows another character without starting a new one, for the rough count.
const CONTINUES = /^[\p{M}\p{Emoji_Modifier}\u{e0020}-\u{e007f}\u200c\u200d]$/u;

function test(pattern: RegExp, point: string | undefined): boolean {
  return point !== undefined && pattern.test(point);
}

/**
 * Is the joiner at `at` in a place a joiner belongs?
 *
 * - Between two letters, or after a mark and before a letter. This is how Persian separates
 *   word parts (می‌خواهم), how Sinhala and Devanagari ask for a joined or unjoined form after
 *   a virama (ශ්‍රී), and how older Malayalam text writes chillu letters.
 * - A zero-width joiner between two emoji (🧑‍💻), the first optionally with a skin tone or a
 *   variation selector.
 *
 * Not at the start or the end, not two in a row, not beside a digit, a space or punctuation.
 */
function joinerBelongs(points: string[], at: number): boolean {
  const next = points[at + 1];
  if (test(LETTER_OR_MARK, points[at - 1]) && test(LETTER, next)) return true;
  if (points[at] !== ZWJ || !test(PICTOGRAPH, next)) return false;
  let before = at - 1;
  while (test(EMOJI_TRAILER, points[before])) before -= 1;
  return test(PICTOGRAPH, points[before]);
}

/**
 * Is the tag character at `at` part of a flag? Tag characters are invisible and can spell
 * anything, so they are allowed in one shape only: straight after the black flag U+1F3F4, one
 * or more tag letters, then the end tag (the flags of England, Scotland and Wales).
 */
function tagBelongs(points: string[], at: number): boolean {
  let start = at;
  while (test(TAG, points[start - 1])) start -= 1;
  if (points[start - 1] !== BLACK_FLAG) return false;
  let end = start;
  while (test(TAG_LETTER, points[end])) end += 1;
  // At least one letter, then the end tag, and `at` inside that stretch.
  return end > start && points[end] === TAG_END && at <= end;
}

/**
 * Checks what a name contains, without counting its visible characters: at most 48 code
 * points, nothing forbidden, joiners and tag characters only where they belong, no more than
 * three accents in a row, and something that shows. Never throws, and gives the same answer
 * in every browser.
 */
export function checkNameContent(value: unknown): NameCheck {
  if (typeof value !== 'string') return 'bad-characters';
  // A code point is at most two UTF-16 units, so this is already over the ceiling.
  if (value.length > MAX_NAME_CODE_POINTS * 2) return 'too-long';
  if (value.trim().length === 0) return 'blank';
  if (FORBIDDEN.test(value)) return 'bad-characters';
  const points = Array.from(value);
  if (points.length > MAX_NAME_CODE_POINTS) return 'too-long';
  let accents = 0;
  for (let at = 0; at < points.length; at += 1) {
    const point = points[at];
    if (point === ZWJ || point === ZWNJ) {
      if (!joinerBelongs(points, at)) return 'bad-characters';
    } else if (test(TAG, point)) {
      if (!tagBelongs(points, at)) return 'bad-characters';
    }
    accents = test(ACCENT, point) ? accents + 1 : 0;
    if (accents > MAX_ACCENTS_IN_A_ROW) return 'bad-characters';
  }
  if (!SHOWS.test(value.replace(DRAWS_NOTHING, ''))) return 'blank';
  return 'ok';
}

/** Splits text into characters as a player sees them. */
export type Segment = (text: string) => string[];

/**
 * For a browser with no `Intl.Segmenter`: a new character starts at every code point that is
 * not a mark, a skin tone, a joiner or a tag, and is not an emoji joined to the one before.
 * This is approximate. It never counts fewer characters than the real thing, so it never lets a
 * longer name through, but it can count more (a flag made of two letters counts as two).
 */
export const segmentRoughly: Segment = (text) => {
  const out: string[] = [];
  let current = '';
  for (const point of text) {
    const joined = current.endsWith(ZWJ) && PICTOGRAPH.test(point);
    if (current !== '' && (CONTINUES.test(point) || joined)) {
      current += point;
    } else {
      if (current !== '') out.push(current);
      current = point;
    }
  }
  if (current !== '') out.push(current);
  return out;
};

const segmentWithIntl: Segment = (text) => {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text), (part) => part.segment);
};

function segmentBest(text: string): string[] {
  try {
    return segmentWithIntl(text);
  } catch {
    return segmentRoughly(text);
  }
}

/** Checks a name's content and that it has at most `maxChars` visible characters. Never throws. */
export function checkName(value: unknown, maxChars: number, segment: Segment = segmentBest): NameCheck {
  const content = checkNameContent(value);
  if (content !== 'ok') return content;
  return segment(value as string).length > maxChars ? 'too-long' : 'ok';
}

/**
 * Checks a nickname: 1 to 12 visible characters (PLAT-004), at most 48 code points, with at
 * least one letter, number or emoji. The join form uses it to warn early; the host uses it to
 * decide. Trimming and the blocked-words filter (PLAT-005) are the host's job and come after.
 */
export function checkNickname(value: unknown): NameCheck {
  return checkName(value, MAX_NICKNAME_CHARS);
}

/** Checks a team name: 1 to 24 visible characters, under the same rules as a nickname. */
export function checkTeamName(value: unknown): NameCheck {
  return checkName(value, MAX_TEAM_NAME_CHARS);
}
