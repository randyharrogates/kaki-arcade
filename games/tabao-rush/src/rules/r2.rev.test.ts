import { expect, it } from 'vitest';
import { decodeState, encodeState, hashState } from '@kaki/sim-core';
import { tabaoRush } from './game';
import { items } from './state';
import type { Item, TabaoState, Food, StationType, Process } from './state';
import { checkRecipe, RECIPES, containerOf, food } from './recipes';
import { actionPreview } from './items';
import { ASSEMBLY_STEPS, BURN_STEPS, COOK_STEPS, RETURN_STEPS, stationCross, stationViews, advanceStations, SPREAD_STEPS } from './stations';
import { aimAt, circle, cross, frame, setup, stationTiles, stepWith, required } from './review-fixture';

const c_invalid = (name: string) => name !== 'plating+bowl';
const T = (t: StationType, k = 0) => required(stationTiles(t)[k]);
const rackOf = (s: TabaoState, kind: string) => required(stationTiles('dish-rack').find((t) => (s.stations?.[t]?.container ?? 'plate') === kind));
const aim = (s: TabaoState, tile: number, id = 'p0'): TabaoState => ({ ...s, cooks: s.cooks.map((c) => c.id === id ? aimAt(c, tile) : c) });
const give = (s: TabaoState, item: Omit<Item, 'place'> | undefined, id = 'p0'): TabaoState => ({ ...s, inventory: { ...s.inventory, held: { ...s.inventory.held, [id]: item ? { ...item, place: { kind: 'held', cook: id } } : undefined } } });
const put = (s: TabaoState, tile: number, item: Omit<Item, 'place'> | null, extra = {}): TabaoState => ({ ...s, stations: { ...s.stations, [tile]: { ...required(s.stations?.[tile]), ...extra, content: item ? { ...item, place: { kind: 'counter', tile } } : null } } });
const press = (s: TabaoState, held = 0, pressed = held, id = 'p0') => stepWith(s, new Map([[id, frame(held, pressed, s.tick)]]));
const f = (id: number, ingredient: string, ...processes: Process[]): Food => ({ id, ingredient, kind: processes.length ? (processes.at(-1) === 'chop' ? 'chopped' : 'cooked') : 'raw', processes });
const box = (contents: Food[], container: 'plate' | 'bowl' | 'cup' = 'plate', id = 500): Omit<Item, 'place'> => ({ id, kind: contents.length ? 'dish' : 'plate', container, contents, processes: [] });
const log = (n: string, v: unknown) => { if (n.startsWith('C toast')) expect(v).toEqual({ reason: { code: 'missing-ingredient', ingredient: 'drink' } }); process.stdout.write(`[${n}] ${JSON.stringify(v)}\n`); };

it('A ruin enumeration: every ingredient, every history prefix, every station and container', () => {
  const ruins: string[] = []; const previewMismatch: string[] = [];
  const types: StationType[] = ['chop', 'wok', 'pot', 'grill', 'rice', 'drinks', 'plating', 'sink', 'bin', 'serving', 'dish-rack', 'return-counter'];
  const seen = new Set<string>();
  for (const r of RECIPES) for (const p of r.ingredients) {
    const ings = p.ingredient === 'drink' ? ['kopi', 'teh'] : [p.ingredient];
    const prep = p.steps.filter((x) => x !== 'spread');
    for (const ing of ings) for (let k = 0; k <= prep.length; k++) {
      const hist = prep.slice(0, k) as Process[];
      const key = `${ing}:${hist.join(',')}`; if (seen.has(key)) continue; seen.add(key);
      const item = { ...f(900, ing, ...hist), place: { kind: 'held' as const, cook: 'p0' } } as Item;
      const targets: [string, (s: TabaoState) => TabaoState][] = types.map((t) => [t, (s) => aim(s, T(t))]);
      for (const c of ['plate', 'bowl', 'cup'] as const) targets.push([`plating+${c}`, (s) => aim(put(s, T('plating'), box([], c)), T('plating'))]);
      for (const [name, prepare] of targets) {
        const s0 = give(prepare(setup(1, 3, false)), item);
        const cook = required(s0.cooks[0]);
        const out = stationCross(s0, cook);
        const pv = actionPreview(s0, cook).cross;
        if ((pv === 'nothing') !== (out === s0)) previewMismatch.push(`${key}@${name}: ${pv}`);
        if (out === s0) continue;
        if (name === 'serving' || name === 'bin') continue;
        const tile = T(name.startsWith('plating') ? 'plating' : name as StationType);
        const placed = out.stations?.[tile]?.content;
        if (name === 'plating') continue; // loose food on plating can be picked up again
        const inBox = placed && containerOf(placed);
        if (inBox) {
          // food entered a container: it can never come out except by moving all contents to another container
          const remaining = p.steps.slice(k).filter((x) => x !== 'spread');
          if (remaining.filter((x) => x !== 'mix').length) ruins.push(`${key} into ${name} still needs ${remaining.join(',')}`);
          if (ing === 'laksa-broth' && c_invalid(name)) ruins.push(`${key} into ${name}: noodles can no longer be added`);
        } else if (placed?.id === 900 && name !== 'plating') {
          if (prep[k] !== name) ruins.push(`${key} accepted by ${name} but next step is ${prep[k] ?? 'none'}`);
        }
      }
    }
  }
  // broth taken out of the pot before noodles
  let s = put(setup(1, 3, false), T('pot'), { id: 91, kind: 'cooked', ingredient: 'laksa-broth', processes: ['pot'] }, { progress: COOK_STEPS });
  s = aim(s, T('pot')); const taken = press(s, 0, cross);
  const back = press(taken, 0, cross);
  log('A broth lifted before noodles', { lifted: taken.inventory.held.p0?.ingredient, canReturnToPot: back.inventory.held.p0 === undefined, preview: actionPreview(s, required(s.cooks[0])).cross });
  log('A ruins', ruins); log('A preview mismatches', previewMismatch);
  expect(previewMismatch).toEqual([]);
  expect(ruins).toEqual([]);
});

