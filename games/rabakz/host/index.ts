import type { RabakzPublicView } from './view-model';
// Host-only entry. Keep the pure rules entry free of DOM and CSS imports.
export { RabakzScreen, QuestionFrame } from './Screen';
export { screenModel, questionFit, screenScale } from './view-model';
export type { RabakzPublicView, ScreenModel } from './view-model';
export { scoreboardModel } from './standings';
export type { Standings, StandingPlayer } from './standings';

/** Retain a numeric key while display fields are unchanged; no per-tick key allocation. */
let previous: RabakzPublicView | undefined;
let revision = 0;
export function publicViewKey(view: RabakzPublicView): number {
  if (!equalDisplay(view, previous)) { previous = view; revision++; }
  return revision;
}
function equalDisplay(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  for (const field in a) {
    if (!Object.hasOwn(b, field) || !equalDisplay(Reflect.get(a, field), Reflect.get(b, field))) return false;
  }
  for (const field in b) if (!Object.hasOwn(a, field)) return false;
  return true;
}

export { scheduleCue } from './sound';
