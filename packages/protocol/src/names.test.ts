import { describe, expect, it } from 'vitest';

import { MAX_NAME_CODE_POINTS } from './limits';
import {
  checkName,
  checkNameContent,
  checkNickname,
  checkTeamName,
  NAME_PROBLEMS,
  segmentRoughly,
} from './names';

const ZWJ = '\u200d';
const ZWNJ = '\u200c';
const FE0F = '\ufe0f';
// Emoji built from parts, spelled out so that no invisible character hides in this file.
const SHRUG_WOMAN = `\u{1f937}${ZWJ}\u2640${FE0F}`;
const TECHNOLOGIST = `\u{1f9d1}${ZWJ}\u{1f4bb}`;
const RAINBOW_FLAG = `\u{1f3f3}${FE0F}${ZWJ}\u{1f308}`;
const ASTRONAUT = `\u{1f469}\u{1f3fd}${ZWJ}\u{1f680}`;
const FAMILY = `\u{1f468}${ZWJ}\u{1f469}${ZWJ}\u{1f467}${ZWJ}\u{1f466}`;
const SINGAPORE = '\u{1f1f8}\u{1f1ec}';
const ENGLAND = '\u{1f3f4}\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}\u{e007f}';
const SCOTLAND = '\u{1f3f4}\u{e0067}\u{e0062}\u{e0073}\u{e0063}\u{e0074}\u{e007f}';
const NOODLES = '\u{1f35c}';
const MUTHUKUMAR = '\u0bae\u0bc1\u0ba4\u0bcd\u0ba4\u0bc1\u0b95\u0bcd\u0b95\u0bc1\u0bae\u0bbe\u0bb0\u0bcd';
const SUBRAMANIAM = '\u0b9a\u0bc1\u0baa\u0bcd\u0baa\u0bbf\u0bb0\u0bae\u0ba3\u0bbf\u0baf\u0bae\u0bcd';

const hex = (text: string): string =>
  Array.from(text, (point) => `U+${(point.codePointAt(0) ?? 0).toString(16)}`).join(' ');