it('B kaya set binned or burnt fuses an empty cup to its plate for good', () => {
  const kaya = { ...box([f(1, 'bread', 'grill', 'spread')]), cup: { ...box([f(2, 'kopi', 'drinks')], 'cup', 501), place: { kind: 'held', cook: 'p0' } } as Item };
  let s = aim(give(setup(1, 3, false), kaya), T('bin'));
  s = press(s, 0, cross);
  const fused = required(s.inventory.held.p0);
  log('B after bin', { kind: fused.kind, cup: fused.cup && { id: fused.cup.id, kind: fused.cup.kind, contents: fused.cup.contents } });
  expect(fused.cup).toBeUndefined();
  const detached = required(items(s).find((i) => i.id === 501));
  expect(detached).toMatchObject({ container: 'cup', kind: 'plate' });
  const plateReturned = stationCross(aim(s, rackOf(s, 'plate')), required(aim(s, rackOf(s, 'plate')).cooks[0]));
  expect(plateReturned.inventory.held.p0).toBeUndefined();
  expect(plateReturned.stations?.[rackOf(s, 'plate')]?.supply?.some((i) => i.id === fused.id)).toBe(true);
  const cupState = aim(give(s, detached), rackOf(s, 'cup'));
  expect(actionPreview(cupState, required(cupState.cooks[0])).cross).toBe('return cup');
  const cupReturned = stationCross(cupState, required(cupState.cooks[0]));
  expect(cupReturned.inventory.held.p0).toBeUndefined();
  expect(cupReturned.stations?.[rackOf(s, 'cup')]?.supply?.some((i) => i.id === 501)).toBe(true);
  // rack refuses
  const atRack = aim(s, rackOf(s, 'plate'));
  log('B plate rack preview', actionPreview(atRack, required(atRack.cooks[0])).cross);
  const cupRack = aim(s, rackOf(s, 'cup'));
  log('B cup rack preview', actionPreview(cupRack, required(cupRack.cooks[0])).cross);
  // put on plating; add bread; add loose kopi: does it reach the cup?
  s = press(aim(s, T('plating')), 0, cross);
  s = press(give(s, { id: 3, kind: 'cooked', ingredient: 'bread', processes: ['grill', 'spread'] }), 0, cross);
  s = press(give(s, { id: 4, kind: 'cooked', ingredient: 'kopi', processes: ['drinks'] }), 0, cross);
  const plate = required(s.stations?.[T('plating')]?.content);
  log('B after refill', { contents: plate.contents?.map((x) => x.ingredient), cup: plate.cup?.contents, check: checkRecipe(plate) });
  // a filled cup offered to it
  s = press(give(s, { ...box([f(5, 'teh', 'drinks')], 'cup', 502) }), 0, cross);
  log('B second cup', { held: s.inventory.held.p0?.id, plateCup: s.stations?.[T('plating')]?.content?.cup?.id });
  // any way to lift the cup off? empty-handed cross / circle
  const lift = press(give(s, undefined), 0, cross);
  expect(actionPreview(give(s, undefined), required(s.cooks[0])).cross).toBe('pick up cup');
  expect(lift.inventory.held.p0?.id).toBe(502);
  expect(lift.stations?.[T('plating')]?.content?.cup).toBeUndefined();
  log('B empty-hand cross takes', { held: lift.inventory.held.p0?.id, hasCup: !!lift.inventory.held.p0?.cup });
});

