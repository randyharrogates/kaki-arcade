import '../../../content/rabakz/src/bank.d.ts';
import { expect, it, vi } from 'vitest';
import bank from 'virtual:rabakz-bank';
import { createRng, nextFloat } from '@kaki/sim-core';
import { checkSettingsSchema, defaultSettings, settingsSchema, validateSettings } from '@kaki/platform';
import { poolSize, selectQuestions } from '@kaki/content-rabakz';
import { setupTable } from '../../../content/rabakz/src/select';
import { rabakz } from '../../../games/rabakz/src';
import { pool } from '../../../games/rabakz/src/rules/setup';

vi.mock('virtual:rabakz-bank', async () => {
  const { rabakzBank } = await import('@kaki/content-rabakz/vite');
  const source = await rabakzBank().load('\0virtual:rabakz-bank');
  if (!source) throw new Error('Missing bank');
  return { default: JSON.parse(source.slice('export default '.length)) as unknown };
});
vi.mock('virtual:rabakz-bank-index', async () => {
  const { rabakzBank } = await import('@kaki/content-rabakz/vite');
  const source = await rabakzBank().load('\0virtual:rabakz-bank-index');
  if (!source) throw new Error('Missing index');
  return { default: JSON.parse(source.slice('export default '.length)) as unknown };
});

it('RZ-001/010/011 setup and selector agree across the real bank and seeded subsets', () => {
  const table = setupTable(bank.index);
  const schema = settingsSchema(rabakz, { data: { 'categories.json': table }, saved: null, teams: false });
  expect(checkSettingsSchema(schema)).toEqual([]);
  expect(validateSettings(schema, defaultSettings(schema)).ok).toBe(true);
  expect(table.categories).toHaveLength(16);
  const singapore = table.categories.filter(category => category.region === 'singapore').map(category => category.id);
  expect(singapore).toHaveLength(6);
  const rng = createRng(404);
  const subsets = [[], table.categories.map(category => category.id), singapore,
    ...table.categories.map(category => [category.id]),
    ...Array.from({ length: 200 }, () => table.categories.filter(() => nextFloat(rng) < 0.5).map(category => category.id))];
  const chunks = bank.index.categories.map(entry => ({ category: entry.id, hash: entry.hash,
    data: JSON.parse(bank.files.find(file => file.name === entry.file)?.text ?? 'null') as unknown }));
  let refusals = 0;
  for (const categories of subsets) for (const difficulty of ['easy', 'mixed', 'hard'] as const) {
    const selection = { categories: categories.length ? categories : 'mixed' as const, difficulty, count: 10 as const };
    expect(pool(table, categories, difficulty)).toBe(poolSize(bank.index, selection));
    for (const length of [10, 30, 50] as const) {
      const settings = { length, categories, difficulty };
      const problem = schema.check?.(settings);
      if (problem) { refusals++; expect(problem.length).toBeLessThanOrEqual(89); continue; }
      for (let seed = 1; seed <= 5; seed++) {
        const random = createRng(seed);
        const selected = selectQuestions({ index: bank.index, chunks,
          settings: { ...selection, count: length }, random: () => nextFloat(random) });
        expect(selected.ok).toBe(true);
        if (selected.ok) expect(selected.questions).toHaveLength(length);
      }
    }
  }
  expect(refusals).toBeGreaterThan(0);
  const life = table.categories.find(category => category.title === 'Singapore life');
  expect(life).toBeDefined();
  if (life && pool(table, [life.id], 'hard') < 10)
    expect(schema.check?.({ length: 10, categories: [life.id], difficulty: 'hard' })).toMatch(/Only \d+ hard life questions\./i);
}, 60_000);

it('RZ-010 setup entry static module graph excludes chunk texts', async () => {
  const { build } = await import('vite');
  const { rabakzBank } = await import('@kaki/content-rabakz/vite');
  const result = await build({ configFile: false, logLevel: 'silent', plugins: [rabakzBank()],
    build: { write: false, minify: false, rolldownOptions: { input: 'content/rabakz/src/session.ts', preserveEntrySignatures: 'strict' } } });
  if (!('output' in result)) throw new Error('Expected build output');
  const chunks = result.output.filter(chunk => chunk.type === 'chunk');
  const entry = chunks.find(chunk => chunk.isEntry);
  expect(entry).toBeDefined();
  const visit = (name: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(name)) return seen;
    seen.add(name);
    const chunk = chunks.find(chunk => chunk.fileName === name);
    for (const imported of chunk?.imports ?? []) visit(imported, seen);
    return seen;
  };
  const setup = chunks.filter(chunk => visit(entry?.fileName ?? '').has(chunk.fileName));
  const modules = setup.flatMap(chunk => Object.keys(chunk.modules));
  expect(modules).toContain('\0virtual:rabakz-bank-index');
  expect(modules).not.toContain('\0virtual:rabakz-bank');
  expect(chunks.some(chunk => Object.keys(chunk.modules).includes('\0virtual:rabakz-bank'))).toBe(true);
});