describe('checkNickname', () => {
  it('accepts ordinary names in many scripts', () => {
    for (const name of [
      'Ah Beng',
      'Mei',
      'Jos\u00e9',
      'Zo\u00eb',
      'Nguy\u1ec5n',
      '\u5c0f\u660e',
      '\u3055\u304f\u3089',
      '\ubbfc\uc900',
      '\u03a9mega',
      '\u0645\u062d\u0645\u062f',
      '\u05e9\u05dc\u05d5\u05dd',
      '\u0928\u092e\u0938\u094d\u0924\u0947',
      'P1',
      '7',
      'abcdefghijkl',
      'A-B_C.D!',
      "O'Neil",
    ]) {
      expect(checkNickname(name), name).toBe('ok');
    }
  });

  it('counts characters as a player sees them: Tamil names of 13 and 14 code points pass', () => {
    expect(Array.from(MUTHUKUMAR).length).toBe(14);
    expect(Array.from(SUBRAMANIAM).length).toBe(13);
    expect(checkNickname(MUTHUKUMAR)).toBe('ok');
    expect(checkNickname(SUBRAMANIAM)).toBe('ok');
    // A letter with its accent written separately is one character.
    expect(checkNickname('e\u0301'.repeat(12))).toBe('ok');
    expect(checkNickname('e\u0301'.repeat(13))).toBe('too-long');
  });

  it('accepts emoji built from joined parts, with skin tones, and flags', () => {
    for (const name of [
      NOODLES,
      SHRUG_WOMAN,
      TECHNOLOGIST,
      RAINBOW_FLAG,
      ASTRONAUT,
      FAMILY,
      SINGAPORE,
      ENGLAND,
      SCOTLAND,
      `\u2764${FE0F}`,
      `Mei ${NOODLES}`,
      TECHNOLOGIST.repeat(12),
      `${FAMILY} fam`,
      `1${FE0F}\u20e3`,
    ]) {
      expect(checkNickname(name), hex(name)).toBe('ok');
    }
  });

  it('is at most 12 visible characters and 48 code points', () => {
    expect(checkNickname('abcdefghijkl')).toBe('ok');
    expect(checkNickname('abcdefghijklm')).toBe('too-long');
    expect(checkNickname(NOODLES.repeat(12))).toBe('ok');
    expect(checkNickname(NOODLES.repeat(13))).toBe('too-long');
    expect(checkNickname('x'.repeat(1000))).toBe('too-long');
    // Twelve families are twelve characters but 84 code points.
    expect(Array.from(FAMILY).length).toBe(7);
    expect(checkNickname(FAMILY.repeat(6))).toBe('ok');
    expect(checkNickname(FAMILY.repeat(7))).toBe('too-long');
    expect(MAX_NAME_CODE_POINTS).toBe(48);
  });

  it('refuses a name with nothing that shows', () => {
    for (const blank of [
      '',
      ' ',
      '   ',
      '\t',
      '\u00a0',
      '\u3000',
      ' \u2003 ',
      '\ufeff',
      // Fillers that are letters or symbols by category but draw nothing.
      '\u3164',
      '\u3164\u3164\u3164',
      '\u115f\u1160',
      '\uffa0',
      '\u2800',
      ' \u2800 \u3164 ',
      // Marks with nothing to sit on.
      '\u0301',
      '\u0301\u0302',
      ' \u0e47',
      // Punctuation only.
      '...',
      '!!!',
      '- _ -',
    ]) {
      expect(checkNickname(blank), hex(blank)).toBe('blank');
    }
    // A filler beside something that shows is let through.
    expect(checkNickname('A\u3164B')).toBe('ok');
  });

  it('refuses control characters and characters that change the direction of text', () => {
    const forbidden: Record<string, string[]> = {
      'bidirectional controls': [
        '\u202a',
        '\u202b',
        '\u202c',
        '\u202d',
        '\u202e',
        '\u2066',
        '\u2067',
        '\u2068',
        '\u2069',
        '\u200e',
        '\u200f',
        '\u061c',
      ],
      'zero-width space, word joiner, byte-order mark': ['\u200b', '\u2060', '\ufeff'],
      'line and paragraph separators': ['\u2028', '\u2029'],
      'control characters': ['\u0000', '\u0007', '\t', '\n', '\r', '\u001b', '\u007f', '\u0085', '\u009f'],
      'other invisible formatting': ['\u00ad', '\u180e', '\ufff9'],
    };
    for (const [group, chars] of Object.entries(forbidden)) {
      for (const char of chars) {
        const label = `${group} ${hex(char)}`;
        expect(checkNickname(`a${char}b`), label).toBe('bad-characters');
        expect(checkNickname(`ab${char}`), label).toBe('bad-characters');
        expect(checkTeamName(`a${char}b`), label).toBe('bad-characters');
      }
    }
    expect(checkNickname('a\ud83c')).toBe('bad-characters');
    expect(checkNickname('\udf5cab')).toBe('bad-characters');
  });

  it('tag characters are allowed only as a flag: straight after the black flag, ending properly', () => {
    expect(checkNickname(ENGLAND)).toBe('ok');
    expect(checkNickname(`${SCOTLAND} Scot`)).toBe('ok');
    expect(checkNickname(`${ENGLAND}${SCOTLAND}`)).toBe('ok');
    const tags = '\u{e0068}\u{e0069}\u{e007f}';
    // After any other emoji, or a letter, tag characters are a hidden message.
    expect(checkNickname(`${NOODLES}${tags}`)).toBe('bad-characters');
    expect(checkNickname(`\u{1f600}${tags}`)).toBe('bad-characters');
    expect(checkNickname(`\u{1f3f3}${tags}`)).toBe('bad-characters');
    expect(checkNickname(`a${tags}`)).toBe('bad-characters');
    expect(checkNickname(`${tags}ab`)).toBe('bad-characters');
    // No end tag; nothing before the end tag; more after the end tag; a gap after the flag.
    expect(checkNickname('\u{1f3f4}\u{e0067}\u{e0062}')).toBe('bad-characters');
    expect(checkNickname('\u{1f3f4}\u{e007f}')).toBe('bad-characters');
    expect(checkNickname('\u{1f3f4}\u{e0067}\u{e007f}\u{e0067}')).toBe('bad-characters');
    expect(checkNickname('\u{1f3f4}\u{e0067}\u{e007f}\u{e0067}\u{e007f}')).toBe('bad-characters');
    expect(checkNickname(`\u{1f3f4}${FE0F}\u{e0067}\u{e007f}`)).toBe('bad-characters');
    expect(checkNickname('\u{1f3f4} \u{e0067}\u{e007f}')).toBe('bad-characters');
  });

  it('a joiner between emoji builds one emoji', () => {
    for (const name of [TECHNOLOGIST, SHRUG_WOMAN, RAINBOW_FLAG, ASTRONAUT, FAMILY]) {
      expect(checkNickname(name), hex(name)).toBe('ok');
    }
    expect(checkNickname(`${NOODLES}${ZWJ}`)).toBe('bad-characters');
    expect(checkNickname(`${NOODLES}${ZWJ}${ZWJ}${NOODLES}`)).toBe('bad-characters');
    expect(checkNickname(`${NOODLES}${ZWJ}!`)).toBe('bad-characters');
    // The non-joiner has no business between emoji.
    expect(checkNickname(`${NOODLES}${ZWNJ}${NOODLES}`)).toBe('bad-characters');
  });

  it('a joiner or non-joiner between letters, or after a virama, is how some scripts are written', () => {
    const names: Record<string, string> = {
      'Sinhala "Sri": a joiner after the virama': `\u0dc1\u0dca${ZWJ}\u0dbb\u0dd3`,
      'Persian "I want": a non-joiner between word parts': `\u0645\u06cc${ZWNJ}\u062e\u0648\u0627\u0647\u0645`,
      'Malayalam "his": a chillu written the older way': `\u0d05\u0d35\u0d28\u0d4d${ZWJ}\u0d31\u0d46`,
      'Devanagari: a joiner after the virama': `\u0915\u094d${ZWJ}\u0937`,
      'Devanagari: a non-joiner after the virama': `\u0915\u094d${ZWNJ}\u0937`,
      'Bengali: a non-joiner after a vowel sign': `\u0995\u09bf${ZWNJ}\u0995`,
      'Latin letters either side': `a${ZWJ}b`,
    };
    for (const [what, name] of Object.entries(names)) {
      expect(checkNickname(name), what).toBe('ok');
      expect(checkName(name, 12, segmentRoughly), what).toBe('ok');
      expect(checkNameContent(name), what).toBe('ok');
    }
  });

  it('a joiner anywhere else is refused', () => {
    for (const joiner of [ZWJ, ZWNJ]) {
      const refused: Record<string, string> = {
        'at the start': `${joiner}ab`,
        'at the end': `ab${joiner}`,
        'at the end, after a virama': `\u0915\u094d${joiner}`,
        doubled: `a${joiner}${joiner}b`,
        'between digits': `1${joiner}2`,
        'between a letter and a digit': `a${joiner}1`,
        'after a space': `a ${joiner}b`,
        'before a space': `a${joiner} b`,
        'between punctuation': `a.${joiner}.b`,
        'between a letter and an emoji': `a${joiner}${NOODLES}`,
        'between an emoji and a letter': `${NOODLES}${joiner}a`,
        'alone with spaces': ` ${joiner} `,
      };
      for (const [where, name] of Object.entries(refused)) {
        const label = `${hex(joiner)} ${where}`;
        expect(checkNickname(name), label).toBe('bad-characters');
        expect(checkName(name, 12, segmentRoughly), label).toBe('bad-characters');
      }
    }
  });

  it('caps stacked accents at three in a row', () => {
    expect(checkNickname('a\u0301\u0302\u0303')).toBe('ok');
    expect(checkNickname('a\u0301\u0302\u0303\u0304')).toBe('bad-characters');
    expect(checkNickname('Z' + '\u0351'.repeat(20) + 'algo')).toBe('bad-characters');
    // Variation selectors pick a glyph; they are not accents.
    expect(checkNickname(`\u2764${FE0F}\u0301\u0302\u0303`)).toBe('ok');
  });

  it('a name that passes is still only text', () => {
    // Showing a name is the consumer's job: as text, never as HTML.
    expect(checkNickname('<script>')).toBe('ok');
    expect(checkNickname('<b>Mei</b>')).toBe('ok');
  });

  it('takes anything at all without throwing', () => {
    for (const value of [null, undefined, 7, {}, [], () => 1, Symbol('s'), 10n]) {
      expect(checkNickname(value)).toBe('bad-characters');
      expect(checkNameContent(value)).toBe('bad-characters');
    }
    expect(NAME_PROBLEMS).toEqual(['blank', 'too-long', 'bad-characters']);
  });

  it('team names follow the same rules with a limit of 24', () => {
    expect(checkTeamName('Red')).toBe('ok');
    expect(checkTeamName('The Kopi Peng Kakis')).toBe('ok');
    expect(checkTeamName('x'.repeat(24))).toBe('ok');
    expect(checkTeamName('x'.repeat(25))).toBe('too-long');
    expect(checkTeamName('   ')).toBe('blank');
  });
});