it('C toast without its cup reads "wrong container" (overload of missing drink)', () => {
  log('C toast only', checkRecipe({ ...box([f(1, 'bread', 'grill', 'spread')]), place: { kind: 'held', cook: 'p0' } }));
  log('C toast + loose kopi', checkRecipe({ ...box([f(1, 'bread', 'grill', 'spread'), f(2, 'kopi', 'drinks')]), place: { kind: 'held', cook: 'p0' } }));
  log('C toast + empty cup', checkRecipe({ ...box([f(1, 'bread', 'grill', 'spread')]), cup: { ...box([], 'cup', 9), place: { kind: 'held', cook: 'p0' } }, place: { kind: 'held', cook: 'p0' } }));
  log('C unspread toast + cup', checkRecipe({ ...box([f(1, 'bread', 'grill')]), cup: { ...box([f(2, 'teh', 'drinks')], 'cup', 9), place: { kind: 'held', cook: 'p0' } }, place: { kind: 'held', cook: 'p0' } }));
  log('C rojak unmixed', checkRecipe({ ...box([f(1, 'pineapple', 'chop'), f(2, 'turnip', 'chop'), f(3, 'cucumber', 'chop')]), place: { kind: 'held', cook: 'p0' } }));
  log('C raw rice in hand', checkRecipe({ id: 1, kind: 'raw', ingredient: 'rice', processes: [], place: { kind: 'held', cook: 'p0' } }));
});

it('D plating progress after an assembly: next plate shows working', () => {
  let s = aim(put(setup(1, 3, false), T('plating'), box([f(1, 'pineapple', 'chop'), f(2, 'turnip', 'chop'), f(3, 'cucumber', 'chop')])), T('plating'));
  for (let i = 0; i < ASSEMBLY_STEPS; i++) s = press(s, circle, 0);
  s = press(s, 0, cross); // pick up rojak
  const v1 = stationViews(s).find((x) => x.tile === T('plating'));
  s = press(give(s, box([], 'plate', 600)), 0, cross); // put an empty plate
  const v2 = stationViews(s).find((x) => x.tile === T('plating'));
  log('D', { afterPickup: v1 && { status: v1.status, p: v1.progress, t: v1.total }, emptyPlate: v2 && { status: v2.status, p: v2.progress, t: v2.total } });
  expect(v1).toMatchObject({ status: 'empty', progress: 0, total: 0 });
  expect(v2).toMatchObject({ status: 'done', progress: 0, total: 0 });
  // two cooks working same step
  let t = aim(aim(put(setup(2, 3, false), T('plating'), box([f(1, 'bread', 'grill')])), T('plating')), T('plating'), 'p1');
  t = stepWith(t, new Map([['p0', frame(circle, circle)], ['p1', frame(circle, circle)]]));
  log('D two cooks', t.stations?.[T('plating')]?.progress);
  expect(t.stations?.[T('plating')]?.progress).toBe(1);
});

it('E returns: conserved through leave, reload and round end; many dirty containers', () => {
  let s = setup(2, 3, true);
  const serveOne = (st: TabaoState, item: Omit<Item, 'place'>) => press(aim(give(st, item), T('serving')), 0, cross);
  const ids = items(s).filter((i) => containerOf(i)).map((i) => i.id);
  for (const [k, id] of ids.entries()) {
    const c = required(items(s).find((i) => i.id === id));
    const contents = c.container === 'cup' ? [f(1000 + k, 'kopi', 'drinks')] : c.container === 'bowl' ? [{ ...f(1000 + k, 'laksa-broth', 'pot') }, f(2000 + k, 'noodles', 'pot')] : [f(1000 + k, 'kway-teow', 'chop', 'wok')];
    s = { ...s, stations: Object.fromEntries(Object.entries(required(s.stations)).map(([t, st]) => [t, { ...st, supply: st.supply?.filter((x) => x.id !== id) ?? [] }])) };
    s = serveOne(s, { ...c, kind: 'dish', contents });
  }
  log('E events served', s.returns?.length);
  s = tabaoRush.leave(s, 'p1');
  const mid = decodeState(JSON.parse(JSON.stringify(encodeState(s)))) as TabaoState;
  expect(hashState(mid)).toBe(hashState(s));
  for (let i = 0; i < RETURN_STEPS; i++) s = press(s);
  const rc = required(s.stations?.[T('return-counter')]);
  log('E return counter', { n: rc.supply?.length, kinds: [...new Set(rc.supply?.map((x) => `${x.container ?? ''}:${x.kind}`))], inTransit: s.returns?.length, containers: items(s).filter((i) => containerOf(i)).length });
  expect(items(s).filter((i) => containerOf(i)).length).toBe(8);
  // round end mid transit
  let e = { ...setup(1, 3, false) }; e = { ...e, endTick: 5 };
  e = press(aim(give(e, box([f(1, 'kway-teow', 'chop', 'wok')])), T('serving')), 0, cross);
  for (let i = 0; i < 10; i++) e = press(e);
  log('E round over mid-transit', { over: tabaoRush.isOver(e), inTransit: e.returns?.length, viewItems: (tabaoRush.publicView(e) as { items: unknown[] }).items.length });
});

