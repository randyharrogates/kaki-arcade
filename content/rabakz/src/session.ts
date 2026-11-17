import { chunksNeeded, selectQuestions } from './select';
import type { MatchSettings } from './select';
import bank from 'virtual:rabakz-bank';
export function categories(): { id: string; title: string }[] { return bank.index.categories.map(c => ({ id: c.id, title: c.title })); }
/** Bank validation and hashes are fixed by the content build; selection checks readiness. */
export function questions(settings: MatchSettings, random: () => number) {
  const chunks = chunksNeeded(bank.index, settings).map(entry => {
    const file = bank.files.find(f => f.name === entry.file);
    if (!file) throw new Error('Missing bank chunk');
    return { category: entry.id, hash: entry.hash, data: JSON.parse(file.text) as unknown };
  });
  const selected = selectQuestions({ index: bank.index, settings, chunks, random });
  if (!selected.ok) throw new Error(`Rabakz selection: ${selected.reason}`);
  return selected.questions;
}
