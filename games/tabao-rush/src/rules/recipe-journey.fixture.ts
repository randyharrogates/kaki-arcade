import { BUTTON, createTick, EMPTY_SETUP, STEP_MS } from '@kaki/platform';
import { tabaoRush } from './game';
import { checkRecipe, containerOf, RECIPES } from './recipes';
import type { Recipe } from './recipes';
import type { Container, Item, Level, StationType, TabaoState } from './state';
import { prepareStations, COOK_STEPS, WORK_STEPS, ASSEMBLY_STEPS } from './stations';
const players = Array.from({ length: 8 }, (_, i) => ({ id: `p${String(i)}`, seat: i + 1,
  name: `Cook ${String(i)}`, colour: 'seat-1' as const }));
const ingredients = ['rice', 'chicken', 'cucumber', 'kway-teow', 'satay', 'laksa-broth', 'noodles', 'pineapple', 'turnip', 'bread', 'kopi', 'teh'];
const types: readonly StationType[] = ['chop', 'wok', 'pot', 'grill', 'rice', 'drinks', 'plating', 'serving', 'sink', 'bin', 'dish-rack', 'return-counter'];
const width = 32;
const crate = (ingredient: string) => ingredient === 'noodles' ? width + 13 : width + 1 + ingredients.indexOf(ingredient);
export const station = (type: StationType) => width + 14 + types.indexOf(type);
export const level: Level = { id: 'recipe-kitchen', width, height: 8,
  spawns: players.map((_, i) => ({ x: i === 0 ? 1.5 : i * 2 + 1.5, y: i === 0 ? 2.5 : 5.5 })),
  tiles: Array.from({ length: width * 8 }, (_, at) => {
    const x = at % width, y = Math.floor(at / width);
    if (y === 1 && x === 13) return { kind: 'station', stationId: 'noodles', ingredient: 'noodles' };
    if (y === 1 && x >= 1 && x <= ingredients.length && x !== 7) return { kind: 'station', stationId: `crate-${String(x)}`, ingredient: ingredients[x - 1] ?? '' };
    const type = y === 1 ? types[x - 14] : undefined;
    if (y === 1 && x === 29) return { kind: 'station', stationId: 'plating-2', stationType: 'plating' };
    if (y === 1 && x === 30) return { kind: 'counter' };
    if (y === 1 && (x === 27 || x === 28)) return { kind: 'station', stationId: `rack-${String(x)}`, stationType: 'dish-rack', container: x === 27 ? 'bowl' : 'cup' };
    if (type) return { kind: 'station', stationId: type, stationType: type, ...(type === 'dish-rack' ? { container: 'plate' } : {}) };
    return x === 0 || x === width - 1 || y === 0 || y === 7 ? { kind: 'wall' } : { kind: 'floor' };
  }),
};
export function initial(count = 1, seed = 73): TabaoState {
  const base = tabaoRush.init(seed, players.slice(0, count), {}, EMPTY_SETUP);
  return prepareStations({ ...base, level, cooks: base.cooks.map((c, i) => ({ ...c,
    ...level.spawns[i], facing: 6, targetTile: i === 0 ? crate('rice') : null })) });
}
export const cross = 1 << BUTTON.FACE_BOTTOM, circle = 1 << BUTTON.FACE_RIGHT;
function inputs(state: TabaoState, mask = 0, x = 0, y = 0, pressed = mask) {
  const id = state.cooks[0]?.id ?? 'p0';
  return createTick({ frames: new Map([[id, { held: mask, pressed, released: 0, axes: [x, y, 0, 0], age: 0, seq: state.tick }]]) });
}
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test value');
  return value;
}
export function offered(recipe: Recipe, container: Container = recipe.container): Item {
  return { id: 100, kind: 'dish', container, processes: recipe.assembly,
    ...(recipe.id === 'kaya-toast' ? { cup: { id: 109, kind: 'dish' as const, container: 'cup' as const, contents: [{ id: 110, kind: 'cooked' as const, ingredient: 'kopi', processes: ['drinks' as const] }], place: { kind: 'held' as const, cook: 'p0' } } } : {}),
    contents: recipe.ingredients.filter((p) => recipe.id !== 'kaya-toast' || p.ingredient !== 'drink').map((p, i) => ({ id: 101 + i, kind: p.steps.length ? 'cooked' : 'raw',
      ingredient: p.ingredient === 'drink' ? 'kopi' : p.ingredient, processes: p.steps })),
    place: { kind: 'held', cook: 'p0' } };
}
interface Pad { stick: [number, number]; buttons: ('FACE_BOTTOM' | 'FACE_RIGHT')[] }
/** This driver only walks and presses sampled buttons. No state edits after init. */
export class Journey {
  state: TabaoState;
  pads: Pad[] = [];
  constructor(count = 1) { this.state = initial(count); }
  tick(mask = 0, x = 0, y = 0) {
    this.pads.push({ stick: [x, y], buttons: mask === cross ? ['FACE_BOTTOM'] : mask === circle ? ['FACE_RIGHT'] : [] });
    const previous = this.pads[this.pads.length - 2];
    const priorMask = previous?.buttons[0] === 'FACE_BOTTOM' ? cross : previous?.buttons[0] === 'FACE_RIGHT' ? circle : 0;
    this.state = tabaoRush.step(this.state, inputs(this.state, mask, x, y, mask & ~priorMask), STEP_MS);
  }
  press() { this.tick(cross); this.tick(); }
  wait(n: number, mask = 0) { for (let i = 0; i < n; i++) this.tick(mask); }
  walk(tile: number) {
    const x = tile % width + 0.5;
    for (let attempt = 0; attempt < 700; attempt++) {
      const cook = this.state.cooks[0];
      if (!cook) throw new Error('No cook');
      const dx = x - cook.x, dy = 2.5 - cook.y;
      if (Math.hypot(dx, dy) < 0.015) break;
      this.tick(0, Math.max(-1, Math.min(1, dx * 20)), Math.max(-1, Math.min(1, dy * 20)));
    }
    this.tick(); this.tick(0, 0, -0.2); this.tick();
    if (this.state.cooks[0]?.targetTile !== tile) throw new Error('Journey missed target');
  }
  getContainer(container: Container) {
    this.walk(container === 'plate' ? station('dish-rack') : width + (container === 'bowl' ? 27 : 28));
    this.press();
    if (containerOf(required(this.state.inventory.held.p0)) !== container) throw new Error('Wrong container');
    this.walk(station('plating')); this.press();
  }
  prepareIngredient(ingredient: string, type: StationType) {
    this.walk(crate(ingredient)); this.press();
    this.walk(station(type)); this.press();
    if (type === 'grill') { this.wait(COOK_STEPS / 2); this.tick(circle); this.wait(COOK_STEPS / 2); }
    else this.wait(type === 'chop' || type === 'drinks' ? WORK_STEPS : COOK_STEPS, type === 'chop' || type === 'drinks' ? circle : 0);
    if (ingredient !== 'laksa-broth') this.press();
  }
  add() { this.walk(station('plating')); this.press(); }
  dish(id: string) {
    const recipe = RECIPES.find((r) => r.id === id);
    if (!recipe) throw new Error('Unknown recipe');
    this.getContainer(recipe.container);
    for (const p of recipe.ingredients) {
      const ingredient = p.ingredient === 'drink' ? 'kopi' : p.ingredient;
      if (id === 'laksa' && ingredient === 'noodles') continue;
      const first = p.steps[0];
      if (first === 'chop' || first === 'grill' || first === 'rice' || first === 'pot' || first === 'drinks') this.prepareIngredient(ingredient, first);
      else { this.walk(crate(ingredient)); this.press(); }
      if (p.steps[1] === 'wok' || p.steps[1] === 'grill') {
        const type = p.steps[1]; this.walk(station(type)); this.press();
        if (type === 'grill') { this.wait(COOK_STEPS / 2); this.tick(circle); this.wait(COOK_STEPS / 2); }
        else this.wait(COOK_STEPS);
        this.press();
      }
      if (id === 'laksa') {
        // Return the broth to its pot, then add noodles in sequence.
        this.walk(crate('noodles')); this.press(); this.walk(station('pot')); this.press();
        this.press();
      }
      if (ingredient === 'kopi' && id === 'kaya-toast') {
        this.walk(width + 30); this.press(); // park pulled drink on ordinary counter
        this.walk(width + 28); this.press(); this.walk(width + 29); this.press(); // cup on second plating counter
        this.walk(width + 30); this.press(); this.walk(width + 29); this.press(); this.press();
      }
      this.add();
      if (ingredient === 'bread') this.wait(ASSEMBLY_STEPS, circle);
    }
    if (id === 'rojak') this.wait(ASSEMBLY_STEPS, circle);
    this.press();
    const checked = checkRecipe(required(this.state.inventory.held.p0));
    if (!('dish' in checked) || checked.dish !== id) throw new Error('Journey did not make dish');
  }
  serve() {
    this.walk(station('serving')); this.tick(cross);
    if (this.state.serviceEvents?.[0]?.type !== 'served') throw new Error('Journey did not serve order');
    this.tick();
  }
}

