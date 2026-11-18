import type { Settings } from './model';

type Counts = Readonly<Record<'easy' | 'medium' | 'hard', number>>;
export interface SetupTable {
  readonly budgetBytes: number;
  readonly categories: readonly {
    readonly id: string; readonly title: string; readonly region: string;
    readonly plain: Counts; readonly pictures: Counts;
    readonly bytes: number; readonly largestPicture: number;
  }[];
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const counts = (value: unknown): value is Counts => record(value) &&
  count(value.easy) && count(value.medium) && count(value.hard);
/** Reject incomplete preload data rather than admitting a match on guessed counts. */
export function readSetupTable(value: unknown): SetupTable {
  if (!record(value) || !count(value.budgetBytes) || !Array.isArray(value.categories))
    return { budgetBytes: 0, categories: [] };
  const categories: SetupTable['categories'][number][] = [];
  for (const entry of value.categories as unknown[]) {
    if (!record(entry) || typeof entry.id !== 'string' || typeof entry.title !== 'string' ||
      !['general', 'singapore'].includes(String(entry.region)) || !counts(entry.plain) ||
      !counts(entry.pictures) || !count(entry.bytes) || !count(entry.largestPicture) ||
      categories.some(category => category.id === entry.id)) return { budgetBytes: 0, categories: [] };
    categories.push({ id: entry.id, title: entry.title, region: String(entry.region),
      plain: entry.plain, pictures: entry.pictures, bytes: entry.bytes, largestPicture: entry.largestPicture });
  }
  return { budgetBytes: value.budgetBytes, categories };
}
/** RZ-001/010/011: conservative pool guaranteed to fit the transfer budget. */
export function pool(table: SetupTable, categories: readonly string[], difficulty: Settings['difficulty']): number {
  const needed = table.categories.filter(category => categories.length === 0 || categories.includes(category.id));
  const left = table.budgetBytes - needed.reduce((sum, category) => sum + category.bytes, 0);
  if (left < 0) return 0;
  let plain = 0, pictures = 0, largest = 0;
  for (const category of needed) {
    largest = Math.max(largest, category.largestPicture);
    for (const level of difficulty === 'mixed' ? ['easy', 'medium', 'hard'] as const : [difficulty]) {
      plain += category.plain[level]; pictures += category.pictures[level];
    }
  }
  return plain + (largest === 0 ? pictures : Math.min(pictures, Math.floor(left / largest)));
}
/** The suggested fix is checked against the same pool, including the transfer budget. */
export function setupProblem(table: SetupTable, settings: Settings): string | null {
  const categories = settings.categories ?? [];
  const available = pool(table, categories, settings.difficulty);
  if (available >= settings.length) return null;
  const shorter = ([30, 10] as const).find(length => length < settings.length && available >= length);
  const fix = shorter ? `Choose ${String(shorter)} questions${pool(table, [], settings.difficulty) >= settings.length ? ' or Mixed categories' : ''}.` : pool(table, categories, 'mixed') >= settings.length ? 'Choose Mixed difficulty.' :
    pool(table, [], settings.difficulty) >= settings.length ? 'Choose Mixed categories.' :
    pool(table, [], 'mixed') >= settings.length ? 'Choose Mixed categories and Mixed difficulty.' :
    pool(table, [], 'mixed') >= 10 ? 'Choose 10 questions and Mixed difficulty.' : 'Try another game.';
  const category = categories.length === 1 ? table.categories.find(entry => entry.id === categories[0]) : undefined;
  const short = category ? category.title.replace(/^Singapore /, '').replace('Games, comics and anime', 'Games and anime').replace('Technology and vehicles', 'Tech and vehicles') : '';
  const label = short.charAt(0).toUpperCase() + short.slice(1);
  const detail = `Only ${String(available)} ${settings.difficulty.charAt(0).toUpperCase() + settings.difficulty.slice(1)}${label ? ` ${label}` : ''} questions. ${fix}`;
  return detail.length <= 89 ? detail : `Only ${String(available)} questions fit. ${fix}`;
}
