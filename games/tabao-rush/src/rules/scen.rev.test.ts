import { withOrder } from './orders.fixture';
import { required } from './review-fixture';
import { expect, it } from 'vitest';
import { secondsToSteps } from '@kaki/platform';
import { tabaoRush } from './game';
import { items } from './state';
import type { Item, TabaoState, Food, StationType } from './state';
import { checkRecipe } from './recipes';
import { actionPreview } from './items';
import { ASSEMBLY_STEPS, COOK_STEPS, RETURN_STEPS, SPREAD_STEPS, stationCross, stationViews } from './stations';
import { aimAt, circle, cross, frame, setup, stationTiles, stepWith, crateTile } from './review-fixture';
const T = (t: StationType, k = 0) => required(stationTiles(t)[k]);
function aim(s: TabaoState, tile: number, id = 'p0'): TabaoState { return { ...s, cooks: s.cooks.map((c) => c.id === id ? aimAt(c, tile) : c) }; }
function give(s: TabaoState, item: Omit<Item, 'place'>, id = 'p0'): TabaoState {
    return { ...s, inventory: { ...s.inventory, held: { ...s.inventory.held, [id]: { ...item, place: { kind: 'held', cook: id } } } } };
}
function put(s: TabaoState, tile: number, item: Omit<Item, 'place'>): TabaoState {
    return { ...s, stations: { ...s.stations, [tile]: { ...required(required(s.stations)[tile]), content: { ...item, place: { kind: 'counter', tile } } } } };
}
const press = (s: TabaoState, held = 0, pressed = held) => stepWith(s, new Map([['p0', frame(held, pressed, s.tick)]]));
const f = (id: number, ingredient: string, ...processes: NonNullable<Food['processes']>): Food => ({ id, ingredient, kind: processes.length ? 'cooked' : 'raw', processes });
const plate = (contents: Food[], container: 'plate' | 'bowl' | 'cup' = 'plate'): Omit<Item, 'place'> => ({ id: 500, kind: contents.length ? 'dish' : 'plate', container, contents, processes: [] });
function serve(item: Omit<Item, 'place'>) {
    let s = aim(give(setup(1, 3, false), item), T('serving'));
    const checked = checkRecipe({ ...item, place: { kind: 'held', cook: 'p0' } });
    if ('dish' in checked) s = withOrder(s, checked.dish);
    return { before: s, after: press(s, 0, cross) };
}
const reason = (item: Omit<Item, 'place'>) => serve(item).after.serviceEvents?.[0];
it('R1 next-step acceptance refuses raw kway-teow at wok with a silent preview', () => {
    const s = aim(give(setup(1, 3, false), { id: 90, kind: 'raw', ingredient: 'kway-teow', processes: [] }), T('wok'));
    expect(actionPreview(s, required(s.cooks[0])).cross).toBe('nothing');
    expect(stationCross(s, required(s.cooks[0]))).toBe(s);
    expect(reason(plate([f(1, 'kway-teow', 'wok')]))).toMatchObject({ reason: { code: 'missing-step', ingredient: 'kway-teow', step: 'chop' } });
});
it('R2 chopped cucumber is required in satay; repeat or premature processing is refused', () => {
    expect(reason(plate([f(1, 'satay', 'chop', 'grill'), f(2, 'cucumber', 'chop')]))).toMatchObject({ type: 'served', dish: 'satay' });
    const s = aim(give(setup(1, 3, false), { id: 90, kind: 'chopped', ingredient: 'cucumber', processes: ['chop'] }), T('chop'));
    expect(actionPreview(s, required(s.cooks[0])).cross).toBe('nothing');
    expect(reason(plate([f(1, 'satay', 'chop', 'grill'), f(2, 'cucumber')]))).toMatchObject({ reason: { code: 'missing-step', ingredient: 'cucumber', step: 'chop' } });
});
it('R3 rejection precedence: empty, dirty, burnt, container; allowed list returns not ordered', () => {
    expect(reason(plate([]))).toMatchObject({ reason: { code: 'nothing-to-serve' } });
    expect(reason({ ...plate([]), kind: 'dirty-plate' })).toMatchObject({ reason: { code: 'dirty' } });
    expect(reason({ id: 1, kind: 'extinguisher' })).toMatchObject({ reason: { code: 'wrong-container' } });
    expect(reason({ id: 1, kind: 'burnt', ingredient: 'rice' })).toMatchObject({ reason: { code: 'burnt', ingredient: 'rice' } });
    const item = { ...plate([f(1, 'kopi', 'drinks')], 'cup'), place: { kind: 'held' as const, cook: 'p0' } };
    expect(checkRecipe(item, ['satay'])).toEqual({ reason: { code: 'not-ordered' } });
});
it('R4 wrong container precedes missing ingredient; explicit unknown, extra ingredient and extra step', () => {
    expect(reason(plate([f(1, 'rice', 'rice'), f(2, 'chicken', 'chop')], 'bowl'))).toMatchObject({ reason: { code: 'wrong-container' } });
    expect(reason(plate([f(1, 'rice', 'rice')], 'cup'))).toMatchObject({ reason: { code: 'wrong-container' } });
    expect(reason(plate([f(1, 'unknown')]))).toMatchObject({ reason: { code: 'unknown-combination' } });
    expect(reason(plate([f(1, 'kway-teow', 'chop', 'wok'), f(2, 'unknown')]))).toMatchObject({ reason: { code: 'extra-ingredient', ingredient: 'unknown' } });
    expect(reason(plate([f(1, 'kway-teow', 'chop', 'wok', 'chop')]))).toMatchObject({ reason: { code: 'extra-step', ingredient: 'kway-teow' } });
});
it('R5 spread takes one second, retains interrupted work, affects grilled bread only, publishes seat', () => {
    let s = aim(put(setup(1, 3, false), T('plating'), plate([f(1, 'bread', 'grill'), f(2, 'bread')])), T('plating'));
    s = press(s, circle);
    expect(stationViews(s).find((x) => x.tile === T('plating'))).toMatchObject({ progress: 1, total: secondsToSteps(1), worker: 1 });
    s = press(s);
    expect(required(required(s.stations)[T('plating')]).progress).toBe(1);
    for (let i = 1; i < ASSEMBLY_STEPS; i++)
        s = press(s, circle);
    expect(required(required(required(required(s.stations)[T('plating')]).content).contents).map((x) => x.processes)).toEqual([['grill', 'spread'], []]);
});
it('R6 serving, racks and returns never burn and have no fire neighbours', () => {
    let s = setup(1, 3, true);
    const safe = ['serving', 'dish-rack', 'return-counter'];
    for (const st of Object.values(required(s.stations))) {
        if (safe.includes(st.type))
            expect(st.neighbours).toEqual([]);
        expect(st.neighbours.every((tile) => !safe.includes(required(required(s.stations)[tile]).type))).toBe(true);
    }
    const p = T('plating');
    s = { ...s, stations: { ...s.stations, [p]: { ...required(required(s.stations)[p]), fire: true, fireAge: 999 } } };
    for (let i = 0; i < SPREAD_STEPS * 4 + 4; i++)
        s = press(s);
    expect(Object.values(required(s.stations)).filter((st) => safe.includes(st.type)).every((st) => !st.fire)).toBe(true);
});
it('R7 fire empties food and dirties both plate and cup without losing identities', () => {
    let s = setup(1, 3, true);
    const p = T('plating'), p2 = T('plating', 1);
    s = put(s, p2, { ...plate([f(1, 'bread', 'grill', 'spread')]), cup: { ...plate([f(2, 'kopi', 'drinks')], 'cup'), id: 501, place: { kind: 'counter', tile: p2 } } });
    s = { ...s, fireSpreadClock: SPREAD_STEPS - 1, stations: { ...s.stations, [p]: { ...required(required(s.stations)[p]), fire: true, fireAge: 999, neighbours: [p2] } } };
    s = press(s);
    expect(required(required(s.stations)[p2]).content).toMatchObject({ id: 500, kind: 'dirty-plate', contents: [] });
    expect(required(required(s.stations)[p2]).content?.cup).toBeUndefined();
    expect(items(s).find((i) => i.id === 501)).toMatchObject({ kind: 'dirty-plate', container: 'cup', contents: [] });
});
it('R8 leaving drops a dish with contents intact', () => {
    const s = tabaoRush.leave(give(setup(2, 3, false), plate([f(1, 'rice', 'rice')]), 'p1'), 'p1');
    expect(items(s).find((x) => x.id === 500)).toMatchObject({ place: { kind: 'floor' }, contents: [{ id: 1 }] });
});
it('R9 toast needs a filled cup; service returns both identities dirty after five seconds', () => {
    const toast = plate([f(1, 'bread', 'grill', 'spread'), f(2, 'kopi', 'drinks')]);
    expect(reason(toast)).toMatchObject({ reason: { code: 'missing-ingredient', ingredient: 'drink' } });
    expect(reason({ ...toast, cup: { ...plate([], 'cup'), id: 502, place: { kind: 'held', cook: 'p0' } } })).toMatchObject({ reason: { code: 'missing-ingredient', ingredient: 'drink' } });
    const cup: Item = { ...plate([f(2, 'teh', 'drinks')], 'cup'), id: 501, place: { kind: 'held', cook: 'p0' } };
    let s = aim(give(put(setup(1, 3, false), T('plating'), plate([f(1, 'bread', 'grill', 'spread')])), cup), T('plating'));
    expect(actionPreview(s, required(s.cooks[0])).cross).toBe('place cup on plate');
    s = press(s, 0, cross);
    s = press(s, 0, cross);
    s = aim(s, T('serving'));
    s = withOrder(s, 'kaya-toast');
    const step = s.tick;
    s = press(s, 0, cross);
    expect(s.serviceEvents?.[0]).toMatchObject({ type: 'served', dish: 'kaya-toast', drink: 'teh', step });
    expect(s.inventory.held.p0).toBeUndefined();
    expect(s.returns?.map((r) => r.item.id)).toEqual([500, 501]);
    for (let i = 1; i < RETURN_STEPS; i++)
        s = press(s);
    expect(required(required(s.stations)[T('return-counter')]).supply ?? []).toEqual([]);
    s = press(s);
    expect(s.returns).toEqual([]);
    expect(required(required(s.stations)[T('return-counter')]).supply?.map((x) => [x.id, x.kind])).toEqual([[500, 'dirty-plate'], [501, 'dirty-plate']]);
    s = aim(s, T('return-counter'));
    expect(actionPreview(s, required(s.cooks[0])).cross).toBe('take plate');
    s = press(s, 0, cross);
    expect(s.inventory.held.p0?.id).toBe(500);
    const invalid = setup(1, 3, false);
    expect(() => stationViews({ ...invalid, stations: undefined, level: { ...invalid.level, tiles: invalid.level.tiles.map((t) => t.kind === 'station' && t.stationType === 'return-counter' ? { kind: 'wall' } : t) } } as unknown as TabaoState)).toThrow('return counter');
});
it('R10 simultaneous service follows seat order and clears events next step', () => {
    let s = aim(aim(setup(2, 3, false), T('serving')), T('serving'), 'p1');
    s = give(give(s, plate([f(1, 'rice', 'rice')])), { ...plate([f(2, 'kopi', 'drinks')]), id: 501 }, 'p1');
    s = stepWith(s, new Map([['p1', frame(0, cross)], ['p0', frame(0, cross)]]));
    expect(s.serviceEvents?.map((x) => x.seat)).toEqual([1, 2]);
    expect(required(required(s.stations)[T('serving')]).rejection?.reason).toEqual({ code: 'wrong-container' });
    expect(press(s).serviceEvents).toEqual([]);
});
it('R11 mix is timed and adding food undoes it', () => {
    let s = aim(put(setup(1, 3, false), T('plating'), plate([f(1, 'pineapple', 'chop'), f(2, 'turnip', 'chop'), f(3, 'cucumber', 'chop')])), T('plating'));
    expect(actionPreview(s, required(s.cooks[0])).circle).toBe('mix');
    s = press(s, circle, 0);
    expect(required(required(required(s.stations)[T('plating')]).content).processes).toEqual([]);
    for (let i = 1; i < ASSEMBLY_STEPS; i++)
        s = press(s, circle, 0);
    expect(required(required(required(s.stations)[T('plating')]).content).processes).toEqual(['mix']);
    s = give(s, { ...f(4, 'cucumber', 'chop'), kind: 'chopped' });
    s = press(s, 0, cross);
    expect(required(required(required(s.stations)[T('plating')]).content).processes).toEqual([]);
});
it('R12 noodles enter only finished unburnt broth and complete laksa immediately', () => {
    let s = aim(give(setup(1, 3, false), { id: 90, kind: 'raw', ingredient: 'noodles', processes: [] }), T('pot'));
    expect(actionPreview(s, required(s.cooks[0])).cross).toBe('nothing');
    s = put(s, T('pot'), { id: 91, kind: 'raw', ingredient: 'laksa-broth', processes: [] });
    expect(actionPreview(s, required(s.cooks[0])).cross).toBe('nothing');
    s = put(s, T('pot'), { id: 91, kind: 'burnt', ingredient: 'laksa-broth', processes: ['pot'] });
    expect(actionPreview(s, required(s.cooks[0])).cross).toBe('nothing');
    s = put(s, T('pot'), { id: 91, kind: 'cooked', ingredient: 'laksa-broth', processes: ['pot'] });
    s = { ...s, stations: { ...s.stations, [T('pot')]: { ...required(required(s.stations)[T('pot')]), progress: COOK_STEPS } } };
    expect(actionPreview(s, required(s.cooks[0])).cross).toBe('add noodles');
    s = press(s, 0, cross);
    expect(required(s.stations)[T('pot')]).toMatchObject({ progress: COOK_STEPS, content: { kind: 'cooked', contents: [{ ingredient: 'noodles', processes: ['pot'] }] } });
});
it('R13 ingredient preparation order is independent across ingredients', () => {
    expect(reason(plate([f(3, 'cucumber', 'chop'), f(1, 'rice', 'rice'), f(2, 'chicken', 'chop')]))).toMatchObject({ type: 'served', dish: 'chicken-rice' });
});
it('R14 public view serialises and exposes each of eight cooks previews', () => {
    const s = setup(8, 3, true);
    const view = JSON.parse(JSON.stringify(tabaoRush.publicView(s))) as {
        cooks: unknown[];
    };
    expect(view.cooks).toHaveLength(8);
    for (const c of view.cooks)
        expect(c).toHaveProperty('actions.cross');
});
it('R15 crates issue one raw portion only to empty hands and refuse containers', () => {
    let s = aim(setup(1, 3, false), crateTile('rice'));
    const id = s.nextItemId;
    s = press(s, 0, cross);
    expect(s.inventory.held.p0).toMatchObject({ id, kind: 'raw', ingredient: 'rice' });
    const blocked = aim(give(s, plate([])), crateTile('rice'));
    expect(actionPreview(blocked, required(blocked.cooks[0])).cross).toBe('nothing');
    expect(press(blocked, 0, cross).inventory.held.p0).toBe(blocked.inventory.held.p0);
});
