import { readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { CATEGORY_TITLES, categoryTitle } from './categories';
import { rabakz } from '../src/index';
import { scenario } from './scenarios';
import { screenModel } from './view-model';

it('RZ-003 question categories show the bank metadata title for every category', () => {
  const directory = 'content/rabakz/src/questions';
  const metadata = readdirSync(directory).filter(file => file.endsWith('.json')).map(file =>
    JSON.parse(readFileSync(`${directory}/${file}`, 'utf8')) as { category: string; title: string });
  expect(Object.keys(CATEGORY_TITLES).sort()).toEqual(metadata.map(category => category.category).sort());
  const view = rabakz.publicView(scenario('open'));
  if (!view.question) throw new Error('Missing question fixture');
  for (const { category, title } of metadata) {
    expect(categoryTitle(category)).toBe(title);
    expect(screenModel({ ...view, question: { ...view.question, category } })?.category).toBe(title);
  }
  expect(categoryTitle('arts-and-literature')).toBe('Arts and literature');
});
