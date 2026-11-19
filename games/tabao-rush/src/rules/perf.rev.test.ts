import { required } from './review-fixture';
import { performance, PerformanceObserver } from 'node:perf_hooks';
const gcs: [
    number,
    number
][] = [];
new PerformanceObserver((l) => { for (const e of l.getEntries())
    gcs.push([e.startTime, e.duration]); }).observe({ entryTypes: ['gc'] });
import { it } from 'vitest';
import { ROUND_STEPS } from './game';
import { tabaoRush } from './playing.fixture';
import type { Item, TabaoState, Station } from './state';
import { RECIPES } from './recipes';
import { aimAt, circle, cross, frame, setup, stationTiles, stepWith } from './review-fixture';
const loadFor: Record<string, string> = { chop: 'chicken', wok: 'kway-teow', pot: 'laksa-broth', grill: 'satay', rice: 'rice', drinks: 'kopi', sink: '' };
function dish(id: number, rec = RECIPES[0]): Omit<Item, 'place'> {
    const r = rec ?? required(RECIPES[0]);
    return { id, kind: 'dish', container: r.container, processes: [...r.assembly],
        ...(r.id === 'kaya-toast' ? { cup: { id: id + 8, kind: 'dish' as const, container: 'cup' as const, contents: [{ id: id + 9, kind: 'cooked' as const, ingredient: 'kopi', processes: ['drinks' as const] }], place: { kind: 'held' as const, cook: 'p6' } } } : {}),
        contents: r.ingredients.filter((p) => r.id !== 'kaya-toast' || p.ingredient !== 'drink').map((p, j) => ({ id: id + 1 + j, ingredient: p.ingredient === 'drink' ? 'kopi' : p.ingredient, kind: 'cooked' as const, processes: [...p.steps] })) };
}
function run(label: string) {
    let s: TabaoState = setup(8, 9, true);
    const tile = (t: string, k = 0) => required(stationTiles(t as never)[k]);
    const plan: [
        string,
        number,
        number,
        number
    ][] = [
        ['p0', tile('chop', 0), circle, 0], ['p1', tile('chop', 1), circle, 0], ['p2', tile('drinks', 0), circle, 0], ['p3', tile('sink', 0), circle, 0],
        ['p4', tile('plating', 0), circle, cross], ['p5', tile('plating', 1), circle, cross], ['p6', tile('serving', 0), 0, cross], ['p7', tile('serving', 1), 0, cross]
    ];
    s = { ...s, cooks: s.cooks.map((c) => { const p = plan.find((x) => x[0] === c.id); return p ? aimAt(c, p[1]) : c; }) };
    const frames = new Map(plan.map(([id, , h, p]) => [id, frame(h, p)]));
    const spans: [
        number,
        number
    ][] = [];
    const times: number[] = [];
    const views: number[] = [];
    const returnTimes: number[] = [];
    let id = 100000;
    let viewBytes = 0;
    for (let t = 0; t < ROUND_STEPS; t++) {
        // replenish: every mechanism busy, plating counters with a container, servers with dishes, combiners with food
        const stations: Record<number, Station> = { ...s.stations };
        for (const st of Object.values(stations)) {
            if (st.fire) {
                stations[st.tile] = { ...st, fire: false, fireAge: 0 };
                continue;
            }
            const ing = loadFor[st.type];
            if (ing !== undefined && (!st.content || st.content.kind === 'burnt' || st.progress === st.total)) {
                stations[st.tile] = { ...st, progress: 0, doneAge: 0, burntAge: 0, warning: false, turned: false,
                    content: st.type === 'sink' ? { id: ++id, kind: 'dirty-plate', container: 'plate', contents: [], processes: [], place: { kind: 'counter', tile: st.tile } }
                        : { id: ++id, kind: 'raw', ingredient: ing, processes: [], place: { kind: 'counter', tile: st.tile } } };
            }
            if (st.type === 'plating' && (!st.content || (st.content.contents?.length ?? 0) >= 3))
                stations[st.tile] = { ...st, content: { id: ++id, kind: 'plate', container: 'plate', contents: [], processes: [], place: { kind: 'counter', tile: st.tile } } };
        }
        const held: Record<string, Item | undefined> = { ...s.inventory.held };
        held.p0 = undefined;
        held.p1 = undefined;
        held.p2 = undefined;
        held.p3 = undefined;
        held.p4 = { id: ++id, kind: 'chopped', ingredient: 'cucumber', processes: ['chop'], place: { kind: 'held', cook: 'p4' } };
        held.p5 = { id: ++id, kind: 'cooked', ingredient: 'rice', processes: ['rice'], place: { kind: 'held', cook: 'p5' } };
        held.p6 = { ...dish(id += 10, RECIPES[t % 7]), place: { kind: 'held', cook: 'p6' } };
        held.p7 = { ...dish(id += 10, RECIPES[(t + 3) % 7]), contents: [], kind: 'plate', place: { kind: 'held', cook: 'p7' } }; // rejection path
        s = { ...s, stations, inventory: { ...s.inventory, held }, nextItemId: id + 1 };
        const returnsDue = s.returns?.some((r) => r.due <= s.tick) ?? false;
        const t0 = performance.now();
        s = stepWith(s, frames);
        const t9 = performance.now();
        times.push(t9 - t0);
        if (returnsDue) returnTimes.push(t9 - t0);
        spans.push([t0, t9]);
        const t1 = performance.now();
        const v = tabaoRush.publicView(s);
        views.push(performance.now() - t1);
        if (t === 6000)
            viewBytes = JSON.stringify(v).length;
    }
    process.stdout.write(`[${label}] returns in transit=${String(s.returns?.length)} returned=${String(Object.values(s.stations ?? {}).filter((st) => st.type === 'return-counter').reduce((n, st) => n + (st.supply?.length ?? 0), 0))}\n`);
    const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)] ?? 0;
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    process.stdout.write(`[${label}] steps delivering returns=${String(returnTimes.length)} mean=${mean(returnTimes).toFixed(4)} p95=${q(returnTimes, 0.95).toFixed(4)} worst=${Math.max(...returnTimes).toFixed(3)} ms\n`);
    const worstAt = times.indexOf(Math.max(...times));
    const top = times.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]).slice(0, 8).map(([v, i]) => `${v.toFixed(3)}@${String(i)}`);
    const late = times.slice(600);
    const slow = spans.map((sp, i) => [sp, times[i] ?? 0, i] as const).filter(([, v]) => v > 1);
    
    const gcHit = slow.filter(([[a, b]]) => gcs.some(([g, d]) => g < b && g + d > a)).length;
    process.stdout.write(`[${label}] steps>1ms=${String(slow.length)} overlapping a GC=${String(gcHit)} gcEvents=${String(gcs.length)}` + "\n");
    process.stdout.write(`[${label}] step mean=${mean(late).toFixed(4)} p95=${q(late, 0.95).toFixed(4)} p99=${q(late, 0.99).toFixed(4)} worst=${Math.max(...late).toFixed(3)} (all-worst ${Math.max(...times).toFixed(3)}@${String(worstAt)}) over1ms=${String(late.filter((x) => x > 1).length)} top=${top.join(',')}` + "\n");
    process.stdout.write(`[${label}] view mean=${mean(views.slice(600)).toFixed(4)} p95=${q(views.slice(600), 0.95).toFixed(4)} worst=${Math.max(...views.slice(600)).toFixed(3)} bytes=${String(viewBytes)} events=${String(s.serviceEvents?.length)}` + "\n");
}
it('busy 8-cook round, twice', { timeout: 600000 }, () => { run('A'); run('B'); });
it('idle 8-cook round baseline', { timeout: 600000 }, () => {
    let s = setup(8, 9, false);
    const times: number[] = [];
    for (let t = 0; t < ROUND_STEPS; t++) {
        const t0 = performance.now();
        s = stepWith(s, new Map());
        times.push(performance.now() - t0);
    }
    const late = times.slice(600).sort((a, b) => a - b);
    process.stdout.write(`[idle] mean=${(late.reduce((a, b) => a + b, 0) / late.length).toFixed(4)} p95=${(late[Math.floor(late.length * 0.95)] ?? 0).toFixed(4)} worst=${(late.at(-1) ?? 0).toFixed(3)}` + "\n");
});
