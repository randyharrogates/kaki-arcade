import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { CAPACITY, RECIPES, ingredientAccepted, readyForContainer } from '../games/tabao-rush/src/rules/recipes';
import { accepts, automatic, advanceStations, prepareStations } from '../games/tabao-rush/src/rules/stations';
import type { Item, Process, StationType, TabaoState } from '../games/tabao-rush/src/rules/state';

const source = readFileSync(new URL('./blender/items.py', import.meta.url), 'utf8');
const config = JSON.parse(readFileSync(new URL('../assets/src/pipeline.json', import.meta.url), 'utf8')) as {
  sets: { id: string; frames: { id: string; file: string; anchor: number[]; anchors?: Record<string, number[]> }[] }[];
};
const itemSet = config.sets.find((s) => s.id === 'tabao-rush-items');
if (!itemSet) throw new Error('pipeline.json has no tabao-rush-items set');
const frames = itemSet.frames;
const ingredients = [...new Set(RECIPES.flatMap((r) => r.ingredients.flatMap((p) =>
  p.ingredient === 'drink' ? ['kopi', 'teh'] : [p.ingredient])))];
const reachable = new Map<string, Set<string>>();
const portions = new Set<string>();
const containers = Object.keys(CAPACITY);
// Ask the simulation's actual completion transition; changes to station outputs must
// change this graph and fail coverage, rather than agreeing with a duplicated ternary.
const stationOutput = (process: Process, ingredient: string, history: Process[]) => {
  const state = { tick: 0, level: { firesEnabled: false }, stations: { 0: {
    tile: 0, type: process, progress: 1, total: 1, turned: true,
    content: { id: 1, ingredient, kind: 'raw', processes: history,
      place: { kind: 'held', cook: 'test' } },
  } } } as unknown as TabaoState;
  return advanceStations(state).stations?.[0]?.content?.kind;
};
const racks = prepareStations({ level: { tiles: [], extinguisherTile: 0 },
  inventory: { counters: {} }, nextItemId: 1 } as unknown as TabaoState);
const equipment = Object.values(racks.inventory.counters).map((item) => `item-${item?.kind ?? 'missing'}`);
for (const ingredient of ingredients) {
  const states = new Set(['raw']);
  for (const recipe of RECIPES) for (const part of recipe.ingredients) {
    if (part.ingredient !== ingredient && !(part.ingredient === 'drink' && ['kopi', 'teh'].includes(ingredient))) continue;
    const history: Process[] = [];
    let appearance: string;
    for (const process of part.steps) {
      if (process === 'spread') appearance = 'spread';
      // Noodles are added to cooked broth (potAddition), never loaded alone.
      else if (process === 'pot' && recipe.potSequence?.[1] === ingredient) appearance = stationOutput(process, ingredient, history) ?? 'missing';
      else {
        if (!ingredientAccepted(process, ingredient, history)) throw new Error(`Unreachable recipe step ${ingredient}/${process}`);
        appearance = stationOutput(process, ingredient, history) ?? 'missing';
        if (automatic(process as StationType)) states.add('burnt');
      }
      states.add(appearance);
      history.push(process);
      const item: Item = { id: 1, ingredient, kind: appearance === 'spread' ? 'cooked' : appearance as Item['kind'],
        processes: [...history], place: { kind: 'held', cook: 'test' } };
      if (readyForContainer(item)) portions.add(`portion-${ingredient}-${appearance}`);
    }

  }
  reachable.set(ingredient, states);
}
const expected = [
  ...[...reachable].flatMap(([ingredient, states]) => [...states].map((s) => `item-${ingredient}-${s}`)),
  ...containers.flatMap((c) => ['clean', 'dirty'].map((s) => `container-${c}-${s}`)),
  ...equipment,
  ...RECIPES.flatMap((r) => [`dish-${r.id}-plated`, `icon-${r.id}`]),
  ...portions, 'portion-side-cup-clean', 'portion-side-kopi-cooked', 'portion-side-teh-cooked', 'portion-drink-side-clean', 'portion-rojak-dressing-clean',
];

