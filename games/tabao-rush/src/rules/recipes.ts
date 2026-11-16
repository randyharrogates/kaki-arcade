import { secondsToSteps } from '@kaki/platform';
import type { Container, Food, Item, Process } from './state';

export const REJECTION_STEPS = secondsToSteps(3);
export const CAPACITY: Readonly<Record<Container, number>> = { plate: 4, bowl: 2, cup: 1 };
export interface Recipe {
  readonly id: string;
  readonly name: string;
  readonly container: Container;
  readonly ingredients: readonly { readonly ingredient: string; readonly steps: readonly Process[] }[];
  readonly assembly: readonly Process[];
  readonly potSequence?: readonly string[];
}
const part = (ingredient: string, ...steps: Process[]) => ({ ingredient, steps });
/** D-085: step order is per ingredient, never across ingredients. Spec §4: one entry per launch dish; kopi and teh are alternatives within dish seven. */
export const RECIPES: readonly Recipe[] = [
  { id: 'chicken-rice', name: 'Chicken rice', container: 'plate', ingredients: [part('rice', 'rice'), part('chicken', 'chop'), part('cucumber', 'chop')], assembly: [] },
  { id: 'char-kway-teow', name: 'Char kway teow', container: 'plate', ingredients: [part('kway-teow', 'chop', 'wok')], assembly: [] },
  { id: 'satay', name: 'Satay', container: 'plate', ingredients: [part('satay', 'chop', 'grill'), part('cucumber', 'chop')], assembly: [] },
  { id: 'laksa', potSequence: ['laksa-broth', 'noodles'], name: 'Laksa', container: 'bowl', ingredients: [part('laksa-broth', 'pot'), part('noodles', 'pot')], assembly: [] },
  { id: 'rojak', name: 'Rojak', container: 'plate', ingredients: [part('pineapple', 'chop'), part('turnip', 'chop'), part('cucumber', 'chop')], assembly: ['mix'] },
  { id: 'kaya-toast', name: 'Kaya toast set', container: 'plate', ingredients: [part('bread', 'grill', 'spread'), part('drink', 'drinks')], assembly: [] },
  { id: 'kopi-teh', name: 'Kopi / teh', container: 'cup', ingredients: [part('drink', 'drinks')], assembly: [] },
];
export type Rejection =
  | { readonly code: 'nothing-to-serve' | 'dirty' | 'wrong-container' | 'unknown-combination' | 'not-ordered' }
  | { readonly code: 'missing-ingredient' | 'extra-ingredient' | 'burnt' | 'extra-step'; readonly ingredient: string }
  | { readonly code: 'missing-step'; readonly ingredient: string; readonly step: Process };
export type ServiceEvent = { readonly cook: string; readonly seat: number; readonly step: number; readonly counter: number } &
  ({ readonly type: 'served'; readonly dish: string; readonly drink?: string } | { readonly type: 'rejected'; readonly reason: Rejection });
