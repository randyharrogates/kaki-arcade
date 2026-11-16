import { cloneRng, forkRng, pick } from '@kaki/sim-core';
import type { RngState } from '@kaki/sim-core';
import { secondsToSteps } from '@kaki/platform';
import { RECIPES } from './recipes';
import type { Rejection } from './recipes';
import type { TabaoState } from './state';

/** D-091 / OQ-032: deterministic tuning, pending playtests. */
export const DISH_POINTS: Readonly<Record<string, number>> = Object.fromEntries(RECIPES.map((r) => [r.id, r.basePoints]));
export function patience(dish: string): number { return secondsToSteps(RECIPES.find((r) => r.id === dish)?.patienceSeconds ?? 60); }
export const CREW_FACTORS = [1, 1.74, 2.41, 3.03, 3.62, 4.19, 4.74, 5.28] as const;
export interface Order {
  readonly id: number;
  readonly dish: string;
  readonly arrivalStep: number;
  readonly remaining: number;
  readonly total: number;
  readonly warning: boolean;
}
export interface Kitchen {
  readonly id: string;
  readonly cooks: number;
  readonly cookSteps: number;
  readonly elapsedSteps: number;
  /** Board bound while existing cards drain to targetMaximum after departures. */
  readonly maximum: number;
  readonly targetMaximum: number;
  readonly orders: readonly Order[];
  readonly nextId: number;
  readonly nextArrival: number;
  readonly rng: RngState;
  readonly score: number;
  readonly tips: number;
  readonly expired: number;
  readonly completed: number;
  readonly thresholds: readonly number[];
}
export type OrderEvent =
  | { readonly type: 'served'; readonly kitchen: string; readonly order: number; readonly dish: string; readonly step: number; readonly cook: string; readonly seat: number; readonly points: number; readonly tip: number; readonly delta: number }
  | { readonly type: 'expired'; readonly kitchen: string; readonly order: number; readonly dish: string; readonly step: number; readonly penalty: number; readonly delta: number }
  | { readonly type: 'refused'; readonly kitchen: string; readonly step: number; readonly cook: string; readonly seat: number; readonly counter: number; readonly dish: string | null; readonly reason: Rejection };

export function scaling(count: number, soloBase: readonly number[] = [200, 400, 600]) {
  // A kitchen with no assigned cooks scales as solo.
  const cooks = Math.max(1, Math.min(8, count));
  const low = Math.floor(cooks), fraction = cooks - low;
  const e = (CREW_FACTORS[low - 1] ?? 1) + fraction * ((CREW_FACTORS[Math.min(low, 7)] ?? 1) - (CREW_FACTORS[low - 1] ?? 1));
  return { interval: secondsToSteps(24 / e), maximum: Math.min(Math.floor(cooks) + 1, 6),
    thresholds: soloBase.map((base) => Math.round(base * e / 10) * 10) };
}
function cookCount(state: TabaoState, id: string): number {
  return state.kitchens?.length === 1 ? state.cooks.length
    : state.cooks.filter((cook) => cook.kitchen === id).length;
}
export function stars(kitchen: Kitchen): number {
  return kitchen.thresholds.filter((threshold) => kitchen.score >= threshold).length;
}
/** T-06 sets allowedDishes; until then the first dish is the only introduced dish. */
export function allowedDishes(state: TabaoState): readonly string[] {
  const allowed = state.level.allowedDishes ?? ['chicken-rice'];
  if (!allowed.length || allowed.some((id) => !Object.hasOwn(DISH_POINTS, id))) throw new Error('Level requires known allowed dishes');
  return allowed;
}
export function kitchenId(id?: string): string { return id ?? 'coop'; }
export function ensureOrders(state: TabaoState): TabaoState {
  if (state.kitchens) return state;
  allowedDishes(state);
  const ids = [...new Set(state.level.tiles.flatMap((tile) => tile.kind === 'station' && tile.stationType === 'serving' ? [kitchenId(tile.kitchen)] : []))];
  if (!ids.length) ids.push('coop');
  if (ids.length > 2) throw new Error('At most two kitchens');
  const kitchens = ids.map((id): Kitchen => {
    const rng = forkRng(state.rng, `orders:${id}`);
    const dish = pick(rng, allowedDishes(state)), total = patience(dish);
    const count = ids.length === 1 ? state.cooks.length : cookCount(state, id), scale = scaling(count, state.level.soloThresholds);
    const order: Order = { id: 0, dish, arrivalStep: state.tick, remaining: total, total, warning: false };
    return { id, cooks: count, cookSteps: 0, elapsedSteps: 0, maximum: scale.maximum,
      targetMaximum: scale.maximum, orders: [order], nextId: 1,
      nextArrival: state.tick + scale.interval, rng,
      score: 0, tips: 0, expired: 0, completed: 0, thresholds: scale.thresholds };
  });
  return { ...state, kitchens, orderEvents: [] };
}
/** D-091(d): departures lower the arrival cap; all open cards drain by service or expiry. */
export function resizeOrders(state: TabaoState): TabaoState {
  if (!state.kitchens) return state;
  return { ...state, kitchens: state.kitchens.map((k) => {
    const cooks = cookCount(state, k.id), scale = scaling(cooks, state.level.soloThresholds);
    return { ...k, cooks, maximum: Math.max(k.orders.length, scale.maximum), targetMaximum: scale.maximum,
      thresholds: k.elapsedSteps ? k.thresholds : scale.thresholds };
  }) };
}
/** Arrival at the start of a step, then service, then ageing/expiry at its end.
 * Full queues skip a scheduled slot without drawing RNG. Rescaling occurs on the next slot;
 * existing orders retain their patience.
 */