describe('checkNameContent: the same rules without the count', () => {
  it('does not count visible characters, only code points', () => {
    expect(checkNameContent('abcdefghijklm')).toBe('ok');
    expect(checkNameContent(SINGAPORE.repeat(24))).toBe('ok');
    expect(checkNameContent('x'.repeat(48))).toBe('ok');
    expect(checkNameContent('x'.repeat(49))).toBe('too-long');
    expect(checkNameContent('   ')).toBe('blank');
    expect(checkNameContent('a\u202eb')).toBe('bad-characters');
  });

  it('whatever the host accepts as a nickname, every phone accepts as content', () => {
    for (const name of [MUTHUKUMAR, SUBRAMANIAM, SHRUG_WOMAN, TECHNOLOGIST, RAINBOW_FLAG, ENGLAND, FAMILY.repeat(6)]) {
      expect(checkNickname(name), hex(name)).toBe('ok');
      expect(checkNameContent(name), hex(name)).toBe('ok');
    }
  });
});

describe('without Intl.Segmenter', () => {
  it('the rough count is never lower than the real one, so no longer name gets through', () => {
    const real = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const names = [
      'Ah Beng',
      MUTHUKUMAR,
      SUBRAMANIAM,
      SHRUG_WOMAN,
      TECHNOLOGIST,
      RAINBOW_FLAG,
      `${FAMILY} fam`,
      `${SINGAPORE}\u{1f1f2}\u{1f1fe}`,
      ENGLAND,
      'e\u0301e\u0301',
      '\ubbfc\uc900',
      '\u1112\u1161\u11ab',
      '\u0928\u092e\u0938\u094d\u0924\u0947',
      `\u0dc1\u0dca${ZWJ}\u0dbb\u0dd3`,
      `\u0645\u06cc${ZWNJ}\u062e\u0648\u0627\u0647\u0645`,
    ];
    for (const name of names) {
      const rough = segmentRoughly(name);
      expect(rough.join(''), hex(name)).toBe(name);
      expect(rough.length, hex(name)).toBeGreaterThanOrEqual(Array.from(real.segment(name)).length);
    }
    // And it can be higher: a two-letter flag is one character, counted roughly as two.
    expect(segmentRoughly(SINGAPORE).length).toBe(2);
    expect(Array.from(real.segment(SINGAPORE)).length).toBe(1);
  });

  it('the required names still pass, and the rules still hold', () => {
    const check = (name: string): string => checkName(name, 12, segmentRoughly);
    for (const name of [MUTHUKUMAR, SUBRAMANIAM, SHRUG_WOMAN, TECHNOLOGIST, RAINBOW_FLAG, 'Ah Beng', ENGLAND]) {
      expect(check(name), hex(name)).toBe('ok');
    }
    expect(check('abcdefghijklm')).toBe('too-long');
    expect(check(`a${ZWJ}1`)).toBe('bad-characters');
    expect(check('a\u0301\u0302\u0303\u0304')).toBe('bad-characters');
    expect(check('   ')).toBe('blank');
  });
});