describe('TR-040 TR-041 reachable simulation-to-art coverage', () => {
  it('rasterises geometry with holes, disconnected pieces and a rim, and rejects silhouette collisions', () => {
    const result = execFileSync('python3', ['-c', `
import importlib.util
spec = importlib.util.spec_from_file_location('items', 'tools/blender/items.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
def square(x, y, width):
    a, b, c, d = (x,y), (x+width,y), (x+width,y+width), (x,y+width)
    return [(a,b,c), (a,c,d)]
mask = m.raster_mask(square(.2,.2,.2), 10)
assert mask == {y*10+x for y in range(1,5) for x in range(1,5)}, mask
islands = m.raster_mask(square(.1,.1,.1)+square(.8,.8,.1), 10)
assert 44 not in islands and 11 in islands and 88 in islands
assert not m.raster_mask([((.5,.5),(.5,.5),(.5,.5))])
previous = {}
m.check_icon_mask('rice', mask, previous)
try:
    m.check_icon_mask('laksa', set(mask), previous)
except RuntimeError as error:
    assert 'rice' in str(error) and '1.000 > .90' in str(error)
else:
    raise AssertionError('Identical silhouettes accepted')
m.check_icon_mask('different', {99}, previous)
# Strictly greater than .90 fails; equality is allowed.
m.check_icon_mask('boundary', set(range(9)), {'ten': set(range(10))})
# Ink guard accepts both orientations and inclusive limits, rejecting the old tiny fit.
for width, height in ((41, 20), (20, 47), (44, 30)):
    m.check_icon_size('valid', {y*55+x for y in range(5,5+height) for x in range(5,5+width)})
for width, height in ((28, 25), (40, 20), (48, 20)):
    try:
        m.check_icon_size('bad-fit', {y*55+x for y in range(3,3+height) for x in range(3,3+width)})
    except RuntimeError as error:
        assert 'outside 41-47px' in str(error)
    else:
        raise AssertionError('Incorrect icon extent accepted')
try:
    m.check_icon_size('clipped', set(range(44)))
except RuntimeError as error:
    assert 'clips frame edge' in str(error)
else:
    raise AssertionError('Clipped rim accepted')
# Coverage and rendered alpha use the same strict threshold, including the rim.
assert m.alpha_mask([0, .5, .50001, 1]) == {2, 3}
assert m.raster_mask(square(.2,.2,.2), 10) == m.rim_mask(
    m.alpha_mask([1 if 2 <= i%10 < 4 and 2 <= i//10 < 4 else 0 for i in range(100)]), 10)
# A narrow subpixel triangle cannot become a solid pixel merely by touching its centre.
assert not m.raster_mask([((.049,0),(.051,0),(.05,1))], 10)
assert m.closest_pair({'a': {1,2}, 'b': {1}, 'c': {3}}) == (.5, 'a', 'b')
for state in ('raw', 'chopped', 'cooked', 'burnt'):
    paths = [m.ribbon_points(j, state) for j in range(6)]
    assert len({tuple(path) for path in paths}) == 6
    assert all(all(m.math.isfinite(v) for v in point) for path in paths for point in path)
    assert all(max(p[2] for p in path) > min(p[2] for p in path) for path in paths)
print('ok')
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
    expect(result.trim()).toBe('ok');
    expect(source.match(/check_icon_size\(name, mask, size\)/g)).toHaveLength(2);
    expect(source).toContain('check_icon_mask(name, mask, icon_masks)');
    expect(source).not.toContain('scene.node_tree');
  });
  it('packs exactly reachable food appearances, containers, dishes, seven order icons and portions', () => {
    expect(frames.map((f) => f.id).sort()).toEqual(expected.sort());
    expect(new Set(frames.map((f) => f.id)).size).toBe(frames.length);
    for (const frame of frames) {
      expect(frame.file).toBe(`tabao-rush/items/${frame.id}.png`);
      expect(frame.anchor).toEqual(frame.id.startsWith('icon-') ? [27.5, 27.5] : [44.5, 44.5]);
    }
  });
  it('keeps the real committed source folder exactly equal to the manifest', () => {
    expect(readdirSync(new URL('../assets/src/tabao-rush/items/', import.meta.url)).sort())
      .toEqual([...frames.map((frame) => `${frame.id}.png`), 'render-validation.json'].sort());
  });
  it('keeps the Blender model table exactly equal to the independently derived states', () => {
    const group = (pattern: RegExp): string => {
      const found = source.match(pattern)?.[1];
      if (found === undefined) throw new Error(`items.py has no ${String(pattern)}`);
      return found;
    };
    const literal = group(/REACHABLE = \{([\s\S]*?)\n\}/);
    const actual = new Map([...literal.matchAll(/'([^']+)': \(([^)]*)\)/g)].map((m) =>
      [m[1], new Set([...(m[2] ?? '').matchAll(/'([^']+)'/g)].map((state) => state[1]))]));
    expect(actual).toEqual(reachable);
    expect(source).not.toContain('ICON_INPUTS');
  });
  it('has a slot for every reachable container/content step, including bread before spreading', () => {
    // Plating accepts ready food in every container (even wrong recipes). Checking
    // each member proves coverage for every subset up to the container capacity.
    for (const container of containers) for (const state of ['clean', 'dirty']) {
      const frame = frames.find((f) => f.id === `container-${container}-${state}`);
      for (const id of portions) {
        const ingredient = id.slice('portion-'.length).replace(/-(cooked|chopped|spread)$/, '');
        expect(frame?.anchors?.[ingredient], `${container}/${id}`).toHaveLength(2);
      }
      for (const slot of ['drink-side', 'rojak-dressing']) {
        if (container === 'plate') expect(frame?.anchors?.[slot]).toHaveLength(2);
        else expect(frame?.anchors?.[slot]).toBeUndefined();
      }
    }
    expect(portions.has('portion-bread-cooked')).toBe(true);
    expect(frames.filter((f) => f.id.startsWith('icon-'))).toHaveLength(RECIPES.length);
    const result = execFileSync('python3', ['-c', `
import importlib.util
spec = importlib.util.spec_from_file_location('items', 'tools/blender/items.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.coverage()
assert len({tuple(m.container_anchors(kind)['rice']) for kind in ('plate','bowl','cup')}) == 3
assert m.container_anchors('cup')['chicken'] == [44.5,29.5]
assert m.container_anchors('plate')['kopi'] == m.slot_anchor('drink-side')
assert m.container_anchors('plate')['teh'] == m.slot_anchor('drink-side')
assert m.container_scales('cup')['chicken'] < m.container_scales('bowl')['chicken'] < 1
assert m.container_scales('cup')['kopi'] == 1
assert m.plate_drinks()['teh'][1]['frame'] == 'portion-side-teh-cooked'
for drink in ('kopi', 'teh'):
    served = m.served_composition('kaya-toast')
    assert served['container'] == 'container-plate-clean'
    assert served['variants'][drink][-1]['frame'] == 'portion-side-'+drink+'-cooked'
    assert served['variants'][drink][1:] == [dict(layer, order=layer['order']+10) for layer in m.plate_drinks()[drink]]
assert m.plate_drinks()['kopi'][0]['frame'] == 'portion-side-cup-clean'
assert [layer['slot'] for layer in m.dish_layers('satay')] == ['cucumber','satay']
# Real anchor displacement, clipping and threshold boundary tests.
assert m.compose_masks({0}, [({44*89+44}, [45.5, 46.5])]) == {0, 46*89+45}
assert m.compose_masks(set(), [({88}, [45.5,44.5])]) == set()
masks = {}
for _, (container, parts) in m.DISH_PARTS.items():
    masks['container-'+container+'-clean'] = {44*89+44}
    for ingredient, state, _ in parts:
        masks['portion-'+ingredient+'-'+state] = {44*89+44}
for ident, (container, parts) in m.DISH_PARTS.items():
    masks['dish-'+ident+'-plated'] = m.compose_masks(masks['container-'+container+'-clean'],
        [(masks['portion-'+i+'-'+s], m.slot_anchor(i)) for i,s,_ in parts])
assert all(v == 1 for v in m.check_compositions(masks).values())
masks['dish-laksa-plated'] = {0}
try:
    m.check_compositions(masks)
except RuntimeError as error:
    assert 'laksa' in str(error) and '< .90' in str(error)
else:
    raise AssertionError('Broken composition accepted')
previous = {}
m.check_unique_item('item-noodles-raw', b'a', (1,2), previous)
for encoded, pixels in ((b'a', (3,4)), (b'b', (1,2))):
    try:
        m.check_unique_item('item-noodles-cooked', encoded, pixels, previous)
    except RuntimeError as error:
        assert 'identical item states' in str(error)
    else:
        raise AssertionError('Identical item accepted')
m.check_unique_item('item-noodles-cooked', b'b', (3,4), previous)
# Colour check must fail when an opaque portion is dropped or shifted 10 px.
base = [(0,0,0,0)]*89**2
food = list(base)
for y in range(30,50):
    for x in range(30,50): food[y*89+x] = (210,120,50,255)
actual = m.compose_rgba(base, [(food, [44.5,44.5])])
assert m.composition_difference(actual, actual)['passes']
assert not m.composition_difference(actual, base)['passes']
assert not m.composition_difference(actual, m.compose_rgba(base, [(food,[54.5,44.5])]))['passes']
try:
    m.check_unique_item('dish-noodles-plated', b'b', (3,4), previous)
except RuntimeError:
    pass
else:
    raise AssertionError('Loose/served duplicate accepted')
print('ok')
`], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
    expect(result.trim()).toBe('ok');
  });
  it('guards station restrictions behind the derived graph', () => {
    const raw = (ingredient: string): Item => ({ id: 1, ingredient, kind: 'raw', processes: [], place: { kind: 'held', cook: 'test' } });
    expect(accepts('pot', raw('noodles'))).toBe(false);
    for (const ingredient of ['kopi', 'teh']) {
      expect(accepts('drinks', raw(ingredient))).toBe(true);
      for (const station of ['chop', 'rice', 'grill', 'wok', 'pot'] as const) expect(accepts(station, raw(ingredient))).toBe(false);
    }
    expect(automatic('drinks')).toBe(false);
    expect(accepts('chop', raw('rice'))).toBe(false);
  });
});