export function arriveOrders(state: TabaoState): TabaoState {
  state = ensureOrders(state);
  const kitchens = (state.kitchens ?? []).map((kitchen) => {
    if (state.tick < kitchen.nextArrival) return kitchen;
    const cooks = cookCount(state, kitchen.id);
    const scale = scaling(cooks);
    const next = { ...kitchen, cooks, maximum: Math.max(kitchen.orders.length, scale.maximum),
      targetMaximum: scale.maximum,
      nextArrival: state.tick + scale.interval };
    if (kitchen.orders.length >= scale.maximum) return next;
    const rng = cloneRng(kitchen.rng);
    const dish = pick(rng, allowedDishes(state)), total = patience(dish);
    const order: Order = { id: kitchen.nextId, dish, arrivalStep: state.tick, remaining: total, total, warning: false };
    return { ...next, rng, orders: [...kitchen.orders, order], nextId: kitchen.nextId + 1 };
  });
  return kitchens.some((k, i) => k !== state.kitchens?.[i]) ? { ...state, kitchens } : state;
}
export function ageOrders(state: TabaoState): TabaoState {
  const events: OrderEvent[] = [...(state.orderEvents ?? [])];
  const kitchens = (state.kitchens ?? []).map((kitchen) => {
    const cookSteps = kitchen.cookSteps + cookCount(state, kitchen.id), elapsedSteps = kitchen.elapsedSteps + 1;
    const thresholds = scaling(cookSteps / elapsedSteps, state.level.soloThresholds).thresholds;
    let score = kitchen.score, expired = kitchen.expired;
    const orders: Order[] = [];
    for (const order of kitchen.orders) {
      const remaining = Math.max(0, order.remaining - 1);
      if (remaining === 0) {
        const penalty = Math.min(score, Math.floor((DISH_POINTS[order.dish] ?? 0) * 0.25));
        score -= penalty; expired++;
        events.push({ type: 'expired', kitchen: kitchen.id, order: order.id, dish: order.dish,
          step: state.tick, penalty, delta: -penalty });
      } else orders.push({ ...order, remaining, warning: remaining * 4 <= order.total });
    }
    return { ...kitchen, cookSteps, elapsedSteps, thresholds, orders, score, expired,
      nextArrival: !orders.length ? Math.min(kitchen.nextArrival, state.tick + 1 + secondsToSteps(3)) : kitchen.nextArrival, maximum: Math.max(orders.length, kitchen.targetMaximum) };
  });
  return kitchens.some((k, i) => k !== state.kitchens?.[i]) ? { ...state, kitchens, orderEvents: events } : state;
}
/** Removes one oldest matching order immediately, so a later seat cannot complete it again. */
export function completeOrder(state: TabaoState, id: string, dish: string, cook: string): TabaoState {
  const kitchen = state.kitchens?.find((k) => k.id === id);
  const order = kitchen?.orders.find((o) => o.dish === dish);
  if (!kitchen || !order) throw new Error('Serving requires an open order');
  const points = DISH_POINTS[dish] ?? 0;
  const tip = Math.floor(points * 0.2 * order.remaining / order.total);
  return { ...state, kitchens: (state.kitchens ?? []).map((k) => k !== kitchen ? k : { ...k,
    orders: k.orders.filter((o) => o.id !== order.id), score: k.score + points + tip,
    tips: k.tips + tip, completed: k.completed + 1, maximum: Math.max(k.orders.length - 1, k.targetMaximum) }),
  orderEvents: [...(state.orderEvents ?? []), { type: 'served', kitchen: id, order: order.id,
    dish, step: state.tick, cook, seat: state.players.find((p) => p.id === cook)?.seat ?? 0, points, tip, delta: points + tip }] };
}
