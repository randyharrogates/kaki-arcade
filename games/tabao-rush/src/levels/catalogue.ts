import { RECIPES } from '../rules/recipes';
import type { Anchor, LevelDefinition } from './format';

function kitchen(id: string, name: string, all: boolean): LevelDefinition {
  const width = all ? 15 : 11, height = 6;
  const dishes = RECIPES.filter(r => all || ['chicken-rice', 'kopi-teh'].includes(r.id));
  const ingredients = [...new Set(dishes.flatMap(r => r.ingredients.map(p => p.ingredient === 'drink' ? 'kopi' : p.ingredient)))];
  const kinds = [...new Set(dishes.flatMap(r => r.ingredients.flatMap(p => p.steps.map(s => s === 'spread' ? 'plating' : s))))];
  const entries: Omit<Anchor, 'tile' | 'facing' | 'kitchen' | 'id'>[] = [
    ...ingredients.map(ingredient => ({ kind: 'crate' as const, ingredient })),
    ...Array.from({ length: all ? 2 : 1 }, () => ({ kind: 'chop' as const })),
    ...kinds.map(kind => ({ kind: kind as Anchor['kind'] })),
    ...(['plating', 'serving', 'return-counter', 'sink', 'bin'] as const).filter(kind => !kinds.includes(kind)).map(kind => ({ kind })),
    ...Array.from({ length: all ? 5 : 4 }, () => ({ kind: 'dish-rack' as const, container: 'plate' as const })),
    { kind: 'dish-rack', container: 'cup' },
    ...(all ? [{ kind: 'dish-rack' as const, container: 'bowl' as const }, { kind: 'extinguisher' as const }] : []),
  ];
  // Perimeter anchors face the uninterrupted central work floor.
  const positions = [
    ...Array.from({ length: width - 2 }, (_, x) => x + 1),
    ...Array.from({ length: width - 2 }, (_, x) => (height - 1) * width + x + 1),
    ...Array.from({ length: height - 2 }, (_, y) => (y + 1) * width),
    ...Array.from({ length: height - 2 }, (_, y) => (y + 1) * width + width - 1),
  ];
  return { id, name, width, height, collision: Array.from({ length: width * height }, (_, i) => (i % width === 0 || i % width === width - 1) && (i < width || i >= width * (height - 1)) ? 'wall' as const : 'floor' as const),
    kitchens: ['coop'], spawns: Array.from({ length: 8 }, (_, i) => ({ tile: 2 * width + i + 1, kitchen: 'coop', facing: 6 as const })),
    stations: entries.map((entry, i) => { const tile = positions[i]; if (tile === undefined) throw new Error('Kitchen perimeter full');
      return { ...entry, id: `${entry.kind}-${String(i)}`, tile, facing: tile < width ? 2 : tile >= width * (height - 1) ? 6 : tile % width === 0 ? 0 : 4, kitchen: 'coop' }; }),
    twists: [], venue: all ? 'zi char' : 'kopitiam',
    allowedDishes: dishes.map(r => r.id), roundSeconds: 210, soloThresholds: [200, 400, 600], ordinal: all ? 5 : 1, firesEnabled: all };
}
export const FIRST_KITCHEN = kitchen('kopitiam-first-shift', 'Kopitiam first shift', false);
export const FULL_KITCHEN = kitchen('zi-char-test-kitchen', 'Zi char test kitchen', true);
export const LEVELS = [FIRST_KITCHEN, FULL_KITCHEN] as const;
