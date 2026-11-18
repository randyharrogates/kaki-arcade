import { it, expect } from 'vitest';
import { build } from 'vite';
import { rabakzBank } from '@kaki/content-rabakz/vite';
import type { Chunk, SourceCredit } from '@kaki/content-rabakz';
import { legalCopy } from './legal-copy';

it('RZ-021 emits exactly the shipped OTDB questions and their scoped credits', async () => {
  const plugin = rabakzBank();
  const result = await build({ configFile: false, logLevel: 'silent', plugins: [plugin],
    build: { write: false, rolldownOptions: { input: 'content/rabakz/src/session.ts', preserveEntrySignatures: 'strict' } } });
  if (!('output' in result)) throw new Error('Expected build output');
  const asset = result.output.find(file => file.fileName === 'rabakz/questions.json');
  if (asset?.type !== 'asset') throw new Error('Missing downloadable bank');
  expect(legalCopy.credits.sections[0].links.at(-1)?.href).toBe('/' + asset.fileName);
  const text = String(asset.source);
  expect(text.endsWith('\n')).toBe(true);
  const download = JSON.parse(text) as { questions: Chunk['questions']; credits: SourceCredit[] };
  const source = await plugin.load('\0virtual:rabakz-bank');
  const bank = JSON.parse(source?.slice('export default '.length) ?? 'null') as { index: { credits: SourceCredit[] }; files: { name: string; text: string }[] };
  const questions = bank.files.filter(file => file.name !== 'index.json').flatMap(file => (JSON.parse(file.text) as Chunk).questions).filter(question => question.id.startsWith('otdb-'));
  expect(download.questions).toEqual(questions);
  expect(download.questions.length).toBeGreaterThan(0);
  expect(download.questions.every(question => question.id.startsWith('otdb-'))).toBe(true);
  expect(download.credits).toEqual(bank.index.credits);
  expect(download.credits).toEqual([expect.objectContaining({ licence: 'CC BY-SA 4.0', questions: questions.length })]);
  expect(result.output.filter(file => file.type === 'chunk').some(chunk => chunk.code.includes('/rabakz/questions.json'))).toBe(false);
});

it('RZ-021 does not emit a download when the bundle has no bank module', async () => {
  const result = await build({ configFile: false, logLevel: 'silent', plugins: [rabakzBank()],
    build: { write: false, rolldownOptions: { input: 'apps/web/src/pages/legal-copy.ts', preserveEntrySignatures: 'strict' } } });
  if (!('output' in result)) throw new Error('Expected build output');
  expect(result.output.some(file => file.fileName === 'rabakz/questions.json')).toBe(false);
});
