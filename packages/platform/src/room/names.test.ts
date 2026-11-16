import { expect, it } from 'vitest';
import { validateHostMessage } from '@kaki/protocol';
import { applyPhoneEvent, createRoom } from './room';
import { storedName, uniquenessKey } from './blocked-words';
import { identity, join, invariants, j } from './test-helpers';
it('PLAT-003 A1/A2/A3/A4/A9/A16/A17 valid, safe, unique display names and private notices', () => {
  let s = createRoom();
  for (const [i, name] of ['Hello shitty', 'hello shitty', 'fu\u200cck', 'Sam',
    'Sa\u200cm', 'Ｓａｍ', '  abcdefghijkl', '🇸🇬'.repeat(12)].entries()) {
    const r = join(s, i, name);
    expect(r.result.ok).toBe(true);
    s = r.state;
    invariants(s);
    expect(validateHostMessage(r.effects.find((e) => 't' in e)).ok).toBe(true);
  }
  expect(s.players[4]?.name).toBe('Sa\u200cm 2');
  const r = applyPhoneEvent(s, identity(3, 4), { type: 'rename', name: 'shit' }, 0);
  expect(r.effects).toContainEqual({
    type: 'name-replaced', seat: 4,
    name: r.state.players[3]?.name
  });
  expect(join(createRoom(), 1, 'a'.repeat(13)).result).toMatchObject({ reason: 'too-long' });
});
it('PLAT-004 A17 safe suffixes report final names', () => {
  let s = createRoom();
  for (let i = 1; i <= 8; i++)
    s = join(s, i, `Player ${String((i % 8) + 1)}`).state;
  const r = applyPhoneEvent(s, identity(1, 1), { type: 'rename', name: 'shit' }, 0);
  invariants(r.state);
  expect(r.effects).toContainEqual({
    type: 'name-replaced', seat: 1,
    name: r.state.players[0]?.name
  });
  const duplicate = join(join(createRoom(), 1, 'abcdefghijkl').state, 2, 'abcdefghijkl');
  expect(duplicate.state.players[1]?.name).toBe('abcdefghij 2');
  expect(duplicate.effects).toContainEqual({
    type: 'name-suffixed', seat: 2,
    name: 'abcdefghij 2', givenName: 'abcdefghijkl', nameSuffixed: true
  });
});
it.each([
  '👩‍💻'.repeat(12),
  '👩‍💻',
  '❤️',
  'ශ්‍රී',
  'می‌خواهم',
  '\u{1f3f4}\u{e0067}\u{e0062}\u{e0073}\u{e0063}\u{e0074}\u{e007f}',
  '👨‍👩‍👧',
  'Muhammad',
  'é'.repeat(12),
  'Wei Ming',
])('PLAT-004 stores exact accepted code points %s', (name) => {
  expect(storedName(` ${name} `)).toBe(name);
  const r = j(createRoom(), 1, name);
  expect(r.result.ok).toBe(true);
  expect(r.state.players[0]?.name).toBe(name);
});
it.each([
  ['Anna', 'Ana'],
  ['Lee', 'Le'],
  ['Tim', 'Tîm'],
  ['Al1', 'Ali'],
  ['Bill', 'Bil'],
  ['Jo3', 'Joe'],
  ['Ben', 'Bën'],
  ['Kelly', 'Kely'],
  ['Sam 5', 'Sam S'],
  ['Tan', 'T4n'],
])('PLAT-004 distinct uniqueness keys %s and %s', (a, b) => {
  expect(uniquenessKey(a)).not.toBe(uniquenessKey(b));
  expect(j(j(createRoom(), 1, a).state, 2, b).state.players[1]?.name).toBe(b);
});
it.each([
  'Sa\u200cm',
  'Ｓａｍ',
  'Ѕam',
])('PLAT-004 equivalent uniqueness key %s', (name) => {
  expect(uniquenessKey(name)).toBe(uniquenessKey('Sam'));
});
it('PLAT-004 suffix reports given name without replacement', () => {
  const r = j(j(createRoom(), 1, 'Sam').state, 2, 'sam');
  expect(r.effects).toContainEqual({
    type: 'name-suffixed', seat: 2,
    name: 'sam 2', givenName: 'sam', nameSuffixed: true
  });
  expect(r.effects.find((e) => 't' in e)).toMatchObject({ nameReplaced: false });
});
it.each([
  '',
  '   ',
  'a\nb',
  'a\u0000b',
])('PLAT-004 refuses blank or control input %j', (name) => {
  expect(j(createRoom(), 1, name).result.ok).toBe(false);
});
it('PLAT-004 forged rename with mismatched device is refused', () => {
  const s = j(j(createRoom(), 1, 'A').state, 2, 'B').state;
  expect(applyPhoneEvent(s, { deviceId: 'd2', connectionId: 'c1', seat: 1 },
    { type: 'rename', name: 'Z' }, 0).state.players).toEqual(s.players);
});
it.each([
  ['Anna', 'anna'],
  ['Lee', 'lee'],
  ['Al1', 'al1'],
])('PLAT-004 reviewer skeleton probe %s', (name, key) => {
  expect(uniquenessKey(name)).toBe(key);
});
it.each([
  ['Straße', 'strasse'],
  ['ﬁ', 'fi'],
  ['ΣΑΣ', 'σας'],
  ['Σςσ', 'σσσ'],
  ['ᾲ', 'ὰι'],
  ['Ꮳ', 'ꮳ'],
])('PLAT-004 full case folding equates %s and %s', (a, b) => {
  expect(uniquenessKey(a)).toBe(uniquenessKey(b));
});