it('F laksa: broth burns after noodles; noodles into raw or burnt broth refused', () => {
  let s = put(setup(1, 3, false), T('pot'), { id: 91, kind: 'cooked', ingredient: 'laksa-broth', processes: ['pot'] }, { progress: COOK_STEPS });
  s = aim(give(s, { id: 92, kind: 'raw', ingredient: 'noodles', processes: [] }), T('pot'));
  s = press(s, 0, cross);
  for (let i = 0; i < BURN_STEPS + 2; i++) s = press(s);
  const burnt = s.stations?.[T('pot')]?.content;
  log('F burnt laksa', { kind: burnt?.kind, contents: burnt?.contents });
  s = press(s, 0, cross); // lift burnt
  s = press(aim(s, T('bin')), 0, cross);
  log('F binned', { held: s.inventory.held.p0, foods: items(s).flatMap((i) => food(i)).length });
});

it('G allowed list and not-ordered; stationCross does not pass it yet', () => {
  const dish = { ...box([f(1, 'kway-teow', 'chop', 'wok')]), place: { kind: 'held' as const, cook: 'p0' } };
  log('G', { ok: checkRecipe(dish, ['char-kway-teow']), notOrdered: checkRecipe(dish, ['satay']), wrongButNotOrdered: checkRecipe({ ...dish, contents: [f(1, 'kway-teow', 'chop')] }, ['satay']) });

});

it('D-087 A: lifted broth accepts noodles in a bowl with add preview', () => {
  let s = aim(put(setup(1, 3, false), T('pot'), { id: 91, kind: 'cooked', ingredient: 'laksa-broth', processes: ['pot'] }, { progress: COOK_STEPS }), T('pot'));
  s = press(s, 0, cross);
  s = aim(put(s, T('plating'), box([], 'bowl')), T('plating'));
  s = press(s, 0, cross);
  s = give(s, { id: 92, kind: 'raw', ingredient: 'noodles', processes: [] });
  expect(actionPreview(s, required(s.cooks[0])).cross).toMatch(/^add /);
  s = press(s, 0, cross);
  expect(checkRecipe(required(s.stations?.[T('plating')]?.content))).toEqual({ dish: 'laksa' });
});

it('D-087 B: washing and fire separate cups and preserve their state and type', () => {
  const plate = { ...box([], 'plate'), kind: 'dirty-plate' as const, cup: { ...box([], 'cup', 501), kind: 'dirty-plate' as const, place: { kind: 'held' as const, cook: 'p0' } } };
  let s = aim(give(setup(1, 3, false), plate), T('sink'));
  s = press(s, 0, cross);
  expect(s.inventory.held.p0).toMatchObject({ id: 501, container: 'cup', kind: 'dirty-plate' });
  expect(s.stations?.[T('sink')]?.content?.cup).toBeUndefined();
  const source = T('chop'), target = T('plating');
  s = put(setup(1, 3, true), target, { ...plate, kind: 'dish', contents: [f(1, 'bread', 'grill', 'spread')], cup: { ...plate.cup, kind: 'dish', contents: [f(2, 'kopi', 'drinks')] } });
  s = { ...s, fireSpreadClock: SPREAD_STEPS - 1, stations: { ...s.stations, [source]: { ...required(s.stations?.[source]), fire: true, fireAge: 100, neighbours: [target] } } };
  s = advanceStations(s);
  expect(s.stations?.[target]?.content).toMatchObject({ kind: 'dirty-plate', contents: [] });
  expect(s.stations?.[target]?.content?.cup).toBeUndefined();
  expect(items(s).find((i) => i.id === 501)).toMatchObject({ container: 'cup', kind: 'dirty-plate', contents: [] });
});
