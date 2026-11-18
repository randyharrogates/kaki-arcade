import { expect, it } from 'vitest';
import type { JsonValue } from '@kaki/platform';
import { checkSettingsSchema, defaultSettings, settingsSchema, validateSettings } from '@kaki/platform';
import { rabakz } from '../index';
import { pool, readSetupTable, setupProblem } from './setup';
import type { SetupTable } from './setup';
const table: SetupTable = { budgetBytes: 100, categories: [
  { id: 'life', title: 'Singapore life', region: 'singapore', plain: { easy: 10, medium: 5, hard: 8 }, pictures: { easy: 3, medium: 0, hard: 2 }, bytes: 20, largestPicture: 30 },
  { id: 'games', title: 'Games, comics and anime', region: 'general', plain: { easy: 50, medium: 50, hard: 50 }, pictures: { easy: 0, medium: 0, hard: 0 }, bytes: 10, largestPicture: 0 },
  { id: 'tech', title: 'Technology and vehicles', region: 'general', plain: { easy: 50, medium: 50, hard: 50 }, pictures: { easy: 0, medium: 0, hard: 0 }, bytes: 0, largestPicture: 0 },
  { id: 'arts', title: 'Singapore arts and sport', region: 'singapore', plain: { easy: 10, medium: 10, hard: 10 }, pictures: { easy: 0, medium: 0, hard: 0 }, bytes: 0, largestPicture: 0 },
] };
it('RZ-011 counts difficulties, caps pictures, counts all for none and fails over budget', () => {
  expect(pool(table, ['life'], 'easy')).toBe(12);
  expect(pool(table, ['life'], 'hard')).toBe(10);
  expect(pool(table, ['life'], 'mixed')).toBe(25);
  expect(pool(table, [], 'mixed')).toBe(355);
  expect(pool({ ...table, budgetBytes: 19 }, ['life'], 'easy')).toBe(0);
  expect(pool({ ...table, categories: table.categories.map(c => ({ ...c, largestPicture: 0 })) }, ['life'], 'mixed')).toBe(28);
});
it('RZ-001 refusals name computed counts and suggest a working fix within 89 characters', () => {
  const small = { ...table, budgetBytes: 20 };
  expect(setupProblem(small, { length: 10, categories: ['life'], difficulty: 'hard' })).toBe('Only 8 Hard Life questions. Choose Mixed difficulty.');
  for (const length of [10, 30, 50] as const) for (const difficulty of ['easy', 'mixed', 'hard'] as const) {
    const problem = setupProblem(small, { length, categories: ['life'], difficulty });
    if (problem) expect(problem.length).toBeLessThanOrEqual(89);
  }
  expect(readSetupTable(null).categories).toEqual([]);
  expect(readSetupTable({ ...table, categories: [{ id: 'bad' }] }).categories).toEqual([]);
  expect(readSetupTable(table)).toEqual(table);
});
it('RZ-010 groups, labels, every field option and defaults are valid', () => {
  const schema = settingsSchema(rabakz, { data: { 'categories.json': table as unknown as JsonValue }, saved: null, teams: false });
  expect(checkSettingsSchema(schema)).toEqual([]);
  const defaults = defaultSettings(schema);
  expect(validateSettings(schema, defaults).ok).toBe(true);
  const categories = schema.fields.find(field => field.kind === 'multi');
  expect(categories).toMatchObject({ noneLabel: 'Mixed', default: [], options: [
    { label: 'Games and anime', group: 'Around the world' }, { label: 'Tech and vehicles', group: 'Around the world' },
    { label: 'Life', group: 'Singapore' }, { label: 'Arts and sport', group: 'Singapore' },
  ] });
  for (const field of schema.fields) if (field.kind === 'choice' || field.kind === 'multi')
    for (const option of field.options) expect(validateSettings(schema, { ...defaults,
      [field.id]: field.kind === 'multi' ? [option.value] : option.value }).ok).toBe(true);
  expect(schema.fields.find(field => field.id === 'difficulty')).toMatchObject({ help: 'Easy suits children' });
});

it('RZ-001 offers an available shorter length and names difficulty plainly', () => {
  const larger = { ...table, categories: table.categories.map(c => c.id === 'life' ? {...c, plain:{easy:10,medium:20,hard:10}} : c) };
  expect(setupProblem(larger, {length:50,categories:['life'],difficulty:'mixed'})).toContain('Choose 30 questions or Mixed categories.');
});

it('RZ-001 refusal category and difficulty names match the buttons', () => {
  const nature = {...table, categories:table.categories.map(c => c.id === 'life' ? {...c,title:'Singapore nature'} : c),budgetBytes:20};
  expect(setupProblem(nature,{length:10,categories:['life'],difficulty:'hard'})).toBe('Only 8 Hard Nature questions. Choose Mixed difficulty.');
});
