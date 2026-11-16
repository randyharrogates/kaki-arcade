import { ensureOrders, patience } from './orders';
import type { TabaoState } from './state';

/** Explicit open-order fixture for tests whose subject is cooking, not order generation. */
export function withOrder(state: TabaoState, dish: string): TabaoState {
  state = ensureOrders(state);
  return { ...state, kitchens: (state.kitchens ?? []).map((k) => ({ ...k,
    orders: [{ id: k.nextId, dish, arrivalStep: state.tick, remaining: patience(dish),
      total: patience(dish), warning: false }], nextId: k.nextId + 1 })) };
}