export type RecipeCheck = { readonly dish: string } | { readonly reason: Rejection };
const matches = (expected: string, actual: string | undefined) => expected === actual || expected === 'drink' && (actual === 'kopi' || actual === 'teh');
export function containerOf(item: Item): Container | undefined {
  return item.container ?? (item.kind === 'plate' || item.kind === 'dirty-plate' || item.kind === 'dish' ? 'plate' : undefined);
}
export function food(item: Item): readonly Food[] {
  if (containerOf(item)) return [...(item.contents ?? []), ...(item.cup?.contents ?? [])];
  return [{ id: item.id, kind: item.kind, ...(item.ingredient === undefined ? {} : { ingredient: item.ingredient }), processes: item.processes ?? [] }, ...(item.contents ?? [])];
}
export function checkRecipe(item: Item, allowed?: readonly string[]): RecipeCheck {
  const contents = food(item), container = containerOf(item);
  if (!contents.length && item.kind !== 'dirty-plate') return { reason: { code: 'nothing-to-serve' } };
  if (item.kind === 'dirty-plate' || item.cup?.kind === 'dirty-plate') return { reason: { code: 'dirty' } };
  const burnt = contents.find((f) => f.kind === 'burnt');
  if (burnt) return { reason: { code: 'burnt', ingredient: burnt.ingredient ?? 'unknown' } };
  let recipe: Recipe | undefined;
  let overlap = -1, missing = Infinity, difference = Infinity;
  // Stable table-order ties, without allocating a ranking array on every preview/service.
  for (const candidate of RECIPES) {
    let found = 0;
    for (const part of candidate.ingredients) if (contents.some((f) => matches(part.ingredient, f.ingredient))) found++;
    const absent = candidate.ingredients.length - found;
    const delta = Math.abs(candidate.ingredients.length - contents.length);
    if (found > overlap || found === overlap && (absent < missing || absent === missing && delta < difference)) {
      recipe = candidate; overlap = found; missing = absent; difference = delta;
    }
  }
  if (!container || recipe && overlap > 0 && container !== recipe.container) return { reason: { code: 'wrong-container' } };
  if (recipe?.id === 'kaya-toast' && (!item.cup || containerOf(item.cup) !== 'cup' || !item.cup.contents?.some((f) => matches('drink', f.ingredient)))) return { reason: { code: 'missing-ingredient', ingredient: 'drink' } };
  if (!recipe || overlap <= 0) return { reason: { code: 'unknown-combination' } };
  const remaining = [...contents];
  const paired: { expected: Recipe['ingredients'][number]; actual: Food }[] = [];
  for (const expected of recipe.ingredients) {
    const index = remaining.findIndex((f) => matches(expected.ingredient, f.ingredient));
    if (index < 0) return { reason: { code: 'missing-ingredient', ingredient: expected.ingredient } };
    const actual = remaining.splice(index, 1)[0];
    if (actual) paired.push({ expected, actual });
  }
  if (remaining[0]) return { reason: { code: 'extra-ingredient', ingredient: remaining[0].ingredient ?? 'unknown' } };
  for (const { expected, actual } of paired) {
    const history = actual.processes ?? [];
    for (const [i, step] of expected.steps.entries()) if (history[i] !== step) return { reason: { code: 'missing-step', ingredient: actual.ingredient ?? expected.ingredient, step } };
  }
  for (const step of recipe.assembly) if (!item.processes?.includes(step)) return { reason: { code: 'missing-step', ingredient: recipe.id, step } };
  for (const { expected, actual } of paired) if ((actual.processes?.length ?? 0) > expected.steps.length) return { reason: { code: 'extra-step', ingredient: actual.ingredient ?? expected.ingredient } };
  if ((item.processes?.length ?? 0) > recipe.assembly.length) return { reason: { code: 'extra-step', ingredient: recipe.id } };
  if (allowed && !allowed.includes(recipe.id)) return { reason: { code: 'not-ordered' } };
  return { dish: recipe.id };
}
export function ingredientAccepted(type: Process, ingredient: string | undefined, history: readonly Process[] = []): boolean {
  return RECIPES.some((r) => r.ingredients.some((p) => matches(p.ingredient, ingredient) && p.steps[history.length] === type && history.every((step, i) => step === p.steps[i]) &&
    !(type === 'pot' && r.potSequence && r.potSequence[0] !== ingredient)));
}
export function potAddition(current: Item, held: Item): boolean {
  return current.kind === 'cooked' && (current.processes ?? []).join(',') === 'pot' && !current.contents?.length && held.kind === 'raw' && !(held.processes?.length) &&
    RECIPES.some((r) => r.potSequence !== undefined && r.potSequence[0] === current.ingredient && r.potSequence[1] === held.ingredient);
}
export function assemblyAction(item: Item): { action: 'mix' | 'spread'; ingredient?: string } | null {
  if (containerOf(item) !== 'plate') return null;
  const contents = item.contents ?? [];
  for (const recipe of RECIPES) {
    if (recipe.assembly.includes('mix') && !item.processes?.includes('mix') && contents.length === recipe.ingredients.length &&
      recipe.ingredients.every((p) => contents.some((f) => matches(p.ingredient, f.ingredient) &&
        (f.processes ?? []).join(',') === p.steps.join(',')))) return { action: 'mix' };
    for (const part of recipe.ingredients) {
      const before = part.steps.indexOf('spread');
      if (before < 0) continue;
      if (contents.some((f) => f.kind === 'cooked' && matches(part.ingredient, f.ingredient) &&
        (f.processes ?? []).join(',') === part.steps.slice(0, before).join(','))) return { action: 'spread', ingredient: part.ingredient };
    }
  }
  return null;
}

/** D-087: only final assembly may remain after food enters a container. */
export function readyForContainer(item: Item): boolean {
  return food(item).every((f) => f.kind !== 'burnt' && RECIPES.some((r) => r.ingredients.some((p) => {
    const history = f.processes ?? [];
    const steps = p.steps;
    const required = steps.at(-1) === 'mix' || steps.at(-1) === 'spread' ? steps.slice(0, -1) : steps;
    return matches(p.ingredient, f.ingredient) && (steps.join(',') === history.join(',') || required.join(',') === history.join(','));
  })));
}
