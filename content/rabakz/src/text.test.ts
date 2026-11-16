import { describe, expect, it } from 'vitest';
import { findBlocked, parseBlocklist } from './blocklist';
import {
  containsPhrase,
  displayLength,
  duplicateJsonKey,
  optionKey,
  promptKey,
  textFault,
  wordFold,
  words,
} from './text';

describe('keys for comparing texts', () => {
  it('promptKey folds case, Latin accents, apostrophes, sentence punctuation and spacing', () => {
    expect(promptKey("What's the Capital of  Perú?")).toBe('whats the capital of peru');
    expect(promptKey('What’s the capital of Peru')).toBe('whats the capital of peru');
    expect(promptKey('“Which”, (he asked), is it…?!')).toBe('which he asked is it');
    expect(promptKey('  ?!  ')).toBe('');
  });

  it('promptKey keeps signs and symbols, so sums stay apart', () => {
    const keys = ['What is 5 + 3?', 'What is 5 - 3?', 'What is 5 × 3?', 'What is 5 ÷ 3?', 'What is 5 / 3?', 'What is 5 % of 3?', 'What is 5 of 3?'].map(promptKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(promptKey('Is C# older than C++?')).not.toBe(promptKey('Is C older than C?'));
  });

  it('promptKey strips Latin accents only: marks of other scripts stay', () => {
    // Tamil ka with different vowel signs are different syllables.
    expect(promptKey('கி')).not.toBe(promptKey('கு'));
    expect(promptKey('கி')).not.toBe(promptKey('க'));
    expect(wordFold('கி')).not.toBe(wordFold('கு'));
    expect(promptKey('naïve café')).toBe('naive cafe');
  });

  it('optionKey ignores only case, width and spacing', () => {
    expect(optionKey('Sydney')).toBe(optionKey('ＳＹＤＮＥＹ'));
    expect(optionKey('New  York')).toBe(optionKey('new york'));
    const apart = ['C', 'C++', 'C#', '+', '-', '×', '÷', '-5', '5', '🍎', '🍌', 'Rose', 'Rosé', 'கி', 'கு', 'Sydney!'];
    expect(new Set(apart.map(optionKey)).size).toBe(apart.length);
  });

  it('wordFold leaves words only', () => {
    expect(wordFold('Kick-ass! What a RUDE, phrase.')).toBe('kick ass what a rude phrase');
  });

  it('containsPhrase matches whole words in order', () => {
    expect(containsPhrase('A merlion, seen from the bay', 'Merlion')).toBe(true);
    expect(containsPhrase('Merlions galore', 'Merlion')).toBe(false);
    expect(containsPhrase('Raffles, the hotel', 'Raffles Hotel')).toBe(false);
    expect(containsPhrase('anything', '?')).toBe(false);
  });
});

describe('text helpers', () => {
  it('displayLength counts code points, and two for an emoji', () => {
    expect(displayLength('kopi')).toBe(4);
    expect(displayLength('𝄞𝄞')).toBe(2);
    expect(displayLength('🍎')).toBe(2);
    expect(displayLength('❤️')).toBe(2);
    expect(displayLength('Perú')).toBe(4);
  });

  it('words splits at spaces, hyphens, dashes and slashes, not at a non-breaking hyphen', () => {
    expect(words('Coffee-shop and/or  kopitiam')).toEqual(['Coffee', 'shop', 'and', 'or', 'kopitiam']);
    expect(words('1990–2000')).toEqual(['1990', '2000']);
    expect(words('(Constantinople), "Rome"? [x] ...')).toEqual(['Constantinople', 'Rome', 'x']);
    expect(words("don't U.S.A.")).toEqual(["don't", 'U.S.A']);
    expect(words('non‑breaking')).toEqual(['non‑breaking']);
  });

  it('textFault passes clean text', () => {
    expect(textFault('Is 5 < 7? Yes & no.')).toBeNull();
    expect(textFault('R & B, π and 🍎')).toBeNull();
    expect(textFault('')).toBe('is empty');
  });

  it('textFault catches an entity or a tag without its closing character', () => {
    for (const text of ['&amp;', 'Fish &amp chips', '&quot;', '&#039;', '&#x27;', '&eacute;', 'a bare &nbsp', '&NBSP', 'a &#39 b', 'x <br y', 'a <i>b', '</b', '<!-- x']) {
      expect(textFault(text)).not.toBeNull();
    }
  });

  it('textFault lets an ampersand in a name through', () => {
    for (const text of ['AT&T', 'R&B', "M&M's", 'Q&A', 'D&D', 'S&P 500', 'H&M', "Ben & Jerry's", 'Amp&ampere', 'P&lt2']) {
      expect(textFault(text)).toBeNull();
    }
  });

  it('textFault lets science through and catches look-alike letters', () => {
    for (const text of ['πr²', '2πr', 'kΩ', 'MΩ', 'µm', 'Hawaiʻi', 'αβγ', 'Δx']) {
      expect(textFault(text)).toBeNull();
    }
    expect(textFault('Whаt')).toContain('mixes Latin and Cyrillic letters in the word "Whаt"');
    expect(textFault('ΑΒC')).toContain('mixes Greek and Latin');
    expect(textFault('Lοndon')).toContain('mixes Latin and Greek');
    expect(textFault('Москва')).toContain('(Cyrillic)');
  });
});

describe('duplicateJsonKey', () => {
  it('finds a key repeated in one object, at any depth', () => {
    expect(duplicateJsonKey('{"a":1,"b":2,"a":3}')).toBe('a');
    expect(duplicateJsonKey('{"q":[{"id":"x","prompt":"p"},{"id":"y","id":"z"}]}')).toBe('id');
    expect(duplicateJsonKey('{ "a" : { "b" : 1 , "b" : 2 } }')).toBe('b');
    expect(duplicateJsonKey('{"\\u0061":1,"a":2}')).toBe('a');
  });

  it('is not fooled by the same key in different objects or by strings that look like keys', () => {
    expect(duplicateJsonKey('{"a":{"a":1},"b":[{"a":1},{"a":2}]}')).toBeNull();
    expect(duplicateJsonKey('{"a":"a","b":["a","a"],"c":"x\\":\\"a"}')).toBeNull();
    expect(duplicateJsonKey('{"a":"{\\"a\\":1,\\"a\\":2}"}')).toBeNull();
    expect(duplicateJsonKey('[]')).toBeNull();
  });
});

describe('blocklist', () => {
  it('reads terms, skipping comments and blank lines, folded and sorted', () => {
    const list = parseBlocklist('# header\n\nZeta\n  Alpha  \r\nrude  Phrase!\nalpha\n#beta\n');
    expect(list.terms).toEqual(['alpha', 'rude phrase', 'zeta']);
  });

  it('finds whole words and phrases only', () => {
    const list = parseBlocklist('ass\nrude phrase');
    expect(findBlocked('A class of bass players', list)).toEqual([]);
    expect(findBlocked('Kick-ass! What a RUDE, phrase.', list)).toEqual(['ass', 'rude phrase']);
    expect(findBlocked('anything', parseBlocklist(''))).toEqual([]);
  });
});
